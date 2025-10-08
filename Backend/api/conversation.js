// /Backend/api/conversation.js

import { CosmosClient } from '@azure/cosmos';
import { v4 as uuidv4 } from 'uuid';
import { StatusCodes } from 'http-status-codes';
import { callOpenAI, parseAIResponse } from '../lib/ai-service.js';

// FIREBASE AUTH: Import Firebase Admin SDK
import admin from 'firebase-admin';

// FIREBASE AUTH: Initialize Firebase Admin
// This requires a FIREBASE_SERVICE_ACCOUNT_JSON environment variable.
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

/**
 * FIREBASE AUTH: Verifies the Firebase ID token from the request's Authorization header.
 * @param {object} req - The incoming request object.
 * @returns {Promise<admin.auth.DecodedIdToken|null>} The decoded token or null if invalid.
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
 * Endpoint: /Backend/api/conversation
 */
export default async function handler(req, res) {
  // Set headers and handle OPTIONS (CORS) and METHOD NOT ALLOWED (405) checks
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.setHeader('Allow', ['GET', 'POST', 'OPTIONS']);
    return res.status(StatusCodes.METHOD_NOT_ALLOWED).json({ 
      error: 'Method not allowed',
      allowedMethods: ['GET', 'POST', 'OPTIONS'],
      timestamp: new Date().toISOString()
    });
  }
  
  // FIREBASE AUTH: Verify the token before proceeding.
  const decodedToken = await verifyFirebaseToken(req);
  if (!decodedToken) {
    return res.status(StatusCodes.UNAUTHORIZED).json({ error: 'Unauthorized: Invalid or missing token.' });
  }

  try {
    // --- GET REQUEST LOGIC (FOR loadConversation) ---
    if (req.method === 'GET') {
        const conversationId = req.query.id; 
        const userId = req.query.userId; 

        // FIREBASE AUTH: Ensure the authenticated user matches the requested user ID.
        if (decodedToken.uid !== userId) {
          return res.status(StatusCodes.FORBIDDEN).json({ error: 'Forbidden: You can only access your own conversations.' });
        }

        if (!conversationId || !userId) {
            return res.status(StatusCodes.BAD_REQUEST).json({ 
                error: 'Conversation ID and User ID are required.',
                timestamp: new Date().toISOString()
            });
        }
        try {
            const { resource: conversation } = await container.item(conversationId, userId).read();
            if (!conversation) {
                return res.status(StatusCodes.NOT_FOUND).json({ error: 'Conversation not found.' });
            }
            return res.status(StatusCodes.OK).json(conversation);
        } catch (error) {
            console.error('Database read failed:', error);
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                error: 'Failed to retrieve conversation from database.',
                message: error.message
            });
        }
    }

    // --- POST REQUEST LOGIC (FOR sendChatMessage) ---
    if (req.method === 'POST') {
        const { userId, conversationId, message } = req.body; 
        
        // FIREBASE AUTH: Ensure the authenticated user matches the user ID in the body.
        if (decodedToken.uid !== userId) {
          return res.status(StatusCodes.FORBIDDEN).json({ error: 'Forbidden: You can only act on your own behalf.' });
        }

        if (!userId || !message) {
          return res.status(StatusCodes.BAD_REQUEST).json({ 
            error: 'userId and message are required',
            received: { userId: Boolean(userId), message: Boolean(message) },
            timestamp: new Date().toISOString()
          });
        }

        let convoId = conversationId;
        let conversation;
        let history = []; 

        // --- Database Logic (Create or Update) ---
        try {
          if (!convoId) {
            convoId = uuidv4();
            conversation = {
              id: convoId,
              userId,
              title: message.substring(0, 30),
              messages: [{
                id: uuidv4(),
                role: 'user',
                content: message,
                timestamp: new Date().toISOString()
              }],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
          } else {
            const { resource: existingConvo } = await container.item(convoId, userId).read();
            if (!existingConvo) {
              return res.status(StatusCodes.NOT_FOUND).json({ error: 'Conversation not found' });
            }
            conversation = existingConvo;
            history = existingConvo.messages; 
            conversation.messages.push({
              id: uuidv4(),
              role: 'user',
              content: message,
              timestamp: new Date().toISOString()
            });
          }

          // --- AI Logic: Call the external service ---
          const aiResponseText = await callOpenAI(message, history); 
          const { cleanMessage, options, isDone } = parseAIResponse(aiResponseText);
          
          conversation.messages.push({
            id: uuidv4(),
            role: 'assistant',
            content: cleanMessage,
            timestamp: new Date().toISOString()
          });
          conversation.updatedAt = new Date().toISOString();

          if (history.length === 0) {
              const titlePrompt = `Summarize this chat into a 5-word title: User: "${message}"`;
              const titleResponseText = await callOpenAI(titlePrompt, []);
              conversation.title = parseAIResponse(titleResponseText).cleanMessage;
          }

          if (isDone) {
              conversation.isDone = true;
          }

          await container.items.upsert(conversation);

          return res.status(StatusCodes.OK).json({
            success: true,
            conversationId: convoId,
            response: cleanMessage,
            options: options,
            isDone: isDone,
            messages: conversation.messages,
            timestamp: new Date().toISOString()
          });
          
        } catch (error) {
          console.error('Database/AI Operation Failed:', error);
          return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
              error: error.message || 'Failed to process chat message',
              message: error.message,
              timestamp: new Date().toISOString()
          });
        }
    }
    
  } catch (error) {
    console.error('Chat function execution error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        error: 'An unexpected error occurred',
        message: error.message,
        timestamp: new Date().toISOString()
    });
  }
}