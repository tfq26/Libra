import { history } from '../apps/Backend/init.js';

export default async function handler(req, res) {
  try {
    await history(req, res);
  } catch (err) {
    console.error('[API History Wrapper] Error:', err);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: err.message || 'Internal Server Error' }));
  }
}
