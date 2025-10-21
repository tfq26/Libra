// /Backend/api/conversation.js

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { CosmosClient } from '@azure/cosmos';
import { v4 as uuidv4 } from 'uuid';
import { StatusCodes } from 'http-status-codes';
import { callOpenAIStream, parseAIResponse } from '../lib/ai-service.js'; // --- MODIFIED: Import the new streaming function ---
import admin from 'firebase-admin';
import { Ratelimit } from "@upstash/ratelimit"; // --- NEW: Import Upstash Rate Limiter ---
import { Redis } from "@upstash/redis"; // --- NEW: Import Upstash Redis ---

// Load environment variables from .backend.env
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.backend.env') });
console.log('[Conversation API] ✅ Environment variables loaded');

// --- Vercel/Serverless Firebase Admin Initialization ---
// (No changes here, this is correct)
let serviceAccount;
try {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_BASE64 environment variable is required.');
  }
  const serviceAccountJson = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8');
  serviceAccount = JSON.parse(serviceAccountJson);
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('[Conversation API] ✅ Firebase Admin initialized successfully');
  }
} catch (error) {
  console.error('[Firebase] Initialization critical error:', error.message);
  throw new Error('Failed to initialize critical backend services.'); 
}

// --- NEW: Initialize Upstash Rate Limiter ---
// Creates a Redis client from environment variables UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
// This allows 15 requests per minute from a single user.
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(15, "60 s"),
  analytics: true,
});

// Redis client for caching conversations (same env vars used by Upstash)
const redisClient = Redis.fromEnv();
const CONVERSATION_CACHE_TTL = parseInt(process.env.CONVERSATION_CACHE_TTL_SECONDS || '300', 10);

/**
 * FIREBASE AUTH: Verifies the Firebase ID token from the request's Authorization header.
 * (No changes here)
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

// Initialize CosmosDB client
const cosmosClient = new CosmosClient(process.env.COSMOSDB_CONNECTION_STRING);
const database = cosmosClient.database('libraapp');
const conversationsContainer = database.container('Conversations');
const profilesContainer = database.container('Profiles'); // --- NEW: Container for user profiles ---
console.log('[Conversation API] ✅ CosmosDB client initialized');

/**
 * Vercel Serverless Function for handling chat messages.
 */
export default async function handler(req, res) {
  // CORS and OPTIONS handling (no changes)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.status(StatusCodes.NO_CONTENT).end();
  }

  // --- Verify Firebase Auth FIRST ---
  const decodedToken = await verifyFirebaseToken(req);
  if (!decodedToken) {
    return res.status(StatusCodes.UNAUTHORIZED).json({ 
      error: 'Unauthorized: Invalid or missing token.' 
    });
  }
  const clientUserId = decodedToken.uid;

  // --- NEW: Apply Rate Limiting ---
  const { success } = await ratelimit.limit(clientUserId);
  if (!success) {
    return res.status(StatusCodes.TOO_MANY_REQUESTS).json({ 
      error: 'Too many requests. Please wait a minute before trying again.'
    });
  }

  // Check supported methods
  if (req.method !== 'POST' && req.method !== 'GET' && req.method !== 'PUT') {
    return res.status(StatusCodes.METHOD_NOT_ALLOWED).json({
      error: 'Method not allowed', allowedMethods: ['GET', 'POST', 'PUT']
    });
  }

  try {
    // --- GET REQUEST LOGIC (LOAD CONVERSATION HISTORY) ---
    // (No major changes needed here)
  if (req.method === 'GET') {
    const id = req.query.id;
    if (!id) {
      return res.status(StatusCodes.BAD_REQUEST).json({ 
        error: 'Conversation ID is required for GET request.',
      });
    }

    const cacheKey = `conversation:${clientUserId}:${id}`;
    // Try cache first — only accept cached copy if conversation is still in-progress
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        // Diagnostic logging to help determine stored shape
        console.log('[Redis] cache raw type:', typeof cached, 'value preview:', (typeof cached === 'string' ? cached.slice(0, 120) : '[object]'));
        try {
          let parsed;
          if (typeof cached === 'object') {
            // some redis clients return parsed objects directly
            parsed = cached;
          } else if (typeof cached === 'string') {
            const txt = cached.trim();
            // If it's the infamous '[object Object]' string, evict and fall back
            if (txt === '[object Object]') {
              console.warn('[Redis] Cached value is the string "[object Object]". Evicting key and falling back to DB', cacheKey);
              try { await redisClient.del(cacheKey); } catch (_) {}
              parsed = null;
            } else if (txt.startsWith('{') || txt.startsWith('[')) {
              parsed = JSON.parse(txt);
            } else {
              // Not JSON — fallback
              console.warn('[Redis] Cached string is not JSON, falling back to DB', cacheKey);
              parsed = null;
            }
          }

          if (parsed && parsed.status !== 'resolved') {
            console.log('[Redis] cache hit (in-progress)', cacheKey);
            return res.status(StatusCodes.OK).json(parsed);
          } else if (parsed && parsed.status === 'resolved') {
            console.log('[Redis] cache hit (resolved) — falling back to DB', cacheKey);
          }
        } catch (e) {
          console.warn('[Redis] Failed to parse cached conversation, falling back to DB', e && e.message ? e.message : e);
          // fallthrough to DB read
        }
      } else {
        console.log('[Redis] cache miss', cacheKey);
      }
    } catch (e) {
      console.warn('[Redis] Error reading conversation cache:', e && e.message ? e.message : e);
    }

    const { resource: conversation } = await conversationsContainer.item(id, clientUserId).read();
    if (!conversation) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: 'Conversation not found.' });
    }

    // Populate cache (best-effort) only if conversation is still in-progress
    try {
      if (conversation.status !== 'resolved') {
        await redisClient.set(cacheKey, JSON.stringify(conversation), { ex: CONVERSATION_CACHE_TTL });
      } else {
        // ensure no stale resolved cache remains
        try { await redisClient.del(cacheKey); } catch (_) {}
      }
    } catch (e) {
      console.warn('[Redis] Failed to set conversation cache:', e && e.message ? e.message : e);
    }

    return res.status(StatusCodes.OK).json(conversation);
  }

    // --- POST REQUEST LOGIC (SEND MESSAGE - REWRITTEN FOR STREAMING) ---
    if (req.method === 'POST') {
      const { message, conversationId } = req.body;
      if (!message) {
          return res.status(StatusCodes.BAD_REQUEST).json({ error: 'Message is required.' });
      }

      let convoId = conversationId;
      let conversation;
      let history = [];

      // 1. Load or Create Conversation
      if (!convoId) {
          convoId = uuidv4();
          conversation = {
              id: convoId,
              userId: clientUserId,
              title: "New Chat",
              messages: [],
              status: 'active', // --- MODIFIED: Use status field ---
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
          };
      } else {
          const { resource: existingConvo } = await conversationsContainer.item(convoId, clientUserId).read();
          if (!existingConvo) {
              return res.status(StatusCodes.NOT_FOUND).json({ error: 'Conversation not found' });
          }
          conversation = existingConvo;
          history = existingConvo.messages;
      }

      // --- NEW: Load User Profile for context ---
      let userProfile = {};
      try {
        const { resource: profile } = await profilesContainer.item(clientUserId, clientUserId).read();
        if (profile) userProfile = profile;
      } catch (e) {
        if (e.statusCode !== 404) console.warn(`Could not load profile for ${clientUserId}:`, e.message);
      }

      // Add user message to conversation object (using new structure)
      const userMessage = {
          id: uuidv4(),
          role: 'user',
          content: { text: message }, // --- MODIFIED: Content is now an object ---
          timestamp: new Date().toISOString()
      };
      conversation.messages.push(userMessage);

      // --- Streaming Logic ---
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Transfer-Encoding', 'chunked');

      let fullAIResponse = "";
      const aiResponseStream = callOpenAIStream(message, history, userProfile); // Pass profile context

      for await (const chunk of aiResponseStream) {
        res.write(chunk); // Send chunk immediately to frontend
        fullAIResponse += chunk; // Assemble full response on backend for saving
      }
      res.end(); // Signal that the stream is finished

      // --- Post-Stream Database Save ---
      // This runs *after* the client has the full response.
      const { cleanMessage, options, isDone } = parseAIResponse(fullAIResponse);

      const assistantMessage = {
          id: uuidv4(),
          role: 'assistant',
          content: { text: cleanMessage }, // --- MODIFIED: Content is an object ---
          timestamp: new Date().toISOString(),
          options: options.length > 0 ? options : undefined
      };
      conversation.messages.push(assistantMessage);
      conversation.updatedAt = new Date().toISOString();

      // --- MODIFIED: Update Title (Optimized) ---
      // Only set title on the very first user message.
      // A simple substring is much faster and cheaper than a separate AI call.
      if (history.length === 0) {
          conversation.title = message.substring(0, 50);
      }

      if (isDone) {
          conversation.status = 'resolved'; // Or 'unresolved' based on [END Y/N]
      }

    await conversationsContainer.items.upsert(conversation);
    // Update cache after save (best-effort)
    try {
      const cacheKey = `conversation:${clientUserId}:${convoId}`;
      if (conversation.status !== 'resolved') {
        await redisClient.set(cacheKey, JSON.stringify(conversation), { ex: CONVERSATION_CACHE_TTL });
      } else {
        try { await redisClient.del(cacheKey); } catch (_) {}
      }
    } catch (e) {
      console.warn('[Redis] Failed to update conversation cache after POST:', e && e.message ? e.message : e);
    }
      
      // The response was already streamed, so we just exit.
      return;
    }

    // --- PUT REQUEST LOGIC (SAVE/UPDATE CONVERSATION) ---
    if (req.method === 'PUT') {
      const { conversationId, messages, title } = req.body;
      if (!conversationId || !messages) {
        return res.status(StatusCodes.BAD_REQUEST).json({ error: 'conversationId and messages are required.' });
      }
      
      const { resource: existingConvo } = await conversationsContainer.item(conversationId, clientUserId).read();
      if (!existingConvo) {
        return res.status(StatusCodes.NOT_FOUND).json({ error: 'Conversation to update not found.' });
      }

      const updatedConversation = {
        ...existingConvo,
        messages: messages, // Frontend sends the full message history
        title: title || existingConvo.title,
        updatedAt: new Date().toISOString()
      };

    await conversationsContainer.items.upsert(updatedConversation);
    // Update cache after save (best-effort)
    try {
      const cacheKey = `conversation:${clientUserId}:${conversationId}`;
      if (updatedConversation.status !== 'resolved') {
        await redisClient.set(cacheKey, JSON.stringify(updatedConversation), { ex: CONVERSATION_CACHE_TTL });
      } else {
        try { await redisClient.del(cacheKey); } catch (_) {}
      }
    } catch (e) {
      console.warn('[Redis] Failed to update conversation cache after PUT:', e && e.message ? e.message : e);
    }

    return res.status(StatusCodes.OK).json({ success: true, message: 'Conversation saved.' });
    }

  } catch (error) {
    console.error('Chat function execution error:', error);
    // --- MODIFIED: Stream-aware error handling ---
    if (!res.headersSent) {
      // If stream hasn't started, send a normal JSON error
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          error: error.message || 'An internal server error occurred.',
      });
    } else {
      // If stream has started, we can't send JSON, so just end the connection.
      res.end();
    }
  }
}
