const { app } = require('@azure/functions');
const { BlobServiceClient } = require('@azure/storage-blob');
const { v4: uuidv4 } = require('uuid');
const busboy = require('busboy');
const axios = require('axios');

// NOTE: You will need to install these packages in your function app.
// npm install @azure/storage-blob uuid busboy axios

// A function to call the real Azure OpenAI multi-modal model
async function callOpenAI(prompt, imageUrl = null) {
    try {
        const apiKey = process.env.AzureOpenAIApiKey;
        const endpoint = process.env.AzureOpenAIEndpoint;
        const deploymentName = process.env.AzureOpenAIDeploymentName; // Assumed to be configured
        const apiVersion = "2024-02-15-preview";

        const headers = {
            'Content-Type': 'application/json',
            'api-key': apiKey,
        };

        const messages = [{
            role: "user",
            content: []
        }];

        if (imageUrl) {
            messages[0].content.push({ type: "text", text: prompt });
            messages[0].content.push({ type: "image_url", image_url: { url: imageUrl } });
        } else {
            messages[0].content.push({ type: "text", text: prompt });
        }

        const payload = {
            messages,
            stream: false,
            model: "gpt-4o",
            max_tokens: 1000
        };

        const response = await axios.post(
            `${endpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=${apiVersion}`,
            payload,
            { headers }
        );

        return response.data.choices[0].message.content;

    } catch (error) {
        console.error("Error calling Azure OpenAI:", error.response ? error.response.data : error.message);
        throw new Error("Failed to get response from AI model.");
    }
}

// A helper function to upload a buffer to Azure Blob Storage
async function uploadToBlobStorage(imageBuffer, containerName, fileName) {
    try {
        // NOTE: Ensure your AzureWebJobsStorage connection string is set as an environment variable
        const connectionString = process.env.AzureWebJobsStorage;
        if (!connectionString) {
            throw new Error("AzureWebJobsStorage connection string not found.");
        }

        const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
        const containerClient = blobServiceClient.getContainerClient(containerName);

        // Create container if it doesn't exist
        await containerClient.createIfNotExists();

        const blockBlobClient = containerClient.getBlockBlobClient(fileName);
        await blockBlobClient.uploadData(imageBuffer, {
            blobHTTPHeaders: { blobContentType: 'image/jpeg' },
        });

        return blockBlobClient.url;
    } catch (error) {
        console.error("Failed to upload image to blob storage:", error);
        return null;
    }
}

// Main HTTP Trigger for the Azure Function
app.http('libra2', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log('HTTP trigger function processed a request.');

        const contentType = request.headers['content-type'] || '';

        // Handle JSON request for text-only input
        if (contentType.includes('application/json')) {
            try {
                const body = await request.json();
                const prompt = body.prompt;

                if (!prompt) {
                    return { status: 400, body: "Please pass a 'prompt' in the request body." };
                }

                try {
                    const aiResponse = await callOpenAI(prompt);
                    return { jsonBody: { response: aiResponse } };
                } catch (error) {
                    return { status: 500, body: "Error processing AI request." };
                }

            } catch (error) {
                return { status: 400, body: "Invalid JSON format." };
            }
        }
        // Handle multipart/form-data for image upload
        else if (contentType.includes('multipart/form-data')) {
            return new Promise((resolve) => {
                const bb = busboy({ headers: request.headers });
                let fileBuffer = null;
                let fileName = null;
                let prompt = null;

                bb.on('file', (name, file, info) => {
                    fileName = `${uuidv4()}-${info.filename}`;
                    const chunks = [];
                    file.on('data', (chunk) => chunks.push(chunk));
                    file.on('end', () => {
                        fileBuffer = Buffer.concat(chunks);
                    });
                });

                bb.on('field', (name, value) => {
                    if (name === 'prompt') {
                        prompt = value;
                    }
                });

                bb.on('close', async () => {
                    if (!fileBuffer || !prompt) {
                        resolve({ status: 400, body: "Missing file or prompt in form data." });
                        return;
                    }

                    const containerName = "libra-images";
                    const imageUrl = await uploadToBlobStorage(fileBuffer, containerName, fileName);

                    if (!imageUrl) {
                        resolve({ status: 500, body: "Failed to upload image." });
                        return;
                    }

                    try {
                        const aiResponse = await callOpenAI(prompt, imageUrl);
                        resolve({ jsonBody: { response: aiResponse, imageUrl: imageUrl } });
                    } catch (error) {
                        resolve({ status: 500, body: "Error processing AI request with image." });
                    }
                });

                request.body.pipe(bb);
            });
        } else {
            return { status: 415, body: "Unsupported Media Type. Please use application/json or multipart/form-data." };
        }
    }
});
