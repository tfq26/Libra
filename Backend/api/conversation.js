// New/Updated Backend/api/conversation.js (Supporting both GET and POST)

import { CosmosClient } from '@azure/cosmos';
import { v4 as uuidv4 } from 'uuid';
import { StatusCodes } from 'http-status-codes';

// Initialize CosmosDB client (use environment variables)
const cosmosClient = new CosmosClient(process.env.COSMOSDB_CONNECTION_STRING);
const database = cosmosClient.database('libraapp');
const container = database.container('Conversations');

/**
 * Vercel Serverless Function for handling chat messages (POST) and loading (GET)
 * Endpoint: /Backend/api/conversation
 */
export default async function handler(req, res) {
  // Set headers for Vercel CORS compatibility
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS'); // 🔑 FIX 1: Allow GET
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 🔑 FIX 2: Block methods other than GET and POST
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.setHeader('Allow', ['GET', 'POST', 'OPTIONS']);
    return res.status(StatusCodes.METHOD_NOT_ALLOWED).json({ 
      error: 'Method not allowed',
      allowedMethods: ['GET', 'POST', 'OPTIONS'],
      timestamp: new Date().toISOString()
    });
  }
  
  // NOTE: Authentication/JWT verification logic should be added here
  // const verifiedUserId = verifyClerkToken(req); 
  // if (!verifiedUserId) { return res.status(StatusCodes.UNAUTHORIZED).json(...) }
  // --- END AUTH CHECK ---

  try {
    // --- 🔑 GET REQUEST LOGIC (FOR loadConversation) ---
    if (req.method === 'GET') {
        const conversationId = req.query.id; 
        const userId = req.query.userId; // Assuming frontend passes userId for authorization/partition key

        if (!conversationId) {
            return res.status(StatusCodes.BAD_REQUEST).json({ 
                error: 'Conversation ID (id) is required for GET request.',
                timestamp: new Date().toISOString()
            });
        }
        // NOTE: The frontend loadConversation uses the URL /conversation?id=...
        // The userId is often implicitly derived from the Authorization token,
        // but since you pass it in the body for POST, we assume it's needed here too.
        if (!userId) {
            return res.status(StatusCodes.UNAUTHORIZED).json({ 
                error: 'User ID is required for GET authorization.',
                timestamp: new Date().toISOString()
            });
        }

        try {
            // Retrieve the conversation using ID and Partition Key (userId)
            const { resource: conversation } = await container.item(conversationId, userId).read();

            if (!conversation) {
                return res.status(StatusCodes.NOT_FOUND).json({ 
                    error: 'Conversation not found.',
                    timestamp: new Date().toISOString()
                });
            }

            return res.status(StatusCodes.OK).json(conversation);
        } catch (error) {
            // Catch specific DB errors (like Owner resource does not exist)
            console.error('Database read failed:', error);
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                error: 'Failed to retrieve conversation from database.',
                message: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    // --- 📦 POST REQUEST LOGIC (FOR sendChatMessage) ---
    if (req.method === 'POST') {
        const { userId, conversationId, message } = req.body; 
        
        // Input validation (now using simple checks)
        if (!userId || !message) {
          return res.status(StatusCodes.BAD_REQUEST).json({ 
            error: 'userId and message are required',
            received: { userId: Boolean(userId), message: Boolean(message) },
            timestamp: new Date().toISOString()
          });
        }

        let convoId = conversationId;
        let conversation;
        
        // --- Database Logic (Create or Update) ---
        try {
          if (!convoId) {
            // Logic to create new conversation... (UNCHANGED)
            convoId = uuidv4();
            const newConversation = {
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
            
            await container.items.create(newConversation);
            conversation = newConversation;
          } else {
            // Logic to update existing conversation... (UNCHANGED)
            const { resource: existingConvo } = await container.item(convoId, userId).read();
            if (!existingConvo) {
              return res.status(StatusCodes.NOT_FOUND).json({ 
                error: 'Conversation not found',
                timestamp: new Date().toISOString()
              });
            }
            
            existingConvo.messages = existingConvo.messages || [];
            existingConvo.messages.push({
              id: uuidv4(),
              role: 'user',
              content: message,
              timestamp: new Date().toISOString()
            });
            existingConvo.updatedAt = new Date().toISOString();
            await container.item(convoId, userId).replace(existingConvo);
            conversation = existingConvo;
          }

          // --- AI Logic ---
          const aiResponse = `You said: ${message}`; // Placeholder

          // Add AI response and update DB
          conversation.messages = conversation.messages || [];
          conversation.messages.push({
            id: uuidv4(),
            role: 'assistant',
            content: aiResponse,
            timestamp: new Date().toISOString()
          });
          conversation.updatedAt = new Date().toISOString();
          await container.item(convoId, userId).replace(conversation);

          // Send success response
          return res.status(StatusCodes.OK).json({
            success: true,
            conversationId: convoId,
            response: aiResponse, 
            messages: conversation.messages,
            timestamp: new Date().toISOString()
          });
          
        } catch (error) {
          // Inner Database error handling
          console.error('Database operation failed:', error);
          return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
              error: 'Failed to process chat message',
              message: error.message,
              timestamp: new Date().toISOString()
          });
        }
    }
    
  } catch (error) {
    // Outer error handling
    console.error('Chat function execution error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        error: 'An unexpected error occurred',
        message: error.message,
        timestamp: new Date().toISOString()
    });
  }
}