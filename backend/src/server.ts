import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';

import { env } from './config/env.config';
import routes from './routes';
import { initQueue, emailQueue, queueService } from './services/queue.service';
import { emailWorkerService } from './services/email.worker';
import { initSmtpTransporter } from './config/smtp.config';
import { initElasticsearch } from './config/elasticsearch.config';
import { initRedis, closeRedis } from './config/redis.config';
import { errorHandler } from './middlewares/error.middleware';
import { prisma } from './prisma/client';

const app = express();

// Middlewares
app.use(
  cors({
    origin: [env.CLIENT_URL, 'http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Server Startup
async function startServer() {
  try {
    console.log('------------------------------------------------------------');
    console.log('🚀 ReachInbox Full-Stack Email Job Scheduler is Booting Up...');
    console.log('------------------------------------------------------------');

    // 1. Initialize Redis Engine (Real Redis Server on port 6379)
    await initRedis();

    // 2. Initialize BullMQ Queue
    const queue = initQueue();

    // 3. Mount Bull-Board Live Queue Monitor
    const serverAdapter = new ExpressAdapter();
    serverAdapter.setBasePath('/admin/queues');
    createBullBoard({
      queues: [new BullMQAdapter(queue)],
      serverAdapter,
    });
    app.use('/admin/queues', serverAdapter.getRouter());

    // 4. Mount Master API Routes
    app.use('/api', routes);

    // 5. Serve Frontend Static Assets if Built (Production Deployment Support)
    const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');
    if (fs.existsSync(frontendDistPath)) {
      app.use(express.static(frontendDistPath));
      app.get('*', (req: express.Request, res: express.Response, next: express.NextFunction) => {
        if (req.path.startsWith('/api') || req.path.startsWith('/admin')) {
          return next();
        }
        res.sendFile(path.join(frontendDistPath, 'index.html'));
      });
      console.log(`[Static] Serving frontend production build from ${frontendDistPath}`);
    }

    // 6. Global Error Handler
    app.use(errorHandler);

    // 7. Initialize SMTP Transporter
    await initSmtpTransporter();

    // 8. Initialize Elasticsearch Indexing
    await initElasticsearch();

    // 9. Start BullMQ Email Worker
    emailWorkerService.initWorker();

    // 10. Recover Any Pending / Scheduled Jobs from Previous Run (Crash Resilience)
    await queueService.recoverPendingJobsOnBoot();

    // 11. Start HTTP Server
    const server = app.listen(env.PORT, () => {
      console.log('============================================================');
      console.log(`✅ Backend API Server running at:     http://localhost:${env.PORT}`);
      console.log(`📊 Bull-Board Live Queue Monitor:    http://localhost:${env.PORT}/admin/queues`);
      console.log(`🌐 Client Origin URL:                ${env.CLIENT_URL}`);
      console.log(`⚙️ Worker Concurrency:                ${env.WORKER_CONCURRENCY}`);
      console.log(`⏱️ Inter-Email Delay:                ${env.EMAIL_SEND_DELAY_MS}ms`);
      console.log(`⚡ Sender Hourly Rate Limit:         ${env.MAX_EMAILS_PER_HOUR_PER_SENDER}/hr`);
      console.log('============================================================');
    });

    // Graceful Shutdown
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n[Shutdown] Received ${signal}. Gracefully stopping workers and connections...`);
      server.close();
      await emailWorkerService.close();
      if (emailQueue) await emailQueue.close();
      await closeRedis();
      await prisma.$disconnect();
      console.log('[Shutdown] All background services terminated cleanly. Exiting.');
      process.exit(0);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
