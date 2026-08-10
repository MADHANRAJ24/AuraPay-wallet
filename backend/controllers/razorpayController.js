import Razorpay from 'razorpay';
import crypto from 'crypto';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';

// Setup Razorpay client
// Use mock key values if not specified in .env
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_mockKeyId123',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'rzp_test_mockSecret456'
});

// 1. Create Razorpay order for adding money to wallet
export const createOrder = async (req, res) => {
  const { amount } = req.body;

  try {
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }

    const options = {
      amount: Math.round(numAmount * 100), // Razorpay amount in paise (smallest unit)
      currency: 'INR',
      receipt: `rcpt_load_${Date.now()}`
    };

    // If utilizing mock/unconfigured developer keys, return a mock success order
    if (process.env.RAZORPAY_KEY_ID === 'rzp_test_mockKeyId123' || !process.env.RAZORPAY_KEY_ID) {
      return res.json({
        success: true,
        isMock: true,
        order: {
          id: `order_mock_${Math.random().toString(36).substring(2, 9)}`,
          amount: options.amount,
          currency: options.currency,
          receipt: options.receipt
        }
      });
    }

    const order = await razorpay.orders.create(options);
    res.json({ success: true, isMock: false, order, key_id: process.env.RAZORPAY_KEY_ID });
  } catch (error) {
    console.error('Razorpay Create Order Error:', error);
    res.status(500).json({ success: false, message: 'Failed to create payment order' });
  }
};

// 2. Verify payment signature
export const verifyPayment = async (req, res) => {
  const { 
    razorpay_order_id, 
    razorpay_payment_id, 
    razorpay_signature, 
    amount,
    isMock 
  } = req.body;
  const userId = req.user._id;

  try {
    const numAmount = Number(amount);
    let verified = false;

    const isMockAllowed = process.env.RAZORPAY_KEY_ID === 'rzp_test_mockKeyId123' || !process.env.RAZORPAY_KEY_ID;
    if (isMock && isMockAllowed) {
      // Mock mode verification bypass
      verified = true;
    } else {
      const text = razorpay_order_id + '|' + razorpay_payment_id;
      const signatureSecret = process.env.RAZORPAY_KEY_SECRET || 'rzp_test_mockSecret456';
      
      const generated_signature = crypto
        .createHmac('sha256', signatureSecret)
        .update(text)
        .digest('hex');

      verified = (generated_signature === razorpay_signature);
    }

    if (!verified) {
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }

    // Deduct/Credit balances
    const updatedUser = await User.findByIdAndUpdate(userId, { $inc: { walletBalance: numAmount } });

    // Log transaction
    const transaction = await Transaction.create({
      senderId: null,
      senderName: 'Razorpay PG Gateway',
      senderUpi: `TXN_${razorpay_payment_id || 'MOCK_PAY_ID'}`,
      receiverId: userId,
      receiverName: req.user.name,
      receiverUpi: req.user.upiId,
      amount: numAmount,
      type: 'wallet_load',
      status: 'success',
      remarks: 'Loaded money via Razorpay UPI Checkout'
    });

    // --- SOCKET.IO REAL-TIME NOTIFICATION ---
    const io = req.app.get('socketio');
    if (io) {
      // Notify current user about successful wallet load
      io.to(userId.toString()).emit('money_received', {
        type: 'wallet_load',
        title: 'Funds Loaded Successfully',
        message: `₹${numAmount.toLocaleString('en-IN')} has been added to your wallet via UPI.`,
        transaction
      });
    }

    res.json({
      success: true,
      message: 'Payment verified and credited to wallet',
      data: {
        newWalletBalance: updatedUser.walletBalance + numAmount,
        transaction
      }
    });
  } catch (error) {
    console.error('Verify Payment Error:', error);
    res.status(500).json({ success: false, message: 'Server error during verification' });
  }
};
