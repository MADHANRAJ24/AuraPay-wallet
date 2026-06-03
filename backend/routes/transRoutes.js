import express from 'express';
import { sendMoney, verifyRecipient, getTransactionHistory } from '../controllers/transController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/send', protect, sendMoney);
router.post('/verify', protect, verifyRecipient);
router.get('/history', protect, getTransactionHistory);

export default router;
