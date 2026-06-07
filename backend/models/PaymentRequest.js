import mongoose from 'mongoose';
import { isFallback, getFallbackModel } from '../config/db.js';

const PaymentRequestSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  senderName: { type: String, required: true },
  senderUpi: { type: String, required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiverName: { type: String, required: true },
  receiverUpi: { type: String, required: true },
  amount: { type: Number, required: true },
  remarks: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'approved', 'declined'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

const MongoPaymentRequestModel = mongoose.models.PaymentRequest || mongoose.model('PaymentRequest', PaymentRequestSchema);
const PaymentRequestFallback = getFallbackModel('paymentrequests');

const PaymentRequestModel = {
  find: (query = {}) => isFallback() ? PaymentRequestFallback.find(query) : MongoPaymentRequestModel.find(query),
  findOne: (query = {}) => isFallback() ? PaymentRequestFallback.findOne(query) : MongoPaymentRequestModel.findOne(query),
  findById: (id) => isFallback() ? PaymentRequestFallback.findById(id) : MongoPaymentRequestModel.findById(id),
  create: (data) => isFallback() ? PaymentRequestFallback.create(data) : MongoPaymentRequestModel.create(data),
  findByIdAndUpdate: (id, update, options) => isFallback() ? PaymentRequestFallback.findByIdAndUpdate(id, update, options) : MongoPaymentRequestModel.findByIdAndUpdate(id, update, options),
  updateOne: (query, update) => isFallback() ? PaymentRequestFallback.updateOne(query, update) : MongoPaymentRequestModel.updateOne(query, update),
  deleteOne: (query) => isFallback() ? PaymentRequestFallback.deleteOne(query) : MongoPaymentRequestModel.deleteOne(query)
};

export default PaymentRequestModel;
