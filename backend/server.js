import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import rateLimit from 'express-rate-limit';

import { connectDB } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import transRoutes from './routes/transRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import plaidRoutes from './routes/plaidRoutes.js';
import razorpayRoutes from './routes/razorpayRoutes.js';

// Load environmental variables
dotenv.config();

const app = express();

// Set up security rate limiter (max 100 requests per 15 mins per IP)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 150, 
  message: { success: false, message: 'Too many API requests, please wait 15 minutes.' }
});

// App configuration middlewares
app.use('/api', limiter);
app.use(cors());
app.use(express.json());

// Database connectivity check
connectDB();

// Initialize standard HTTP Server
const server = http.createServer(app);

// Initialize WebSockets Socket.io Server
const io = new Server(server, {
  cors: {
    origin: '*', // Allow connections from frontend dev client
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Expose Socket.io instance to routers/controllers context
app.set('socketio', io);

// Handle WebSocket client connections
io.on('connection', (socket) => {
  // Client joins their personal userId room
  socket.on('join', (userId) => {
    if (userId) {
      socket.join(userId);
    }
  });

  socket.on('disconnect', () => {
    // Socket disconnected
  });
});

// Route mappings
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/transactions', transRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/plaid', plaidRoutes);
app.use('/api/payment', razorpayRoutes); // Mount razorpay endpoints

app.get('/', (req, res) => {
  res.send('AuraPay Real-Time Payment Engine API is running...');
});

// Port configuration
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 AuraPay Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
