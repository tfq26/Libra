import { app } from '@azure/functions';
import { CosmosClient } from '@azure/cosmos';

const cosmosClient = new CosmosClient(process.env.CosmosDBConnectionString);
const database = cosmosClient.database("LibraChatDB");
const container = database.container("Conversations");

// --- HTTP Trigger for Fetching Conversation History List ---
app.http('history', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log('History function processed a request.');
        try {
            const userId = request.query.get('userId');
            if (!userId) {
                return { status: 400, body: "User ID is required." };
            }

            const querySpec = {
                query: "SELECT c.id, c.title, c.createdAt FROM c WHERE c.userId = @userId ORDER BY c.createdAt DESC",
                parameters: [ { name: "@userId", value: userId } ]
            };

            const { resources: conversations } = await container.items.query(querySpec).fetchAll();
            return { jsonBody: conversations };

        } catch (error) {
            context.log("Error in history function:", error);
            return { status: 500, body: "Error fetching conversation history." };
        }
    }
});
