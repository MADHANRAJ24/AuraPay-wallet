import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FALLBACK_DB_PATH = path.join(__dirname, '..', 'db_fallback.json');

let useFallback = false;
let fallbackData = {
  users: [],
  transactions: [],
  bankaccounts: [],
  rewards: [],
  paymentrequests: []
};

// Seed initial bank accounts and admin user if fallback is used
const seedFallbackData = () => {
  let modified = false;
  
  // Create admin if none exists
  if (fallbackData.users.length === 0) {
    // Note: Admin password is "admin123", we'll pre-hash it or hash it.
    // Hashed with bcrypt: "$2a$10$tM.yF5qNswbYyW88Z/p.j.gqX0Xk2vU9sFfeC2YfHqYj8i3p7L0.q" (for admin123)
    fallbackData.users.push({
      _id: 'admin-id-000',
      name: 'System Admin',
      email: 'admin@aurapay.com',
      password: '$2a$10$laEqgxKbRcn6mSJGa0wpH.PQO3eqZm0H.6q4.EvbX/TM1kgXeiSGC', // admin123
      phone: '9999999999',
      upiId: 'admin@aura',
      walletBalance: 1000000,
      role: 'admin',
      status: 'active',
      createdAt: new Date().toISOString()
    });
    modified = true;
  }
  
  if (modified) {
    fs.writeFileSync(FALLBACK_DB_PATH, JSON.stringify(fallbackData, null, 2));
  }
};

const initFallbackDb = () => {
  useFallback = true;
  console.log('⚠️ MongoDB not running or URI not provided. Switching to JSON Fallback DB.');
  console.log(`📂 Fallback database path: ${FALLBACK_DB_PATH}`);
  
  if (fs.existsSync(FALLBACK_DB_PATH)) {
    try {
      const fileContent = fs.readFileSync(FALLBACK_DB_PATH, 'utf-8');
      fallbackData = JSON.parse(fileContent);
      if (!fallbackData.users) fallbackData.users = [];
      if (!fallbackData.transactions) fallbackData.transactions = [];
      if (!fallbackData.bankaccounts) fallbackData.bankaccounts = [];
      if (!fallbackData.rewards) fallbackData.rewards = [];
      if (!fallbackData.paymentrequests) fallbackData.paymentrequests = [];
    } catch (e) {
      console.error('Error reading fallback DB file, resetting fallback database.', e);
    }
  }
  seedFallbackData();
};

const seedLiveAdmin = async () => {
  try {
    const usersCollection = mongoose.connection.db.collection('users');
    const adminExists = await usersCollection.findOne({ role: 'admin' });
    
    if (!adminExists) {
      await usersCollection.insertOne({
        name: 'System Admin',
        email: 'admin@aurapay.com',
        password: '$2a$10$laEqgxKbRcn6mSJGa0wpH.PQO3eqZm0H.6q4.EvbX/TM1kgXeiSGC', // admin123
        phone: '9999999999',
        upiId: 'admin@aura',
        walletBalance: 1000000,
        role: 'admin',
        status: 'active',
        createdAt: new Date()
      });
      console.log('👑 Seeding Default Admin User in live MongoDB database.');
    }
  } catch (e) {
    console.error('Error seeding live admin:', e);
  }
};

export const connectDB = async () => {
  const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/aurapay';
  try {
    mongoose.set('strictQuery', false);
    // Timeout quickly if no local mongo is running (say, in 2 seconds)
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 2000
    });
    console.log('🔌 MongoDB connected successfully!');
    await seedLiveAdmin();
  } catch (error) {
    initFallbackDb();
  }
};

export const isFallback = () => useFallback;

export const getFallbackModel = (collectionName) => {
  const getCollection = () => {
    if (!fallbackData[collectionName]) {
      fallbackData[collectionName] = [];
    }
    return fallbackData[collectionName];
  };

  const save = () => {
    fs.writeFileSync(FALLBACK_DB_PATH, JSON.stringify(fallbackData, null, 2));
  };

  return {
    find: async (query = {}) => {
      let items = getCollection();
      return items.filter(item => {
        for (let key in query) {
          // simple check
          if (query[key] !== undefined && item[key] !== query[key]) {
            return false;
          }
        }
        return true;
      });
    },
    findOne: async (query = {}) => {
      let items = getCollection();
      return items.find(item => {
        for (let key in query) {
          if (query[key] !== undefined && item[key] !== query[key]) {
            return false;
          }
        }
        return true;
      }) || null;
    },
    findById: async (id) => {
      let items = getCollection();
      return items.find(item => item._id === id) || null;
    },
    create: async (data) => {
      const items = getCollection();
      const newDoc = {
        _id: Math.random().toString(36).substring(2, 11) + Date.now().toString(36),
        createdAt: new Date().toISOString(),
        ...data
      };
      items.push(newDoc);
      save();
      return newDoc;
    },
    findByIdAndUpdate: async (id, update, options = {}) => {
      const items = getCollection();
      const idx = items.findIndex(item => item._id === id);
      if (idx === -1) return null;
      
      const target = items[idx];
      let updatedFields = update;
      if (update.$set) updatedFields = update.$set;
      if (update.$inc) {
        for (let k in update.$inc) {
          target[k] = (target[k] || 0) + update.$inc[k];
        }
      }
      
      // Update fields
      for (let key in updatedFields) {
        if (key !== '$inc' && key !== '$set') {
          target[key] = updatedFields[key];
        }
      }
      
      items[idx] = target;
      save();
      return target;
    },
    updateOne: async (query, update) => {
      const items = getCollection();
      const item = items.find(item => {
        for (let key in query) {
          if (item[key] !== query[key]) return false;
        }
        return true;
      });
      if (!item) return { matchedCount: 0, modifiedCount: 0 };
      
      let updatedFields = update;
      if (update.$set) updatedFields = update.$set;
      if (update.$inc) {
        for (let k in update.$inc) {
          item[k] = (item[k] || 0) + update.$inc[k];
        }
      }
      for (let key in updatedFields) {
        if (key !== '$inc' && key !== '$set') {
          item[key] = updatedFields[key];
        }
      }
      save();
      return { matchedCount: 1, modifiedCount: 1 };
    },
    deleteOne: async (query) => {
      const items = getCollection();
      const idx = items.findIndex(item => {
        for (let key in query) {
          if (item[key] !== query[key]) return false;
        }
        return true;
      });
      if (idx === -1) return { deletedCount: 0 };
      items.splice(idx, 1);
      save();
      return { deletedCount: 1 };
    }
  };
};
