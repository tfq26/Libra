// New/Updated Backend/api/chat.js (Mimicking your working history.js structure)

import { CosmosClient } from '@azure/cosmos';
import { v4 as uuidv4 } from 'uuid';
import { StatusCodes } from 'http-status-codes';

// Initialize CosmosDB client (use environment variables)
const cosmosClient = new CosmosClient(process.env.COSMOSDB_CONNECTION_STRING);
const database = cosmosClient.database('LibraChatDB');
const container = database.container('Conversations');

/**
 * Vercel Serverless Function for sending a chat message
 * POST /Backend/api/chat
 */
export default async function handler(req, res) {
  // Set headers for Vercel CORS compatibility
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST', 'OPTIONS']);
    return res.status(405).json({ 
      error: 'Method not allowed',
      allowedMethods: ['POST', 'OPTIONS'],
      timestamp: new Date().toISOString()
    });
  }

  try {
    // Vercel auto-parses the body for standard content types
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
    
    // --- Database Logic ---
    try {
      if (!convoId) {
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

      // 🎯 CRITICAL: Send a clean, complete JSON response
      return res.status(StatusCodes.OK).json({
        success: true,
        conversationId: convoId,
        response: aiResponse, // Renamed 'message' to 'response' for client compatibility
        messages: conversation.messages,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      // Database logic failed
      console.error('Database operation failed:', error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          error: 'Failed to process chat message',
          message: error.message,
          timestamp: new Date().toISOString()
      });
    }
    
  } catch (error) {
    // Outer handler failed (e.g., body parsing issue)
    console.error('Chat function execution error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        error: 'An unexpected error occurred',
        message: error.message,
        timestamp: new Date().toISOString()
    });
  }
}