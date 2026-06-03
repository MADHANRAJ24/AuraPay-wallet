# AuraPay Wallet 📱💳
> A premium, real-time MERN Stack Payment Application featuring Indian Rupee (₹) localization, real webcam QR scanning, live payment gateways, automated fraud detection, and synthesized audio notification chimes.

---

## 🚀 Key Features

*   **🇮🇳 Rupee (₹) & `en-IN` Localization**: Complete Indian Rupee formatting across all dashboards, ledger records, billing panels, and user views.
*   **📷 Live Webcam QR Scanner & Image Scanner**: Stream standard webcam video directly in the viewport for scanning or upload a QR image with animated laser scan line feedback.
*   **💳 Live Razorpay Checkout PG**: Seamlessly integrates Razorpay Checkout API on the client side and the Razorpay Node SDK on the server side to support real-time wallet funding (with automatic sandbox simulation fallback).
*   **🔔 WebSockets & Synthesized Audio Alerts**: Live transaction triggers push notifications across clients via `Socket.io`. Emits browser-synthesized audio chimes (custom ascending tones for receipts, soft single tones for sends) using the **Web Audio API**.
*   **🛡️ Fraud Detection & Rate Limiting**: Built-in velocity checks, value checks, and transaction auditing that automatically flag suspicious transfers for admin review. Protected by `express-rate-limit` middleware.
*   **💾 Hybrid Database Connection**: Connects to live MongoDB Atlas cloud clusters with an automatic JSON file-based database fallback (`db_fallback.json`) for seamless offline local development.
*   **🎨 Premium Glassmorphic UI/UX**: Designed using pure Vanilla CSS (no heavy Tailwind CSS or component library bloat) with responsive dark modes, glowing custom borders, and dynamic animations.

---

## 🏗️ Architecture & File Structure

```
AuraPay/
├── backend/
│   ├── config/db.js          # Database connection (MongoDB Atlas + JSON fallback)
│   ├── controllers/          # Business logic handlers
│   │   ├── authController.js # JWT creation, bcrypt hashing, and login
│   │   ├── adminController.js# System metrics, user blocking, audit feeds
│   │   ├── razorpayController.js # Razorpay order management & payment verification
│   │   └── transController.js# Verified money transfers & fraud rule engine
│   ├── middleware/           # auth & admin JWT route guards
│   ├── models/               # Database schema controls (User, Transaction, BankAccount)
│   └── server.js             # Express API engine & Socket.io server
├── frontend/
│   ├── src/
│   │   ├── context/          # AuthContext and WalletContext ledger states
│   │   ├── components/       # Glassmorphic Navbar & WebSocket notifications
│   │   ├── pages/            # Login, Register, Dashboard, Send, Bills, History, Admin Panel
│   │   └── index.css         # Styling system (glassmorphism, neon outlines, scrollbars)
│   └── package.json          # React bundler config
└── package.json              # Workspace runner
```

---

## 🛠️ Installation & Setup

### Prerequisites
*   Node.js (v16+)
*   npm or yarn
*   A MongoDB Atlas Connection String (optional, fallback database provided automatically)
*   Razorpay API Keys (optional, sandbox simulation provided automatically)

### 1. Clone the repository
```bash
git clone https://github.com/MADHANRAJ24/AuraPay-wallet.git
cd AuraPay-wallet
```

### 2. Configure Environment Variables
Create a file named `.env` inside the `backend/` directory:
```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key

# Razorpay Credentials (leave blank to run in simulation mode)
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```

### 3. Install Dependencies
Run the install command from the root workspace folder:
```bash
npm run install-all
```

### 4. Start Development Servers
Launch both the Express backend server (port `5000`) and the Vite React client (port `5173`) concurrently:
```bash
npm start
```

---

## 🛡️ Security Audit & Rules
*   **High-Value Transactions**: Any single transfer $\ge$ ₹10,000 flags a risk warning.
*   **Velocity Restrictions**: Initiating 3+ transactions in under 2 minutes triggers security flags.
*   **Exclusions Configured**: Secure `.gitignore` rules prevent exposing environment credentials or binary packages to version control.
