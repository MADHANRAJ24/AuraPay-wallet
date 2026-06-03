import User from '../models/User.js';
import Transaction from '../models/Transaction.js';

// Get admin stats & analytics data
export const getAdminStats = async (req, res) => {
  try {
    const allUsers = await User.find({});
    const allTrans = await Transaction.find({});

    const totalUsers = allUsers.filter(u => u.role !== 'admin').length;
    const blockedUsers = allUsers.filter(u => u.status === 'blocked').length;
    const totalTransactions = allTrans.length;

    // Sum total transacted amount (exclude loads/recharges/bills if we want purely user-to-user, but let's calculate total volume across all types)
    const totalVolume = allTrans
      .filter(t => t.status === 'success')
      .reduce((sum, t) => sum + t.amount, 0);

    const flaggedTransactions = allTrans.filter(t => t.isFlagged).length;

    // Calculate distributions
    const typeDistribution = allTrans.reduce((acc, t) => {
      acc[t.type] = (acc[t.type] || 0) + 1;
      return acc;
    }, {});

    // Prepare 7-day activity chart data
    const last7Days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    const chartData = last7Days.map(date => {
      const dayTrans = allTrans.filter(t => {
        const tDate = typeof t.createdAt === 'string' ? t.createdAt : t.createdAt.toISOString();
        return tDate.startsWith(date);
      });
      const amount = dayTrans.filter(t => t.status === 'success').reduce((sum, t) => sum + t.amount, 0);
      return {
        date: date.substring(5), // MM-DD format
        amount,
        count: dayTrans.length
      };
    });

    res.json({
      success: true,
      data: {
        totalUsers,
        blockedUsers,
        totalTransactions,
        totalVolume,
        flaggedTransactions,
        typeDistribution,
        chartData
      }
    });
  } catch (error) {
    console.error('Get Admin Stats Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Monitor all transactions (with fraud filtering options)
export const getAllTransactions = async (req, res) => {
  try {
    const allTrans = await Transaction.find({});
    
    // Sort transactions manually by date descending
    const sortedTrans = allTrans.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ success: true, data: sortedTrans });
  } catch (error) {
    console.error('Admin Get Transactions Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Toggle user status (block/unblock)
export const toggleUserStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'active' or 'blocked'

  try {
    if (!status || (status !== 'active' && status !== 'blocked')) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (targetUser.role === 'admin') {
      return res.status(400).json({ success: false, message: 'Cannot modify admin accounts' });
    }

    await User.findByIdAndUpdate(id, { status });

    res.json({
      success: true,
      message: `User status successfully updated to ${status}`
    });
  } catch (error) {
    console.error('Toggle User Status Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
