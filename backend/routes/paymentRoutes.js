import express from 'express';
import { addMoneyToWallet, rechargeMobile, payUtilityBill } from '../controllers/paymentController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/add-money', protect, addMoneyToWallet);
router.post('/recharge', protect, rechargeMobile);
router.post('/billpay', protect, payUtilityBill);

export default router;
