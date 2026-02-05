import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { supabase } from '../utils/supabase';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { generateCSVFromProducts } from '../utils/csv';
import { 
  validateShopifyStore, 
  scrapeShopifyProducts, 
  generateScrapeSummary,
  normalizeStoreUrl,
} from '../services/shopifyScraper';

// Validation schemas
const validateStoreSchema = z.object({
  url: z.string().min(1, 'URL is required'),
});

const startScrapeSchema = z.object({
  url: z.string().min(1, 'URL is required'),
});

export async function scrapeRoutes(app: FastifyInstance) {
  // Apply auth middleware to all routes
  app.addHook('preHandler', authMiddleware);

  /**
   * POST /validate-store
   * Validate if a URL is a valid Shopify store
   */
  app.post('/validate-store', async (request: AuthenticatedRequest, reply) => {
    try {
      const { url } = validateStoreSchema.parse(request.body);
      const validation = await validateShopifyStore(url);

      return reply.send(validation);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({ 
          error: 'Validation failed', 
          details: err.errors 
        });
      }
      console.error('[Validate Store Error]', err);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  /**
   * POST /start
   * Start a new scraping job
   */
  app.post('/start', async (request: AuthenticatedRequest, reply) => {
    try {
      const { url } = startScrapeSchema.parse(request.body);
      const userId = request.user?.id;

      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      // Normalize URL first
      const normalizedUrl = normalizeStoreUrl(url);

      // Check user credits
      const { data: userData } = await supabase
        .from('users')
        .select('credits')
        .eq('id', userId)
        .single();

      if (!userData || userData.credits < 5) {
        return reply.status(403).send({ 
          error: 'Insufficient credits',
          credits_needed: 5,
          credits_available: userData?.credits || 0,
        });
      }

      // Validate store before creating job
      const validation = await validateShopifyStore(normalizedUrl);
      if (!validation.isValid) {
        return reply.status(400).send({
          error: 'Invalid store',
          message: validation.message,
        });
      }

      // Create scrape job
      const { data: job, error } = await supabase
        .from('scrape_jobs')
        .insert({
          user_id: userId,
          store_url: validation.url,
          store_name: validation.storeName,
          status: 'pending',
        })
        .select()
        .single();

      if (error || !job) {
        console.error('[Create Job Error]', error);
        return reply.status(500).send({ error: 'Failed to create scrape job' });
      }

      // Start scraping in background
      processScrapeJob(job.id, validation.url, userId);

      return reply.send({
        success: true,
        jobId: job.id,
        status: 'pending',
        storeName: validation.storeName,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({ 
          error: 'Validation failed', 
          details: err.errors 
        });
      }
      console.error('[Start Scrape Error]', err);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  /**
   * GET /status/:jobId
   * Get the status of a scraping job
   */
  app.get('/status/:jobId', async (request: AuthenticatedRequest, reply) => {
    try {
      const { jobId } = request.params as { jobId: string };
      const userId = request.user?.id;

      const { data: job } = await supabase
        .from('scrape_jobs')
        .select('*')
        .eq('id', jobId)
        .eq('user_id', userId)
        .single();

      if (!job) {
        return reply.status(404).send({ error: 'Job not found' });
      }

      return reply.send({
        id: job.id,
        status: job.status,
        store_url: job.store_url,
        store_name: job.store_name,
        products_count: job.products_count,
        error_message: job.error_message,
        created_at: job.created_at,
        updated_at: job.updated_at,
      });
    } catch (err) {
      console.error('[Get Status Error]', err);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  /**
   * GET /history
   * Get user's scrape history
   */
  app.get('/history', async (request: AuthenticatedRequest, reply) => {
    try {
      const userId = request.user?.id;
      const limit = parseInt((request.query as any).limit) || 10;

      const { data: jobs, error } = await supabase
        .from('scrape_jobs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[Get History Error]', error);
        return reply.status(500).send({ error: 'Failed to fetch history' });
      }

      return reply.send({ jobs: jobs || [] });
    } catch (err) {
      console.error('[Get History Error]', err);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  /**
   * GET /preview/:jobId
   * Get a preview of scraped products (first 50)
   */
  app.get('/preview/:jobId', async (request: AuthenticatedRequest, reply) => {
    try {
      const { jobId } = request.params as { jobId: string };
      const userId = request.user?.id;

      // Verify job ownership
      const { data: job } = await supabase
        .from('scrape_jobs')
        .select('*')
        .eq('id', jobId)
        .eq('user_id', userId)
        .single();

      if (!job) {
        return reply.status(404).send({ error: 'Job not found' });
      }

      // Get scraped products
      const { data: scrapeData } = await supabase
        .from('scrape_data')
        .select('products')
        .eq('job_id', jobId)
        .single();

      const products = scrapeData?.products || [];

      // Return first 50 products for preview
      return reply.send({
        jobId,
        status: job.status,
        totalProducts: products.length,
        products: products.slice(0, 50),
      });
    } catch (err) {
      console.error('[Get Preview Error]', err);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  /**
   * GET /download/:jobId
   * Download scraped products as CSV
   */
  app.get('/download/:jobId', async (request: AuthenticatedRequest, reply) => {
    try {
      const { jobId } = request.params as { jobId: string };
      const userId = request.user?.id;

      // Verify job ownership
      const { data: job } = await supabase
        .from('scrape_jobs')
        .select('*')
        .eq('id', jobId)
        .eq('user_id', userId)
        .single();

      if (!job) {
        return reply.status(404).send({ error: 'Job not found' });
      }

      if (job.status !== 'completed') {
        return reply.status(400).send({ error: 'Scrape not completed yet' });
      }

      // Get scraped products
      const { data: scrapeData } = await supabase
        .from('scrape_data')
        .select('products')
        .eq('job_id', jobId)
        .single();

      const products = scrapeData?.products || [];

      if (products.length === 0) {
        return reply.status(404).send({ error: 'No products found' });
      }

      // Generate CSV
      const csv = generateCSVFromProducts(products);

      // Set headers for file download
      const filename = `${job.store_name || job.store_url.replace(/https?:\/\//, '').replace(/\//g, '_')}_products.csv`;
      reply.header('Content-Type', 'text/csv');
      reply.header('Content-Disposition', `attachment; filename="${filename}"`);
      
      return reply.send(csv);
    } catch (err) {
      console.error('[Download Error]', err);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  /**
   * GET /summary/:jobId
   * Get summary statistics for a scrape job
   */
  app.get('/summary/:jobId', async (request: AuthenticatedRequest, reply) => {
    try {
      const { jobId } = request.params as { jobId: string };
      const userId = request.user?.id;

      // Verify job ownership
      const { data: job } = await supabase
        .from('scrape_jobs')
        .select('*')
        .eq('id', jobId)
        .eq('user_id', userId)
        .single();

      if (!job) {
        return reply.status(404).send({ error: 'Job not found' });
      }

      // Get scraped products
      const { data: scrapeData } = await supabase
        .from('scrape_data')
        .select('products')
        .eq('job_id', jobId)
        .single();

      const products = scrapeData?.products || [];
      const summary = generateScrapeSummary(products);

      return reply.send({
        jobId,
        status: job.status,
        storeUrl: job.store_url,
        storeName: job.store_name,
        ...summary,
      });
    } catch (err) {
      console.error('[Get Summary Error]', err);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
}

/**
 * Background job processor
 * Uses the enhanced shopifyScraper service
 */
async function processScrapeJob(jobId: string, storeUrl: string, userId: string) {
  console.log(`[Job ${jobId}] Starting processing for ${storeUrl}`);

  try {
    // Update status to running
    await supabase
      .from('scrape_jobs')
      .update({ 
        status: 'running', 
        updated_at: new Date().toISOString() 
      })
      .eq('id', jobId);

    // Progress callback for real-time updates (optional enhancement)
    const onProgress = (page: number, totalProducts: number) => {
      console.log(`[Job ${jobId}] Page ${page}: ${totalProducts} products`);
    };

    // Scrape products using the enhanced service
    const result = await scrapeShopifyProducts(storeUrl, {
      delay: 1000, // 1 second between requests
      maxPages: 50,
      onProgress,
    });

    if (!result.success && result.totalCount === 0) {
      // Complete failure - no products scraped
      await supabase
        .from('scrape_jobs')
        .update({
          status: 'failed',
          error_message: result.error || 'Scraping failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId);
      
      console.error(`[Job ${jobId}] Failed: ${result.error}`);
      return;
    }

    // Deduct credits (only if we got products)
    const { error: creditError } = await supabase.rpc('deduct_credits', {
      user_id: userId,
      amount: 5,
    });

    if (creditError) {
      console.error(`[Job ${jobId}] Failed to deduct credits:`, creditError);
      // Continue anyway - user should still get their data
    }

    // Store products
    const { error: storeError } = await supabase
      .from('scrape_data')
      .insert({
        job_id: jobId,
        user_id: userId,
        products: result.products,
      });

    if (storeError) {
      console.error(`[Job ${jobId}] Failed to store products:`, storeError);
    }

    // Update job status to completed
    await supabase
      .from('scrape_jobs')
      .update({
        status: 'completed',
        products_count: result.totalCount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    console.log(`[Job ${jobId}] Completed: ${result.totalCount} products`);

    // If there was a partial error, log it but job is still marked completed
    if (result.error) {
      console.warn(`[Job ${jobId}] Partial success with warning: ${result.error}`);
    }

  } catch (error: any) {
    console.error(`[Job ${jobId}] Unexpected error:`, error);
    
    await supabase
      .from('scrape_jobs')
      .update({
        status: 'failed',
        error_message: error.message || 'Processing failed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);
  }
}
