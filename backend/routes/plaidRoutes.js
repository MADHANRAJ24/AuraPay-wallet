import express from 'express';
import { createLinkToken, exchangePublicToken } from '../controllers/plaidController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/create-link-token', protect, createLinkToken);
router.post('/exchange-token', protect, exchangePublicToken);

export default router;
