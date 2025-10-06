import { Router } from 'express';
import { StatusCodes } from 'http-status-codes';
import { CosmosClient } from '@azure/cosmos';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

const router = Router();

// Initialize CosmosDB client
const database = cosmosClient.database("LibraChatDB");
const container = database.container("Conversations");

// POST /api/chat - Send a chat message
router.post('/', async (req, res, next) => {
  try {
    const { userId, conversationId, message } = req.body;
    // Input validation
    if (!userId || !message) {
      return res.status(StatusCodes.BAD_REQUEST).json({ 
        error: 'userId and message are required',
        received: { userId: Boolean(userId), message: Boolean(message) },
        timestamp: new Date().toISOString()
      });
    }
    
    let convoId = conversationId;
    let conversation;
    
    try {
      // Create new conversation if none exists
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
        // Add message to existing conversation
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

      // Here you would typically call your AI service
      // const aiResponse = await callAIService(message);
      
      // For now, we'll just echo the message back
      const aiResponse = `You said: ${message}`;

      // Add AI response to conversation
      conversation.messages = conversation.messages || [];
      conversation.messages.push({
        id: uuidv4(),
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date().toISOString()
      });
      conversation.updatedAt = new Date().toISOString();
      await container.item(convoId, userId).replace(conversation);

      return res.status(StatusCodes.OK).json({
        success: true,
        conversationId: convoId,
        message: aiResponse,
        messages: conversation.messages,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Database operation failed:', error);
      throw new Error('Failed to process chat message');
    }
  } catch (error) {
    console.error('Chat error:', error);
    next(error);
  }
});

export default router;
