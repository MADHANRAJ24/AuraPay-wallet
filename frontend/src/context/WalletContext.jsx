import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const WalletContext = createContext();

const USERS_API = 'http://localhost:5000/api/users';
const PAYMENTS_API = 'http://localhost:5000/api/payments';
const TRANS_API = 'http://localhost:5000/api/transactions';

export const WalletProvider = ({ children }) => {
  const { token, refreshUser } = useAuth();
  const [linkedBanks, setLinkedBanks] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [requests, setRequests] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [loadingTrans, setLoadingTrans] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [loadingRewards, setLoadingRewards] = useState(false);
  const [error, setError] = useState(null);

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  });

  const fetchBanks = async () => {
    if (!token) return;
    setLoadingBanks(true);
    try {
      const res = await fetch(`${USERS_API}/banks`, { headers: getHeaders() });
      const data = await res.json();
      if (data.success) {
        setLinkedBanks(data.data);
      }
    } catch (err) {
      console.error('Error fetching bank accounts:', err);
    } finally {
      setLoadingBanks(false);
    }
  };

  const fetchTransactions = async () => {
    if (!token) return;
    setLoadingTrans(true);
    try {
      const res = await fetch(`${TRANS_API}/history`, { headers: getHeaders() });
      const data = await res.json();
      if (data.success) {
        setTransactions(data.data);
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
    } finally {
      setLoadingTrans(false);
    }
  };

  const fetchRequests = async () => {
    if (!token) return;
    setLoadingRequests(true);
    try {
      const res = await fetch(`${TRANS_API}/requests`, { headers: getHeaders() });
      const data = await res.json();
      if (data.success) {
        setRequests(data.data);
      }
    } catch (err) {
      console.error('Error fetching payment requests:', err);
    } finally {
      setLoadingRequests(false);
    }
  };

  const fetchRewards = async () => {
    if (!token) return;
    setLoadingRewards(true);
    try {
      const res = await fetch(`${TRANS_API}/rewards`, { headers: getHeaders() });
      const data = await res.json();
      if (data.success) {
        setRewards(data.data);
      }
    } catch (err) {
      console.error('Error fetching rewards:', err);
    } finally {
      setLoadingRewards(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchBanks();
      fetchTransactions();
      fetchRequests();
      fetchRewards();
    } else {
      setLinkedBanks([]);
      setTransactions([]);
      setRequests([]);
      setRewards([]);
    }
  }, [token]);

  const linkBank = async (bankName, accountNumber, routingCode) => {
    setError(null);
    try {
      const res = await fetch(`${USERS_API}/banks`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ bankName, accountNumber, routingCode })
      });
      const data = await res.json();
      if (data.success) {
        await fetchBanks();
        return { success: true };
      } else {
        setError(data.message);
        return { success: false, message: data.message };
      }
    } catch (err) {
      return { success: false, message: 'Server error' };
    }
  };

  const unlinkBank = async (id) => {
    try {
      const res = await fetch(`${USERS_API}/banks/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      const data = await res.json();
      if (data.success) {
        await fetchBanks();
        return { success: true };
      } else {
        return { success: false, message: data.message };
      }
    } catch (err) {
      return { success: false, message: 'Server error' };
    }
  };

  const addMoney = async (bankAccountId, amount) => {
    try {
      const res = await fetch(`${PAYMENTS_API}/add-money`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ bankAccountId, amount })
      });
      const data = await res.json();
      if (data.success) {
        await fetchBanks();
        await fetchTransactions();
        await refreshUser();
        return { success: true, message: data.message };
      } else {
        return { success: false, message: data.message };
      }
    } catch (err) {
      return { success: false, message: 'Server error' };
    }
  };

  const verifyRecipient = async (recipient) => {
    try {
      const res = await fetch(`${TRANS_API}/verify`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ recipient })
      });
      const data = await res.json();
      return data; // returns { success, data: { name, upiId }, message }
    } catch (err) {
      return { success: false, message: 'Failed to connect to server' };
    }
  };

  const sendMoney = async (recipientUpi, amount, remarks) => {
    try {
      const res = await fetch(`${TRANS_API}/send`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ recipientUpi, amount, remarks })
      });
      const data = await res.json();
      if (data.success) {
        await fetchTransactions();
        await refreshUser();
        return { success: true, message: data.message, data: data.data };
      } else {
        return { success: false, message: data.message };
      }
    } catch (err) {
      return { success: false, message: 'Server error' };
    }
  };

  const rechargeMobile = async (phoneNumber, operator, amount, planName) => {
    try {
      const res = await fetch(`${PAYMENTS_API}/recharge`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ phoneNumber, operator, amount, planName })
      });
      const data = await res.json();
      if (data.success) {
        await fetchTransactions();
        await refreshUser();
        return { success: true, message: data.message };
      } else {
        return { success: false, message: data.message };
      }
    } catch (err) {
      return { success: false, message: 'Server error' };
    }
  };

  const payUtilityBill = async (billType, provider, consumerNumber, amount) => {
    try {
      const res = await fetch(`${PAYMENTS_API}/billpay`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ billType, provider, consumerNumber, amount })
      });
      const data = await res.json();
      if (data.success) {
        await fetchTransactions();
        await refreshUser();
        return { success: true, message: data.message };
      } else {
        return { success: false, message: data.message };
      }
    } catch (err) {
      return { success: false, message: 'Server error' };
    }
  };

  const requestMoney = async (recipientUpi, amount, remarks) => {
    try {
      const res = await fetch(`${TRANS_API}/request`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ recipientUpi, amount, remarks })
      });
      const data = await res.json();
      return data;
    } catch (err) {
      return { success: false, message: 'Server error' };
    }
  };

  const handleRequest = async (id, action) => {
    try {
      const res = await fetch(`${TRANS_API}/requests/${id}/action`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (data.success) {
        await fetchRequests();
        await fetchTransactions();
        await refreshUser();
      }
      return data;
    } catch (err) {
      return { success: false, message: 'Server error' };
    }
  };

  const scratchCard = async (id) => {
    try {
      const res = await fetch(`${TRANS_API}/rewards/${id}/scratch`, {
        method: 'POST',
        headers: getHeaders()
      });
      const data = await res.json();
      if (data.success) {
        await fetchRewards();
        await fetchTransactions();
        await refreshUser();
      }
      return data;
    } catch (err) {
      return { success: false, message: 'Server error' };
    }
  };

  const toggleUpiLite = async (enabled) => {
    try {
      const res = await fetch(`${TRANS_API}/upilite/toggle`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ enabled })
      });
      const data = await res.json();
      if (data.success) {
        await refreshUser();
      }
      return data;
    } catch (err) {
      return { success: false, message: 'Server error' };
    }
  };

  const fundUpiLite = async (amount, action) => {
    try {
      const res = await fetch(`${TRANS_API}/upilite/fund`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ amount, action })
      });
      const data = await res.json();
      if (data.success) {
        await fetchTransactions();
        await refreshUser();
      }
      return data;
    } catch (err) {
      return { success: false, message: 'Server error' };
    }
  };

  return (
    <WalletContext.Provider
      value={{
        linkedBanks,
        transactions,
        requests,
        rewards,
        loadingBanks,
        loadingTrans,
        loadingRequests,
        loadingRewards,
        error,
        fetchBanks,
        fetchTransactions,
        fetchRequests,
        fetchRewards,
        linkBank,
        unlinkBank,
        addMoney,
        verifyRecipient,
        sendMoney,
        rechargeMobile,
        payUtilityBill,
        requestMoney,
        handleRequest,
        scratchCard,
        toggleUpiLite,
        fundUpiLite
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => useContext(WalletContext);
