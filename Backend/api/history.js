import { CosmosClient } from '@azure/cosmos';
import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  try {
    let serviceAccount;
    if (process.env.NODE_ENV === 'production') {
      if (!process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT_BASE64 is not set in production');
      }
      serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8'));
    } else {
      const serviceAccountPath = path.join(process.cwd(), 'Frontend', 'src', 'firebase', 'firebase-service-account.json');
      serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    }
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } catch (error) {
    console.error('[Firebase] Initialization error:', error.message);
    if (process.env.NODE_ENV === 'development') {
      console.error(error.stack);
    }
  }
}

// Initialize CosmosDB client
const cosmosClient = new CosmosClient(process.env.COSMOSDB_CONNECTION_STRING);
const database = cosmosClient.database('libraapp');
const container = database.container('Conversations');

/**
 * Verifies the Firebase ID token from the request's Authorization header.
 * @param {object} req - The incoming request object.
 * @returns {Promise<admin.auth.DecodedIdToken>} The decoded token.
 */
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

/**
 * Vercel Serverless Function for fetching chat history
 * GET /api/history?userId=<userId>
 */
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET method
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET', 'OPTIONS']);
    return res.status(405).json({ 
      error: 'Method not allowed',
      allowedMethods: ['GET', 'OPTIONS']
    });
  }

  try {
    // Verify Firebase token and get user info
    const decodedToken = await verifyFirebaseToken(req);
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Ensure the authenticated user can only access their own history
    if (decodedToken.uid !== userId) {
      console.warn(`[Security] User ${decodedToken.uid} attempted to access history of user ${userId}`);
      return res.status(403).json({ error: 'Unauthorized to access this resource' });
    }

    // Query CosmosDB for user's conversations
    const { resources: conversations } = await container.items
      .query({
        query: 'SELECT c.id, c.title, c.createdAt, c.updatedAt FROM c WHERE c.userId = @userId ORDER BY c.updatedAt DESC',
        parameters: [{ name: '@userId', value: userId }]
      })
      .fetchAll();

    return res.status(200).json(conversations);

  } catch (error) {
    console.error('[History] Error:', error.message);
    
    // Handle known error statuses
    if (error.status === 401 || error.status === 403) {
      return res.status(error.status).json({ error: error.message });
    }
    
    // Log full error in development
    if (process.env.NODE_ENV === 'development') {
      console.error(error.stack);
    }
    
    // Generic error response
    return res.status(500).json({ 
      error: 'An error occurred while fetching chat history',
      ...(process.env.NODE_ENV === 'development' && { details: error.message })
    });
  }
}
