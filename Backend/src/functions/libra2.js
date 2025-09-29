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

// MODIFIED: The core function for calling OpenAI with the new system prompt
async function callOpenAI(prompt, history = [], imageUrl = null) {
    try {
        const apiKey = process.env.AzureOpenAIApiKey;
        const endpoint = process.env.AzureOpenAIEndpoint;
        const deploymentName = process.env.AzureOpenAIDeploymentName;
        const apiVersion = "2024-02-15-preview";

        const MODEL_CONTEXT_WINDOW = 8192;
        const RESPONSE_BUFFER = 1500;

        // MODIFIED: This is the new, detailed system prompt for the guided assistant.
        const systemMessage = {
            role: "system",
            content: `You are Libra, a step-by-step diagnostic assistant. Your goal is to help a user solve a technical problem one step at a time.
        
        CRITICAL RULES:
        1.  **One Step at a Time:** Provide only ONE clear, concise instruction or question in each response. Do not provide lists of steps.
        2.  **Classify Your Response:** At the end of EVERY response, you MUST include a classification tag for the type of step you provided. The user will not see this tag.
        3.  **Use ONLY these tags:**
            * \`[step_type: definitive]\` when you propose a solution to see if it fixed the problem (e.g., "Try restarting the device.").
            * \`[step_type: transition]\` when you ask the user to perform an action or check something to gather more information (e.g., "Can you check if the power light is on?").
            * \`[step_type: clarification]\` when you are explaining a concept or asking a clarifying question (e.g., "When you say it's 'not working', do you mean it's slow or completely disconnected?").
        4.  **Wait for User Response:** Base your next step on the user's button press (e.g., if they say 'It didn't work', provide an alternative solution).
        
        **Example Interaction:**
        * User Prompt: "My Wi-Fi is not working."
        * Your Response: "I see. First, could you check if the Wi-Fi icon on your router is lit up or blinking? [step_type: transition]"`
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

// NEW: A helper function to parse the AI's response for a step_type tag
function parseAIResponse(rawResponse) {
    const regex = /\[step_type:\s*(\w+)]/;
    const match = rawResponse.match(regex);

    if (match) {
        const cleanMessage = rawResponse.replace(regex, '').trim();
        const stepType = match[1];
        return { cleanMessage, stepType };
    } else {
        console.warn("AI response missing a [step_type] tag. Applying fallback.");
        return {
            cleanMessage: rawResponse,
            stepType: 'clarification' // Safe default
        };
    }
}

// --- Main Chat HTTP Trigger (Modified) ---
app.http('chat', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
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
                    const { resource: existing } = await container.item(conversationId, userId).read();
                    if (existing) {
                        conversation = existing;
                        history = existing.messages;
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
                
                // MODIFIED: Parse the AI response to extract the message and stepType
                const { cleanMessage, stepType } = parseAIResponse(aiResponseText);

                conversation.messages.push({ role: "user", content: prompt, timestamp: new Date().toISOString() });
                conversation.messages.push({ role: "assistant", content: cleanMessage, timestamp: new Date().toISOString() });

                // MODIFIED: Title generation now happens after the first real user message
                if (conversation.messages.length === 2) {
                    const titlePrompt = `Summarize this chat into a 5-word title: User: "${conversation.messages[0].content}"`;
                    const titleResponse = await callOpenAI(titlePrompt, []);
                    // Ensure the title itself doesn't contain a step_type tag
                    conversation.title = parseAIResponse(titleResponse).cleanMessage;
                }

                await container.items.upsert(conversation);

                // MODIFIED: Return the new JSON structure with the stepType
                return { 
                    jsonBody: { 
                        response: cleanMessage, 
                        stepType: stepType, 
                        conversationId: conversation.id 
                    } 
                };

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
