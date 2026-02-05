import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { supabase } from '../utils/supabase';

const sendOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const verifyOtpSchema = z.object({
  email: z.string().email(),
  token: z.string().length(6, 'OTP must be 6 digits'),
});

export async function authRoutes(app: FastifyInstance) {
  // Send OTP to email
  app.post('/send-otp', async (request, reply) => {
    try {
      const { email } = sendOtpSchema.parse(request.body);

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
        },
      });

      if (error) {
        return reply.status(400).send({ error: error.message });
      }

      return reply.send({ 
        success: true, 
        message: 'OTP sent to your email' 
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({ 
          error: 'Validation failed', 
          details: err.errors 
        });
      }
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Verify OTP and get session
  app.post('/verify-otp', async (request, reply) => {
    try {
      const { email, token } = verifyOtpSchema.parse(request.body);

      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });

      if (error || !data.session) {
        return reply.status(400).send({ error: error?.message || 'Invalid OTP' });
      }

      // Check if user exists in our users table, if not create
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (!userData) {
        // Create user record with initial credits
        await supabase.from('users').insert({
          id: data.user.id,
          email: data.user.email,
          credits: 5, // Free credits on signup
        });
      }

      return reply.send({
        success: true,
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at,
        },
        user: {
          id: data.user.id,
          email: data.user.email,
        },
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({ 
          error: 'Validation failed', 
          details: err.errors 
        });
      }
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Refresh token
  app.post('/refresh', async (request, reply) => {
    try {
      const { refresh_token } = request.body as { refresh_token: string };

      const { data, error } = await supabase.auth.refreshSession({
        refresh_token,
      });

      if (error || !data.session) {
        return reply.status(401).send({ error: 'Invalid refresh token' });
      }

      return reply.send({
        success: true,
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at,
        },
      });
    } catch (err) {
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
}
