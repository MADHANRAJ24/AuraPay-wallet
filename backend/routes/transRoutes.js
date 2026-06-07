import express from 'express';
import { 
  sendMoney, 
  verifyRecipient, 
  getTransactionHistory,
  createPaymentRequest,
  getPaymentRequests,
  handlePaymentRequest,
  getRewards,
  claimReward,
  toggleUpiLite,
  fundUpiLite
} from '../controllers/transController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/send', protect, sendMoney);
router.post('/verify', protect, verifyRecipient);
router.get('/history', protect, getTransactionHistory);

// P2P Request Routes
router.post('/request', protect, createPaymentRequest);
router.get('/requests', protect, getPaymentRequests);
router.post('/requests/:id/action', protect, handlePaymentRequest);

// Rewards (Scratch Card) Routes
router.get('/rewards', protect, getRewards);
router.post('/rewards/:id/scratch', protect, claimReward);

// UPI Lite Routes
router.post('/upilite/toggle', protect, toggleUpiLite);
router.post('/upilite/fund', protect, fundUpiLite);

export default router;
