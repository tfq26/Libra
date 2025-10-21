const axios = require('axios');
const readline = require('readline');

const AZURE_FUNCTION_URL = "http://localhost:7071/api/libra2";

// This will store our conversation
let conversationHistory = [];

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'You: '
});

console.log("Welcome to Libra 2.0 Terminal Chat!");
console.log("Type your message and press Enter.");
console.log("To exit the chat, type 'exit'.");

// The function now sends the prompt AND the history
const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 1000; // Start with a 1-second delay

async function sendTextPrompt(prompt, history) {
    let currentDelay = INITIAL_DELAY_MS;

    // Loop up to our maximum number of retries
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            // This is the same API call as before
            const response = await axios.post(AZURE_FUNCTION_URL, { prompt, history });
            const aiResponse = response.data.response;
            console.log("AI:", aiResponse);

            // If the request succeeds, update history and exit the loop
            conversationHistory.push({ role: "user", content: prompt });
            conversationHistory.push({ role: "assistant", content: aiResponse });
            return; // Success!

        } catch (error) {
            console.error(`Attempt ${attempt} failed:`, error.message);

            // If this was our last attempt, show the final error
            if (attempt === MAX_RETRIES) {
                console.error("All retry attempts failed. Please try again later.");
                if (error.response) {
                    console.error("Final response data:", error.response.data);
                }
                return; // Stop trying
            }

            // Wait before trying again
            console.log(`Retrying in ${currentDelay / 1000} seconds...`);
            await new Promise(resolve => setTimeout(resolve, currentDelay));

            // Double the delay for the next attempt (exponential backoff)
            currentDelay *= 2;
        }
    }
}


rl.on('line', (line) => {
    const trimmedLine = line.trim();

    if (trimmedLine.toLowerCase() === 'exit') {
        rl.close();
        return;
    }

    // Pass the recent history to the function
    const recentHistory = conversationHistory.slice(-10);
    sendTextPrompt(trimmedLine, recentHistory);

}).on('close', () => {
    console.log("Thank you for using Libra 2.0!");
    process.exit(0);
});

rl.prompt();