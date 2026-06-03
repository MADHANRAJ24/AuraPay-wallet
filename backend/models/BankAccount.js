import mongoose from 'mongoose';
import { isFallback, getFallbackModel } from '../config/db.js';

const BankAccountSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  bankName: { type: String, required: true },
  accountNumber: { type: String, required: true },
  balance: { type: Number, default: 50000 }, // Mock money in bank
  routingCode: { type: String, required: true },
  isLinked: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

const MongoBankAccountModel = mongoose.models.BankAccount || mongoose.model('BankAccount', BankAccountSchema);
const BankAccountFallback = getFallbackModel('bankaccounts');

const BankAccountModel = {
  find: (query = {}) => isFallback() ? BankAccountFallback.find(query) : MongoBankAccountModel.find(query),
  findOne: (query = {}) => isFallback() ? BankAccountFallback.findOne(query) : MongoBankAccountModel.findOne(query),
  findById: (id) => isFallback() ? BankAccountFallback.findById(id) : MongoBankAccountModel.findById(id),
  create: (data) => isFallback() ? BankAccountFallback.create(data) : MongoBankAccountModel.create(data),
  findByIdAndUpdate: (id, update, options) => isFallback() ? BankAccountFallback.findByIdAndUpdate(id, update, options) : MongoBankAccountModel.findByIdAndUpdate(id, update, options),
  updateOne: (query, update) => isFallback() ? BankAccountFallback.updateOne(query, update) : MongoBankAccountModel.updateOne(query, update),
  deleteOne: (query) => isFallback() ? BankAccountFallback.deleteOne(query) : MongoBankAccountModel.deleteOne(query)
};

export default BankAccountModel;
