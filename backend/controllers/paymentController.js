import BankAccount from '../models/BankAccount.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';

// Add money from bank to wallet
export const addMoneyToWallet = async (req, res) => {
  const { bankAccountId, amount } = req.body;
  const userId = req.user._id;

  try {
    const numAmount = Number(amount);
    if (!bankAccountId || isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid bank account or amount' });
    }

    // Find the linked bank account
    const bankAccount = await BankAccount.findOne({ _id: bankAccountId, userId, isLinked: true });
    if (!bankAccount) {
      return res.status(404).json({ success: false, message: 'Linked bank account not found' });
    }

    // Deduct from bank atomically if balance is sufficient
    const updatedBank = await BankAccount.findOneAndUpdate(
      { _id: bankAccountId, userId, isLinked: true, balance: { $gte: numAmount } },
      { $inc: { balance: -numAmount } },
      { new: true }
    );
    if (!updatedBank) {
      return res.status(400).json({ success: false, message: 'Insufficient balance in bank account' });
    }

    const updatedUser = await User.findByIdAndUpdate(userId, { $inc: { walletBalance: numAmount } }, { new: true });

    // Create a transaction record
    const transaction = await Transaction.create({
      senderId: null,
      senderName: bankAccount.bankName,
      senderUpi: `A/C ******${bankAccount.accountNumber.slice(-4)}`,
      receiverId: userId,
      receiverName: req.user.name,
      receiverUpi: req.user.upiId,
      amount: numAmount,
      type: 'wallet_load',
      status: 'success',
      remarks: `Loaded money from ${bankAccount.bankName} Account`
    });

    res.json({
      success: true,
      message: `Successfully loaded ₹${numAmount} to wallet`,
      data: {
        newWalletBalance: updatedUser.walletBalance,
        transaction
      }
    });
  } catch (error) {
    console.error('Add Money Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Mobile Recharge
export const rechargeMobile = async (req, res) => {
  const { phoneNumber, operator, amount, planName } = req.body;
  const userId = req.user._id;

  try {
    const numAmount = Number(amount);
    if (!phoneNumber || !operator || isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid recharge details' });
    }

    // Deduct wallet balance atomically if balance is sufficient
    const updatedUser = await User.findOneAndUpdate(
      { _id: userId, walletBalance: { $gte: numAmount } },
      { $inc: { walletBalance: -numAmount } },
      { new: true }
    );
    if (!updatedUser) {
      return res.status(400).json({ success: false, message: 'Insufficient wallet balance' });
    }

    // Log transaction
    const transaction = await Transaction.create({
      senderId: userId,
      senderName: req.user.name,
      senderUpi: req.user.upiId,
      receiverId: null,
      receiverName: operator,
      receiverUpi: `${operator.toLowerCase()}@recharge`,
      amount: numAmount,
      type: 'recharge',
      status: 'success',
      remarks: `Recharged ${phoneNumber} - ${planName || 'Special Tariff Voucher'}`
    });

    res.json({
      success: true,
      message: `Recharge of ₹${numAmount} successful for ${phoneNumber}`,
      data: {
        newWalletBalance: updatedUser.walletBalance,
        transaction
      }
    });
  } catch (error) {
    console.error('Recharge Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Bill Payments (Electricity, Water, Broadband)
export const payUtilityBill = async (req, res) => {
  const { billType, provider, consumerNumber, amount } = req.body;
  const userId = req.user._id;

  try {
    const numAmount = Number(amount);
    if (!billType || !provider || !consumerNumber || isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid bill details' });
    }

    // Deduct wallet balance atomically if balance is sufficient
    const updatedUser = await User.findOneAndUpdate(
      { _id: userId, walletBalance: { $gte: numAmount } },
      { $inc: { walletBalance: -numAmount } },
      { new: true }
    );
    if (!updatedUser) {
      return res.status(400).json({ success: false, message: 'Insufficient wallet balance' });
    }

    // Log transaction
    const transaction = await Transaction.create({
      senderId: userId,
      senderName: req.user.name,
      senderUpi: req.user.upiId,
      receiverId: null,
      receiverName: provider,
      receiverUpi: `${provider.toLowerCase().replace(/[^a-z0-9]/g, '')}@billpay`,
      amount: numAmount,
      type: 'bill',
      status: 'success',
      remarks: `${billType.toUpperCase()} Bill Payment for A/C ${consumerNumber}`
    });

    res.json({
      success: true,
      message: `Utility bill payment of ₹${numAmount} to ${provider} successful`,
      data: {
        newWalletBalance: updatedUser.walletBalance,
        transaction
      }
    });
  } catch (error) {
    console.error('Bill Pay Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
