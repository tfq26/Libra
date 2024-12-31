import dotenv from 'dotenv';
dotenv.config(); // Load environment variables
import { GoogleGenerativeAI } from "@google/generative-ai";


class GeminiService {
    constructor() {
        this.apiKey = process.env.GEMINI_API_KEY;
        if (!this.apiKey) {
            throw new Error("GEMINI_API_KEY is not set in the .env file.");
        }
        this.genAI = new GoogleGenerativeAI(this.apiKey);
        this.model = null;
    }

    /**
     * Initializes the model for generating content.
     * @param {string} modelName - The name of the generative model (default: "gemini-1.5-flash").
     */
    async initializeModel(modelName = "gemini-1.5-flash") {
        try {
            this.model = await this.genAI.getGenerativeModel({ model: modelName });
            console.log(`Model "${modelName}" initialized successfully.`);
        } catch (error) {
            console.error("Failed to initialize model:", error.message);
            throw new Error("Error initializing Gemini model.");
        }
    }

    /**
     * Sends a user prompt to the Gemini API and retrieves its response.
     * @param {string} userMessage - The user's message to send to Gemini.
     * @returns {Promise<string>} - The response from Gemini.
     */
    async sendToGemini(userMessage) {
        if (!this.model) {
            throw new Error("Model is not initialized. Call initializeModel first.");
        }

        try {
            console.log("Sending user message to Gemini:", userMessage);

            const result = await this.model.generateContent(userMessage);
            console.log("Raw Gemini API response:", JSON.stringify(result.response, null, 2));

            // Extract candidates array
            const candidates = result.response.candidates;

            // Ensure candidates exist and extract the first candidate's content
            if (Array.isArray(candidates) && candidates.length > 0) {
                const content = candidates[0]?.content;

                // Extract the parts array from content
                const parts = content?.parts;

                if (Array.isArray(parts) && parts.length > 0) {
                    const botResponse = parts[0]?.text;
                    if (botResponse) {
                        console.log("Extracted text:", botResponse);
                        return botResponse.trim(); // Trim whitespace and return response
                    }
                }
            }

            // If no valid response text is found
            throw new Error("No valid response text found in parts");
        } catch (error) {
            console.error("Error communicating with Gemini:", error.message);
            throw new Error("Failed to communicate with Google Gemini.");
        }
    }
}

export default GeminiService; // Add this line