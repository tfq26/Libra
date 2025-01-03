import express from 'express';
import cors from 'cors';
import session from 'express-session';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import GeminiService from './services/GeminiServices.js'; // Import the GeminiService class

dotenv.config();

const app = express();

// 1) Configure CORS
app.use(
    cors({
        origin: 'https://testlibra.vercel.app/', // Update this if your frontend runs elsewhere
        credentials: true,
    })
);

// 2) Parse JSON bodies
app.use(express.json());

// 3) Session middleware
app.use(
    session({
        secret: process.env.SESSION_SECRET || 'someRandomSecret',
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            secure: false, // Set to true in production with HTTPS
            maxAge: 1000 * 60 * 60, // 1 hour
        },
    })
);

// 4) Mount auth routes
app.use('/auth', authRoutes);

// Initialize the GeminiService instance
const geminiService = new GeminiService();
(async () => {
    try {
        // Initialize the model
        await geminiService.initializeModel();
        console.log('GeminiService initialized successfully.');
    } catch (error) {
        console.error('Failed to initialize GeminiService:', error.message);
        process.exit(1); // Exit the process if the service cannot initialize
    }
})();

// 5) POST / (Frontend Communication and Gemini Interaction)
app.post('/', async (req, res) => {
    const { userName, message } = req.body;

    try {
        console.log(`Received message from ${userName}: ${message}`);

        // Use the GeminiService instance to send the user's message and get the response
        const geminiResponse = await geminiService.sendToGemini(message);

        // Send the Gemini response back to the frontend
        res.status(200).json({ message: geminiResponse });
    } catch (error) {
        console.error('Error processing Gemini response:', error.message);
        res.status(500).json({ error: 'Failed to process response from Gemini' });
    }
});

// 6) Example protected route
app.get('/profile', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Unauthorized: Not logged in' });
    }
    return res.status(200).json({
        message: `Hello, ${req.session.user.name}`,
        user: req.session.user,
    });
});

// 7) Logout route
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
        }
        res.clearCookie('connect.sid');
        res.status(200).json({ message: 'Logged out successfully' });
    });
});

// 8) Start server
const PORT = process.env.PORT || 5174;

// Start the server and save the reference
const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Graceful Shutdown
const handleExit = (signal) => {
    console.log(`\nReceived ${signal}. Cleaning up...`);
    server.close(() => {
        console.log('Server closed gracefully.');
        process.exit(0); // Exit the process
    });
};

// Listen for termination signals
process.on('SIGINT', handleExit); // Handles Ctrl+C
process.on('SIGTERM', handleExit); // Handles system termination signals

// Catch uncaught exceptions (optional)
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1); // Exit with failure
});
