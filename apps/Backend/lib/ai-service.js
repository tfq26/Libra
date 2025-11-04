// /Backend/lib/ai-service.js

import axios from 'axios';
import { get_encoding } from "tiktoken";
import { generateBlobSASUrl } from './blob-service.js';

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

9.  **Output Schema (STRICT):** Your message MUST match EXACTLY ONE of the following forms. Do not include any other tags or JSON. No code fences.
    * For multiple-choice: "[MC] <one concise instruction or question> [options: "Option 1", "Option 2", (up to 4 total)]"
    * For yes/no:        "[YN] <one concise instruction or question> [options: "Yes", "No"]"
    * For typed input:   "[TYPE] <one concise instruction requesting a specific input>"
    If you choose [TYPE], do NOT output an options tag. If you choose [YN], the options MUST be exactly Yes/No. If you choose [MC], include 2–4 short, actionable options only.

10. **Self-check before finalizing:** Re-read your message and confirm it matches the schema above. If not, FIX IT before you finish.

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

const ATTACHMENT_SIGNED_URL_TTL_SECONDS = parseInt(process.env.ATTACHMENT_SIGNED_URL_TTL_SECONDS || '900', 10);
const ATTACHMENT_IMAGE_DETAIL = process.env.AZURE_IMAGE_DETAIL_LEVEL || 'auto';

function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function stringifyProfile(userProfile = {}) {
    try {
        if (!userProfile || typeof userProfile !== 'object') return '';
        const entries = Object.entries(userProfile)
            .filter(([, value]) => value !== undefined && value !== null && value !== '')
            .map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`);
        if (!entries.length) return '';
        return `User context (may inform troubleshooting steps):\n${entries.join('\n')}`;
    } catch (err) {
        return '';
    }
}

async function toAzureMessage(message) {
    if (!message) return null;

    const role = message.role || 'user';
    const rawContent = message.content ?? message.text ?? message.message ?? '';

    if (typeof rawContent === 'string') {
        const text = rawContent.trim();
        return { role, content: text || '' };
    }

    if (!isPlainObject(rawContent)) {
        return { role, content: String(rawContent ?? '') };
    }

    const parts = [];
    if (typeof rawContent.text === 'string' && rawContent.text.trim().length > 0) {
        parts.push({ type: 'text', text: rawContent.text.trim() });
    }

    if (Array.isArray(rawContent.attachments)) {
        for (const attachment of rawContent.attachments) {
            if (!attachment || typeof attachment !== 'object') continue;

            let url = attachment.signedUrl || attachment.url || null;
            if (!url && attachment.blobName) {
                try {
                    url = await generateBlobSASUrl(attachment.blobName, ATTACHMENT_SIGNED_URL_TTL_SECONDS);
                } catch (err) {
                    console.warn('[AI] Failed to sign attachment for vision request', attachment.blobName, err.message || err);
                }
            }

            if (!url) continue;

            parts.push({
                type: 'image_url',
                image_url: {
                    url,
                    detail: ATTACHMENT_IMAGE_DETAIL
                }
            });
        }
    }

    if (parts.length === 0) {
        return { role, content: '' };
    }
    if (parts.length === 1 && parts[0].type === 'text') {
        return { role, content: parts[0].text };
    }
    return { role, content: parts };
}

async function buildMessageSequence({ prompt, userMessage, history = [], userProfile }) {
    const messages = [SYSTEM_MESSAGE];

    const profileContext = stringifyProfile(userProfile);
    if (profileContext) {
        messages.push({ role: 'system', content: profileContext });
    }

    for (const historic of history) {
        const azureMsg = await toAzureMessage(historic);
        if (azureMsg) messages.push(azureMsg);
    }

    if (userMessage) {
        const azureUserMsg = await toAzureMessage(userMessage);
        if (azureUserMsg) messages.push(azureUserMsg);
    } else if (typeof prompt === 'string' && prompt.trim().length > 0) {
        messages.push({ role: 'user', content: prompt.trim() });
    }

    return messages;
}

function normalizeStreamArguments(input, legacyHistory, legacyProfile) {
    if (isPlainObject(input) && (input.prompt || input.userMessage)) {
        return {
            prompt: input.prompt,
            userMessage: input.userMessage,
            history: input.history ?? legacyHistory ?? [],
            userProfile: input.userProfile ?? legacyProfile ?? {}
        };
    }

    const prompt = typeof input === 'string' ? input : String(input ?? '');
    return {
        prompt,
        history: legacyHistory ?? [],
        userProfile: legacyProfile ?? {}
    };
}

// --- Token Counting ---
export function countMessageTokens(messages) {
    const encoding = get_encoding("cl100k_base");
    let numTokens = 0;
    for (const message of messages) {
        numTokens += 3;
        for (const [key, value] of Object.entries(message)) {
            if (typeof value === 'string') {
                numTokens += encoding.encode(value).length;
            } else if (Array.isArray(value)) {
                for (const part of value) {
                    if (typeof part === 'string') {
                        numTokens += encoding.encode(part).length;
                    } else if (part && typeof part === 'object' && typeof part.text === 'string') {
                        numTokens += encoding.encode(part.text).length;
                    }
                }
            } else if (value && typeof value === 'object' && typeof value.text === 'string') {
                numTokens += encoding.encode(value.text).length;
            }
        }
    }
    numTokens += 3;
    encoding.free();
    return numTokens;
}

// --- Response Parsing ---
export function parseAIResponse(rawResponse) {
    const text = (rawResponse ?? '').toString().trim();

    // Detect explicit end
    const endMatch = text.match(/\[END\s+(Y|N)\]$/i);
    if (endMatch) {
        const clean = text.replace(/\[END\s+(Y|N)\]$/i, '').trim();
        return { cleanMessage: clean, options: [], isDone: true };
    }

    // Identify leading tag
    let tag = null;
    if (/^\s*\[TYPE\]/i.test(text)) tag = 'TYPE';
    else if (/^\s*\[YN\]/i.test(text)) tag = 'YN';
    else if (/^\s*\[MC\]/i.test(text)) tag = 'MC';

    // Strip known tag from start and capture message
    let cleaned = text.replace(/^\s*\[(MC|YN|TYPE)\]\s*/i, '').trim();

    // Extract [options: ...] if present
    const optionsRegex = /\[options:\s*([^\]]+)\]/i;
    let options = [];
    const m = cleaned.match(optionsRegex);
    if (m && m[1]) {
        try {
            options = JSON.parse(`[${m[1]}]`).map(String);
        } catch (_) {
            options = [];
        }
        cleaned = cleaned.replace(optionsRegex, '').trim();
    }

    // Repair/Enforce schema
    const clampOptions = (arr, min, max, fallback) => {
        const list = Array.isArray(arr) ? arr.filter(v => typeof v === 'string' && v.trim()).map(v => v.trim()) : [];
        if (list.length < min) return fallback;
        return list.slice(0, max);
    };

    if (!tag) {
        // Infer a reasonable tag when missing
        if (/\b(yes|no)\b/i.test(cleaned) && cleaned.includes('?')) tag = 'YN';
        else if (/\b(choose|select|pick|option|options)\b/i.test(cleaned)) tag = 'MC';
        else tag = 'TYPE';
    }

    if (tag === 'TYPE') {
        options = [];
    } else if (tag === 'YN') {
        options = ['Yes', 'No'];
    } else if (tag === 'MC') {
        options = clampOptions(options, 2, 4, ['Continue', 'Something else']);
    }

    return { cleanMessage: cleaned, options, isDone: false };
}

export async function* callOpenAIStream(input, history = [], userProfile = {}) {
  try {
    const MODEL_CONTEXT_WINDOW = 8192;
    const RESPONSE_BUFFER = 1500;

        const normalizedArgs = normalizeStreamArguments(input, history, userProfile);
        const messages = await buildMessageSequence(normalizedArgs);
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
            if (Array.isArray(m.content)) {
                return { role, content: m.content };
            }
            return { role, content: m.content ?? '' };
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

export async function callOpenAI(input, history = [], userProfile = {}) {
    let fullResponse = '';
    for await (const chunk of callOpenAIStream(input, history, userProfile)) {
        fullResponse += chunk;
    }
    return fullResponse;
}

// --- Title Generation (bypasses main SYSTEM_MESSAGE) ---
export async function generateConversationTitle({ userText = '', assistantText = '' } = {}) {
    try {
        const { key, endpoint, deploymentName } = ensureAzureConfig();
        const apiVersion = process.env.AZURE_OPENAI_API_VERSION || process.env.AZURE_OPENAI_API_VER || '2025-01-01-preview';

        let url = endpoint.replace(/\/$/, '');
        if (!/\/openai\//i.test(url)) {
            const dep = encodeURIComponent(deploymentName);
            url = `${url}/openai/deployments/${dep}/chat/completions?api-version=${apiVersion}`;
        }

        const TITLE_SYSTEM_PROMPT = [
            'You are a title generator for technical troubleshooting chats.',
            'Return a concise, specific title that captures the main technology or problem.',
            'Hard rules:',
            '- 3–6 words, Title Case.',
            '- No punctuation, no quotes, no emojis.',
            '- Output ONLY the title text, nothing else.',
        ].join('\n');

        const trimmedUser = (userText || '').toString().trim().slice(0, 500);
        const trimmedAssistant = (assistantText || '').toString().trim().slice(0, 800);

        const messages = [
            { role: 'system', content: TITLE_SYSTEM_PROMPT },
            { role: 'user', content: `User: ${trimmedUser || '[image or attachment]'}\nAssistant: ${trimmedAssistant || '[pending]'}` },
        ];

        const resp = await axios.post(url, {
            messages,
            temperature: 0.2,
            max_tokens: 16,
        }, {
            headers: {
                'api-key': key,
                'Content-Type': 'application/json'
            },
            timeout: 20000
        });

        const raw = resp?.data?.choices?.[0]?.message?.content || '';
        // Sanitize: strip newlines/punctuation, clamp length
        const cleaned = String(raw)
            .replace(/[\n\r]+/g, ' ')
            .replace(/["'`“”‘’•·\[\]\(\)\.:;!,?]+/g, '')
            .trim()
            .slice(0, 60);
        return cleaned || 'New Chat';
    } catch (e) {
        console.warn('[AI] Title generation failed:', e?.message || e);
        // Fallback handled by caller
        return 'New Chat';
    }
}