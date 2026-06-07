import { io } from './backend/node_modules/socket.io-client/dist/index.js';

const BACKEND_URL = 'http://localhost:5000';
const SENDER_ID = '6a20da0cbf05f177427e7110';
const RECEIVER_ID = '6a20da44bf05f177427e7123';

let eventsReceived = 0;

// Connect sender
const senderSocket = io(BACKEND_URL);
senderSocket.on('connect', () => {
  console.log('✅ Sender socket connected');
  senderSocket.emit('join', SENDER_ID);
});

senderSocket.on('money_sent', (data) => {
  eventsReceived++;
  console.log('🚀 SENDER received "money_sent" event');
  console.log(`   Message: ${data.message}`);
});

// Connect receiver
const receiverSocket = io(BACKEND_URL);
receiverSocket.on('connect', () => {
  console.log('✅ Receiver socket connected');
  receiverSocket.emit('join', RECEIVER_ID);
});

receiverSocket.on('money_received', (data) => {
  eventsReceived++;
  console.log('💰 RECEIVER received "money_received" event');
  console.log(`   Message: ${data.message}`);
  
  if (eventsReceived >= 2) {
    console.log('\n✅ Real-time transactions working perfectly!');
    console.log('   - Both sender & receiver got notifications');
    console.log('   - Socket.io is functioning correctly');
    process.exit(0);
  }
});

// Simulate transaction
setTimeout(async () => {
  console.log('\n📤 Initiating test transaction...\n');
  try {
    const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhMjBkYTBjYmYwNWYxNzc0MjdlNzExMCIsImlhdCI6MTc4MDUzNzg2OCwiZXhwIjoxNzgzMTI5ODY4fQ.4Ue86coqccA_qDM1HJdQY2WQZfJNY0cRGRDpYnFsaAE';
    
    const response = await fetch(`${BACKEND_URL}/api/transactions/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        recipientUpi: 'receiver@aura',
        amount: '50',
        remarks: 'Socket.io test'
      })
    });
    
    const data = await response.json();
    console.log(`Transaction: ${data.message}`);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}, 2000);

// Timeout
setTimeout(() => {
  console.error('\n❌ Timeout - notifications not received in time');
  console.error(`Events received: ${eventsReceived}/2`);
  process.exit(1);
}, 12000);
