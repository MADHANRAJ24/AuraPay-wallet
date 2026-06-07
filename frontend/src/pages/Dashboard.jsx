import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';
import PlaidLinkButton from '../components/PlaidLinkButton';
import { 
  Plus, 
  Send, 
  QrCode, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Loader2, 
  Building2, 
  Smartphone, 
  FileText, 
  PlusCircle, 
  ShieldAlert, 
  TrendingUp, 
  UserPlus, 
  DollarSign, 
  Link2,
  Trash2,
  Lock,
  Wallet
} from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const { 
    linkedBanks, 
    transactions, 
    loadingBanks, 
    loadingTrans, 
    linkBank, 
    unlinkBank, 
    addMoney 
  } = useWallet();
  const navigate = useNavigate();

  // Modals state
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showAddMoneyModal, setShowAddMoneyModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  // Form states
  const [bankName, setBankName] = useState('');
  const [accountNo, setAccountNo] = useState('');
  const [routingCode, setRoutingCode] = useState('');
  const [loadAmount, setLoadAmount] = useState('');
  const [selectedBankId, setSelectedBankId] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [mockOrder, setMockOrder] = useState(null);
  const [showUpiModal, setShowUpiModal] = useState(false);
  const [upiPin, setUpiPin] = useState('');
  const [upiError, setUpiError] = useState('');

  // Dynamically load Razorpay checkout script from CDN
  useEffect(() => {
    if (window.Razorpay) {
      setRazorpayLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => setRazorpayLoaded(true);
    document.head.appendChild(script);
  }, []);

  // Auto select first bank if list updates
  useEffect(() => {
    if (linkedBanks.length > 0) {
      setSelectedBankId(linkedBanks[0]._id);
    }
  }, [linkedBanks]);

  const handleLinkBankSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);

    if (!bankName || !accountNo || !routingCode) {
      setFormError('Please fill in all fields.');
      setFormLoading(false);
      return;
    }

    const res = await linkBank(bankName, accountNo, routingCode);
    setFormLoading(false);

    if (res.success) {
      setFormSuccess('Bank linked successfully!');
      setBankName('');
      setAccountNo('');
      setRoutingCode('');
      setTimeout(() => {
        setFormSuccess('');
        setShowLinkModal(false);
      }, 1500);
    } else {
      setFormError(res.message || 'Failed to link bank.');
    }
  };

  const handleAddMoneySubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);

    if (!selectedBankId || !loadAmount || isNaN(loadAmount) || Number(loadAmount) <= 0) {
      setFormError('Please enter a valid amount.');
      setFormLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('aurapay_token');
      
      // 1. Create order in backend
      const res = await fetch('http://localhost:5000/api/payment/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ amount: loadAmount })
      });
      const data = await res.json();

      if (!data.success) {
        setFormError(data.message || 'Failed to initiate checkout.');
        setFormLoading(false);
        return;
      }

      // If mock checkout mode (default sandbox when no keys configured)
      if (data.isMock) {
        setFormLoading(false);
        setMockOrder(data.order);
        setShowUpiModal(true); // Open simulated Razorpay PIN keyboard screen!
      } else {
        // Open REAL Razorpay Checkout Overlay
        const options = {
          key: data.key_id || 'rzp_test_mockKeyId123', // Dynamically loaded from backend
          amount: data.order.amount,
          currency: data.order.currency,
          name: 'AuraPay Wallet load',
          description: `Add ₹${loadAmount} to wallet`,
          order_id: data.order.id,
          handler: async function (response) {
            const verifyRes = await fetch('http://localhost:5000/api/payment/verify-payment', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                amount: loadAmount,
                isMock: false
              })
            });
            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              setFormSuccess(`Successfully loaded ₹${loadAmount}!`);
              setLoadAmount('');
              setTimeout(() => {
                window.location.reload();
              }, 1200);
            } else {
              setFormError(verifyData.message || 'Verification failed');
            }
          },
          prefill: {
            name: user?.name,
            email: user?.email,
            contact: user?.phone
          },
          theme: {
            color: '#8b5cf6'
          }
        };
        const rzp = new window.Razorpay(options);
        rzp.open();
        setFormLoading(false);
        setShowAddMoneyModal(false);
      }
    } catch (err) {
      console.error(err);
      setFormError('Failed to establish transaction gateway.');
      setFormLoading(false);
    }
  };

  const handleMockPaymentSubmit = async (e) => {
    e.preventDefault();
    setUpiError('');
    
    if (upiPin.length < 4) {
      setUpiError('Please enter a 4-digit UPI PIN.');
      return;
    }

    setFormLoading(true);
    try {
      const token = localStorage.getItem('aurapay_token');
      
      const verifyRes = await fetch('http://localhost:5000/api/payment/verify-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          razorpay_order_id: mockOrder.id,
          razorpay_payment_id: `pay_mock_${Math.random().toString(36).substring(2, 9)}${Date.now().toString().slice(-4)}`,
          amount: loadAmount,
          isMock: true
        })
      });
      const verifyData = await verifyRes.json();
      setFormLoading(false);

      if (verifyData.success) {
        setFormSuccess(`Successfully loaded ₹${loadAmount}!`);
        setLoadAmount('');
        setUpiPin('');
        setShowUpiModal(false);
        setShowAddMoneyModal(false);
        
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } else {
        setUpiError(verifyData.message || 'Payment verification failed.');
      }
    } catch (err) {
      console.error(err);
      setUpiError('Gateway connection failed.');
      setFormLoading(false);
    }
  };

  const handleKeypadPress = (key) => {
    if (formLoading) return;
    setUpiError('');
    if (key === '⌫') {
      setUpiPin(prev => prev.slice(0, -1));
    } else if (key === '✓') {
      if (upiPin.length < 4) {
        setUpiError('Please enter a 4-digit UPI PIN.');
        return;
      }
      handleMockPaymentSubmit({ preventDefault: () => {} });
    } else {
      if (upiPin.length < 4) {
        setUpiPin(prev => prev + key);
      }
    }
  };

  const handleUnlinkBank = async (id) => {
    if (window.confirm('Are you sure you want to unlink this bank account?')) {
      await unlinkBank(id);
    }
  };

  // Helper to format transaction icon/badges
  const getTransDetails = (type, senderId) => {
    const isSender = senderId === user._id;
    switch (type) {
      case 'send':
        return {
          icon: <ArrowUpRight color="var(--danger)" size={18} />,
          title: 'Sent Money',
          amountSign: '-',
          amountColor: 'var(--danger)',
          badgeClass: 'badge-danger'
        };
      case 'receive':
        return {
          icon: <ArrowDownLeft color="var(--success)" size={18} />,
          title: 'Received Money',
          amountSign: '+',
          amountColor: 'var(--success)',
          badgeClass: 'badge-success'
        };
      case 'recharge':
        return {
          icon: <Smartphone color="var(--info)" size={18} />,
          title: 'Mobile Recharge',
          amountSign: '-',
          amountColor: 'var(--text-primary)',
          badgeClass: 'badge-warning'
        };
      case 'bill':
        return {
          icon: <FileText color="var(--warning)" size={18} />,
          title: 'Utility Bill',
          amountSign: '-',
          amountColor: 'var(--text-primary)',
          badgeClass: 'badge-warning'
        };
      case 'wallet_load':
        return {
          icon: <PlusCircle color="var(--success)" size={18} />,
          title: 'Loaded Funds',
          amountSign: '+',
          amountColor: 'var(--success)',
          badgeClass: 'badge-success'
        };
      default:
        return {
          icon: <Send color="var(--text-secondary)" size={18} />,
          title: 'Transaction',
          amountSign: '',
          amountColor: 'var(--text-primary)',
          badgeClass: 'badge-success'
        };
    }
  };

  // Load real scannable QR code from QRServer API based on user's details
  const renderMockQr = (upi) => {
    return (
      <div style={{ background: '#fff', padding: '12px', borderRadius: '16px', display: 'inline-flex', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }}>
        <img 
          src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(upi || '')}`} 
          alt="My UPI QR Code"
          style={{ width: '150px', height: '150px', display: 'block' }}
        />
      </div>
    );
  };

  return (
    <div className="container animate-fade-in">
      <div className="grid-2">
        {/* WALLET / CARD BLOCK */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="wallet-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem' }}>
              <div>
                <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Available Balance</span>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginTop: '0.25rem', color: '#fff' }} className="glow-text">
                  ₹{Number(user?.walletBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </h1>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.08)', padding: '0.5rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <Wallet size={24} color="#fff" />
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>UPI ID</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>{user?.upiId}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>Member Since</div>
                <div style={{ fontSize: '0.9rem', color: '#fff' }}>
                  {new Date(user?.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </div>
              </div>
            </div>
          </div>

          {/* QUICK ACTION BUTTONS */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', fontWeight: 600 }}>Quick Actions</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', textAlign: 'center' }}>
              
              <button 
                onClick={() => navigate('/send')} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}
              >
                <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)', transition: 'var(--transition-smooth)' }} className="action-icon-btn">
                  <Send size={20} />
                </div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Send</span>
              </button>

              <button 
                onClick={() => navigate('/send?scan=true')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}
              >
                <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-secondary)' }} className="action-icon-btn">
                  <QrCode size={20} />
                </div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Scan QR</span>
              </button>

              <button 
                onClick={() => setShowQrModal(true)} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}
              >
                <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)' }} className="action-icon-btn">
                  <ArrowDownLeft size={20} />
                </div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Receive</span>
              </button>

              <button 
                onClick={() => setShowAddMoneyModal(true)} 
                disabled={linkedBanks.length === 0}
                style={{ background: 'none', border: 'none', cursor: linkedBanks.length === 0 ? 'not-allowed' : 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', opacity: linkedBanks.length === 0 ? 0.5 : 1 }}
              >
                <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--warning)' }} className="action-icon-btn">
                  <Plus size={20} />
                </div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Add Money</span>
              </button>

            </div>
          </div>
        </div>

        {/* BANK ACCOUNTS SECTION */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Linked Banks</h3>
            <button 
              onClick={() => setShowLinkModal(true)} 
              className="btn btn-secondary" 
              style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.85rem' }}
            >
              <Link2 size={14} />
              Link New
            </button>
          </div>

          {loadingBanks ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
              <Loader2 className="animate-spin" size={24} color="var(--accent-primary)" style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          ) : linkedBanks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '12px', background: 'rgba(255,255,255,0.01)' }}>
              <Building2 size={36} color="var(--text-muted)" style={{ marginBottom: '0.75rem' }} />
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>No bank accounts linked yet</p>
              <button onClick={() => setShowLinkModal(true)} className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                Link Account Now
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {linkedBanks.map((bank) => (
                <div key={bank._id} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', padding: '0.6rem', borderRadius: '10px' }}>
                      <Building2 size={20} color="var(--accent-secondary)" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{bank.bankName}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        A/C ••••••{bank.accountNumber.slice(-4)} | Balance: ₹{Number(bank.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleUnlinkBank(bank._id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '0.4rem', borderRadius: '6px', hover: { background: 'rgba(239,68,68,0.1)' } }}
                    title="Unlink Account"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RECENT TRANSACTIONS LIST */}
      <div className="glass-panel" style={{ marginTop: '2rem', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Recent Activity</h3>
          <Link to="/history" style={{ color: 'var(--accent-primary)', fontSize: '0.9rem', fontWeight: 600, textDecoration: 'none' }}>
            View All History
          </Link>
        </div>

        {loadingTrans ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <Loader2 className="animate-spin" size={32} color="var(--accent-primary)" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : transactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '12px' }}>
            <p style={{ color: 'var(--text-muted)' }}>No transactions found. Put some funds in your wallet to start!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {transactions.slice(0, 5).map((tx) => {
              const details = getTransDetails(tx.type, tx.senderId);
              const isSender = tx.senderId === user._id;
              
              // Display receiver name for sent, sender name for received
              const counterpartName = tx.type === 'send' 
                ? tx.receiverName 
                : tx.type === 'receive' 
                  ? tx.senderName 
                  : details.title;
                  
              const counterpartUpi = tx.type === 'send' 
                ? tx.receiverUpi 
                : tx.type === 'receive' 
                  ? tx.senderUpi 
                  : tx.remarks;

              return (
                <div key={tx._id} className="glass-card animate-fade-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.9rem 1.2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ background: 'rgba(255,255,255,0.04)', padding: '0.6rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                      {details.icon}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{counterpartName}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '280px' }}>
                        {counterpartUpi}
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '1rem', color: details.amountColor }}>
                      {details.amountSign}₹{Number(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {new Date(tx.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* --- MODAL DIALOGS --- */}

      {/* MODAL 1: LINK BANK ACCOUNT */}
      {showLinkModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="glass-panel animate-fade-in" style={{ width: '90%', maxWidth: '400px', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Building2 size={22} color="var(--accent-primary)" />
              Link Bank Account
            </h3>
            
            {formError && <div className="badge badge-danger" style={{ width: '100%', padding: '0.6rem', marginBottom: '1rem', borderRadius: '8px' }}>{formError}</div>}
            {formSuccess && <div className="badge badge-success" style={{ width: '100%', padding: '0.6rem', marginBottom: '1rem', borderRadius: '8px' }}>{formSuccess}</div>}

            <form onSubmit={handleLinkBankSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Bank Name</label>
                <select 
                  value={bankName} 
                  onChange={(e) => setBankName(e.target.value)} 
                  className="glass-input"
                  style={{ background: '#0a0a0f', color: '#fff' }}
                >
                  <option value="">Select Bank</option>
                  <option value="State Bank of India (SBI)">State Bank of India (SBI)</option>
                  <option value="HDFC Bank">HDFC Bank</option>
                  <option value="ICICI Bank">ICICI Bank</option>
                  <option value="Axis Bank">Axis Bank</option>
                  <option value="Punjab National Bank (PNB)">Punjab National Bank (PNB)</option>
                  <option value="Bank of Baroda (BOB)">Bank of Baroda (BOB)</option>
                  <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
                  <option value="Canara Bank">Canara Bank</option>
                  <option value="Union Bank of India">Union Bank of India</option>
                  <option value="Indian Bank">Indian Bank</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Account Number</label>
                <input 
                  type="text" 
                  placeholder="12 digit account number" 
                  value={accountNo}
                  onChange={(e) => setAccountNo(e.target.value.replace(/\D/g, ''))}
                  className="glass-input"
                  maxLength={12}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>IFSC / Routing Code</label>
                <input 
                  type="text" 
                  placeholder="AURA0001234" 
                  value={routingCode}
                  onChange={(e) => setRoutingCode(e.target.value.toUpperCase())}
                  className="glass-input"
                  maxLength={11}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => { setShowLinkModal(false); setFormError(''); }} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={formLoading}>
                  {formLoading ? 'Linking...' : 'Link Bank'}
                </button>
              </div>
            </form>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '1rem 0', color: 'var(--text-muted)' }}>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
              <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Or connect securely</span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
            </div>

            <PlaidLinkButton onLinkSuccess={() => setShowLinkModal(false)} />
          </div>
        </div>
      )}

      {/* MODAL 2: ADD MONEY */}
      {showAddMoneyModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="glass-panel animate-fade-in" style={{ width: '90%', maxWidth: '400px', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <PlusCircle size={22} color="var(--success)" />
              Add Money to Wallet
            </h3>

            {formError && <div className="badge badge-danger" style={{ width: '100%', padding: '0.6rem', marginBottom: '1rem', borderRadius: '8px' }}>{formError}</div>}
            {formSuccess && <div className="badge badge-success" style={{ width: '100%', padding: '0.6rem', marginBottom: '1rem', borderRadius: '8px' }}>{formSuccess}</div>}

            <form onSubmit={handleAddMoneySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Source Bank Account</label>
                <select 
                  value={selectedBankId} 
                  onChange={(e) => setSelectedBankId(e.target.value)} 
                  className="glass-input"
                  style={{ background: '#0a0a0f', color: '#fff' }}
                >
                  {linkedBanks.map(bank => (
                    <option key={bank._id} value={bank._id}>
                      {bank.bankName} - A/C ••••{bank.accountNumber.slice(-4)} (Bal: ₹{Number(bank.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Amount (₹)</label>
                <input 
                  type="number" 
                  placeholder="Enter amount to load" 
                  value={loadAmount}
                  onChange={(e) => setLoadAmount(e.target.value)}
                  className="glass-input"
                  min="1"
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => { setShowAddMoneyModal(false); setFormError(''); }} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={formLoading}>
                  {formLoading ? 'Processing...' : 'Load Funds'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: SHOW QR CODE */}
      {showQrModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="glass-panel animate-fade-in" style={{ width: '90%', maxWidth: '360px', padding: '2rem', textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>My AuraPay QR Code</h3>
            
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
              {renderMockQr(user?.upiId)}
            </div>

            <div className="glass-card" style={{ padding: '0.75rem', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>UPI ID</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent-primary)', wordBreak: 'break-all' }}>{user?.upiId}</div>
            </div>

            <button type="button" onClick={() => setShowQrModal(false)} className="btn btn-primary" style={{ width: '100%' }}>Close QR Code</button>
          </div>
        </div>
      )}

      {/* MODAL 4: SIMULATED RAZORPAY UPI PIN MODAL */}
      {showUpiModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100 }}>
          <div style={{ 
            width: '90%', 
            maxWidth: '360px', 
            borderRadius: '24px', 
            padding: '1.5rem', 
            background: '#0c1a30', 
            color: '#fff', 
            border: '1px solid #1a365d', 
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }} className="animate-fade-in">
            
            {/* Header: Bank & UPI logo */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1e3a63', paddingBottom: '0.75rem' }}>
              <div style={{ textAlign: 'left' }}>
                <span style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Unified Payments Interface</span>
                <div style={{ fontSize: '1rem', fontWeight: 700 }}>AuraPay Wallet</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#fff', background: 'linear-gradient(90deg, #df6226, #2251a3)', padding: '0.1rem 0.5rem', borderRadius: '4px' }}>UPI</span>
                <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.1rem' }}>secured by NPCI</span>
              </div>
            </div>

            {/* Payment Info */}
            <div style={{ background: '#112544', padding: '1rem', borderRadius: '14px', border: '1px solid #1c3a66', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>Paying Merchant</div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>AuraPay Wallet load</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>Amount</div>
                <div style={{ fontWeight: 800, fontSize: '1.25rem', color: '#10b981' }}>
                  ₹{Number(loadAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {/* Hidden Input for keyboard typing support */}
            <input 
              type="password"
              value={upiPin}
              onChange={(e) => {
                setUpiError('');
                setUpiPin(e.target.value.replace(/\D/g, '').slice(0, 4));
              }}
              style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
              maxLength={4}
              autoFocus
            />

            {/* PIN Dots display */}
            <div style={{ textAlign: 'center', margin: '0.5rem 0' }}>
              <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.75rem' }}>ENTER 4-DIGIT UPI PIN</div>
              
              <div style={{ display: 'flex', gap: '1.2rem', justifyContent: 'center', alignItems: 'center' }}>
                {[0, 1, 2, 3].map(index => (
                  <div 
                    key={index} 
                    style={{ 
                      width: '16px', 
                      height: '16px', 
                      borderRadius: '50%', 
                      border: '2.5px solid #3b82f6', 
                      background: upiPin.length > index ? '#3b82f6' : 'transparent',
                      boxShadow: upiPin.length > index ? '0 0 10px rgba(59, 130, 246, 0.6)' : 'none',
                      transition: 'all 0.1s cubic-bezier(0.4, 0, 0.2, 1)'
                    }} 
                  />
                ))}
              </div>
            </div>

            {/* Error Message */}
            {upiError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '0.5rem', borderRadius: '8px', color: '#f87171', fontSize: '0.8rem', textAlign: 'center' }}>
                {upiError}
              </div>
            )}

            {/* Virtual Keypad */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(3, 1fr)', 
              gap: '0.75rem', 
              marginTop: '0.5rem',
              justifyItems: 'center'
            }}>
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✓'].map(key => {
                const isDelete = key === '⌫';
                const isSubmit = key === '✓';
                
                let btnBg = '#142744';
                let btnColor = '#fff';
                let btnHoverBg = '#1d355c';
                
                if (isSubmit) {
                  btnBg = '#10b981';
                  btnColor = '#fff';
                  btnHoverBg = '#059669';
                } else if (isDelete) {
                  btnBg = '#ef4444';
                  btnColor = '#fff';
                  btnHoverBg = '#dc2626';
                }

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleKeypadPress(key)}
                    disabled={formLoading}
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      border: 'none',
                      background: btnBg,
                      color: btnColor,
                      fontSize: '1.3rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.1s ease',
                      boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
                    }}
                    onMouseDown={(e) => {
                      e.currentTarget.style.transform = 'scale(0.9)';
                      e.currentTarget.style.background = btnHoverBg;
                    }}
                    onMouseUp={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.background = btnBg;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.background = btnBg;
                    }}
                  >
                    {key}
                  </button>
                );
              })}
            </div>

            {/* Cancel/Close Footer Link */}
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.5rem' }}>
              <button 
                type="button"
                onClick={() => { setShowUpiModal(false); setUpiPin(''); setUpiError(''); }}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: 'rgba(255,255,255,0.4)', 
                  cursor: 'pointer', 
                  fontSize: '0.8rem',
                  textDecoration: 'underline'
                }}
              >
                Cancel Transaction
              </button>
            </div>
            
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .action-icon-btn:hover {
          transform: scale(1.1);
          box-shadow: 0 0 15px rgba(255, 255, 255, 0.05);
        }
      `}} />
    </div>
  );
};

export default Dashboard;
