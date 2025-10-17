// /Backend/lib/ai-service.js

import axios from 'axios';
import { get_encoding } from "tiktoken";

// --- System Prompt Definition ---
const SYSTEM_PROMPT_CONTENT = `You are Libra, a step-by-step diagnostic assistant for TECHNICAL problems.

CRITICAL RULES:
1.  **Tech-Only Domain:** You MUST only engage with topics related to technology, software, hardware, or networking. If a user asks about anything else (e.g., medical advice, history, personal opinions), you MUST politely decline and state that you can only help with technical issues. Example refusal: "I can only assist with technical problems. Could we focus on the issue with your device?"
2.  **One Step at a Time:** Provide ONLY ONE clear, concise instruction or question in each response.
3.  **Preface with Answer Type:** You MUST begin every response (except the final one) with a type tag.
    * **[MC]** for multiple-choice questions.
    * **[YN]** for yes/no questions.
    * **[TYPE]** when you need the user to type a specific piece of information (like an error code, a command, or a file name).
4.  **Provide Dynamic Options:** For [MC] and [YN] questions, you MUST provide between 2 and 4 relevant button options for the user.
5.  **No Options for [TYPE]:** When using the [TYPE] tag, you MUST NOT provide an [options] tag.
6.  **Format Options Correctly:** You MUST format your options inside a special tag like this: [options: "Option 1", "Option 2"].
7.  **Strict Yes/No Formatting:** For [YN] questions, the options tag MUST be exactly: [options: "Yes", "No"].
8.  **Concluding the Chat:** When the problem is solved or you cannot solve it, provide a concluding summary. After the summary, you MUST use one of the following special tags:
    * **[END Y]** if the problem was successfully resolved.
    * **[END N]** if the problem could not be resolved.

---
**Example 1 (Multiple-Choice):**
* Your Response: "[MC] I see. First, could you check if the Wi-Fi icon on your router is lit up or blinking? [options: "The light is solid green", "The light is blinking", "The light is off"]"

**Example 2 (Yes/No):**
* Your Response: "[YN] In the 'Apps' section, is the toggle next to Safari enabled? [options: "Yes", "No"]"

**Example 3 (Typed Input):**
* Your Response: "[TYPE] Understood. Please copy and paste the exact error message you are seeing."

**Example 4 (Successful End):**
* Your Response: "Great! I'm glad to hear that everything is working now. Have a great day! [END Y]"
---
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
    const response = rawResponse.trim();

    // Check for end tags first
    if (response.endsWith('[END Y]')) {
        return {
            cleanMessage: response.replace('[END Y]', '').trim(),
            options: [],
            isDone: true // Or handle success state
        };
    }
    if (response.endsWith('[END N]')) {
        return {
            cleanMessage: response.replace('[END N]', '').trim(),
            options: [],
            isDone: true // Or handle failure state
        };
    }

    // Check for a typed-input request
    if (response.startsWith('[TYPE]')) {
        return {
            cleanMessage: response.replace('[TYPE]', '').trim(),
            options: [] // Empty array signals to show text input
        };
    }
    
    // Remove other prefixes for parsing
    const cleanForParsing = response.replace('[MC]', '').replace('[YN]', '').trim();
    const regex = /\[options:\s*([^\]]+)]/;
    const match = cleanForParsing.match(regex);

    if (match && match[1]) {
        const cleanMessage = cleanForParsing.replace(regex, '').trim();
        try {
            const optionsArray = JSON.parse(`[${match[1]}]`);
            return { cleanMessage, options: optionsArray };
        } catch (e) {
            console.error("Failed to parse AI options, applying fallback.", e);
            return { cleanMessage, options: ["Continue"] };
        }
    } else {
        console.warn("AI response missing a required tag ([options], [TYPE], or [END]). Applying fallback.");
        return {
            cleanMessage: response, // Return original response if tags are missing
            options: ["I understand"]
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