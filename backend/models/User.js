import mongoose from 'mongoose';
import { isFallback, getFallbackModel } from '../config/db.js';

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  upiId: { type: String, required: true, unique: true },
  walletBalance: { type: Number, default: 0 },
  upiLiteBalance: { type: Number, default: 0 },
  upiLiteEnabled: { type: Boolean, default: false },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  status: { type: String, enum: ['active', 'blocked'], default: 'active' },
  createdAt: { type: Date, default: Date.now }
});

const MongoUserModel = mongoose.models.User || mongoose.model('User', UserSchema);
const UserFallback = getFallbackModel('users');

const UserModel = {
  find: (query = {}) => isFallback() ? UserFallback.find(query) : MongoUserModel.find(query),
  findOne: (query = {}) => isFallback() ? UserFallback.findOne(query) : MongoUserModel.findOne(query),
  findById: (id) => isFallback() ? UserFallback.findById(id) : MongoUserModel.findById(id),
  create: (data) => isFallback() ? UserFallback.create(data) : MongoUserModel.create(data),
  findByIdAndUpdate: (id, update, options) => isFallback() ? UserFallback.findByIdAndUpdate(id, update, options) : MongoUserModel.findByIdAndUpdate(id, update, options),
  updateOne: (query, update) => isFallback() ? UserFallback.updateOne(query, update) : MongoUserModel.updateOne(query, update),
  deleteOne: (query) => isFallback() ? UserFallback.deleteOne(query) : MongoUserModel.deleteOne(query)
};

export default UserModel;
