import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'aurapay_secret_key_123', {
    expiresIn: '30d',
  });
};

export const registerUser = async (req, res) => {
  const { name, email, password, phone } = req.body;

  try {
    if (!name || !email || !password || !phone) {
      return res.status(400).json({ success: false, message: 'Please provide all fields' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const phoneExists = await User.findOne({ phone });
    if (phoneExists) {
      return res.status(400).json({ success: false, message: 'Phone number already registered' });
    }

    // Generate clean UPI ID (e.g., john@aura)
    let cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!cleanName) cleanName = 'user';
    let upiId = `${cleanName}@aura`;

    // Check if UPI ID already exists, if so append last 4 digits of phone
    const upiExists = await User.findOne({ upiId });
    if (upiExists) {
      upiId = `${cleanName}${phone.slice(-4)}@aura`;
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      phone,
      upiId,
      walletBalance: 0, // Starts with ₹0 balance
      role: 'user',
      status: 'active'
    });

    if (user) {
      res.status(201).json({
        success: true,
        data: {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          upiId: user.upiId,
          walletBalance: user.walletBalance,
          role: user.role,
          token: generateToken(user._id)
        }
      });
    } else {
      res.status(400).json({ success: false, message: 'Invalid user data' });
    }
  } catch (error) {
    console.error('Register Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (user.status === 'blocked') {
      return res.status(403).json({ success: false, message: 'This user account is blocked' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    res.json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        upiId: user.upiId,
        walletBalance: user.walletBalance,
        role: user.role,
        token: generateToken(user._id)
      }
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    res.json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        upiId: user.upiId,
        walletBalance: user.walletBalance,
        role: user.role,
        status: user.status
      }
    });
  } catch (error) {
    console.error('Get Profile Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
