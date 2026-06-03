import User from '../models/User.js';
import Transaction from '../models/Transaction.js';

// Verify recipient exists (for send money form validation)
export const verifyRecipient = async (req, res) => {
  const { recipient } = req.body; // Phone or UPI ID or Email

  try {
    if (!recipient) {
      return res.status(400).json({ success: false, message: 'Please enter a Phone, UPI ID, or Email' });
    }

    const query = {
      $or: [
        { upiId: recipient.trim() },
        { phone: recipient.trim() },
        { email: recipient.trim() }
      ]
    };

    // For Fallback DB compatibility, we do a manual or simple query
    // Our models handle the dynamic check.
    const user = await User.findOne({
      upiId: recipient.trim()
    }) || await User.findOne({
      phone: recipient.trim()
    }) || await User.findOne({
      email: recipient.trim()
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Recipient not found' });
    }

    if (user._id === req.user._id) {
      return res.status(400).json({ success: false, message: 'You cannot send money to yourself' });
    }

    res.json({
      success: true,
      data: {
        name: user.name,
        upiId: user.upiId,
        phone: user.phone
      }
    });
  } catch (error) {
    console.error('Verify Recipient Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Send Money API
export const sendMoney = async (req, res) => {
  const { recipientUpi, amount, remarks } = req.body;
  const senderId = req.user._id;

  try {
    const numAmount = Number(amount);
    if (!recipientUpi || isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid recipient or amount' });
    }

    // Verify recipient exists
    const recipient = await User.findOne({ upiId: recipientUpi });
    if (!recipient) {
      return res.status(404).json({ success: false, message: 'Recipient not found' });
    }

    if (recipient._id === senderId) {
      return res.status(400).json({ success: false, message: 'You cannot transfer money to yourself' });
    }

    // Verify sender has enough balance
    if (req.user.walletBalance < numAmount) {
      return res.status(400).json({ success: false, message: 'Insufficient wallet balance' });
    }

    // --- FRAUD DETECTION RULES ---
    let fraudScore = 0;

    // Rule 1: High Transaction Value
    if (numAmount >= 10000) {
      fraudScore += 60;
    } else if (numAmount >= 5000) {
      fraudScore += 30;
    }

    // Rule 2: Transaction Velocity (check transactions in the last 2 minutes)
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const userTrans = await Transaction.find({ senderId });
    const recentTrans = userTrans.filter(t => {
      const tDate = typeof t.createdAt === 'string' ? t.createdAt : t.createdAt.toISOString();
      return tDate >= twoMinutesAgo;
    });

    if (recentTrans.length >= 3) {
      fraudScore += 45;
    } else if (recentTrans.length >= 1) {
      fraudScore += 15;
    }

    // Rule 3: Sending to blocked user (if they somehow bypassed)
    if (recipient.status === 'blocked') {
      fraudScore += 90;
    }

    const isFlagged = fraudScore >= 50;

    // Deduct from sender and add to receiver
    await User.findByIdAndUpdate(senderId, { $inc: { walletBalance: -numAmount } });
    await User.findByIdAndUpdate(recipient._id, { $inc: { walletBalance: numAmount } });

    // Create Transaction
    const transaction = await Transaction.create({
      senderId,
      senderName: req.user.name,
      senderUpi: req.user.upiId,
      receiverId: recipient._id,
      receiverName: recipient.name,
      receiverUpi: recipient.upiId,
      amount: numAmount,
      type: 'send',
      status: 'success',
      remarks: remarks || 'Transfer from AuraPay Wallet',
      fraudScore,
      isFlagged
    });

    // --- SOCKET.IO REAL-TIME NOTIFICATIONS ---
    const io = req.app.get('socketio');
    if (io) {
      // Notify receiver about incoming funds
      io.to(recipient._id.toString()).emit('money_received', {
        type: 'receive',
        title: 'Money Received',
        message: `₹${numAmount.toLocaleString('en-IN')} received from ${req.user.name}.`,
        transaction
      });
      // Notify sender about successful transfer
      io.to(senderId.toString()).emit('money_sent', {
        type: 'send',
        title: 'Payment Successful',
        message: `₹${numAmount.toLocaleString('en-IN')} sent to ${recipient.name}.`,
        transaction
      });
    }

    res.json({
      success: true,
      message: isFlagged 
        ? 'Transaction completed (Flagged for security review)' 
        : 'Transaction completed successfully',
      data: {
        newWalletBalance: req.user.walletBalance - numAmount,
        transaction
      }
    });
  } catch (error) {
    console.error('Send Money Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get User's Transaction History
export const getTransactionHistory = async (req, res) => {
  const userId = req.user._id;

  try {
    // Find all transactions where user is sender OR receiver
    const allTrans = await Transaction.find({});
    
    // Sort transactions manually by date descending to support JSON DB correctly
    const userTrans = allTrans
      .filter(t => t.senderId === userId || t.receiverId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ success: true, data: userTrans });
  } catch (error) {
    console.error('Get Transactions Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
