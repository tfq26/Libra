import { warmUp } from '../init.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    const pingAI = req.method === 'POST' && req.body && req.body.pingAI === true;
    const result = await warmUp({ pingAI });
    if (result.success) {
      return res.status(200).json({ warmed: true });
    }
    return res.status(500).json({ warmed: false, error: result.error });
  } catch (err) {
    console.error('[Warm API] Error:', err);
    return res.status(500).json({ warmed: false, error: err.message });
  }
}
