import { EventEmitter } from 'events';
import express from 'express';
import { generateRecipe } from './orchestrator/orchestrator';
import { DebugEvent } from './types/debug-events';

// In-memory storage for active debug sessions
const activeDebugSessions = new Map<string, EventEmitter>();

export function registerDebugRoutes(app: express.Application) {

  // Modified generate endpoint that supports debug mode
  app.post('/api/generate-recipe-debug', async (req, res) => {
    const brief = req.body;

    const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const debugEmitter = new EventEmitter();
    activeDebugSessions.set(requestId, debugEmitter);

    // Return requestId immediately for SSE connection
    res.json({ requestId, debugUrl: `/api/debug/stream/${requestId}` });

    // Run generation in background
    generateRecipe(brief, debugEmitter)
      .then(result => {
        // Recipe complete event already emitted by orchestrator
        // Cleanup after 30 seconds
        setTimeout(() => activeDebugSessions.delete(requestId), 30000);
      })
      .catch(error => {
        // Error event already emitted by orchestrator
        setTimeout(() => activeDebugSessions.delete(requestId), 30000);
      });
  });

  // SSE streaming endpoint
  app.get('/api/debug/stream/:requestId', (req, res) => {
    const { requestId } = req.params;
    const emitter = activeDebugSessions.get(requestId);

    if (!emitter) {
      return res.status(404).json({ error: 'Debug session not found' });
    }

    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    });

    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: 'connected', requestId })}\n\n`);

    // Forward all debug events to SSE
    const eventHandler = (event: DebugEvent) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);

      // Close connection on completion
      if (event.type === 'recipe:complete' || event.type === 'recipe:error') {
        setTimeout(() => {
          res.end();
        }, 100); // Small delay to ensure last event is sent
      }
    };

    emitter.on('debug', eventHandler);

    // Cleanup on client disconnect
    req.on('close', () => {
      emitter.off('debug', eventHandler);
      res.end();
    });

    // Keep-alive heartbeat every 30 seconds
    const heartbeat = setInterval(() => {
      res.write(': heartbeat\n\n');
    }, 30000);

    req.on('close', () => clearInterval(heartbeat));
  });
}
