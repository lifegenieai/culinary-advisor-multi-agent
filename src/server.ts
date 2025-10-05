import express from 'express';
import { generateRecipe } from './orchestrator/orchestrator';
import { CreativeBrief, AppError, ValidationError } from './types';
import { CreativeBriefSchema } from './types/validation';
import { registerDebugRoutes } from './server-debug';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));
app.use('/test-briefs', express.static('test-briefs'));

// Register debug routes (for development observability)
registerDebugRoutes(app);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Main recipe generation endpoint
app.post('/api/generate-recipe', async (req, res) => {
  // Set timeout to 5 minutes (300000ms)
  const TIMEOUT_MS = 300000;

  const timeoutId = setTimeout(() => {
    if (!res.headersSent) {
      res.status(504).json({
        error: 'Recipe generation timed out. Try a simpler request or try again later.',
        timeout: TIMEOUT_MS,
      });
    }
  }, TIMEOUT_MS);

  try {
    // Validate creative brief with Zod
    const parseResult = CreativeBriefSchema.safeParse(req.body);

    if (!parseResult.success) {
      // Use Zod's .flatten() for better error formatting
      const flattened = parseResult.error.flatten();

      throw new ValidationError(
        'Invalid creative brief',
        {
          formErrors: flattened.formErrors,
          fieldErrors: flattened.fieldErrors
        }
      );
    }

    const brief = parseResult.data;

    console.log(`\n📨 Received request: "${brief.title}"`);

    // Generate recipe
    const result = await generateRecipe(brief);

    // Clear timeout on success
    clearTimeout(timeoutId);

    // Return result
    res.json(result);

  } catch (error: unknown) {
    // Clear timeout on error
    clearTimeout(timeoutId);

    console.error('Recipe generation error:', error);

    // Determine status code
    const statusCode = error instanceof AppError && error.httpCode
      ? error.httpCode
      : 500;

    // Return error with execution log if available
    res.status(statusCode).json({
      error: error instanceof Error ? error.message : 'Unknown error',
      ...(error instanceof AppError && {
        isOperational: error.isOperational,
        context: error.context,
        timestamp: error.timestamp,
      }),
      executionLog: (error as any).executionLog || null,
    });
  }
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`\n🚀 Recipe Orchestrator POC`);
  console.log(`📡 Server running at http://localhost:${PORT}`);
  console.log(`🧪 Test UI: http://localhost:${PORT}`);
  console.log(`📋 API endpoint: POST http://localhost:${PORT}/api/generate-recipe\n`);
});

// ============= PROCESS-LEVEL ERROR HANDLERS =============

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  console.error('\n💥 UNCAUGHT EXCEPTION - Shutting down gracefully...');
  console.error('Error name:', error.name);
  console.error('Error message:', error.message);
  console.error('Stack trace:', error.stack);

  // Log to monitoring service (add when available)
  // errorMonitor.logCritical(error);

  // Exit process - let process manager (PM2, Docker, etc.) restart
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: unknown, promise: Promise<any>) => {
  console.error('\n💥 UNHANDLED PROMISE REJECTION');
  console.error('Reason:', reason);
  console.error('Promise:', promise);

  // Throw to let uncaughtException handler deal with it
  throw reason;
});

// Optional: Handle graceful shutdown on SIGTERM (Docker, Kubernetes)
process.on('SIGTERM', () => {
  console.log('\n📴 SIGTERM signal received - Closing HTTP server');
  server.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });
});
