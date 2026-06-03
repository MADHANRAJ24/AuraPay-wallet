import express from 'express';
import { getAdminStats, getAllTransactions, toggleUserStatus } from '../controllers/adminController.js';
import { protect } from '../middleware/auth.js';
import { admin } from '../middleware/admin.js';

const router = express.Router();

router.get('/stats', protect, admin, getAdminStats);
router.get('/transactions', protect, admin, getAllTransactions);
router.put('/users/:id/status', protect, admin, toggleUserStatus);

export default router;
