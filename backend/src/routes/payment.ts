import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { supabase } from '../utils/supabase';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';

const purchaseSchema = z.object({
  planId: z.string(),
});

const verifyPaymentSchema = z.object({
  paymentId: z.string(),
});

// Dodo Payments configuration
const DODO_API_KEY = process.env.DODO_API_KEY || '';
const DODO_API_URL = process.env.DODO_API_URL || 'https://api.dodopayments.com/v1';

// Credit amounts per plan
const planCredits: Record<string, number> = {
  starter: 10,
  growth: 50,
  pro: 200,
};

// Plan prices in INR
const planPrices: Record<string, number> = {
  starter: 499,      // ₹4.99
  growth: 1999,      // ₹19.99
  pro: 6999,         // ₹69.99
};

export async function paymentRoutes(app: FastifyInstance) {
  // Apply auth middleware
  app.addHook('preHandler', authMiddleware);

  // Get user credits
  app.get('/credits', async (request: AuthenticatedRequest, reply) => {
    try {
      const userId = request.user?.id;

      const { data: user } = await supabase
        .from('users')
        .select('credits, email')
        .eq('id', userId)
        .single();

      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      return reply.send({
        credits: user.credits,
        email: user.email,
      });
    } catch (err) {
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Create Dodo Payment
  app.post('/create-payment', async (request: AuthenticatedRequest, reply) => {
    try {
      const { planId } = purchaseSchema.parse(request.body);
      const userId = request.user?.id;
      const userEmail = request.user?.email;

      const creditsToAdd = planCredits[planId];
      const amount = planPrices[planId];

      if (!creditsToAdd || !amount) {
        return reply.status(400).send({ error: 'Invalid plan' });
      }

      // Create pending transaction record
      const { data: transaction, error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: userId,
          type: 'purchase',
          amount: creditsToAdd,
          plan_id: planId,
          payment_intent_id: null, // Will be updated after payment link creation
          description: `Pending payment for ${planId} plan`,
        })
        .select()
        .single();

      if (transactionError) {
        console.error('[Create Transaction Error]', transactionError);
        return reply.status(500).send({ error: 'Failed to create transaction' });
      }

      // Create Dodo Payment Link
      const paymentData = {
        amount: amount,
        currency: 'INR',
        description: `DataFlow - ${planId} Pack (${creditsToAdd} credits)`,
        customer_email: userEmail,
        metadata: {
          user_id: userId,
          plan_id: planId,
          credits: creditsToAdd,
          transaction_id: transaction.id,
        },
        success_url: `dataflow://payment/success?txn=${transaction.id}`,
        cancel_url: `dataflow://payment/cancel?txn=${transaction.id}`,
      };

      const response = await fetch(`${DODO_API_URL}/payment-links`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${DODO_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[Dodo API Error]', errorData);
        return reply.status(500).send({ error: 'Failed to create payment link' });
      }

      const dodoResponse = await response.json();

      // Update transaction with payment intent ID
      await supabase
        .from('transactions')
        .update({
          payment_intent_id: dodoResponse.id,
          description: `Payment initiated for ${planId} plan`,
        })
        .eq('id', transaction.id);

      return reply.send({
        success: true,
        paymentLink: dodoResponse.short_url || dodoResponse.url,
        paymentId: dodoResponse.id,
        transactionId: transaction.id,
        amount: amount,
        currency: 'INR',
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({ 
          error: 'Validation failed', 
          details: err.errors 
        });
      }
      console.error('[Create Payment Error]', err);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Verify payment status (called by frontend after payment)
  app.post('/verify-payment', async (request: AuthenticatedRequest, reply) => {
    try {
      const { paymentId } = verifyPaymentSchema.parse(request.body);
      const userId = request.user?.id;

      // Check payment status with Dodo
      const response = await fetch(`${DODO_API_URL}/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${DODO_API_KEY}`,
        },
      });

      if (!response.ok) {
        return reply.status(400).send({ error: 'Invalid payment ID' });
      }

      const paymentData = await response.json();

      if (paymentData.status === 'completed' || paymentData.status === 'success') {
        // Get transaction details
        const { data: transaction } = await supabase
          .from('transactions')
          .select('*')
          .eq('payment_intent_id', paymentId)
          .single();

        if (!transaction) {
          return reply.status(404).send({ error: 'Transaction not found' });
        }

        // Check if already processed
        if (transaction.processed) {
          return reply.send({
            success: true,
            alreadyProcessed: true,
            credits: transaction.amount,
          });
        }

        // Get current user credits
        const { data: user } = await supabase
          .from('users')
          .select('credits')
          .eq('id', userId)
          .single();

        const newCredits = (user?.credits || 0) + transaction.amount;

        // Update user credits
        await supabase
          .from('users')
          .update({ credits: newCredits })
          .eq('id', userId);

        // Mark transaction as processed
        await supabase
          .from('transactions')
          .update({
            processed: true,
            description: `Payment completed for ${transaction.plan_id} plan`,
          })
          .eq('id', transaction.id);

        return reply.send({
          success: true,
          credits_added: transaction.amount,
          total_credits: newCredits,
        });
      } else {
        return reply.status(400).send({
          success: false,
          status: paymentData.status,
          message: 'Payment not completed yet',
        });
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({ 
          error: 'Validation failed', 
          details: err.errors 
        });
      }
      console.error('[Verify Payment Error]', err);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Dodo Payments Webhook
  app.post('/webhook', async (request, reply) => {
    try {
      const signature = request.headers['x-dodo-signature'] as string;
      const payload = JSON.stringify(request.body);

      // Verify webhook signature (optional but recommended)
      // You can implement signature verification here if Dodo provides it

      const event = request.body as any;

      if (event.event_type === 'payment.completed') {
        const payment = event.data;
        const metadata = payment.metadata || {};
        const { user_id, plan_id, credits, transaction_id } = metadata;

        if (!user_id || !transaction_id) {
          console.error('[Webhook Error] Missing metadata');
          return reply.send({ received: true });
        }

        // Check if already processed
        const { data: existingTransaction } = await supabase
          .from('transactions')
          .select('processed')
          .eq('id', transaction_id)
          .single();

        if (existingTransaction?.processed) {
          return reply.send({ received: true });
        }

        // Get current user credits
        const { data: user } = await supabase
          .from('users')
          .select('credits')
          .eq('id', user_id)
          .single();

        const newCredits = (user?.credits || 0) + (credits || planCredits[plan_id] || 0);

        // Update user credits
        await supabase
          .from('users')
          .update({ credits: newCredits })
          .eq('id', user_id);

        // Update transaction
        await supabase
          .from('transactions')
          .update({
            payment_intent_id: payment.id,
            processed: true,
            description: `Payment completed via webhook for ${plan_id} plan`,
          })
          .eq('id', transaction_id);

        console.log(`[Webhook] Credits added for user ${user_id}: ${credits}`);
      }

      return reply.send({ received: true });
    } catch (err) {
      console.error('[Webhook Error]', err);
      return reply.send({ received: true });
    }
  });

  // Deduct credits for scrape
  app.post('/deduct-credits', async (request: AuthenticatedRequest, reply) => {
    try {
      const { amount } = request.body as { amount: number };
      const userId = request.user?.id;

      const { data: user } = await supabase
        .from('users')
        .select('credits')
        .eq('id', userId)
        .single();

      if (!user || user.credits < amount) {
        return reply.status(403).send({ error: 'Insufficient credits' });
      }

      const newCredits = user.credits - amount;

      await supabase
        .from('users')
        .update({ credits: newCredits })
        .eq('id', userId);

      // Record transaction
      await supabase.from('transactions').insert({
        user_id: userId,
        type: 'usage',
        amount: -amount,
      });

      return reply.send({
        success: true,
        credits_remaining: newCredits,
      });
    } catch (err) {
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
}
