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
import {
  uploadAttachment,
  deleteBlobIfExists,
  stripEphemeralAttachmentFields,
  enrichAttachmentsWithSignedUrls,
} from '../lib/blob-service.js';
import { parseMultipartRequest } from '../lib/multipart.js';

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

const MAX_IMAGE_UPLOAD_BYTES = parseInt(process.env.MAX_IMAGE_UPLOAD_BYTES || String(5 * 1024 * 1024), 10);
const MAX_IMAGE_ATTACHMENTS = parseInt(process.env.MAX_IMAGE_ATTACHMENTS || '3', 10);
const ALLOWED_IMAGE_TYPES = (process.env.ALLOWED_IMAGE_MIME_TYPES || 'image/png,image/jpeg,image/webp,image/gif,image/heic,image/heif')
  .split(',')
  .map(type => type.trim().toLowerCase())
  .filter(Boolean);
const ATTACHMENT_SIGNED_URL_TTL_SECONDS = parseInt(process.env.ATTACHMENT_SIGNED_URL_TTL_SECONDS || '900', 10);

function cacheTtlWithJitter() {
  const jitter = Math.floor(Math.random() * 30);
  const base = Number.isFinite(CONVERSATION_CACHE_TTL) ? CONVERSATION_CACHE_TTL : 300;
  return Math.max(60, base + jitter);
}

function cloneConversationForCache(conversation) {
  if (!conversation) return null;
  const cacheCopy = JSON.parse(JSON.stringify(conversation));
  stripEphemeralFieldsFromConversation(cacheCopy);
  return cacheCopy;
}

function createHttpError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function collectAttachmentBlobNames(conversation) {
  const blobNames = new Set();
  if (!conversation || !Array.isArray(conversation.messages)) return blobNames;
  for (const message of conversation.messages) {
    const attachments = message?.content?.attachments;
    if (!Array.isArray(attachments)) continue;
    for (const attachment of attachments) {
      if (attachment?.blobName) {
        blobNames.add(attachment.blobName);
      }
    }
  }
  return blobNames;
}

async function deleteAttachmentsForConversation(conversation) {
  const blobNames = collectAttachmentBlobNames(conversation);
  for (const blobName of blobNames) {
    try {
      await deleteBlobIfExists(blobName);
    } catch (err) {
      console.warn('[Attachments] Failed to delete blob', blobName, err.message || err);
    }
  }
}

async function sanitizeConversationForResponse(conversation) {
  if (!conversation) return conversation;
  const cloned = JSON.parse(JSON.stringify(conversation));
  if (Array.isArray(cloned.messages)) {
    for (const message of cloned.messages) {
      await enrichAttachmentsWithSignedUrls(message, { expiresInSeconds: ATTACHMENT_SIGNED_URL_TTL_SECONDS });
    }
  }
  return cloned;
}

function stripEphemeralFieldsFromConversation(conversation) {
  if (!conversation || !Array.isArray(conversation.messages)) return;
  for (const message of conversation.messages) {
    stripEphemeralAttachmentFields(message);
  }
}

function inferMimeTypeFromFilename(filename) {
  if (!filename || typeof filename !== 'string') return null;
  const ext = filename.slice(filename.lastIndexOf('.') + 1).toLowerCase();
  switch (ext) {
    case 'png': return 'image/png';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'webp': return 'image/webp';
    case 'gif': return 'image/gif';
    case 'heic': return 'image/heic';
    case 'heif': return 'image/heif';
    default: return null;
  }
}

function validateIncomingFile(file) {
  if (!file) {
    throw createHttpError('Invalid file received.', StatusCodes.BAD_REQUEST);
  }

  const originalName = file.originalName || file.filename || file.name || 'attachment';
  let mime = (file.mimeType || file.mimetype || '').toLowerCase();
  if (!mime) {
    const inferred = inferMimeTypeFromFilename(originalName);
    if (inferred) {
      mime = inferred;
    }
  }

  if (!mime) {
    throw createHttpError('Unsupported file type: undefined', StatusCodes.UNSUPPORTED_MEDIA_TYPE);
  }

  if (!ALLOWED_IMAGE_TYPES.includes(mime)) {
    throw createHttpError(`Unsupported file type: ${mime}`, StatusCodes.UNSUPPORTED_MEDIA_TYPE);
  }

  if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
    throw createHttpError(`File ${originalName} exceeds the ${MAX_IMAGE_UPLOAD_BYTES} byte limit.`, StatusCodes.PAYLOAD_TOO_LARGE);
  }

  return {
    fieldname: file.fieldname,
    originalName,
    mimeType: mime,
    size: file.size,
    buffer: file.buffer,
  };
}

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
  if (![ 'GET', 'POST', 'PUT', 'DELETE' ].includes(req.method)) {
    return res.status(StatusCodes.METHOD_NOT_ALLOWED).json({
      error: 'Method not allowed', allowedMethods: ['GET', 'POST', 'PUT', 'DELETE']
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
              parsed = cached;
            } else if (typeof cached === 'string') {
              const txt = cached.trim();
              if (txt === '[object Object]') {
                console.warn('[Redis] Cached value is the string "[object Object]". Evicting key and falling back to DB', cacheKey);
                try { await redisClient.del(cacheKey); } catch (_) {}
                parsed = null;
              } else if (txt.startsWith('{') || txt.startsWith('[')) {
                parsed = JSON.parse(txt);
              } else {
                console.warn('[Redis] Cached string is not JSON, falling back to DB', cacheKey);
                parsed = null;
              }
            }

            // Only use cache if it's in-progress (not resolved) and has messages
            if (parsed && parsed.status === 'resolved') {
              console.log('[Redis] Cached conversation is resolved, deleting cache and falling back to DB', cacheKey);
              try { await redisClient.del(cacheKey); } catch (_) {}
              parsed = null;
            } else if (parsed && Array.isArray(parsed.messages) && parsed.messages.length === 0) {
              // Evict empty-message cache and fall back
              console.warn('[Redis] Cached conversation has no messages, evicting and falling back to DB', cacheKey);
              try { await redisClient.del(cacheKey); } catch (_) {}
              parsed = null;
            } else if (parsed && Array.isArray(parsed.messages) && parsed.messages.length > 0) {
              console.log('[Redis] cache hit (in-progress, has messages)', cacheKey);
              const sanitized = await sanitizeConversationForResponse(parsed);
              return res.status(StatusCodes.OK).json(sanitized);
            }
          } catch (e) {
            console.warn('[Redis] Failed to parse cached conversation, falling back to DB', e && e.message ? e.message : e);
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

      // CRITICAL: If conversation is resolved/complete, ALWAYS delete from cache and never cache it
      if (conversation.status === 'resolved') {
        try {
          await redisClient.del(cacheKey);
          console.log('[Redis] Deleted cache for resolved conversation from DB:', cacheKey);
        } catch (e) {
          console.warn('[Redis] Failed to delete cache for resolved conversation:', e && e.message ? e.message : e);
        }
      } else if (Array.isArray(conversation.messages) && conversation.messages.length > 0) {
        // Only cache in-progress conversations with messages
        try {
          const cachePayload = cloneConversationForCache(conversation);
          if (cachePayload) {
            const serialized = JSON.stringify(cachePayload);
            await redisClient.set(cacheKey, serialized, { ex: cacheTtlWithJitter() });
            console.log('[Redis] Cached in-progress conversation:', cacheKey);
          }
        } catch (e) {
          console.warn('[Redis] Failed to set conversation cache:', e && e.message ? e.message : e);
        }
      } else {
        // Empty messages or other edge cases: delete cache
        try {
          await redisClient.del(cacheKey);
        } catch (e) {
          console.warn('[Redis] Failed to delete cache:', e && e.message ? e.message : e);
        }
      }

  const sanitizedConversation = await sanitizeConversationForResponse(conversation);
  return res.status(StatusCodes.OK).json(sanitizedConversation);
    }

    // --- DELETE REQUEST LOGIC (DELETE SINGLE OR ALL CONVERSATIONS) ---
    if (req.method === 'DELETE') {
      const { id, all, userId } = req.query;
      // Only allow the authenticated user to delete their own conversations
      if (userId !== clientUserId) {
        return res.status(StatusCodes.FORBIDDEN).json({ error: 'Forbidden: userId mismatch.' });
      }
      if (all === 'true') {
        // Delete all conversations for this user
        const query = {
          query: 'SELECT c.id FROM c WHERE c.userId = @userId',
          parameters: [ { name: '@userId', value: clientUserId } ]
        };
        const { resources: convos } = await conversationsContainer.items.query(query).fetchAll();
        for (const convo of convos) {
          try {
            const { resource: convoResource } = await conversationsContainer.item(convo.id, clientUserId).read();
            if (convoResource) {
              await deleteAttachmentsForConversation(convoResource);
            }
          } catch (err) {
            if (err.statusCode !== 404) {
              console.warn('[Conversation DELETE all] Failed to fetch conversation before delete:', err.message || err);
            }
          }
          await conversationsContainer.item(convo.id, clientUserId).delete();
          // Remove from Redis cache
          try { await redisClient.del(`conversation:${clientUserId}:${convo.id}`); } catch (_) {}
        }
        return res.status(StatusCodes.OK).json({ success: true, message: 'All conversations deleted.' });
      } else if (id) {
        // Delete a single conversation
        try {
          const { resource: convoResource } = await conversationsContainer.item(id, clientUserId).read();
          if (convoResource) {
            await deleteAttachmentsForConversation(convoResource);
          }
        } catch (err) {
          if (err.statusCode !== 404) {
            console.warn('[Conversation DELETE] Failed to fetch conversation before delete:', err.message || err);
          }
        }
        await conversationsContainer.item(id, clientUserId).delete();
        try { await redisClient.del(`conversation:${clientUserId}:${id}`); } catch (_) {}
        return res.status(StatusCodes.OK).json({ success: true, message: 'Conversation deleted.' });
      } else {
        return res.status(StatusCodes.BAD_REQUEST).json({ error: 'id or all=true required for DELETE.' });
      }
    }

    // --- POST REQUEST LOGIC (SEND MESSAGE WITH OPTIONAL IMAGE ATTACHMENTS) ---
    if (req.method === 'POST') {
      const contentType = req.headers['content-type'] || '';
      const isMultipart = contentType.includes('multipart/form-data');

      console.log('[API] Incoming POST /conversation');
      console.log('[API] Headers:', req.headers);
      console.log('[API] Content-Type:', contentType, 'isMultipart:', isMultipart);

      let rawMessage;
      let providedConversationId;
      let providedUserId;
      let parsedFiles = [];

      if (isMultipart) {
        const { fields, files } = await parseMultipartRequest(req, {
          maxFiles: MAX_IMAGE_ATTACHMENTS,
          maxFileSize: MAX_IMAGE_UPLOAD_BYTES,
        });
        console.log('[API] Busboy fields:', fields);
        console.log('[API] Busboy files:', files.map(f => ({ name: f.originalName, mimeType: f.mimeType, size: f.size })));
        rawMessage = fields.message ?? '';
        providedConversationId = fields.conversationId || fields.conversationID || fields.conversation || null;
        providedUserId = fields.userId || null;
        parsedFiles = Array.isArray(files) ? files : [];
      } else {
        console.log('[API] Non-multipart body:', req.body);
        rawMessage = req.body?.message;
        providedConversationId = req.body?.conversationId;
        providedUserId = req.body?.userId;
      }

      if (providedUserId && providedUserId !== clientUserId) {
        return res.status(StatusCodes.FORBIDDEN).json({ error: 'Forbidden: userId mismatch.' });
      }

      const messageText = typeof rawMessage === 'string' ? rawMessage.trim() : '';
      const hasAttachments = parsedFiles.length > 0;

      if (!messageText && !hasAttachments) {
        return res.status(StatusCodes.BAD_REQUEST).json({ error: 'Message or image attachment is required.' });
      }

      let convoId = providedConversationId;
      let conversation;
      let history = [];

      if (convoId) {
        const { resource: existingConvo } = await conversationsContainer.item(convoId, clientUserId).read();
        if (!existingConvo) {
          return res.status(StatusCodes.NOT_FOUND).json({ error: 'Conversation not found' });
        }
        conversation = existingConvo;
        history = Array.isArray(existingConvo.messages) ? [...existingConvo.messages] : [];
      } else {
        convoId = uuidv4();
        const now = new Date().toISOString();
        conversation = {
          id: convoId,
          userId: clientUserId,
          title: 'New Chat',
          messages: [],
          status: 'active',
          createdAt: now,
          updatedAt: now,
        };
      }

      const uploadedBlobNames = [];
      const attachmentMetadata = [];

      if (hasAttachments) {
        if (parsedFiles.length > MAX_IMAGE_ATTACHMENTS) {
          return res.status(StatusCodes.BAD_REQUEST).json({ error: `You can upload up to ${MAX_IMAGE_ATTACHMENTS} images per message.` });
        }
        try {
          for (const file of parsedFiles) {
            const normalizedFile = validateIncomingFile(file);
            const uploadResult = await uploadAttachment(normalizedFile.buffer, {
              userId: clientUserId,
              conversationId: convoId,
              mimeType: normalizedFile.mimeType,
              fileName: normalizedFile.originalName,
            });
            uploadedBlobNames.push(uploadResult.blobName);
            attachmentMetadata.push({
              id: uuidv4(),
              type: 'image',
              fileName: normalizedFile.originalName || null,
              mimeType: normalizedFile.mimeType,
              size: normalizedFile.size,
              blobName: uploadResult.blobName,
              uploadedAt: uploadResult.uploadedAt,
            });
          }
        } catch (err) {
          for (const blobName of uploadedBlobNames) {
            try { await deleteBlobIfExists(blobName); } catch (_) {}
          }
          if (err.statusCode) {
            return res.status(err.statusCode).json({ error: err.message });
          }
          throw err;
        }
      }

      const userMessageContent = {};
      if (messageText) userMessageContent.text = messageText;
      if (attachmentMetadata.length) userMessageContent.attachments = attachmentMetadata;

      if (!userMessageContent.text && !userMessageContent.attachments) {
        return res.status(StatusCodes.BAD_REQUEST).json({ error: 'Message or image attachment is required.' });
      }

      const userMessage = {
        id: uuidv4(),
        role: 'user',
        content: userMessageContent,
        timestamp: new Date().toISOString(),
      };

      conversation.messages = Array.isArray(conversation.messages) ? conversation.messages : [];
      conversation.messages.push(userMessage);
      conversation.updatedAt = new Date().toISOString();
      if (!conversation.status || conversation.status === 'resolved') {
        conversation.status = 'active';
      }

      // --- Load User Profile for context ---
      let userProfile = {};
      try {
        const { resource: profile } = await profilesContainer.item(clientUserId, clientUserId).read();
        if (profile) userProfile = profile;
      } catch (e) {
        if (e.statusCode !== 404) console.warn(`Could not load profile for ${clientUserId}:`, e.message);
      }

      // --- Streaming Logic ---
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Transfer-Encoding', 'chunked');
      res.setHeader('X-Conversation-Id', convoId);

      // Cache the in-progress conversation BEFORE streaming starts
      const cacheKey = `conversation:${clientUserId}:${convoId}`;
      try {
        const cachePayload = cloneConversationForCache(conversation);
        if (cachePayload) {
          const serialized = JSON.stringify(cachePayload);
          await redisClient.set(cacheKey, serialized, { ex: cacheTtlWithJitter() });
          console.log('[Redis] Cached in-progress conversation before streaming', cacheKey);
        }
      } catch (e) {
        console.warn('[Redis] Failed to cache conversation before streaming:', e?.message || e);
      }

      let fullAIResponse = '';
      try {
        const aiResponseStream = callOpenAIStream({ userMessage, history, userProfile });
        for await (const chunk of aiResponseStream) {
          res.write(chunk);
          fullAIResponse += chunk;
        }
      } catch (err) {
        for (const blobName of uploadedBlobNames) {
          try { await deleteBlobIfExists(blobName); } catch (_) {}
        }
        throw err;
      } finally {
        res.end();
      }

      // --- Post-Stream Database Save ---
      const { cleanMessage, options, isDone } = parseAIResponse(fullAIResponse);

      const assistantMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: { text: cleanMessage },
        timestamp: new Date().toISOString(),
        options: options.length > 0 ? options : undefined,
      };
      conversation.messages.push(assistantMessage);
      conversation.updatedAt = new Date().toISOString();

      // --- Generate a technology-focused title using the AI after the first assistant response ---
      if (history.length === 0) {
        try {
          const titlePrompt = 'Summarize the following technical conversation in 5 words or less, focusing on the main technology or problem. Only return the title, no punctuation.';
          let title = '';
          for await (const chunk of callOpenAIStream(cleanMessage, [
            { role: 'system', content: titlePrompt },
            { role: 'user', content: messageText || '[image]' },
            { role: 'assistant', content: cleanMessage },
          ])) {
            title += chunk;
          }
          conversation.title = (title || '').replace(/[\n\r\-\.:]+/g, ' ').trim().slice(0, 50) || 'New Chat';
        } catch (e) {
          conversation.title = (messageText || 'New Chat').substring(0, 50) || 'New Chat';
        }
      }

      if (isDone) {
        conversation.status = 'resolved';
      }

      stripEphemeralFieldsFromConversation(conversation);
      await conversationsContainer.items.upsert(conversation);

      // CRITICAL: Cache management AFTER database save
      if (isDone || conversation.status === 'resolved') {
        // Delete cache immediately when conversation is complete
        try {
          await redisClient.del(cacheKey);
          console.log('[Redis] Deleted cache for completed conversation after save:', cacheKey);
        } catch (e) {
          console.warn('[Redis] Failed to delete cache for completed conversation:', e && e.message ? e.message : e);
        }
      } else if (Array.isArray(conversation.messages) && conversation.messages.length > 0) {
        // Only cache in-progress conversations with messages
        try {
          const cachePayload = cloneConversationForCache(conversation);
          if (cachePayload) {
            const serialized = JSON.stringify(cachePayload);
            await redisClient.set(cacheKey, serialized, { ex: cacheTtlWithJitter() });
            console.log('[Redis] Cached in-progress conversation after POST:', cacheKey);
          }
        } catch (e) {
          console.warn('[Redis] Failed to update conversation cache after POST:', e && e.message ? e.message : e);
        }
      }

      // The response was already streamed
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
    
    // CRITICAL: Cache management for PUT - NEVER cache resolved conversations
    try {
      const cacheKey = `conversation:${clientUserId}:${conversationId}`;
      if (updatedConversation.status === 'resolved') {
        // Always delete cache for resolved conversations
        await redisClient.del(cacheKey);
        console.log('[Redis] Deleted cache for resolved conversation after PUT:', cacheKey);
      } else if (Array.isArray(updatedConversation.messages) && updatedConversation.messages.length > 0) {
        // Only cache in-progress conversations with messages
        const cachePayload = cloneConversationForCache(updatedConversation);
        if (cachePayload) {
          await redisClient.set(cacheKey, JSON.stringify(cachePayload), { ex: cacheTtlWithJitter() });
          console.log('[Redis] Cached in-progress conversation after PUT:', cacheKey);
        }
      } else {
        // Empty or edge cases: delete cache
        await redisClient.del(cacheKey);
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
