import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createGeminiClient, processChatMessage } from './server/chatHandler.ts';
import { KNOWLEDGE_BASE } from './src/knowledgeBase.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 3000);

async function startServer() {
  const app = express();

  app.use(express.json());

  // Initialize server-only @google/genai client when GEMINI_API_KEY is present in env.
  const geminiClient = createGeminiClient(process.env.GEMINI_API_KEY);
  app.locals.geminiClient = geminiClient;

  app.get('/api/kb-count', (_req, res) => {
    res.json({ count: KNOWLEDGE_BASE.length });
  });

  app.post('/api/chat', async (req, res) => {
    const result = await processChatMessage(req.body, KNOWLEDGE_BASE, geminiClient);
    res.status(result.status).json(result.body);
  });

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
