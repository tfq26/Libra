// /Backend/lib/ai-service.js

import axios from 'axios';
import { get_encoding } from "tiktoken";

// Azure-only configuration

function ensureAzureConfig() {
    // Read config at runtime (avoid module-load-time read which can race with dotenv.config)
    const key = process.env.AzureOpenAIApiKey || process.env.AZURE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    const endpoint = process.env.AzureOpenAIEndpoint || process.env.AZURE_OPENAI_ENDPOINT || process.env.OPENAI_ENDPOINT;
    const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || process.env.AzureOpenAIDeploymentName;

    if (!key) throw new Error('Azure OpenAI API key missing. Set AzureOpenAIApiKey or AZURE_OPENAI_API_KEY.');
    if (!endpoint) throw new Error('Azure OpenAI endpoint missing. Set AzureOpenAIEndpoint or AZURE_OPENAI_ENDPOINT.');
    if (!deploymentName) throw new Error('Azure OpenAI deployment name missing. Set AZURE_OPENAI_DEPLOYMENT_NAME.');
    return { key, endpoint, deploymentName };
}

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

export async function* callOpenAIStream(prompt, history = [], userProfile = {}) {
  try {
    const MODEL_CONTEXT_WINDOW = 8192;
    const RESPONSE_BUFFER = 1500;

    const messages = [SYSTEM_MESSAGE, ...history, { role: "user", content: prompt }];
    const inputTokens = countMessageTokens(messages);
    const maxTokensForResponse = MODEL_CONTEXT_WINDOW - inputTokens - RESPONSE_BUFFER;

    if (maxTokensForResponse < 0) {
      throw new Error("The conversation history is too long.");
    }
    
        console.log('[AI] Starting Azure SDK streaming call...');
        const { key, endpoint, deploymentName } = ensureAzureConfig();

        // Attempt to dynamically load the Azure SDK. If unavailable or its API
        // doesn't match what we expect, fall back to the HTTP REST POST.
        let client = null;
        let sdkSupportsStreaming = false;
        try {
            const azureModule = await import('@azure/openai');
            const coreAuth = await import('@azure/core-auth');
            const CandidateClient = azureModule.OpenAIClient || azureModule.OpenAI || azureModule.default || azureModule.OpenAIClient;
            const AzureKeyCredential = coreAuth.AzureKeyCredential || coreAuth.default?.AzureKeyCredential || coreAuth.default;
            if (CandidateClient) {
                try {
                    client = new CandidateClient(endpoint, new AzureKeyCredential(key));
                    // Detect streaming API
                    sdkSupportsStreaming = typeof client.listChatCompletions === 'function' || typeof client.getChatCompletions === 'function';
                } catch (e) {
                    console.warn('[AI] Azure SDK client init failed, will fall back to REST:', e && e.message ? e.message : e);
                    client = null;
                }
            }
        } catch (e) {
            console.warn('[AI] Could not load @azure/openai SDK, falling back to REST axios call:', e && e.message ? e.message : e);
            client = null;
        }

        // Normalize messages for SDK or REST consumption
        const normalizedMessages = (messages || []).map((m) => {
            const role = m.role || 'user';
            let content = '';
            if (typeof m.content === 'string') content = m.content;
            else if (m.content && typeof m.content === 'object') {
                if (typeof m.content.text === 'string') content = m.content.text;
                else if (typeof m.content.content === 'string') content = m.content.content;
                else content = JSON.stringify(m.content);
            } else if (m && typeof m === 'string') content = m;
            return { role, content };
        });
        // If we have an Azure SDK client and it supports streaming, use it
        if (client && sdkSupportsStreaming) {
            try {
                const stream = client.listChatCompletions(deploymentName, { messages: normalizedMessages, maxTokens: Math.min(maxTokensForResponse, 4096) });
                for await (const chunk of stream) {
                    if (chunk.choices && chunk.choices.length > 0) {
                        const delta = chunk.choices[0].delta;
                        if (delta && delta.content) yield delta.content;
                    }
                }
                return;
            } catch (e) {
                console.error('[AI] Azure SDK streaming error, falling back to REST:', e && e.stack ? e.stack : e);
                // fallthrough to REST
            }
        }

        // Fallback: call Azure REST API via axios
        try {
            const apiVersion = process.env.AZURE_OPENAI_API_VERSION || process.env.AZURE_OPENAI_API_VER || '2025-01-01-preview';
            let url = endpoint.replace(/\/$/, '');
            if (!/\/openai\//i.test(url)) {
                const dep = encodeURIComponent(deploymentName);
                url = `${url}/openai/deployments/${dep}/chat/completions?api-version=${apiVersion}`;
            }

            const resp = await axios.post(url, {
                messages: normalizedMessages,
                max_tokens: Math.min(maxTokensForResponse, 4096)
            }, {
                headers: {
                    'api-key': key,
                    'Content-Type': 'application/json'
                },
                timeout: 120000
            });

            const aiText = (resp.data && resp.data.choices && resp.data.choices[0] && (resp.data.choices[0].message?.content || resp.data.choices[0].message)) || '';
            yield aiText;
            return;
        } catch (e) {
            if (e && e.response && e.response.data) {
                console.error('[AI] Azure response error body:', JSON.stringify(e.response.data));
            }
            console.error('[AI] Azure HTTP call error:', e && e.stack ? e.stack : e);
            throw e;
        }

  } catch (error) {
        // Log full stack when available to help trace root cause
        console.error('[AI] Stream error:', error && error.stack ? error.stack : error.message || error);
    // Yield a friendly error message to the client
    yield `[ERROR] I'm sorry, I encountered an error while processing your request.`;
  }
}