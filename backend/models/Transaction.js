import mongoose from 'mongoose';
import { isFallback, getFallbackModel } from '../config/db.js';

const TransactionSchema = new mongoose.Schema({
  senderId: { type: String, default: null },
  senderName: { type: String, default: null },
  senderUpi: { type: String, default: null },
  receiverId: { type: String, default: null },
  receiverName: { type: String, default: null },
  receiverUpi: { type: String, default: null },
  amount: { type: Number, required: true },
  type: { type: String, enum: ['send', 'receive', 'recharge', 'bill', 'wallet_load'], required: true },
  status: { type: String, enum: ['success', 'failed', 'pending'], default: 'success' },
  remarks: { type: String, default: '' },
  fraudScore: { type: Number, default: 0 },
  isFlagged: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const MongoTransactionModel = mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema);
const TransactionFallback = getFallbackModel('transactions');

const TransactionModel = {
  find: (query = {}) => isFallback() ? TransactionFallback.find(query) : MongoTransactionModel.find(query),
  findOne: (query = {}) => isFallback() ? TransactionFallback.findOne(query) : MongoTransactionModel.findOne(query),
  findById: (id) => isFallback() ? TransactionFallback.findById(id) : MongoTransactionModel.findById(id),
  create: (data) => isFallback() ? TransactionFallback.create(data) : MongoTransactionModel.create(data),
  findByIdAndUpdate: (id, update, options) => isFallback() ? TransactionFallback.findByIdAndUpdate(id, update, options) : MongoTransactionModel.findByIdAndUpdate(id, update, options),
  updateOne: (query, update) => isFallback() ? TransactionFallback.updateOne(query, update) : MongoTransactionModel.updateOne(query, update),
  deleteOne: (query) => isFallback() ? TransactionFallback.deleteOne(query) : MongoTransactionModel.deleteOne(query)
};

export default TransactionModel;
