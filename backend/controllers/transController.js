import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import Reward from '../models/Reward.js';
import PaymentRequest from '../models/PaymentRequest.js';

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

    if (user._id.toString() === req.user._id.toString()) {
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

    if (recipient._id.toString() === senderId.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot transfer money to yourself' });
    }

    // Verify sender has enough balance (checking if UPI Lite can be used)
    const isUpiLiteUsed = req.user.upiLiteEnabled && numAmount <= 200 && req.user.upiLiteBalance >= numAmount;

    if (isUpiLiteUsed) {
      // Deduct from UPI Lite balance atomically if sufficient
      const updatedSender = await User.findOneAndUpdate(
        { _id: senderId, upiLiteBalance: { $gte: numAmount } },
        { $inc: { upiLiteBalance: -numAmount } }
      );
      if (!updatedSender) {
        return res.status(400).json({ success: false, message: 'Insufficient UPI Lite balance' });
      }
    } else {
      // Deduct from main wallet balance atomically if sufficient
      const updatedSender = await User.findOneAndUpdate(
        { _id: senderId, walletBalance: { $gte: numAmount } },
        { $inc: { walletBalance: -numAmount } }
      );
      if (!updatedSender) {
        return res.status(400).json({ success: false, message: 'Insufficient wallet balance' });
      }
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

    // Credit to receiver
    await User.findByIdAndUpdate(recipient._id, { $inc: { walletBalance: numAmount } });

    // Create Transaction
    const transaction = await Transaction.create({
      senderId,
      senderName: req.user.name,
      senderUpi: isUpiLiteUsed ? `${req.user.upiId.split('@')[0]}@upilite` : req.user.upiId,
      receiverId: recipient._id,
      receiverName: recipient.name,
      receiverUpi: recipient.upiId,
      amount: numAmount,
      type: 'send',
      status: 'success',
      remarks: remarks || (isUpiLiteUsed ? 'Transfer via UPI Lite' : 'Transfer from AuraPay Wallet'),
      fraudScore,
      isFlagged
    });

    // --- REWARD GENERATION ---
    // 40% probability to award scratch card on transactions >= ₹100
    let wonReward = null;
    if (numAmount >= 100 && Math.random() < 0.40) {
      const rewardAmount = Math.floor(Math.random() * 46) + 5; // ₹5 to ₹50
      wonReward = await Reward.create({
        userId: senderId,
        amount: rewardAmount,
        isClaimed: false
      });
    }

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
        transaction,
        wonReward: wonReward ? true : false
      });
      if (wonReward && io) {
        io.to(senderId.toString()).emit('reward_won', {
          message: `🎉 You've won a Scratch Card! Claim your reward now.`,
          amount: wonReward.amount
        });
      }
    }

    const updatedUser = await User.findById(senderId);
    res.json({
      success: true,
      message: isFlagged 
        ? 'Transaction completed (Flagged for security review)' 
        : 'Transaction completed successfully',
      data: {
        newWalletBalance: updatedUser.walletBalance,
        newUpiLiteBalance: updatedUser.upiLiteBalance,
        transaction,
        wonReward: wonReward ? true : false
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
    const allTrans = await Transaction.find({});
    const userIdStr = userId.toString();

    const userTrans = allTrans
      .filter(t => {
        const senderId = typeof t.senderId === 'string' ? t.senderId : t.senderId?.toString();
        const receiverId = typeof t.receiverId === 'string' ? t.receiverId : t.receiverId?.toString();
        return senderId === userIdStr || receiverId === userIdStr;
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ success: true, data: userTrans });
  } catch (error) {
    console.error('Get Transactions Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Create payment request
export const createPaymentRequest = async (req, res) => {
  const { recipientUpi, amount, remarks } = req.body;
  const senderId = req.user._id;

  try {
    const numAmount = Number(amount);
    if (!recipientUpi || isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid recipient or amount' });
    }

    const receiver = await User.findOne({ upiId: recipientUpi });
    if (!receiver) {
      return res.status(404).json({ success: false, message: 'Recipient not found' });
    }

    if (receiver._id.toString() === senderId.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot request money from yourself' });
    }

    const request = await PaymentRequest.create({
      senderId,
      senderName: req.user.name,
      senderUpi: req.user.upiId,
      receiverId: receiver._id,
      receiverName: receiver.name,
      receiverUpi: receiver.upiId,
      amount: numAmount,
      remarks: remarks || 'Payment request'
    });

    const io = req.app.get('socketio');
    if (io) {
      io.to(receiver._id.toString()).emit('payment_requested', {
        type: 'request',
        title: 'Payment Requested',
        message: `${req.user.name} has requested ₹${numAmount} from you.`,
        request
      });
    }

    res.json({ success: true, message: `Payment request of ₹${numAmount} sent to ${receiver.name}`, data: request });
  } catch (error) {
    console.error('Create Payment Request Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get pending payment requests for the logged-in user
export const getPaymentRequests = async (req, res) => {
  const userId = req.user._id;

  try {
    const allRequests = await PaymentRequest.find({});
    const userIdStr = userId.toString();
    
    const requests = allRequests.filter(r => {
      const receiverId = typeof r.receiverId === 'string' ? r.receiverId : r.receiverId?.toString();
      return receiverId === userIdStr && r.status === 'pending';
    });

    res.json({ success: true, data: requests });
  } catch (error) {
    console.error('Get Payment Requests Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Approve or decline a payment request
export const handlePaymentRequest = async (req, res) => {
  const { action } = req.body; // 'approve' or 'decline'
  const { id } = req.params;
  const receiverId = req.user._id;

  try {
    const request = await PaymentRequest.findById(id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Payment request not found' });
    }

    if (request.receiverId.toString() !== receiverId.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // Acquire atomic status transition lock
    const updatedRequest = await PaymentRequest.updateOne(
      { _id: id, receiverId: receiverId, status: 'pending' },
      { $set: { status: action === 'approve' ? 'approved' : 'declined' } }
    );

    if (updatedRequest.matchedCount === 0) {
      const exists = await PaymentRequest.findById(id);
      if (!exists) {
        return res.status(404).json({ success: false, message: 'Payment request not found' });
      }
      if (exists.receiverId.toString() !== receiverId.toString()) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }
      return res.status(400).json({ success: false, message: 'Request is already processed' });
    }

    if (action === 'decline') {
      const io = req.app.get('socketio');
      if (io) {
        io.to(request.senderId.toString()).emit('request_declined', {
          message: `${req.user.name} declined your request for ₹${request.amount}.`
        });
      }

      return res.json({ success: true, message: 'Payment request declined successfully' });
    }

    if (action === 'approve') {
      // Deduct balance atomically if sufficient
      const updatedReceiver = await User.findOneAndUpdate(
        { _id: receiverId, walletBalance: { $gte: request.amount } },
        { $inc: { walletBalance: -request.amount } }
      );
      
      if (!updatedReceiver) {
        // Rollback request status lock
        await PaymentRequest.findByIdAndUpdate(id, { status: 'pending' });
        return res.status(400).json({ success: false, message: 'Insufficient wallet balance' });
      }

      // Credit sender
      await User.findByIdAndUpdate(request.senderId, { $inc: { walletBalance: request.amount } });

      const transaction = await Transaction.create({
        senderId: receiverId,
        senderName: req.user.name,
        senderUpi: req.user.upiId,
        receiverId: request.senderId,
        receiverName: request.senderName,
        receiverUpi: request.senderUpi,
        amount: request.amount,
        type: 'send',
        status: 'success',
        remarks: request.remarks || 'Approved payment request'
      });

      const io = req.app.get('socketio');
      if (io) {
        io.to(request.senderId.toString()).emit('money_received', {
          type: 'receive',
          title: 'Request Approved',
          message: `₹${request.amount} received from ${req.user.name} (Approved Request).`,
          transaction
        });

        io.to(receiverId.toString()).emit('money_sent', {
          type: 'send',
          title: 'Payment Approved',
          message: `₹${request.amount} sent to ${request.senderName}.`,
          transaction
        });
      }

      if (request.amount >= 100 && Math.random() < 0.40) {
        const rewardAmount = Math.floor(Math.random() * 46) + 5;
        await Reward.create({
          userId: receiverId,
          amount: rewardAmount,
          isClaimed: false
        });
        if (io) {
          io.to(receiverId.toString()).emit('reward_won', {
            message: `🎉 You've won a Scratch Card! Claim your reward now.`,
            amount: rewardAmount
          });
        }
      }

      return res.json({ success: true, message: 'Payment request approved and paid successfully', data: transaction });
    }

    res.status(400).json({ success: false, message: 'Invalid action' });
  } catch (error) {
    console.error('Handle Payment Request Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Fetch scratch cards for the user
export const getRewards = async (req, res) => {
  const userId = req.user._id;

  try {
    const allRewards = await Reward.find({});
    const userIdStr = userId.toString();
    
    const rewards = allRewards
      .filter(r => {
        const rUserId = typeof r.userId === 'string' ? r.userId : r.userId?.toString();
        return rUserId === userIdStr;
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ success: true, data: rewards });
  } catch (error) {
    console.error('Get Rewards Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Claim scratch card
export const claimReward = async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  try {
    const reward = await Reward.findById(id);
    if (!reward) {
      return res.status(404).json({ success: false, message: 'Reward card not found' });
    }

    if (reward.userId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // Acquire atomic status update lock
    const updatedReward = await Reward.updateOne(
      { _id: id, userId: userId, isClaimed: false },
      { $set: { isClaimed: true } }
    );

    if (updatedReward.matchedCount === 0) {
      const exists = await Reward.findById(id);
      if (!exists) {
        return res.status(404).json({ success: false, message: 'Reward card not found' });
      }
      if (exists.userId.toString() !== userId.toString()) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }
      return res.status(400).json({ success: false, message: 'Reward already claimed' });
    }

    const updatedUser = await User.findByIdAndUpdate(userId, { $inc: { walletBalance: reward.amount } }, { new: true });

    await Transaction.create({
      senderId: null,
      senderName: 'AuraPay Rewards Office',
      senderUpi: 'cashback@rewards',
      receiverId: userId,
      receiverName: req.user.name,
      receiverUpi: req.user.upiId,
      amount: reward.amount,
      type: 'wallet_load',
      status: 'success',
      remarks: 'AuraPay Cashback Scratch Card'
    });

    res.json({ 
      success: true, 
      message: `Congratulations! ₹${reward.amount} credited to your wallet!`,
      data: {
        amount: reward.amount,
        newWalletBalance: updatedUser.walletBalance
      }
    });
  } catch (error) {
    console.error('Claim Reward Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Toggle UPI Lite
export const toggleUpiLite = async (req, res) => {
  const userId = req.user._id;
  const { enabled } = req.body;

  try {
    const updatedUser = await User.findByIdAndUpdate(userId, { upiLiteEnabled: !!enabled }, { new: true });
    res.json({ 
      success: true, 
      message: enabled ? 'UPI Lite enabled successfully!' : 'UPI Lite disabled successfully!',
      data: {
        upiLiteEnabled: updatedUser.upiLiteEnabled,
        upiLiteBalance: updatedUser.upiLiteBalance
      }
    });
  } catch (error) {
    console.error('Toggle UPI Lite Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Fund UPI Lite
export const fundUpiLite = async (req, res) => {
  const userId = req.user._id;
  const { amount, action } = req.body; 

  try {
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }

    if (action === 'load') {
      if (req.user.upiLiteBalance + numAmount > 2000) {
        return res.status(400).json({ success: false, message: 'UPI Lite balance cannot exceed ₹2,000' });
      }

      const updatedUser = await User.findOneAndUpdate(
        { 
          _id: userId, 
          walletBalance: { $gte: numAmount },
          upiLiteBalance: { $lte: 2000 - numAmount }
        },
        { 
          $inc: { 
            walletBalance: -numAmount,
            upiLiteBalance: numAmount
          } 
        },
        { new: true }
      );

      if (!updatedUser) {
        return res.status(400).json({ success: false, message: 'Insufficient wallet balance or UPI Lite limit exceeded' });
      }

      await Transaction.create({
        senderId: userId,
        senderName: req.user.name,
        senderUpi: req.user.upiId,
        receiverId: userId,
        receiverName: 'UPI Lite Wallet',
        receiverUpi: `${req.user.upiId.split('@')[0]}@upilite`,
        amount: numAmount,
        type: 'send',
        status: 'success',
        remarks: 'Transferred to UPI Lite Balance'
      });

      const updatedUser = await User.findById(userId);
      return res.json({ 
        success: true, 
        message: `Successfully loaded ₹${numAmount} to UPI Lite`,
        data: {
          walletBalance: updatedUser.walletBalance,
          upiLiteBalance: updatedUser.upiLiteBalance
        }
      });
    }

    if (action === 'unload') {
      const updatedUser = await User.findOneAndUpdate(
        { 
          _id: userId, 
          upiLiteBalance: { $gte: numAmount }
        },
        { 
          $inc: { 
            walletBalance: numAmount,
            upiLiteBalance: -numAmount
          } 
        },
        { new: true }
      );

      if (!updatedUser) {
        return res.status(400).json({ success: false, message: 'Insufficient UPI Lite balance' });
      }

      await Transaction.create({
        senderId: userId,
        senderName: 'UPI Lite Wallet',
        senderUpi: `${req.user.upiId.split('@')[0]}@upilite`,
        receiverId: userId,
        receiverName: req.user.name,
        receiverUpi: req.user.upiId,
        amount: numAmount,
        type: 'receive',
        status: 'success',
        remarks: 'Withdrawn from UPI Lite Balance'
      });

      const updatedUser = await User.findById(userId);
      return res.json({ 
        success: true, 
        message: `Successfully returned ₹${numAmount} to Main Wallet`,
        data: {
          walletBalance: updatedUser.walletBalance,
          upiLiteBalance: updatedUser.upiLiteBalance
        }
      });
    }

    res.status(400).json({ success: false, message: 'Invalid action' });
  } catch (error) {
    console.error('Fund UPI Lite Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
