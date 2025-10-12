// /Backend/api/conversation.js

import { CosmosClient } from '@azure/cosmos';
import { v4 as uuidv4 } from 'uuid';
import { StatusCodes } from 'http-status-codes';
import { callOpenAI, parseAIResponse } from '../lib/ai-service.js';
// Removed path and fs imports as we rely solely on environment variables
import admin from 'firebase-admin';

// --- Vercel/Serverless Firebase Admin Initialization (MUST be based on ENV) ---
let serviceAccount;

try {
  // Rely exclusively on the base64 encoded environment variable for both dev and prod
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_BASE64 environment variable is required.');
  }
  
  // Decode the service account JSON string
  const serviceAccountJson = Buffer.from(
    process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 
    'base64'
  ).toString('utf8');
  serviceAccount = JSON.parse(serviceAccountJson);

  // Initialize Firebase Admin if not already initialized
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('[Firebase] Admin initialized successfully.');
  }
} catch (error) {
  console.error('[Firebase] Initialization critical error:', error.message);
  // Re-throw a simple error, Vercel will catch this and show a 500
  throw new Error('Failed to initialize critical backend services.'); 
}
// --- END Firebase Init ---

/**
 * FIREBASE AUTH: Verifies the Firebase ID token from the request's Authorization header.
 * (Logic is retained, assuming external libraries like 'ai-service.js' are correctly resolved by Vercel)
 */
async function verifyFirebaseToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error('Error verifying Firebase token:', error);
    return null;
  }
}

// Initialize CosmosDB client (use environment variables)
const cosmosClient = new CosmosClient(process.env.COSMOSDB_CONNECTION_STRING);
const database = cosmosClient.database('libraapp');
const container = database.container('Conversations');

/**
 * Vercel Serverless Function for handling chat messages (POST) and loading (GET)
 */
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(StatusCodes.NO_CONTENT).end();
  }

  // Check supported methods
  if (req.method !== 'POST' && req.method !== 'GET' && req.method !== 'PUT') {
    return res.status(StatusCodes.METHOD_NOT_ALLOWED).json({
      error: 'Method not allowed',
      allowedMethods: ['GET', 'POST', 'PUT']
    });
  }
  
  // Vercel automatically parses JSON bodies into req.body (no need for custom parsing)
  const { userId, conversationId, message } = req.body || req.query;

  // Verify Firebase authentication
  const decodedToken = await verifyFirebaseToken(req);
  if (!decodedToken) {
    return res.status(StatusCodes.UNAUTHORIZED).json({ 
      error: 'Unauthorized: Invalid or missing token.' 
    });
  }
  
  // Authorization Check: Ensure the user ID from the body/query matches the authenticated user
  const clientUserId = userId || req.query.userId;
  if (decodedToken.uid !== clientUserId) {
    return res.status(StatusCodes.FORBIDDEN).json({ 
      error: 'Forbidden: Cannot access resources for another user.' 
    });
  }

  try {
    // --- GET REQUEST LOGIC (LOAD CONVERSATION HISTORY) ---
    if (req.method === 'GET') {
        const id = req.query.id || conversationId;
        
        if (!id || !clientUserId) {
            return res.status(StatusCodes.BAD_REQUEST).json({ 
                error: 'Conversation ID and User ID are required for GET request.',
            });
        }
        
        // Use the authenticated user ID as partition key
        const { resource: conversation } = await container.item(id, clientUserId).read();
        
        if (!conversation) {
            return res.status(StatusCodes.NOT_FOUND).json({ error: 'Conversation not found.' });
        }
        return res.status(StatusCodes.OK).json(conversation);
    }

    // --- POST REQUEST LOGIC (SEND MESSAGE) ---
    if (req.method === 'POST') {
        if (!message) {
          return res.status(StatusCodes.BAD_REQUEST).json({ 
            error: 'Message is required.'
          });
        }

        let convoId = conversationId;
        let conversation;
        let history = []; 

        // 1. Load/Create Conversation
        if (!convoId) {
            convoId = uuidv4();
            conversation = {
                id: convoId,
                userId: clientUserId,
                title: message.substring(0, 30),
                messages: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
        } else {
            const { resource: existingConvo } = await container.item(convoId, clientUserId).read();
            if (!existingConvo) {
                return res.status(StatusCodes.NOT_FOUND).json({ error: 'Conversation not found' });
            }
            conversation = existingConvo;
            history = existingConvo.messages;
        }

        // Add user message
        conversation.messages.push({
            id: uuidv4(),
            role: 'user',
            content: message,
            timestamp: new Date().toISOString()
        });

        // 2. AI Logic: Call the external service
        const aiResponseText = await callOpenAI(message, history); 
        const { cleanMessage, options, isDone } = parseAIResponse(aiResponseText);
        
        // Add assistant response
        conversation.messages.push({
            id: uuidv4(),
            role: 'assistant',
            content: cleanMessage,
            timestamp: new Date().toISOString(),
            options: options.length > 0 ? options : undefined // Store options for history
        });
        conversation.updatedAt = new Date().toISOString();

        // 3. Update Title (only on first message)
        if (history.length === 0) {
            const titlePrompt = `Summarize this chat into a 5-word title: User: "${message}"`;
            const titleResponseText = await callOpenAI(titlePrompt, []);
            conversation.title = parseAIResponse(titleResponseText).cleanMessage;
        }

        if (isDone) {
            conversation.isDone = true;
        }

        // 4. Save to Database
        await container.items.upsert(conversation);

        // 5. Send final response (MUST include options)
        return res.status(StatusCodes.OK).json({
            success: true,
            conversationId: convoId,
            response: cleanMessage,
            options: options, // Critical for the new UI feature
            isDone: isDone,
            messages: conversation.messages,
            timestamp: new Date().toISOString()
        });
    }

    if (req.method === 'PUT') {
      const { conversationId, messages, title } = req.body;

      if (!conversationId || !clientUserId || !messages) {
        return res.status(StatusCodes.BAD_REQUEST).json({ 
          error: 'conversationId, userId, and messages are required for an update.' 
        });
      }
      
      const { resource: existingConvo } = await container.item(conversationId, clientUserId).read();

      if (!existingConvo) {
        return res.status(StatusCodes.NOT_FOUND).json({ error: 'Conversation to update not found.' });
      }

      const updatedConversation = {
        ...existingConvo,
        messages: messages,
        title: title || existingConvo.title,
        updatedAt: new Date().toISOString()
      };

      await container.items.upsert(updatedConversation);

      return res.status(StatusCodes.OK).json({ success: true, message: 'Conversation saved.' });
    }

  } catch (error) {
    console.error('Chat function execution error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        error: error.message || 'An internal server error occurred.',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}