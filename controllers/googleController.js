// controllers/googleController.js
import fetch from 'node-fetch';
import { userDB } from '../models/userDB.js';

/**
 * POST /auth/google
 * Expects { accessToken } in the body
 */
export async function handleGoogleSignIn(req, res) {
    try {
        const { accessToken } = req.body;
        if (!accessToken) {
            return res.status(400).json({ error: 'No access token provided' });
        }

        // 1) Fetch user info from Google
        const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        const profile = await response.json();

        // 2) Check if Google response is valid
        if (!profile || !profile.email) {
            return res.status(401).json({ error: 'Invalid Google token' });
        }

        // 3) Check if user exists in DB
        let existingUser = userDB[profile.email];
        if (!existingUser) {
            // Create a new user record if it doesn't exist
            existingUser = {
                email: profile.email,
                name: profile.name,
                googleId: profile.sub, // sub is Google’s unique user ID
                // No password field needed if they're purely a Google user
            };
            userDB[profile.email] = existingUser;
        }

        // 4) Store user in session
        req.session.user = {
            email: existingUser.email,
            name: existingUser.name,
        };

        res.status(200).json({ message: 'Google sign-in successful', user: req.session.user });
    } catch (err) {
        console.error('Error verifying Google token:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
