import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { apiRouter } from './src/server/routes';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  // AI Studio sandbox requires port 3000. Standalone Google Cloud Run uses K_SERVICE and PORT (default 8080).
  const isCloudRun = process.env.K_SERVICE !== undefined || process.env.CLOUD_RUN_STANDALONE === 'true';
  const PORT = isCloudRun ? parseInt(process.env.PORT || '8080', 10) : 3000;
  const isProduction = process.env.NODE_ENV === 'production';

  // Request parsing with generous limits for base64/file payloads
  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: true, limit: '20mb' }));

  // Security & CORS headers (Zero-cost Cloud Run / Local WebView compatibility)
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  // Mount Cloud Run Backend API Router
  app.use('/api', apiRouter);

  // Serve static/dev frontend
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Sami Server] Cloud Run / Full-Stack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Sami Server] Fatal error starting server:', err);
  process.exit(1);
});
