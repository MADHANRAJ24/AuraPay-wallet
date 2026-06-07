import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import mongoose from 'mongoose';

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'aurapay_secret_key_123');

      // Fetch user from DB model (returns fallback or Mongo user)
      // The decoded.id might be a string (fallback DB) or ObjectId (MongoDB)
      let user;
      try {
        user = await User.findById(decoded.id);
      } catch (err) {
        // If findById fails (e.g., invalid ObjectId format), try string lookup
        if (err.kind === 'ObjectId') {
          user = await User.findOne({ _id: decoded.id });
        } else {
          throw err;
        }
      }

      if (!user) {
        return res.status(401).json({ success: false, message: 'User not found' });
      }

      if (user.status === 'blocked') {
        return res.status(403).json({ success: false, message: 'User account has been blocked' });
      }

      req.user = user;
      next();
    } catch (error) {
      console.error('JWT Auth Error:', error.message);
      res.status(401).json({ success: false, message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }
};
