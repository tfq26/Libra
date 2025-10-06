import { CosmosClient } from '@azure/cosmos';

// Initialize CosmosDB client
const cosmosClient = new CosmosClient(process.env.COSMOSDB_CONNECTION_STRING);
const database = cosmosClient.database('LibraChatDB');
const container = database.container('Conversations');

executionCount = 0;

/**
 * Vercel Serverless Function for fetching chat history
 * GET /api/history?userId=<userId>
 */
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET method
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET', 'OPTIONS']);
    return res.status(405).json({ 
      error: 'Method not allowed',
      allowedMethods: ['GET', 'OPTIONS'],
      timestamp: new Date().toISOString()
    });
  }

  try {
    const { userId } = req.query;
    
    // Validate userId
    if (!userId) {
      return res.status(400).json({ 
        error: 'User ID is required',
        timestamp: new Date().toISOString()
      });
    }

    // Query for user's conversations
    const querySpec = {
      query: 'SELECT c.id, c.title, c.createdAt, c.updatedAt FROM c WHERE c.userId = @userId ORDER BY c.updatedAt DESC',
      parameters: [{ name: '@userId', value: userId }],
    };

    const { resources: conversations } = await container.items
      .query(querySpec)
      .fetchAll();

    return res.status(200).json({
      success: true,
      data: conversations,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error fetching chat history:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch chat history',
      message: error.message,
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
}
