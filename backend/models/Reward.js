import mongoose from 'mongoose';
import { isFallback, getFallbackModel } from '../config/db.js';

const RewardSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  isClaimed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const MongoRewardModel = mongoose.models.Reward || mongoose.model('Reward', RewardSchema);
const RewardFallback = getFallbackModel('rewards');

const RewardModel = {
  find: (query = {}) => isFallback() ? RewardFallback.find(query) : MongoRewardModel.find(query),
  findOne: (query = {}) => isFallback() ? RewardFallback.findOne(query) : MongoRewardModel.findOne(query),
  findById: (id) => isFallback() ? RewardFallback.findById(id) : MongoRewardModel.findById(id),
  create: (data) => isFallback() ? RewardFallback.create(data) : MongoRewardModel.create(data),
  findByIdAndUpdate: (id, update, options) => isFallback() ? RewardFallback.findByIdAndUpdate(id, update, options) : MongoRewardModel.findByIdAndUpdate(id, update, options),
  updateOne: (query, update) => isFallback() ? RewardFallback.updateOne(query, update) : MongoRewardModel.updateOne(query, update),
  deleteOne: (query) => isFallback() ? RewardFallback.deleteOne(query) : MongoRewardModel.deleteOne(query)
};

export default RewardModel;
