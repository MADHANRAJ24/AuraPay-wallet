import express from 'express';
import { 
  linkBankAccount, 
  getBankAccounts, 
  unlinkBankAccount, 
  updateProfile,
  getAllUsers 
} from '../controllers/userController.js';
import { protect } from '../middleware/auth.js';
import { admin } from '../middleware/admin.js';

const router = express.Router();

router.route('/profile').put(protect, updateProfile);
router.route('/banks').post(protect, linkBankAccount).get(protect, getBankAccounts);
router.route('/banks/:id').delete(protect, unlinkBankAccount);

// Admin-only route
router.route('/admin/users').get(protect, admin, getAllUsers);

export default router;
