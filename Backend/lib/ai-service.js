// /Backend/lib/ai-service.js

import axios from 'axios';
import { get_encoding } from "tiktoken";

// --- System Prompt Definition ---
const SYSTEM_PROMPT_CONTENT = `You are Libra, a step-by-step diagnostic assistant. Your goal is to help a user solve a technical problem one step at a time.

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
`;

const SYSTEM_MESSAGE = {
    role: "system",
    content: SYSTEM_PROMPT_CONTENT
};

// --- Token Counting ---
export function countMessageTokens(messages) {
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

// --- Response Parsing ---
export function parseAIResponse(rawResponse) {
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
            const optionsArray = JSON.parse(`[${match[1]}]`);
            return { cleanMessage, options: optionsArray };
        } catch (e) {
            console.error("Failed to parse AI options, applying fallback.", e);
            return { cleanMessage, options: ["Continue"] };
        }
    } else {
        console.warn("AI response missing an [options] tag. Applying fallback.");
        return {
            cleanMessage: rawResponse,
            options: ["I understand", "I don't understand", "I have a question"]
        };
    }
}

// --- OpenAI API Call ---
export async function callOpenAI(prompt, history = [], imageUrl = null) {
    try {
        const apiKey = process.env.OPENAI_API_KEY;
        const endpoint = process.env.OPENAI_ENDPOINT;
        const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;
        const apiVersion = "2024-02-15-preview";

        if (!apiKey || !endpoint || !deploymentName) {
            throw new Error('Missing required Azure OpenAI configuration. Please check your environment variables.');
        }

        // Minimal logging for production
        if (process.env.NODE_ENV !== 'production') {
            console.log('[AI] Initializing with endpoint:', endpoint.split('/')[2]); // Just show domain
            console.log('[AI] Using deployment:', deploymentName);
        }

        const MODEL_CONTEXT_WINDOW = 8192;
        const RESPONSE_BUFFER = 1500;

        let userMessage = { role: "user", content: prompt };
        if (imageUrl) {
            userMessage.content = [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: imageUrl } }];
        }

        const messages = [SYSTEM_MESSAGE, ...history, userMessage];
        const inputTokens = countMessageTokens(messages);
        const maxTokensForResponse = MODEL_CONTEXT_WINDOW - inputTokens - RESPONSE_BUFFER;

        if (maxTokensForResponse < 0) {
            throw new Error("The conversation history is too long.");
        }

        const headers = { 'Content-Type': 'application/json', 'api-key': apiKey };
        const payload = {
            messages,
            model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
            max_tokens: Math.min(maxTokensForResponse, 4096)
        };

        // Ensure the endpoint ends with a slash for proper URL construction
        const baseUrl = endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint;
        const apiUrl = `${baseUrl}/openai/deployments/${deploymentName}/chat/completions?api-version=${apiVersion}`;
        
        if (process.env.NODE_ENV !== 'production') {
            console.log('[AI] Sending request to Azure OpenAI');
        }
        
        const response = await axios.post(
            apiUrl,
            payload,
            { 
                headers,
                timeout: 30000 // 30 second timeout
            }
        );
        
        if (!response.data.choices || !response.data.choices[0] || !response.data.choices[0].message) {
            console.error('Unexpected response format from Azure OpenAI:', JSON.stringify(response.data, null, 2));
            throw new Error('Unexpected response format from Azure OpenAI');
        }
        
        return response.data.choices[0].message.content;

    } catch (error) {
        console.error('[AI] Error:', error.message);
        if (error.message.includes("The conversation history is too long")) {
            throw error;
        }
        throw new Error("Failed to get response from AI model.");
    }
}