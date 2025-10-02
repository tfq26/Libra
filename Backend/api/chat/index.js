import { app } from '@azure/functions';
import { CosmosClient } from '@azure/cosmos';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { get_encoding } from "tiktoken";

// --- Cosmos DB Configuration ---
const cosmosConnectionString = process.env.CosmosDBConnectionString;
const cosmosClient = new CosmosClient(cosmosConnectionString);
const databaseId = "LibraChatDB";
const containerId = "Conversations";
const database = cosmosClient.database(databaseId);
const container = database.container(containerId);

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
            1.  **One Step at a Time:** Provide only ONE clear, concise instruction or question in each response.
            2.  **Provide Dynamic Options:** After your response, you MUST provide between 2 and 4 relevant button options for the user.
            3.  **Options Must Be ANSWERS:** The options you provide must be potential ANSWERS to your question, not generic actions like "I understand" or "Continue".
            4.  **Handle Yes/No Questions:** If your question can be answered with a simple yes or no, you MUST provide the options exactly as: [options: "Yes", "No"].
            5.  **Format Correctly:** You MUST format your options inside a special tag like this: [options: "Option 1", "Option 2", "Option 3"]. The user will not see this tag.
            6.  Concluding the Chat: When the user's problem is fully resolved or if you have exhausted all solutions, your final response must be a concluding summary. After this summary, you MUST use the special tag: [done].

            Example of a Final Message:
            Your Response: "Great! I'm glad to hear that everything is working now. If you have any other issues, please don't hesitate to start a new chat. Have a great day! [done]"

            **Example 1 (Multi-Choice):**
            * Your Response: "I see. First, could you check if the Wi-Fi icon on your router is lit up or blinking? [options: "The light is solid green", "The light is blinking", "The light is off"]"

            **Example 2 (Yes/No):**
            * Your Response: "In the 'Apps' section, is the toggle next to Safari enabled? [options: "Yes", "No"]"
            
            **Example 3 (Definitive Step):**
            * Your Response: "Okay, please try restarting your device. Let me know if that solves the issue. [options: "That fixed it!", "The issue is still there"]"
            `
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

// MODIFIED: This function now parses for an [options: ...] tag and returns an array.
function parseAIResponse(rawResponse) {
    // Check for the 'done' tag first
    if (rawResponse.includes('[done]')) {
        return {
            cleanMessage: rawResponse.replace('[done]', '').trim(),
            options: [],
            isDone: true
        };
    }
    const regex = /\[options:\s*([^\]]+)]/;
    const match = rawResponse.match(regex);

    if (match && match[1]) {
        const cleanMessage = rawResponse.replace(regex, '').trim();
        try {
            // The AI gives us a string like: "Option 1", "Option 2"
            // We wrap it in brackets to make it a valid JSON array string: ["Option 1", "Option 2"]
            const optionsArray = JSON.parse(`[${match[1]}]`);
            return { cleanMessage, options: optionsArray };
        } catch (e) {
            console.error("Failed to parse AI options, applying fallback.", e);
            // Fallback if the AI's formatting is broken
            return { cleanMessage, options: ["Continue"] };
        }
    } else {
        // Fallback if the AI forgets the tag completely
        console.warn("AI response missing an [options] tag. Applying fallback.");
        return {
            cleanMessage: rawResponse,
            options: ["I understand", "I don't understand", "I have a question"]
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
                
                // MODIFIED: Parse for the 'options' array instead of 'stepType'
                const { cleanMessage, options, isDone } = parseAIResponse(aiResponseText);

                conversation.messages.push({ role: "user", content: prompt, timestamp: new Date().toISOString() });
                conversation.messages.push({ role: "assistant", content: cleanMessage, timestamp: new Date().toISOString() });

                // MODIFIED: Title generation uses the new parser
                if (conversation.messages.length === 2) {
                    const titlePrompt = `Summarize this chat into a 5-word title: User: "${conversation.messages[0].content}"`;
                    const titleResponse = await callOpenAI(titlePrompt, []);
                    conversation.title = parseAIResponse(titleResponse).cleanMessage;
                }

                // NEW: If the conversation is done, set a flag in the database
                if (isDone) {
                    conversation.isDone = true;
                }

                await container.items.upsert(conversation);

                // MODIFIED: Return the isDone flag in the JSON response
                return { 
                    jsonBody: { 
                        response: cleanMessage, 
                        options: options, 
                        isDone: isDone, // Send the flag to the frontend
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