const { app } = require('@azure/functions');
const { BlobServiceClient } = require('@azure/storage-blob');
const { v4: uuidv4 } = require('uuid');
const busboy = require('busboy');

// NOTE: You will need to install these packages in your function app.
// npm install @azure/storage-blob uuid busboy

// A placeholder function for the AI model call.
// In a production app, you would replace this with a real call to an Azure AI Service.
function callAiModel(prompt, imageUrl = null) {
    if (imageUrl) {
        console.log(`Analyzing image from URL: ${imageUrl} with prompt: '${prompt}'`);
        // Simulate a multi-modal analysis.
        if (prompt.toLowerCase().includes("error") || prompt.toLowerCase().includes("tv")) {
            return "AI Analysis: I see a television screen displaying an 'E500' error code. Is this correct?";
        } else {
            return "AI Analysis: I have analyzed the image, and it appears to be a technical component. I need more information to assist you.";
        }
    } else {
        console.log(`Processing text-only prompt: '${prompt}'`);
        // Simulate a text-only response.
        return `Solution for '${prompt}': Here are some helpful steps based on my analysis: 1. Reboot the device... 2. Check for loose connections... 3. Reinstall the software...`;
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

                const aiResponse = callAiModel(prompt);
                return { jsonBody: { response: aiResponse } };

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

                    const aiResponse = callAiModel(prompt, imageUrl);
                    resolve({ jsonBody: { response: aiResponse, imageUrl: imageUrl } });
                });

                request.body.pipe(bb);
            });
        } else {
            return { status: 415, body: "Unsupported Media Type. Please use application/json or multipart/form-data." };
        }
    }
});
