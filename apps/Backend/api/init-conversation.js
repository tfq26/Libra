import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { CosmosClient } from '@azure/cosmos';
import { v4 as uuidv4 } from 'uuid';
import admin from 'firebase-admin';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.backend.env') });

// Initialize Firebase Admin if not initialized
if (!admin.apps.length) {
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
      const serviceAccountJson = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8');
      const serviceAccount = JSON.parse(serviceAccountJson);
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
      console.log('[Init Conversation API] ✅ Firebase Admin initialized');
    } else {
      console.warn('[Init Conversation API] FIREBASE_SERVICE_ACCOUNT_BASE64 not set; requests that require auth will fail');
    }
  } catch (e) {
    console.error('[Init Conversation API] Firebase init error:', e.message);
  }
}

const cosmosClient = new CosmosClient(process.env.COSMOSDB_CONNECTION_STRING || '');
const database = cosmosClient.database('libraapp');
const container = database.container('Conversations');

async function verifyFirebaseToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    return decoded;
  } catch (err) {
    console.error('[InitConv] Token verify error:', err.message);
    return null;
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const decoded = await verifyFirebaseToken(req);
    if (!decoded) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = decoded.uid;
    const convoId = uuidv4();
    const now = new Date().toISOString();

    const conversation = {
      id: convoId,
      userId,
      title: 'New Chat',
      messages: [],
      createdAt: now,
      updatedAt: now,
      isDraft: true
    };

    await container.items.upsert(conversation);

    return res.status(200).json({ success: true, conversationId: convoId });
  } catch (err) {
    console.error('[Init Conversation] Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
