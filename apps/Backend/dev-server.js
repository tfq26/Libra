import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { chat, history } from './init.js';
import initConversationHandler from './api/init-conversation.js';
import warmHandler from './api/warm.js';

const app = express();
const PORT = process.env.BACKEND_PORT || process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));

// Mount handlers (they already accept (req, res))
// Support both /api/conversation and /conversation (frontend expects /conversation)
app.all(['/api/conversation', '/conversation'], async (req, res) => {
  try {
    await chat(req, res);
  } catch (err) {
    console.error('[Dev Server] /api/conversation error', err);
    res.status(500).json({ error: err.message });
  }
});

app.all(['/api/history', '/history'], async (req, res) => {
  try {
    await history(req, res);
  } catch (err) {
    console.error('[Dev Server] /api/history error', err);
    res.status(500).json({ error: err.message });
  }
});

// Mount warm endpoints
app.all(['/api/warm', '/warm'], async (req, res) => {
  try {
    await warmHandler(req, res);
  } catch (err) {
    console.error('[Dev Server] /api/warm error', err);
    res.status(500).json({ error: err.message });
  }
});

// Mount init-conversation endpoints
app.all(['/api/init-conversation', '/init-conversation'], async (req, res) => {
  try {
    await initConversationHandler(req, res);
  } catch (err) {
    console.error('[Dev Server] /api/init-conversation error', err);
    res.status(500).json({ error: err.message });
  }
});

const server = app.listen(PORT, () => {
  console.log(`[Dev Server] Backend dev server listening on http://localhost:${PORT}`);
});

server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(`[Dev Server] Port ${PORT} already in use. If you have another backend running, stop it or set BACKEND_PORT to a different port.`);
    process.exit(1);
  }
  console.error('[Dev Server] Unexpected server error:', err);
  process.exit(1);
});

