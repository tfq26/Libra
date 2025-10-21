import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { CosmosClient } from '@azure/cosmos';
import admin from 'firebase-admin';

// Load environment variables from .backend.env
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.backend.env') });
console.log('[History API] ✅ Environment variables loaded');

// --- Vercel/Serverless Firebase Admin Initialization (Unified) ---
if (!admin.apps.length) {
  try {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_BASE64 environment variable is required.');
    }
    
    const serviceAccountJson = Buffer.from(
      process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 
      'base64'
    ).toString('utf8');
    const serviceAccount = JSON.parse(serviceAccountJson);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('[History API] ✅ Firebase Admin initialized successfully');

  } catch (error) {
    console.error('[Firebase] Initialization critical error:', error.message);
    throw new Error('Failed to initialize critical backend services.'); 
  }
}

// Initialize CosmosDB client
const cosmosClient = new CosmosClient(process.env.COSMOSDB_CONNECTION_STRING);
const database = cosmosClient.database('libraapp');
const container = database.container('Conversations');
console.log('[History API] ✅ CosmosDB client initialized');

async function verifyFirebaseToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const error = new Error('No token provided');
    error.status = 401;
    throw error;
  }

  const idToken = authHeader.split('Bearer ')[1];
  try {
    return await admin.auth().verifyIdToken(idToken);
  } catch (error) {
    console.error('[Auth] Token verification failed:', error.message);
    const authError = new Error('Invalid or expired token');
    authError.status = 401;
    throw authError;
  }
}

export default async function handler(req, res) {
  // --- (CORS and Method checks remain the same, but now allow PUT/DELETE) ---
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const decodedToken = await verifyFirebaseToken(req);
    const clientUserId = req.body.userId || req.query.userId;

    if (!clientUserId) {
        return res.status(400).json({ error: 'User ID is required' });
    }
    if (decodedToken.uid !== clientUserId) {
        return res.status(403).json({ error: 'Unauthorized to access this resource' });
    }

    // --- GET (Fetch History) ---
    if (req.method === 'GET') {
      const page = parseInt(req.query.page || '1', 10);
      const pageSize = parseInt(req.query.pageSize || '10', 10);
      const offset = (page - 1) * pageSize;

      // Query for the total count of items first
      const countQuerySpec = {
        query: 'SELECT VALUE COUNT(1) FROM c WHERE c.userId = @userId',
        parameters: [{ name: '@userId', value: clientUserId }]
      };
      const { resources: [total] } = await container.items.query(countQuerySpec).fetchAll();

      // Query for the paginated list of conversations
      const querySpec = {
        query: 'SELECT c.id, c.title, c.createdAt, c.updatedAt FROM c WHERE c.userId = @userId ORDER BY c.updatedAt DESC OFFSET @offset LIMIT @limit',
        parameters: [
          { name: '@userId', value: clientUserId },
          { name: '@offset', value: offset },
          { name: '@limit', value: pageSize }
        ]
      };
      const { resources: conversations } = await container.items.query(querySpec).fetchAll();
      
      return res.status(200).json({ conversations, total });
    }

    // --- PUT Method: Update a Conversation (Moved from conversation.js) ---
    if (req.method === 'PUT') {
      const { conversationId, messages, title } = req.body;
      if (!conversationId || !messages) {
        return res.status(400).json({ error: 'conversationId and messages are required for an update.' });
      }
      
      const { resource: existingConvo } = await container.item(conversationId, clientUserId).read();
      if (!existingConvo) {
        return res.status(404).json({ error: 'Conversation to update not found.' });
      }

      const updatedConversation = {
        ...existingConvo,
        messages: messages,
        title: title || existingConvo.title,
        updatedAt: new Date().toISOString()
      };
      await container.items.upsert(updatedConversation);
      return res.status(200).json({ success: true, message: 'Conversation saved.' });
    }

    // --- DELETE Method: Delete a Conversation ---
    if (req.method === 'DELETE') {
        const { conversationId } = req.body;
        if (!conversationId) {
            return res.status(400).json({ error: 'conversationId is required for a delete.' });
        }

        // Verify ownership before deleting
        const { resource: existingConvo } = await container.item(conversationId, clientUserId).read();
        if (!existingConvo) {
            return res.status(404).json({ error: 'Conversation to delete not found or you do not have permission.' });
        }

        await container.item(conversationId, clientUserId).delete();
        return res.status(200).json({ success: true, message: 'Conversation deleted.' });
    }

  } catch (error) {
    console.error('[History API Error]:', error.message);
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    return res.status(500).json({ error: 'An internal server error occurred.' });
  }
}
