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
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [loadingTrans, setLoadingTrans] = useState(false);
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

  useEffect(() => {
    if (token) {
      fetchBanks();
      fetchTransactions();
    } else {
      setLinkedBanks([]);
      setTransactions([]);
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

  return (
    <WalletContext.Provider
      value={{
        linkedBanks,
        transactions,
        loadingBanks,
        loadingTrans,
        error,
        fetchBanks,
        fetchTransactions,
        linkBank,
        unlinkBank,
        addMoney,
        verifyRecipient,
        sendMoney,
        rechargeMobile,
        payUtilityBill
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => useContext(WalletContext);
