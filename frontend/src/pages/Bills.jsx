import React, { useState } from 'react';
import { useWallet } from '../context/WalletContext';
import { useAuth } from '../context/AuthContext';
import { Smartphone, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

const Bills = () => {
  const { user } = useAuth();
  const { rechargeMobile, payUtilityBill } = useWallet();

  // Tab: 'recharge' or 'utility'
  const [tab, setTab] = useState('recharge');

  // Recharge Form
  const [phone, setPhone] = useState('');
  const [operator, setOperator] = useState('');
  const [rechargeAmt, setRechargeAmt] = useState('');
  const [plan, setPlan] = useState('');

  // Utility Form
  const [billType, setBillType] = useState('');
  const [provider, setProvider] = useState('');
  const [consumerNo, setConsumerNo] = useState('');
  const [utilityAmt, setUtilityAmt] = useState('');

  // State handles
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleRecharge = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!phone || !operator || !rechargeAmt || isNaN(rechargeAmt) || Number(rechargeAmt) <= 0) {
      setError('Please fill in all fields with valid details.');
      return;
    }

    if (Number(rechargeAmt) > user.walletBalance) {
      setError('Insufficient wallet balance to perform recharge.');
      return;
    }

    setLoading(true);
    const planName = plan || 'Custom Recharge Plan';
    const res = await rechargeMobile(phone, operator, rechargeAmt, planName);
    setLoading(false);

    if (res.success) {
      setSuccess(`Recharge of ₹${Number(rechargeAmt).toLocaleString('en-IN')} successful for ${phone}!`);
      setPhone('');
      setOperator('');
      setRechargeAmt('');
      setPlan('');
    } else {
      setError(res.message || 'Recharge failed.');
    }
  };

  const handleUtilityPay = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!billType || !provider || !consumerNo || !utilityAmt || isNaN(utilityAmt) || Number(utilityAmt) <= 0) {
      setError('Please fill in all fields with valid details.');
      return;
    }

    if (Number(utilityAmt) > user.walletBalance) {
      setError('Insufficient wallet balance to pay this bill.');
      return;
    }

    setLoading(true);
    const res = await payUtilityBill(billType, provider, consumerNo, utilityAmt);
    setLoading(false);

    if (res.success) {
      setSuccess(`Utility bill of ₹${Number(utilityAmt).toLocaleString('en-IN')} to ${provider} paid successfully!`);
      setBillType('');
      setProvider('');
      setConsumerNo('');
      setUtilityAmt('');
    } else {
      setError(res.message || 'Bill payment failed.');
    }
  };

  // Provider mappings helper
  const getProviders = (type) => {
    switch (type) {
      case 'electricity':
        return ['Grid Power Distribution', 'Metro Electricity Board', 'Apex Energy Corp'];
      case 'water':
        return ['Municipal Water Authority', 'Hydro-Flow Services', 'Clear Water Board'];
      case 'broadband':
        return ['Aura Fiber BroadBand', 'GigaNet Telecom', 'Sonic Broadband'];
      case 'gas':
        return ['National Gas Pipeline', 'Aura Petroleum Gas', 'SafeFuel distribution'];
      default:
        return [];
    }
  };

  return (
    <div className="container animate-fade-in" style={{ maxWidth: '600px' }}>
      
      {/* Selector Tabs */}
      <div className="glass-panel" style={{ display: 'flex', padding: '0.4rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
        <button 
          onClick={() => { setTab('recharge'); setError(''); setSuccess(''); }}
          className="btn" 
          style={{ flex: 1, background: tab === 'recharge' ? 'rgba(255,255,255,0.08)' : 'transparent', border: 'none', color: tab === 'recharge' ? 'var(--text-primary)' : 'var(--text-secondary)', borderRadius: '8px', padding: '0.6rem' }}
        >
          <Smartphone size={16} />
          Mobile Recharge
        </button>
        <button 
          onClick={() => { setTab('utility'); setError(''); setSuccess(''); }}
          className="btn" 
          style={{ flex: 1, background: tab === 'utility' ? 'rgba(255,255,255,0.08)' : 'transparent', border: 'none', color: tab === 'utility' ? 'var(--text-primary)' : 'var(--text-secondary)', borderRadius: '8px', padding: '0.6rem' }}
        >
          <FileText size={16} />
          Bill Payments
        </button>
      </div>

      <div className="glass-panel" style={{ padding: '2rem' }}>
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--danger-bg)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '0.75rem 1rem', borderRadius: '8px', color: 'var(--danger)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--success-bg)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '0.75rem 1rem', borderRadius: '8px', color: 'var(--success)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
            <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
            <span>{success}</span>
          </div>
        )}

        {tab === 'recharge' ? (
          /* MOBILE RECHARGE FORM */
          <form onSubmit={handleRecharge} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Smartphone size={22} color="var(--accent-primary)" />
              Mobile Recharge
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Mobile Number</label>
              <input
                type="tel"
                placeholder="10 digit number"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                className="glass-input"
                maxLength={10}
                disabled={loading}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Telecom Operator</label>
              <select
                value={operator}
                onChange={(e) => setOperator(e.target.value)}
                className="glass-input"
                style={{ background: '#0a0a0f', color: '#fff' }}
                disabled={loading}
              >
                <option value="">Select Operator</option>
                <option value="Jio Cellular">Jio Cellular</option>
                <option value="Airtel Networks">Airtel Networks</option>
                <option value="AT&T Mobility">AT&T Mobility</option>
                <option value="Verizon Wireless">Verizon Wireless</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Select Plan / Recharge Value (₹)</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '0.5rem' }}>
                {[199, 299, 499].map((amt) => (
                  <button 
                    key={amt}
                    type="button"
                    onClick={() => {
                      setRechargeAmt(amt);
                      setPlan(amt === 199 ? 'Jio Basic Pack (28 Days)' : amt === 299 ? 'Aura Pro Data Plan (56 Days)' : 'Premium Unlimited Voice & Data (84 Days)');
                    }}
                    className="btn btn-secondary"
                    style={{ padding: '0.5rem', fontSize: '0.85rem', border: Number(rechargeAmt) === amt ? '1px solid var(--accent-primary)' : '1px solid rgba(255,255,255,0.08)', background: Number(rechargeAmt) === amt ? 'rgba(139,92,246,0.1)' : 'rgba(255,255,255,0.03)' }}
                  >
                    ₹{amt} Plan
                  </button>
                ))}
              </div>
              <input
                type="number"
                placeholder="Or enter custom amount (₹)"
                value={rechargeAmt}
                onChange={(e) => { setRechargeAmt(e.target.value); setPlan('Custom Top Up'); }}
                className="glass-input"
                min="1"
                disabled={loading}
              />
            </div>

            <button type="submit" className="btn btn-primary glow-btn" style={{ width: '100%', marginTop: '0.5rem' }} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                  Recharging...
                </>
              ) : (
                'Pay & Recharge'
              )}
            </button>
          </form>
        ) : (
          /* UTILITY BILL FORM */
          <form onSubmit={handleUtilityPay} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={22} color="var(--warning)" />
              Utility Bill Payments
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Bill Category</label>
              <select
                value={billType}
                onChange={(e) => { setTab(tab); setBillType(e.target.value); setProvider(''); }}
                className="glass-input"
                style={{ background: '#0a0a0f', color: '#fff' }}
                disabled={loading}
              >
                <option value="">Select Category</option>
                <option value="electricity">Electricity</option>
                <option value="water">Water supply</option>
                <option value="broadband">Broadband Internet</option>
                <option value="gas">LPG Gas</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', opacity: billType ? 1 : 0.5, pointerEvents: billType ? 'auto' : 'none' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Billing Provider</label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="glass-input"
                style={{ background: '#0a0a0f', color: '#fff' }}
                disabled={loading}
              >
                <option value="">Select Provider</option>
                {getProviders(billType).map((prov) => (
                  <option key={prov} value={prov}>{prov}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Consumer Number / ID</label>
              <input
                type="text"
                placeholder="e.g. 1048102919"
                value={consumerNo}
                onChange={(e) => setConsumerNo(e.target.value.replace(/\W/g, ''))}
                className="glass-input"
                disabled={loading}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Bill Amount (₹)</label>
              <input
                type="number"
                placeholder="Enter bill outstanding amount"
                value={utilityAmt}
                onChange={(e) => setUtilityAmt(e.target.value)}
                className="glass-input"
                min="1"
                disabled={loading}
              />
            </div>

            <button type="submit" className="btn btn-primary glow-btn" style={{ width: '100%', marginTop: '0.5rem' }} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                  Processing payment...
                </>
              ) : (
                'Pay Utility Bill'
              )}
            </button>
          </form>
        )}
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}} />
    </div>
  );
};

export default Bills;
