import BankAccount from '../models/BankAccount.js';
import User from '../models/User.js';

export const linkBankAccount = async (req, res) => {
  const { bankName, accountNumber, routingCode } = req.body;
  const userId = req.user._id;

  try {
    if (!bankName || !accountNumber || !routingCode) {
      return res.status(400).json({ success: false, message: 'All bank fields are required' });
    }

    // Check if bank account is already linked for this user
    const existingBank = await BankAccount.findOne({ userId, accountNumber });
    if (existingBank) {
      if (existingBank.isLinked) {
        return res.status(400).json({ success: false, message: 'This bank account is already linked' });
      } else {
        // Re-link
        await BankAccount.findByIdAndUpdate(existingBank._id, { isLinked: true });
        return res.json({ success: true, message: 'Bank account re-linked successfully' });
      }
    }

    // Create linked bank account with mock balance
    const bankAccount = await BankAccount.create({
      userId,
      bankName,
      accountNumber,
      routingCode,
      balance: Math.floor(10000 + Math.random() * 90000), // Random starting balance between 10k and 100k
      isLinked: true
    });

    res.status(201).json({
      success: true,
      message: 'Bank account linked successfully',
      data: bankAccount
    });
  } catch (error) {
    console.error('Link Bank Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getBankAccounts = async (req, res) => {
  try {
    const accounts = await BankAccount.find({ userId: req.user._id, isLinked: true });
    res.json({ success: true, data: accounts });
  } catch (error) {
    console.error('Get Bank Accounts Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const unlinkBankAccount = async (req, res) => {
  const { id } = req.params;

  try {
    const bankAccount = await BankAccount.findOne({ _id: id, userId: req.user._id });
    if (!bankAccount) {
      return res.status(404).json({ success: false, message: 'Bank account not found' });
    }

    // Soft delete / toggle link
    await BankAccount.findByIdAndUpdate(id, { isLinked: false });

    res.json({ success: true, message: 'Bank account unlinked successfully' });
  } catch (error) {
    console.error('Unlink Bank Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateProfile = async (req, res) => {
  const { name, email, phone } = req.body;
  const userId = req.user._id;

  try {
    // Check if email or phone is already taken by someone else
    if (email && email !== req.user.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({ success: false, message: 'Email already in use' });
      }
    }

    if (phone && phone !== req.user.phone) {
      const phoneExists = await User.findOne({ phone });
      if (phoneExists) {
        return res.status(400).json({ success: false, message: 'Phone number already in use' });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { name: name || req.user.name, email: email || req.user.email, phone: phone || req.user.phone },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        upiId: updatedUser.upiId,
        walletBalance: updatedUser.walletBalance,
        upiLiteEnabled: updatedUser.upiLiteEnabled,
        upiLiteBalance: updatedUser.upiLiteBalance,
        role: updatedUser.role
      }
    });
  } catch (error) {
    console.error('Update Profile Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Admin user fetching
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-password');
    res.json({ success: true, data: users });
  } catch (error) {
    console.error('Get All Users Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
