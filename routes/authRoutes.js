// routes/authRoutes.js
import { Router } from 'express';
import { registerUser, loginUser } from '../controllers/userController.js';
import { handleGoogleSignIn } from '../controllers/googleController.js';

const router = Router();

// POST /auth/register
router.post('/register', registerUser);

// POST /auth/login
router.post('/login', loginUser);

// POST /auth/google
router.post('/google', handleGoogleSignIn);

export default router;
