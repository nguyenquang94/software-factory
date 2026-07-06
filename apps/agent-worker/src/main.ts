import { startWorker } from './queue/consumer.js';
import { validateConfig } from './config.js';

console.log('[Main] Starting Agent Worker...');

try {
  validateConfig();
} catch (error) {
  const errMsg = error instanceof Error ? error.message : String(error);
  console.error(`[Main] Configuration error: ${errMsg}`);
  process.exit(1);
}

let workerInstance: ReturnType<typeof startWorker> | null = null;

try {
  workerInstance = startWorker();
  console.log('[Main] Agent Worker started successfully.');
} catch (error) {
  const errMsg = error instanceof Error ? error.message : String(error);
  console.error(`[Main] Failed to start Agent Worker: ${errMsg}`);
  process.exit(1);
}

async function shutdown(signal: string) {
  console.log(`[Main] Received ${signal}. Starting graceful shutdown...`);
  
  if (workerInstance) {
    const { worker, connection } = workerInstance;
    try {
      // close() waits for active jobs to complete
      console.log('[Main] Closing BullMQ Worker (waiting for active jobs)...');
      await worker.close();
      console.log('[Main] BullMQ Worker closed.');

      console.log('[Main] Closing Redis connection...');
      await connection.quit();
      console.log('[Main] Redis connection closed.');
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error(`[Main] Error during graceful shutdown: ${errMsg}`);
      process.exit(1);
    }
  }
  
  console.log('[Main] Graceful shutdown completed.');
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  console.error('[Main] Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('[Main] Uncaught Exception:', error);
  shutdown('UNCAUGHT_EXCEPTION');
});
