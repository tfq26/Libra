import { chat } from '../apps/Backend/init.js';

export default async function handler(req, res) {
  try {
    await chat(req, res);
  } catch (err) {
    console.error('[API Chat Wrapper] Error:', err);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: err.message || 'Internal Server Error' }));
  }
}
