import express from 'express';
import { registerUser, loginUser, getMe, verifyPassword } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getMe);
router.post('/verify-password', protect, verifyPassword);

export default router;
