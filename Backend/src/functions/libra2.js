import { app } from '@azure/functions';
import { BlobServiceClient } from '@azure/storage-blob';
import { CosmosClient } from '@azure/cosmos';
import { v4 as uuidv4 } from 'uuid';
import busboy from 'busboy';
import axios from 'axios';
import { get_encoding } from "tiktoken";

// --- Cosmos DB Configuration ---
const cosmosConnectionString = process.env.CosmosDBConnectionString;
const cosmosClient = new CosmosClient(cosmosConnectionString);
const databaseId = "LibraChatDB";
const containerId = "Conversations";
const database = cosmosClient.database(databaseId);
const container = database.container(containerId);

// --- Helper function to set up the database and container with a Partition Key ---
async function setupCosmosDB() {
    await cosmosClient.databases.createIfNotExists({ id: databaseId });
    await database.containers.createIfNotExists({
        id: containerId,
        partitionKey: { paths: ["/userId"] }
    });
    console.log("Cosmos DB database and container are ready with /userId partition key.");
}

// Call setup on startup
setupCosmosDB().catch(console.error);

// --- Token Counting and OpenAI Call (remains the same) ---
function countMessageTokens(messages) {
    const encoding = get_encoding("cl100k_base");
    let numTokens = 0;
    for (const message of messages) {
        numTokens += 3;
        for (const [key, value] of Object.entries(message)) {
            if (typeof value === 'string') {
                numTokens += encoding.encode(value).length;
            }
        }
    }
    numTokens += 3;
    encoding.free();
    return numTokens;
}

async function callOpenAI(prompt, history = [], imageUrl = null) {
    try {
        const apiKey = process.env.AzureOpenAIApiKey;
        const endpoint = process.env.AzureOpenAIEndpoint;
        const deploymentName = process.env.AzureOpenAIDeploymentName;
        const apiVersion = "2024-02-15-preview";

        const MODEL_CONTEXT_WINDOW = 8192;
        const RESPONSE_BUFFER = 1500;

        const systemMessage = {
            role: "system",
            content: `You are Libra, an expert technical support agent and your job is to help the user with their 
            technological issue. Please try to help them as they do not know anything about the issue and they are 
            coming to you for help. If the user asks for help, please reassure them that you are there to help and
            start by asking any clarifying questions, making sure to define any unknown terms and keeping questions 
            simple but thorough. When you give directions, please give each step one at a time and give one solution
            at a time. If the user says that the solution works, then help them through everything and if not, give 
            them more solutions. If the problem could not be solved after exhausting all solutions, please refer them
            to helpful websites and provide customer support phone numbers or emails. Please do not break character and
            if the user asks an off topic question, please respond with a respectful response and maybe even a tech joke
            occasionally.` // Your full system prompt
        };
        let userMessage = { role: "user", content: prompt };
        if (imageUrl) {
            userMessage.content = [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: imageUrl } }];
        }

        const messages = [systemMessage, ...history, userMessage];
        const inputTokens = countMessageTokens(messages);
        const maxTokensForResponse = MODEL_CONTEXT_WINDOW - inputTokens - RESPONSE_BUFFER;

        if (maxTokensForResponse < 0) {
            throw new Error("The conversation history is too long.");
        }

        const headers = { 'Content-Type': 'application/json', 'api-key': apiKey };
        const payload = {
            messages,
            model: "gpt-4o",
            max_tokens: Math.min(maxTokensForResponse, 4096)
        };

        const response = await axios.post(
            `${endpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=${apiVersion}`,
            payload,
            { headers }
        );
        return response.data.choices[0].message.content;

    } catch (error) {
        console.error("Error calling Azure OpenAI:", error.message);
        if (error.message.includes("The conversation history is too long")) {
            throw error;
        }
        throw new Error("Failed to get response from AI model.");
    }
}


// --- Main Chat HTTP Trigger (Now handles GET and POST) ---
app.http('chat', {
    methods: ['GET', 'POST'], // Now accepts both methods
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log(`Chat function processed a ${request.method} request.`);

        // --- Handle POST for sending a new message ---
        if (request.method === 'POST') {
            try {
                const body = await request.json();
                let { prompt, conversationId, userId } = body;

                if (!userId || !prompt) {
                    return { status: 400, body: "User ID and prompt are required." };
                }

                let conversation;
                let history = [];

                if (conversationId) {
                    const { resource: existingConversation } = await container.item(conversationId, userId).read();
                    if (existingConversation) {
                        conversation = existingConversation;
                        history = existingConversation.messages;
                    }
                }

                if (!conversation) {
                    conversationId = uuidv4();
                    conversation = {
                        id: conversationId,
                        userId: userId,
                        createdAt: new Date().toISOString(),
                        title: prompt.substring(0, 30),
                        messages: []
                    };
                }

                const aiResponseText = await callOpenAI(prompt, history);

                conversation.messages.push({ role: "user", content: prompt, timestamp: new Date().toISOString() });
                conversation.messages.push({ role: "assistant", content: aiResponseText, timestamp: new Date().toISOString() });

                if (conversation.messages.length === 4) {
                    const titlePrompt = `Summarize this into a 5-word title: User: ${conversation.messages[0].content} Assistant: ${conversation.messages[1].content}`;
                    const newTitle = await callOpenAI(titlePrompt, []);
                    conversation.title = newTitle;
                }

                await container.items.upsert(conversation);
                return { jsonBody: { response: aiResponseText, conversationId: conversation.id } };

            } catch (error) {
                context.log("Error in chat function (POST):", error);
                return { status: 500, body: "Error processing chat request." };
            }
        }

        // --- Handle GET for fetching a conversation's history ---
        if (request.method === 'GET') {
            try {
                const conversationId = request.query.get('id');
                const userId = request.query.get('userId');

                if (!userId || !conversationId) {
                    return { status: 400, body: "User ID and Conversation ID are required." };
                }

                const { resource: conversation } = await container.item(conversationId, userId).read();

                if (conversation) {
                    return { jsonBody: conversation };
                } else {
                    return { status: 404, body: "Conversation not found." };
                }

            } catch (error) {
                context.log("Error in chat function (GET):", error);
                return { status: 500, body: "Error fetching conversation." };
            }
        }
    }
});

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
