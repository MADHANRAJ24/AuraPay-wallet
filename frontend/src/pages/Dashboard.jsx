import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';
import PlaidLinkButton from '../components/PlaidLinkButton';
import ScratchCardModal from '../components/ScratchCardModal';
import LocalQRCode from '../components/LocalQRCode';
import UserAvatar from '../components/UserAvatar';
import { Gift, PieChart, Eye, EyeOff } from 'lucide-react';
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
  Wallet,
  Volume2
} from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const { 
    linkedBanks, 
    transactions, 
    requests,
    rewards,
    loadingBanks, 
    loadingTrans, 
    linkBank, 
    unlinkBank, 
    addMoney,
    handleRequest,
    toggleUpiLite,
    fundUpiLite
  } = useWallet();
  const navigate = useNavigate();

  // Modals state
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showAddMoneyModal, setShowAddMoneyModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showUpiLiteModal, setShowUpiLiteModal] = useState(false);

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

  const [upiLiteFundAmount, setUpiLiteFundAmount] = useState('');
  const [upiLiteFundAction, setUpiLiteFundAction] = useState('load');
  const [selectedReward, setSelectedReward] = useState(null);
  const [activeRequestToPay, setActiveRequestToPay] = useState(null);
  const [requestActionLoading, setRequestActionLoading] = useState(false);

  // AuraPay Smart Soundbox state
  const [soundboxEnabled, setSoundboxEnabled] = useState(localStorage.getItem('aurapay_soundbox_enabled') !== 'false');
  const [soundboxLang, setSoundboxLang] = useState(localStorage.getItem('aurapay_soundbox_lang') || 'en');
  const [soundboxRate, setSoundboxRate] = useState(parseFloat(localStorage.getItem('aurapay_soundbox_rate') || '1.0'));

  const toggleSoundbox = () => {
    const nextVal = !soundboxEnabled;
    setSoundboxEnabled(nextVal);
    localStorage.setItem('aurapay_soundbox_enabled', nextVal.toString());
  };

  const updateSoundboxLang = (lang) => {
    setSoundboxLang(lang);
    localStorage.setItem('aurapay_soundbox_lang', lang);
  };

  const updateSoundboxRate = (rate) => {
    setSoundboxRate(rate);
    localStorage.setItem('aurapay_soundbox_rate', rate.toString());
  };

  // Hide/Unhide Account Balance Security state
  const [showBalance, setShowBalance] = useState(localStorage.getItem('aurapay_show_balance') === 'true');
  const [showVerifyPasswordModal, setShowVerifyPasswordModal] = useState(false);
  const [verifyPasswordInput, setVerifyPasswordInput] = useState('');
  const [verifyPasswordError, setVerifyPasswordError] = useState('');
  const [verifyPasswordLoading, setVerifyPasswordLoading] = useState(false);
  const [showVerifyPasswordText, setShowVerifyPasswordText] = useState(false);

  useEffect(() => {
    const handleStorageChange = () => {
      setShowBalance(localStorage.getItem('aurapay_show_balance') === 'true');
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('balanceToggle', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('balanceToggle', handleStorageChange);
    };
  }, []);

  const handleToggleBalance = () => {
    if (showBalance) {
      setShowBalance(false);
      localStorage.setItem('aurapay_show_balance', 'false');
      window.dispatchEvent(new Event('balanceToggle'));
    } else {
      setVerifyPasswordInput('');
      setVerifyPasswordError('');
      setShowVerifyPasswordText(false);
      setShowVerifyPasswordModal(true);
    }
  };

  const handleVerifyPassword = async (e) => {
    e.preventDefault();
    if (!verifyPasswordInput) {
      setVerifyPasswordError('Please enter your password.');
      return;
    }

    setVerifyPasswordLoading(true);
    setVerifyPasswordError('');
    try {
      const token = localStorage.getItem('aurapay_token');
      const res = await fetch('http://localhost:5000/api/auth/verify-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ password: verifyPasswordInput })
      });
      const data = await res.json();
      if (data.success) {
        setShowBalance(true);
        localStorage.setItem('aurapay_show_balance', 'true');
        window.dispatchEvent(new Event('balanceToggle'));
        setShowVerifyPasswordModal(false);
      } else {
        setVerifyPasswordError(data.message || 'Incorrect password.');
      }
    } catch (err) {
      console.error('Password verification error:', err);
      setVerifyPasswordError('Connection error. Please try again.');
    } finally {
      setVerifyPasswordLoading(false);
    }
  };

  const handleTestSoundbox = () => {
    try {
      let textToSpeak = '';
      if (soundboxLang === 'hi') {
        textToSpeak = 'आभामणी में एक सौ रुपये सफलतापूर्वक प्राप्त हुए।';
      } else if (soundboxLang === 'bilingual') {
        textToSpeak = 'रुपये एक सौ प्राप्त हुए! Received Rupees 100 on AuraPay.';
      } else {
        textToSpeak = 'Rupees 100 received successfully on AuraPay.';
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.rate = soundboxRate;
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      if (soundboxLang === 'hi' || soundboxLang === 'bilingual') {
        const hindiVoice = voices.find(v => v.lang.startsWith('hi-') || v.lang.startsWith('mr-'));
        if (hindiVoice) utterance.voice = hindiVoice;
      } else {
        const englishVoice = voices.find(v => v.lang.startsWith('en-') && (v.name.includes('Google') || v.name.includes('Natural')));
        if (englishVoice) utterance.voice = englishVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis test failed:', e);
    }
  };

  // Budget Planner states
  const [budgetLimit, setBudgetLimit] = useState(parseInt(localStorage.getItem('aurapay_monthly_budget') || '10000', 10));
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [tempBudget, setTempBudget] = useState(budgetLimit.toString());

  const handleSaveBudget = (e) => {
    e.preventDefault();
    const parsed = parseInt(tempBudget, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setBudgetLimit(parsed);
      localStorage.setItem('aurapay_monthly_budget', parsed.toString());
      setIsEditingBudget(false);
    }
  };

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

    if (activeRequestToPay) {
      try {
        const res = await handleRequest(activeRequestToPay._id, 'approve');
        setFormLoading(false);
        if (res.success) {
          setFormSuccess(`Successfully paid ₹${activeRequestToPay.amount} to ${activeRequestToPay.senderName}!`);
          setUpiPin('');
          setActiveRequestToPay(null);
          setShowUpiModal(false);
          
          setTimeout(() => {
            window.location.reload();
          }, 1200);
        } else {
          setUpiError(res.message || 'Payment failed.');
        }
      } catch (err) {
        console.error(err);
        setUpiError('Payment failed.');
        setFormLoading(false);
      }
      return;
    }

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

  // Load real scannable QR code locally based on user's details
  const renderMockQr = (upi) => {
    return <LocalQRCode value={upi} size={150} />;
  };

  // Process transactions for Spend Analytics
  const getSpendAnalytics = () => {
    let billTotal = 0;
    let rechargeTotal = 0;
    let transferTotal = 0;
    let currentMonthTotal = 0;

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    
    transactions.forEach(tx => {
      if (tx.status === 'success') {
        let isExpenditure = false;
        if (tx.type === 'bill') {
          billTotal += tx.amount;
          isExpenditure = true;
        } else if (tx.type === 'recharge') {
          rechargeTotal += tx.amount;
          isExpenditure = true;
        } else if (tx.type === 'send') {
          transferTotal += tx.amount;
          isExpenditure = true;
        }

        if (isExpenditure && tx.createdAt) {
          const txDate = new Date(tx.createdAt);
          if (txDate.getFullYear() === currentYear && txDate.getMonth() === currentMonth) {
            currentMonthTotal += tx.amount;
          }
        }
      }
    });
    
    const total = billTotal + rechargeTotal + transferTotal;
    return {
      bill: billTotal,
      recharge: rechargeTotal,
      transfer: transferTotal,
      total,
      currentMonthSpent: currentMonthTotal
    };
  };

  const analytics = getSpendAnalytics();

  // Opens receipt in printable thermal receipt window
  const handlePrintReceipt = (tx) => {
    const printWindow = window.open('', '_blank', 'width=600,height=700');
    if (!printWindow) {
      alert("Please allow pop-ups to download or print your transaction receipt.");
      return;
    }
    
    const isSender = tx.senderId === user?._id;
    const counterpartName = tx.type === 'send' ? tx.receiverName : tx.type === 'receive' ? tx.senderName : tx.senderName || 'AuraPay Service';
    const counterpartUpi = tx.type === 'send' ? tx.receiverUpi : tx.type === 'receive' ? tx.senderUpi : tx.senderUpi || 'service@aurapay';
    
    let typeName = 'TRANSACTION RECEIPT';
    if (tx.type === 'wallet_load') typeName = 'WALLET LOAD RECEIPT';
    else if (tx.type === 'recharge') typeName = 'MOBILE RECHARGE RECEIPT';
    else if (tx.type === 'bill') typeName = 'UTILITY BILL RECEIPT';
    
    printWindow.document.write(`
      <html>
        <head>
          <title>AuraPay Receipt - ${tx._id}</title>
          <style>
            body { font-family: 'Courier New', Courier, monospace; color: #333; background: #fff; padding: 30px; line-height: 1.4; }
            .receipt-card { border: 2px dashed #000; padding: 25px; max-width: 450px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 15px; margin-bottom: 20px; }
            .header h1 { margin: 0; font-size: 24px; font-weight: 900; letter-spacing: 2px; }
            .header p { margin: 5px 0 0 0; font-size: 12px; color: #666; }
            .details { display: flex; flex-direction: column; gap: 10px; font-size: 14px; margin-bottom: 20px; }
            .row { display: flex; justify-content: space-between; }
            .label { font-weight: bold; text-transform: uppercase; }
            .amount-section { text-align: center; border-top: 2px dashed #000; border-bottom: 2px dashed #000; padding: 15px 0; margin: 20px 0; }
            .amount { font-size: 32px; font-weight: 900; }
            .footer { text-align: center; font-size: 12px; margin-top: 30px; border-top: 1px dashed #666; padding-top: 15px; }
            .stamp { border: 3px double #10b981; color: #10b981; display: inline-block; padding: 5px 15px; font-weight: bold; transform: rotate(-5deg); font-size: 16px; margin: 15px 0; }
            @media print {
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="receipt-card">
            <div class="header">
              <h1>AURAPAY WALLET</h1>
              <p>REAL-TIME TRANSACTION LEDGER</p>
              <p>${typeName}</p>
            </div>
            
            <div class="details">
              <div class="row"><span class="label">TXN ID:</span><span>${tx._id}</span></div>
              <div class="row"><span class="label">DATE:</span><span>${new Date(tx.createdAt).toLocaleString('en-IN')}</span></div>
              <div class="row"><span class="label">STATUS:</span><span style="color: #10b981; font-weight:bold;">${tx.status.toUpperCase()}</span></div>
              <div class="row"><span class="label">TYPE:</span><span>${tx.type.toUpperCase()}</span></div>
              <hr style="border: 0; border-top: 1px dashed #000; width: 100%;" />
              <div class="row"><span class="label">FROM:</span><span>${isSender ? user.name + ' (' + user.upiId + ')' : counterpartName + ' (' + counterpartUpi + ')'}</span></div>
              <div class="row"><span class="label">TO:</span><span>${isSender ? counterpartName + ' (' + counterpartUpi + ')' : user.name + ' (' + user.upiId + ')'}</span></div>
              <div class="row"><span class="label">REMARKS:</span><span>${tx.remarks || 'None'}</span></div>
            </div>
            
            <div class="amount-section">
              <div class="amount">₹${Number(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
              <div class="stamp">PAID SECURELY</div>
            </div>
            
            <div class="footer">
              <p>Thank you for using AuraPay!</p>
              <p>Secured by Unified Payments Interface (UPI)</p>
              <p class="no-print" style="margin-top:15px;"><button onclick="window.print();" style="padding: 8px 16px; font-weight: bold; background: #000; color: #fff; border: none; cursor:pointer;">PRINT / SAVE PDF</button></p>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="container animate-fade-in">
      
      {/* P2P PAYMENT REQUESTS NOTIFICATION BANNER */}
      {requests.length > 0 && (
        <div className="glass-panel animate-fade-in" style={{ padding: '1.25rem', border: '1px solid rgba(245, 158, 11, 0.3)', background: 'rgba(245, 158, 11, 0.05)', borderRadius: '16px', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', textAlign: 'left' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--warning)', fontWeight: 700, fontSize: '0.95rem' }}>
            <ShieldAlert size={18} />
            Pending Payment Requests ({requests.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {requests.map(req => (
              <div key={req._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '0.8rem 1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{req.senderName} ({req.senderUpi})</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Remarks: "{req.remarks || 'No message'}"</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                  <span style={{ fontWeight: 800, color: 'var(--warning)', fontSize: '1.1rem' }}>₹{req.amount}</span>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      onClick={async () => {
                        if (requestActionLoading) return;
                        setRequestActionLoading(true);
                        await handleRequest(req._id, 'decline');
                        setRequestActionLoading(false);
                      }} 
                      className="btn btn-secondary" 
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--danger)', background: 'rgba(239, 68, 68, 0.03)' }}
                    >
                      Decline
                    </button>
                    <button 
                      onClick={() => {
                        // Open UPI PIN pad modal to approve
                        setActiveRequestToPay(req);
                        setUpiPin('');
                        setUpiError('');
                        setFormSuccess('');
                        setShowUpiModal(true);
                      }} 
                      className="btn btn-primary" 
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', borderRadius: '8px' }}
                    >
                      Pay Now
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid-2">
        {/* WALLET / CARD BLOCK */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="wallet-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Available Balance</span>
                  <button
                    type="button"
                    onClick={handleToggleBalance}
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', cursor: 'pointer', padding: '0.2rem 0.3rem', display: 'flex', color: 'rgba(255,255,255,0.7)', transition: 'all 0.2s', alignItems: 'center' }}
                    title={showBalance ? "Hide Balance" : "Show Balance"}
                  >
                    {showBalance ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginTop: '0.25rem', color: '#fff' }} className="glow-text">
                  {showBalance ? `₹${Number(user?.walletBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '₹ ••••••.••'}
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

          {/* UPI LITE CARD */}
          <div className="glass-panel" style={{ padding: '1.5rem', background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.4) 100%)', border: '1px solid rgba(139, 92, 246, 0.15)', display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '0.4rem', borderRadius: '8px', color: 'var(--accent-primary)', display: 'flex' }}>
                  <TrendingUp size={16} />
                </div>
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 600, margin: 0 }}>UPI Lite Balance</h4>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>PIN-less transfers up to ₹200</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: user?.upiLiteEnabled ? 'var(--success)' : 'var(--text-muted)', fontWeight: 600 }}>
                  {user?.upiLiteEnabled ? 'Active' : 'Disabled'}
                </span>
                <button 
                  onClick={async () => {
                    await toggleUpiLite(!user?.upiLiteEnabled);
                  }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: user?.upiLiteEnabled ? 'var(--success)' : 'var(--text-muted)' }}
                >
                  {user?.upiLiteEnabled ? (
                    <div style={{ width: '36px', height: '20px', borderRadius: '10px', background: 'var(--success)', position: 'relative', transition: '0.2s' }}>
                      <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#fff', position: 'absolute', right: '2px', top: '2px' }} />
                    </div>
                  ) : (
                    <div style={{ width: '36px', height: '20px', borderRadius: '10px', background: 'rgba(255,255,255,0.1)', position: 'relative', transition: '0.2s' }}>
                      <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#666', position: 'absolute', left: '2px', top: '2px' }} />
                    </div>
                  )}
                </button>
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>
                ₹{Number(user?.upiLiteBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
              
              {user?.upiLiteEnabled && (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    onClick={() => { setUpiLiteFundAction('unload'); setUpiLiteFundAmount(''); setFormError(''); setFormSuccess(''); setShowUpiLiteModal(true); }}
                    className="btn btn-secondary" 
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', borderRadius: '8px' }}
                  >
                    Withdraw
                  </button>
                  <button 
                    onClick={() => { setUpiLiteFundAction('load'); setUpiLiteFundAmount(''); setFormError(''); setFormSuccess(''); setShowUpiLiteModal(true); }}
                    className="btn btn-primary" 
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', borderRadius: '8px' }}
                  >
                    Add Funds
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* AURAPAY SOUNDBOX CARD */}
          <div className="glass-panel animate-fade-in" style={{ padding: '1.5rem', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '1rem', background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.4) 100%)', border: '1px solid rgba(139, 92, 246, 0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '0.4rem', borderRadius: '8px', color: 'var(--accent-primary)', display: 'flex' }}>
                  <Volume2 size={16} />
                </div>
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 600, margin: 0 }}>AuraPay Smart Soundbox</h4>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Bilingual voice transaction announcer</div>
                </div>
              </div>
              
              <button 
                onClick={toggleSoundbox}
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: soundboxEnabled ? 'var(--success)' : 'var(--text-muted)' }}
              >
                {soundboxEnabled ? (
                  <div style={{ width: '36px', height: '20px', borderRadius: '10px', background: 'var(--success)', position: 'relative', transition: '0.2s' }}>
                    <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#fff', position: 'absolute', right: '2px', top: '2px' }} />
                  </div>
                ) : (
                  <div style={{ width: '36px', height: '20px', borderRadius: '10px', background: 'rgba(255,255,255,0.1)', position: 'relative', transition: '0.2s' }}>
                    <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#666', position: 'absolute', left: '2px', top: '2px' }} />
                  </div>
                )}
              </button>
            </div>

            {soundboxEnabled && (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Announce Language</label>
                    <select
                      value={soundboxLang}
                      onChange={(e) => updateSoundboxLang(e.target.value)}
                      className="glass-input"
                      style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem', background: '#0a0a0f', color: '#fff', borderRadius: '6px', height: 'auto', border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                      <option value="en">English Voice</option>
                      <option value="hi">Hindi Voice (हिंदी)</option>
                      <option value="bilingual">Bilingual (Hinglish)</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Voice Speed</label>
                    <select
                      value={soundboxRate}
                      onChange={(e) => updateSoundboxRate(parseFloat(e.target.value))}
                      className="glass-input"
                      style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem', background: '#0a0a0f', color: '#fff', borderRadius: '6px', height: 'auto', border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                      <option value="0.85">Slow</option>
                      <option value="1.0">Normal</option>
                      <option value="1.15">Fast</option>
                    </select>
                  </div>
                </div>

                <button 
                  onClick={handleTestSoundbox}
                  className="btn btn-secondary glow-btn"
                  style={{ padding: '0.45rem 1rem', fontSize: '0.8rem', width: '100%', borderRadius: '8px', border: '1px solid rgba(139, 92, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                >
                  <Volume2 size={14} />
                  Test Voice Announcement (₹100)
                </button>
              </div>
            )}
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

        {/* RIGHT PANEL: BANKS & EXPENSE CHARTS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* BANK ACCOUNTS SECTION */}
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.2rem', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Linked Banks</h3>
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
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '0.4rem', borderRadius: '6px' }}
                      title="Unlink Account"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SPEND ANALYTICS */}
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <PieChart size={18} color="var(--accent-primary)" />
              Spend Analytics
            </h3>
            
            {analytics.total === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                No expenditures recorded yet to analyze.
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                {/* SVG Donut Chart */}
                <div style={{ position: 'relative', width: '100px', height: '100px', flexShrink: 0 }}>
                  <svg width="100%" height="100%" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="50" cy="50" r="38" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
                    {analytics.bill > 0 && (
                      <circle 
                        cx="50" 
                        cy="50" 
                        r="38" 
                        fill="transparent" 
                        stroke="#f59e0b" 
                        strokeWidth="10" 
                        strokeDasharray={`${(analytics.bill / analytics.total) * 238.76} 238.76`} 
                        strokeDashoffset="0"
                      />
                    )}
                    {analytics.recharge > 0 && (
                      <circle 
                        cx="50" 
                        cy="50" 
                        r="38" 
                        fill="transparent" 
                        stroke="#3b82f6" 
                        strokeWidth="10" 
                        strokeDasharray={`${(analytics.recharge / analytics.total) * 238.76} 238.76`} 
                        strokeDashoffset={`-${(analytics.bill / analytics.total) * 238.76}`}
                      />
                    )}
                    {analytics.transfer > 0 && (
                      <circle 
                        cx="50" 
                        cy="50" 
                        r="38" 
                        fill="transparent" 
                        stroke="#8b5cf6" 
                        strokeWidth="10" 
                        strokeDasharray={`${(analytics.transfer / analytics.total) * 238.76} 238.76`} 
                        strokeDashoffset={`-${((analytics.bill + analytics.recharge) / analytics.total) * 238.76}`}
                      />
                    )}
                  </svg>
                  <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>TOTAL</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800 }}>₹{Math.round(analytics.total)}</span>
                  </div>
                </div>
                
                {/* Legend */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1, fontSize: '0.85rem' }}>
                  {analytics.transfer > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#8b5cf6' }} />
                        <span style={{ color: 'var(--text-secondary)' }}>Transfers</span>
                      </div>
                      <span style={{ fontWeight: 700 }}>₹{analytics.transfer.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {analytics.bill > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} />
                        <span style={{ color: 'var(--text-secondary)' }}>Bills</span>
                      </div>
                      <span style={{ fontWeight: 700 }}>₹{analytics.bill.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {analytics.recharge > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }} />
                        <span style={{ color: 'var(--text-secondary)' }}>Recharges</span>
                      </div>
                      <span style={{ fontWeight: 700 }}>₹{analytics.recharge.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* MONTHLY BUDGET PLANNER */}
          <div className="glass-panel animate-fade-in" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left', marginTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span role="img" aria-label="budget">🎯</span>
                Monthly Budget Tracker
              </h3>
              
              {!isEditingBudget && (
                <button 
                  onClick={() => {
                    setTempBudget(budgetLimit.toString());
                    setIsEditingBudget(true);
                  }}
                  className="btn btn-secondary"
                  style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', borderRadius: '6px' }}
                >
                  Set Limit
                </button>
              )}
            </div>

            {isEditingBudget ? (
              <form onSubmit={handleSaveBudget} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', background: 'rgba(255,255,255,0.02)', padding: '0.8rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Configure Monthly Limit (₹)</label>
                  <input
                    type="number"
                    value={tempBudget}
                    onChange={(e) => setTempBudget(e.target.value.replace(/\D/g, ''))}
                    className="glass-input"
                    style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                    min="100"
                    required
                  />
                </div>
                
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <button 
                    type="button" 
                    onClick={() => setIsEditingBudget(false)} 
                    className="btn btn-secondary" 
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', borderRadius: '6px' }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', borderRadius: '6px' }}
                  >
                    Save
                  </button>
                </div>
              </form>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Month Spending</span>
                  <div>
                    <span style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                      ₹{Number(analytics.currentMonthSpent || 0).toLocaleString('en-IN')}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {' '}/ ₹{budgetLimit.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                {(() => {
                  const spent = analytics.currentMonthSpent || 0;
                  const ratio = budgetLimit > 0 ? spent / budgetLimit : 0;
                  const percent = Math.min(100, Math.round(ratio * 100));
                  
                  let progressColor = 'var(--success)';
                  let statusLabel = 'On Track';
                  let statusBg = 'var(--success-bg)';
                  
                  if (ratio >= 1.0) {
                    progressColor = 'var(--danger)';
                    statusLabel = 'Over Limit';
                    statusBg = 'var(--danger-bg)';
                  } else if (ratio >= 0.75) {
                    progressColor = 'var(--warning)';
                    statusLabel = 'Warning';
                    statusBg = 'var(--warning-bg)';
                  }

                  return (
                    <>
                      <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
                        <div 
                          style={{ 
                            width: `${percent}%`, 
                            height: '100%', 
                            background: progressColor, 
                            borderRadius: '4px', 
                            transition: 'width 0.4s ease-out',
                            boxShadow: `0 0 10px ${progressColor}`
                          }} 
                        />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>
                          {percent}% Used
                        </span>
                        <span className="badge" style={{ background: statusBg, color: progressColor, padding: '0.15rem 0.5rem', borderRadius: '4px', textTransform: 'uppercase', fontSize: '0.65rem', fontWeight: 700 }}>
                          {statusLabel}
                        </span>
                      </div>

                      {/* Insight statement */}
                      <p style={{ fontSize: '0.8rem', color: ratio >= 1.0 ? 'var(--danger)' : 'var(--text-secondary)', margin: '0.2rem 0 0 0', lineHeight: 1.4, borderLeft: `2px solid ${progressColor}`, paddingLeft: '0.5rem' }}>
                        {ratio >= 1.0 
                          ? `Alert: You've exceeded your monthly limit by ₹${Math.round(spent - budgetLimit).toLocaleString('en-IN')}! Dial down your outlays.`
                          : ratio >= 0.75 
                            ? `Warning: You have used ${percent}% of your budget. Only ₹${Math.round(budgetLimit - spent).toLocaleString('en-IN')} remaining.`
                            : `You have ₹${Math.round(budgetLimit - spent).toLocaleString('en-IN')} left this month. You are spending responsibly!`
                        }
                      </p>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RECENT TRANSACTIONS LIST */}
      <div className="glass-panel" style={{ marginTop: '2rem', padding: '1.5rem', textAlign: 'left' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 600, margin: 0 }}>Recent Activity</h3>
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
              const isSender = tx.senderId === user?._id;
              
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

              const isP2P = tx.type === 'send' || tx.type === 'receive';

              return (
                <div key={tx._id} className="glass-card animate-fade-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.9rem 1.2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {isP2P ? (
                      <UserAvatar name={counterpartName} size={36} />
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)', padding: '0.55rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)', width: '36px', height: '36px', boxSizing: 'border-box', flexShrink: 0 }}>
                        {details.icon}
                      </div>
                    )}
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{counterpartName}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '220px' }}>
                        {counterpartUpi}
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '1rem', color: details.amountColor }}>
                        {details.amountSign}₹{Number(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(tx.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <button 
                      onClick={() => handlePrintReceipt(tx)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '0.25rem' }}
                      title="Print Receipt"
                    >
                      <FileText size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* REWARDS (SCRATCH CARDS) SECTION */}
      <div className="glass-panel" style={{ marginTop: '2rem', padding: '1.5rem', textAlign: 'left' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Gift size={20} color="var(--accent-primary)" />
          My Scratch Card Rewards
        </h3>

        {rewards.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem 1rem', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '12px', background: 'rgba(255,255,255,0.01)' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No scratch cards won yet. Send money (₹100+) for a chance to win cashback!</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '1rem' }}>
            {rewards.map((rw) => (
              <div 
                key={rw._id} 
                onClick={() => {
                  if (!rw.isClaimed) {
                    setSelectedReward(rw);
                  }
                }}
                className="glass-card" 
                style={{ 
                  aspectRatio: '1', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '0.4rem', 
                  cursor: rw.isClaimed ? 'default' : 'pointer',
                  background: rw.isClaimed 
                    ? 'rgba(16, 185, 129, 0.03)' 
                    : 'linear-gradient(135deg, #a1a1a1 0%, #8e8e8e 100%)',
                  border: rw.isClaimed 
                    ? '1px solid rgba(16, 185, 129, 0.15)' 
                    : '1px solid rgba(255,255,255,0.2)',
                  color: rw.isClaimed ? 'var(--success)' : '#333',
                  boxShadow: rw.isClaimed ? 'none' : '0 4px 15px rgba(0,0,0,0.3)',
                  transition: 'transform 0.1s ease',
                  position: 'relative'
                }}
              >
                {rw.isClaimed ? (
                  <>
                    <span style={{ fontSize: '1.5rem' }}>🎁</span>
                    <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>₹{rw.amount}</span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Claimed</span>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: '1.8rem' }}>💎</span>
                    <span style={{ fontWeight: 850, fontSize: '0.8rem', letterSpacing: '0.05em' }}>TAP TO</span>
                    <span style={{ fontWeight: 850, fontSize: '0.8rem', letterSpacing: '0.05em' }}>SCRATCH</span>
                  </>
                )}
              </div>
            ))}
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
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                  {activeRequestToPay ? 'Paying Recipient' : 'Paying Merchant'}
                </div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                  {activeRequestToPay ? activeRequestToPay.senderName : 'AuraPay Wallet load'}
                </div>
                {activeRequestToPay && (
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', wordBreak: 'break-all' }}>
                    {activeRequestToPay.senderUpi}
                  </div>
                )}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>Amount</div>
                <div style={{ fontWeight: 800, fontSize: '1.25rem', color: '#10b981' }}>
                  ₹{Number(activeRequestToPay ? activeRequestToPay.amount : loadAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
                onClick={() => { setShowUpiModal(false); setUpiPin(''); setUpiError(''); setActiveRequestToPay(null); }}
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

      {/* MODAL 5: FUND UPI LITE */}
      {showUpiLiteModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="glass-panel animate-fade-in" style={{ width: '90%', maxWidth: '380px', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', textAlign: 'left' }}>
              <TrendingUp size={22} color="var(--accent-primary)" />
              {upiLiteFundAction === 'load' ? 'Load UPI Lite Balance' : 'Withdraw from UPI Lite'}
            </h3>
            
            {formError && <div className="badge badge-danger" style={{ width: '100%', padding: '0.6rem', marginBottom: '1rem', borderRadius: '8px' }}>{formError}</div>}
            {formSuccess && <div className="badge badge-success" style={{ width: '100%', padding: '0.6rem', marginBottom: '1rem', borderRadius: '8px' }}>{formSuccess}</div>}

            <form onSubmit={async (e) => {
              e.preventDefault();
              setFormError('');
              setFormSuccess('');
              const numAmount = Number(upiLiteFundAmount);
              if (isNaN(numAmount) || numAmount <= 0) {
                setFormError('Please enter a valid amount.');
                return;
              }
              
              setFormLoading(true);
              const res = await fundUpiLite(upiLiteFundAmount, upiLiteFundAction);
              setFormLoading(false);
              
              if (res.success) {
                setFormSuccess(res.message);
                setUpiLiteFundAmount('');
                setTimeout(() => {
                  setFormSuccess('');
                  setShowUpiLiteModal(false);
                }, 1200);
              } else {
                setFormError(res.message || 'Transaction failed');
              }
            }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', textAlign: 'left' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {upiLiteFundAction === 'load' 
                    ? `Load from Wallet Balance (Available: ₹${Number(user?.walletBalance).toLocaleString('en-IN')})` 
                    : `Withdraw to Main Wallet (Lite Balance: ₹${Number(user?.upiLiteBalance).toLocaleString('en-IN')})`}
                </span>
                <input 
                  type="number" 
                  placeholder="Enter amount (max ₹2,000)" 
                  value={upiLiteFundAmount}
                  onChange={(e) => setUpiLiteFundAmount(e.target.value)}
                  className="glass-input"
                  min="1"
                  max="2000"
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => { setShowUpiLiteModal(false); setFormError(''); }} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={formLoading}>
                  {formLoading ? 'Processing...' : (upiLiteFundAction === 'load' ? 'Load Lite' : 'Withdraw')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedReward && (
        <ScratchCardModal 
          reward={selectedReward} 
          onClose={() => { setSelectedReward(null); }} 
        />
      )}

      {showVerifyPasswordModal && (
        <div className="modal-overlay" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, padding: '1rem', backdropFilter: 'blur(8px)' }}>
          <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '380px', padding: '2rem', position: 'relative', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <Lock size={18} color="var(--accent-primary)" />
              Verify Password
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '1.5rem' }}>
              Enter your login password to reveal account balance.
            </p>

            {verifyPasswordError && (
              <div style={{ background: 'var(--danger-bg)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '0.75rem', borderRadius: '8px', color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '1rem', textAlign: 'center' }}>
                {verifyPasswordError}
              </div>
            )}

            <form onSubmit={handleVerifyPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Login Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showVerifyPasswordText ? "text" : "password"}
                    placeholder="••••••••"
                    value={verifyPasswordInput}
                    onChange={(e) => setVerifyPasswordInput(e.target.value)}
                    className="glass-input"
                    style={{ paddingRight: '40px' }}
                    disabled={verifyPasswordLoading}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowVerifyPasswordText(!showVerifyPasswordText)}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: 0 }}
                  >
                    {showVerifyPasswordText ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowVerifyPasswordModal(false)} className="btn btn-secondary" style={{ flex: 1 }} disabled={verifyPasswordLoading}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={verifyPasswordLoading}>
                  {verifyPasswordLoading ? 'Verifying...' : 'Verify'}
                </button>
              </div>
            </form>
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
