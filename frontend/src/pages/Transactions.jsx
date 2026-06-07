import React, { useState, useEffect } from 'react';
import { useWallet } from '../context/WalletContext';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  Search, 
  Filter, 
  Loader2, 
  CheckCircle, 
  FileText, 
  Calendar,
  X,
  CreditCard,
  AlertTriangle
} from 'lucide-react';

const Transactions = () => {
  const { user } = useAuth();
  const { transactions, loadingTrans, fetchTransactions } = useWallet();

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  
  // Selected transaction for details modal
  const [selectedTx, setSelectedTx] = useState(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    fetchTransactions();
  }, []);

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

  // Filter & Search Logic
  const filteredTransactions = transactions.filter((tx) => {
    // Search match
    const nameMatch = 
      (tx.senderName && tx.senderName.toLowerCase().includes(search.toLowerCase())) ||
      (tx.receiverName && tx.receiverName.toLowerCase().includes(search.toLowerCase())) ||
      (tx.remarks && tx.remarks.toLowerCase().includes(search.toLowerCase())) ||
      (tx._id && tx._id.includes(search));

    // Type match
    let typeMatch = true;
    if (filterType !== 'all') {
      if (filterType === 'send') typeMatch = tx.type === 'send';
      else if (filterType === 'receive') typeMatch = tx.type === 'receive';
      else if (filterType === 'bills') typeMatch = tx.type === 'bill' || tx.type === 'recharge';
      else if (filterType === 'wallet') typeMatch = tx.type === 'wallet_load';
    }

    return nameMatch && typeMatch;
  });

  // Calculate items for current page
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredTransactions.slice(indexOfFirstItem, indexOfLastItem);

  const getTransConfig = (type) => {
    switch (type) {
      case 'send':
        return {
          icon: <ArrowUpRight color="var(--danger)" size={16} />,
          title: 'Sent Money',
          badgeClass: 'badge-danger',
          sign: '-'
        };
      case 'receive':
        return {
          icon: <ArrowDownLeft color="var(--success)" size={16} />,
          title: 'Received Money',
          badgeClass: 'badge-success',
          sign: '+'
        };
      case 'recharge':
        return {
          icon: <CreditCard color="var(--info)" size={16} />,
          title: 'Recharge',
          badgeClass: 'badge-warning',
          sign: '-'
        };
      case 'bill':
        return {
          icon: <FileText color="var(--warning)" size={16} />,
          title: 'Utility Bill',
          badgeClass: 'badge-warning',
          sign: '-'
        };
      case 'wallet_load':
        return {
          icon: <ArrowDownLeft color="var(--success)" size={16} />,
          title: 'Funds Loaded',
          badgeClass: 'badge-success',
          sign: '+'
        };
      default:
        return {
          icon: <ArrowUpRight color="var(--text-secondary)" size={16} />,
          title: 'Transaction',
          badgeClass: 'badge-success',
          sign: ''
        };
    }
  };

  return (
    <div className="container animate-fade-in">
      
      {/* SEARCH AND FILTER PANELS */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} className="filter-wrapper">
          <style dangerouslySetInnerHTML={{__html: `
            .filter-wrapper { display: flex; }
            .filter-row { display: flex; gap: 1rem; width: 100%; }
            .filter-search { flex: 1; position: relative; }
            .filter-select { width: 180px; }
            @media (max-width: 600px) {
              .filter-row { flex-direction: column; }
              .filter-select { width: 100%; }
            }
          `}} />
          
          <div className="filter-row">
            {/* Search Input */}
            <div className="filter-search">
              <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="text" 
                placeholder="Search by name, remarks, or transaction ID" 
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                className="glass-input"
                style={{ paddingLeft: '40px' }}
              />
            </div>

            {/* Filter Category */}
            <div className="filter-select">
              <select 
                value={filterType} 
                onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }} 
                className="glass-input"
                style={{ background: '#0a0a0f', color: '#fff' }}
              >
                <option value="all">All Types</option>
                <option value="send">Sent Payments</option>
                <option value="receive">Received Payments</option>
                <option value="bills">Bills & Recharges</option>
                <option value="wallet">Wallet Loads</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* TRANSACTION LIST TABLE */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '1.25rem', fontWeight: 600 }}>Transaction Statement</h3>

        {loadingTrans ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
            <Loader2 className="animate-spin" size={36} color="var(--accent-primary)" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
            <p style={{ color: 'var(--text-muted)' }}>No transactions matching your search filters.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {currentItems.map((tx) => {
              const cfg = getTransConfig(tx.type);
              const isSender = tx.senderId === user._id;
              
              const name = tx.type === 'send' 
                ? tx.receiverName 
                : tx.type === 'receive' 
                  ? tx.senderName 
                  : cfg.title;

              const upi = tx.type === 'send' 
                ? tx.receiverUpi 
                : tx.type === 'receive' 
                  ? tx.senderUpi 
                  : tx.remarks;

              const displayColor = tx.type === 'send' || tx.type === 'bill' || tx.type === 'recharge' 
                ? 'var(--text-primary)' 
                : 'var(--success)';

              return (
                <div 
                  key={tx._id} 
                  onClick={() => setSelectedTx(tx)}
                  className="glass-card" 
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', cursor: 'pointer', hover: { transform: 'scale(1.01)' } }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', padding: '0.5rem', borderRadius: '10px' }}>
                      {cfg.icon}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{upi}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: displayColor }}>
                        {cfg.sign}₹{Number(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(tx.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePrintReceipt(tx);
                      }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title="Print Receipt"
                    >
                      <FileText size={16} />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* PAGINATION CONTROLS */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1.5rem', marginTop: '2rem', padding: '0.5rem 0' }}>
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                  disabled={currentPage === 1}
                  className="btn btn-secondary" 
                  style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
                >
                  Previous
                </button>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  Page <strong>{currentPage}</strong> of {totalPages}
                </span>
                <button 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
                  disabled={currentPage === totalPages}
                  className="btn btn-secondary" 
                  style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* --- RECEIPT MODAL DIALOG --- */}
      {selectedTx && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="glass-panel animate-fade-in" style={{ width: '90%', maxWidth: '420px', padding: '2rem', border: '1px solid rgba(255,255,255,0.12)' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Transaction Receipt</h3>
              <button 
                onClick={() => setSelectedTx(null)} 
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Status indicator */}
            <div style={{ textAlign: 'center', padding: '1rem 0 1.5rem 0', borderBottom: '1px dashed rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'var(--success-bg)', width: '48px', height: '48px', borderRadius: '50%', marginBottom: '0.75rem', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <CheckCircle size={24} color="var(--success)" />
              </div>
              <h4 style={{ fontSize: '1.6rem', fontWeight: 800 }}>₹{Number(selectedTx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h4>
              <div className="badge badge-success" style={{ marginTop: '0.5rem', textTransform: 'uppercase', fontSize: '0.7rem' }}>
                Payment Success
              </div>
            </div>

            {/* Receipt Parameters */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', padding: '1.5rem 0', fontSize: '0.9rem', borderBottom: '1px dashed rgba(255,255,255,0.08)' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Transaction Reference</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{selectedTx._id}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Date & Time</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Calendar size={14} color="var(--text-muted)" />
                  {new Date(selectedTx.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Payment Category</span>
                <span style={{ textTransform: 'capitalize' }}>{selectedTx.type}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Sender</span>
                <div style={{ textAlign: 'right' }}>
                  <div>{selectedTx.senderName || 'N/A'}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{selectedTx.senderUpi || 'N/A'}</div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Receiver</span>
                <div style={{ textAlign: 'right' }}>
                  <div>{selectedTx.receiverName || 'N/A'}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{selectedTx.receiverUpi || 'N/A'}</div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Remarks</span>
                <span>{selectedTx.remarks || 'No message'}</span>
              </div>

              {selectedTx.isFlagged && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', background: 'var(--warning-bg)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '0.6rem 0.8rem', borderRadius: '8px', color: 'var(--warning)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                  <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                  <div>
                    <strong style={{ display: 'block', marginBottom: '0.1rem' }}>Fraud Warning Flagged</strong>
                    This transaction has been flagged for audit review (Fraud Score: {selectedTx.fraudScore}).
                  </div>
                </div>
              )}

            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button 
                onClick={() => handlePrintReceipt(selectedTx)} 
                className="btn btn-secondary" 
                style={{ flex: 1, padding: '0.6rem' }}
              >
                Print Receipt
              </button>
              <button 
                onClick={() => setSelectedTx(null)} 
                className="btn btn-primary" 
                style={{ flex: 1, padding: '0.6rem' }}
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}} />
    </div>
  );
};

export default Transactions;
