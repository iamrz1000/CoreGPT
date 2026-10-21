import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import http from 'http';
import { WebSocketServer } from 'ws';
import { authRouter } from './src/server/routes/authRoutes.ts';
import { chatRouter } from './src/server/routes/chatRoutes.ts';
import { imageRouter } from './src/server/routes/imageRoutes.ts';
import { voiceRouter } from './src/server/routes/voiceRoutes.ts';
import { adminRouter } from './src/server/routes/adminRoutes.ts';
import { usageRouter } from './src/server/routes/usageRoutes.ts';
import { videoRouter } from './src/server/routes/videoRoutes.ts';
import { setupLiveWebSocket } from './src/server/live.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const server = http.createServer(app);

// WebSocket server for gemini-3.8-live Live API
const wss = new WebSocketServer({ server, path: '/live' });
setupLiveWebSocket(wss);

// Security and parser middlewares
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(cookieParser());

// Server health and readiness check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'CoreGPT',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// Mount API routes
app.use('/api/auth', authRouter);
app.use('/api/video', videoRouter);
app.use('/api/images', imageRouter);
app.use('/api/voice', voiceRouter);
app.use('/api/admin', adminRouter);
app.use('/api/usage', usageRouter);
app.use('/api', chatRouter); // mounts /api/conversations and /api/chat/stream

// Global API error handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use('/api', (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[API Error]:', err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'An unexpected internal server error occurred.',
  });
});

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!process.env.GEMINI_API_KEY) {
    console.warn(
      '⚠️ [NextGen AI]: GEMINI_API_KEY is not defined in the environment. AI features will require the API key in Settings > Secrets.'
    );
  } else {
    console.log('✅ [NextGen AI]: Gemini AI API key successfully loaded.');
  }

  if (!isProduction) {
    // Development mode: Mount Vite middleware for fast HMR and client bundle delivery
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('⚡ [NextGen AI]: Vite dev middleware mounted.');
  } else {
    // Production mode: Serve built static files
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
    console.log('📦 [NextGen AI]: Serving production bundle from dist.');
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 [NextGen AI Assistant] Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server boot error:', err);
  process.exit(1);
});
