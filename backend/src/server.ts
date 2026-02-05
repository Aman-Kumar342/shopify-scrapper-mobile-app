import 'dotenv/config';
import fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { authRoutes } from './routes/auth';
import { scrapeRoutes } from './routes/scrape';
import { paymentRoutes } from './routes/payment';

const app = fastify({
  logger: true,
});

// Register plugins
app.register(cors, {
  origin: '*',
  credentials: true,
});

app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
});

// Health check
app.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Register routes
app.register(authRoutes, { prefix: '/auth' });
app.register(scrapeRoutes, { prefix: '/scrape' });
app.register(paymentRoutes, { prefix: '/payment' });

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3000');
    await app.listen({ port, host: '0.0.0.0' });
    console.log(`Server running on port ${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
