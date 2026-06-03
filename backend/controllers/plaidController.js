import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
import BankAccount from '../models/BankAccount.js';

// Configuration for Plaid API Client
// Register at dashboard.plaid.com to retrieve PLAID_CLIENT_ID and secrets.
const configuration = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV || 'sandbox'],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID || 'MOCK_CLIENT_ID',
      'PLAID-SECRET': process.env.PLAID_SECRET || 'MOCK_SECRET',
    },
  },
});

const plaidClient = new PlaidApi(configuration);

// 1. Create Link Token (To initialize the Plaid SDK on the frontend)
export const createLinkToken = async (req, res) => {
  try {
    const response = await plaidClient.linkTokenCreate({
      user: {
        client_user_id: req.user._id.toString(),
      },
      client_name: 'AuraPay Mobile',
      products: ['auth', 'transactions', 'balance'],
      country_codes: ['US', 'IN'], // Plaid supports US, CA, UK, EU and select Indian integrations
      language: 'en',
    });

    res.json({ success: true, link_token: response.data.link_token });
  } catch (error) {
    console.error('Error creating Plaid link token:', error);
    res.status(500).json({ success: false, message: 'Failed to initialize bank connector SDK' });
  }
};

// 2. Exchange Public Token (Once user signs in via Plaid secure modal)
export const exchangePublicToken = async (req, res) => {
  const { public_token, bankName } = req.body;
  const userId = req.user._id;

  try {
    // Exchange public token for a permanent access token
    const tokenResponse = await plaidClient.itemPublicTokenExchange({
      public_token: public_token,
    });

    const accessToken = tokenResponse.data.access_token;
    const itemId = tokenResponse.data.item_id;

    // Fetch account details (account numbers & current balances) using access token
    const authResponse = await plaidClient.authGet({
      access_token: accessToken,
    });

    const accounts = authResponse.data.accounts;

    // Save linked bank accounts to database
    const savedAccounts = [];
    for (let acc of accounts) {
      const dbAcc = await BankAccount.create({
        userId,
        bankName: bankName || 'Connected Bank',
        accountNumber: acc.mask ? `•••• •••• ${acc.mask}` : acc.account_id,
        balance: acc.balances.available || acc.balances.current || 0,
        routingCode: authResponse.data.numbers.ach?.[0]?.routing || 'PLAID_ROUTING',
        isLinked: true,
        // In production, we'd also encrypt and save accessToken/itemId associated with the account
      });
      savedAccounts.push(dbAcc);
    }

    res.json({
      success: true,
      message: 'Real Bank account securely linked!',
      data: savedAccounts
    });
  } catch (error) {
    console.error('Error exchanging Plaid public token:', error);
    res.status(500).json({ success: false, message: 'Failed to authenticate secure token handshake' });
  }
};
