import { CosmosClient, StatusCodes } from '@azure/cosmos';
import admin from 'firebase-admin';

// --- Firebase Admin Initialization (Unified) ---
if (!admin.apps.length) {
  try {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_BASE64 environment variable is required.');
    }
    const serviceAccountJson = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8');
    const serviceAccount = JSON.parse(serviceAccountJson);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('[Firebase] Admin initialized successfully for history API.');
  } catch (error) {
    console.error('[Firebase] Initialization critical error:', error.message);
    throw new Error('Failed to initialize critical backend services.');
  }
}

// --- CosmosDB Client Initialization ---
const cosmosClient = new CosmosClient(process.env.COSMOSDB_CONNECTION_STRING);
const database = cosmosClient.database('libraapp');
const container = database.container('Conversations');

// --- Firebase Token Verification ---
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

// --- Main API Handler ---
export default async function handler(req, res) {
  // Set CORS and Security Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET' && req.method !== 'PUT' && req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // --- Security Checks (Applied to ALL methods) ---
    const decodedToken = await verifyFirebaseToken(req);
    const clientUserId = req.method === 'GET' ? req.query.userId : req.body.userId;

    if (!clientUserId) {
        return res.status(400).json({ error: 'User ID is required' });
    }

    if (decodedToken.uid !== clientUserId) {
      console.warn(`[Security] User ${decodedToken.uid} attempted to access resources of user ${clientUserId}`);
      return res.status(403).json({ error: 'Unauthorized to access this resource' });
    }

    // --- GET Method: Fetch History List ---
    if (req.method === 'GET') {
      const { resources: conversations } = await container.items
        .query({
          query: 'SELECT c.id, c.title, c.createdAt, c.updatedAt FROM c WHERE c.userId = @userId ORDER BY c.updatedAt DESC',
          parameters: [{ name: '@userId', value: clientUserId }]
        })
        .fetchAll();
      return res.status(200).json(conversations);
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
