// controllers/userController.js
import bcrypt from 'bcryptjs';
import { userDB } from '../models/userDB.js';

// Register a new user
export async function registerUser(req, res) {
    try {
        const { name, email, password } = req.body;

        // 1) Basic validation
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Missing name, email, or password' });
        }

        // 2) Check if user already exists
        if (userDB[email]) {
            return res.status(400).json({ error: 'User already exists with that email' });
        }

        // 3) Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // 4) Store user in mock DB
        userDB[email] = {
            email,
            name,
            password: hashedPassword,
        };

        res.status(201).json({ message: 'User registered successfully!' });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

// Login an existing user
export async function loginUser(req, res) {
    try {
        const { email, password } = req.body;

        // 1) Basic validation
        if (!email || !password) {
            return res.status(400).json({ error: 'Missing email or password' });
        }

        // 2) Check if user exists
        const existingUser = userDB[email];
        if (!existingUser) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // 3) Compare password
        const isMatch = await bcrypt.compare(password, existingUser.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // 4) Store user in session
        req.session.user = {
            email: existingUser.email,
            name: existingUser.name,
        };

        res.status(200).json({ message: 'Login successful', user: req.session.user });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
