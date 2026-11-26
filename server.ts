// Express entry point serving the Vite/static SPA and the /api/chat endpoint.
import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { answer } from './server/pipeline.ts';
import { buildFriendlyGuidanceResponse } from './server/safety.ts';
import type { ChatLanguage } from './src/chat/types.ts';
import { KNOWLEDGE_BASE } from './src/knowledgeBase.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 3000);

async function startServer() {
  const app = express();

  app.use(express.json());

  app.get('/api/kb-count', (_req, res) => {
    res.json({ count: KNOWLEDGE_BASE.length });
  });

  app.post('/api/chat', async (req, res) => {
    const body = req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : {};
    const lang: ChatLanguage = body.lang === 'hi' ? 'hi' : 'en';
    const message = typeof body.message === 'string' ? body.message : '';
    const previousQuestion =
      typeof body.previousQuestion === 'string' ? body.previousQuestion : undefined;

    try {
      const reply = await answer(message, lang, previousQuestion);
      res.status(200).json(reply);
    } catch {
      res.status(200).json(buildFriendlyGuidanceResponse(lang));
    }
  });

  app.use(
    (
      err: unknown,
      req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      if (err && req.path === '/api/chat') {
        res.status(200).json(buildFriendlyGuidanceResponse('en'));
        return;
      }
      next(err);
    },
  );

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distPath, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build not found. Run npm run build first.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ConsumerSaathi server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
