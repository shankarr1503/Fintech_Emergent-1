import axios from 'axios';

// Point EXPO_PUBLIC_BACKEND_URL at your API (see frontend/.env.example).
const API_BASE = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Session token from OTP sign-in; attached to every request.
let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

/** Called when the server rejects the session (expired/invalid token). */
export const setUnauthorizedHandler = (handler: (() => void) | null) => {
  onUnauthorized = handler;
};

api.interceptors.request.use((config) => {
  if (authToken) config.headers.Authorization = `Bearer ${authToken}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401 && authToken) onUnauthorized?.();
    return Promise.reject(error);
  },
);

// Auth APIs
export const sendOTP = async (phone: string) => {
  const response = await api.post('/auth/send-otp', { phone });
  return response.data;
};

/** Revoke the current session token on the server. */
export const logoutSession = async () => {
  await api.post('/auth/logout');
};

export const verifyOTP = async (phone: string, otp: string) => {
  const response = await api.post('/auth/verify-otp', { phone, otp });
  return response.data;
};

// Dashboard API
export const getDashboard = async (userId: string) => {
  const response = await api.get(`/dashboard/${userId}`);
  return response.data;
};

// Transaction APIs
export const getTransactions = async (userId: string, limit = 100, category?: string) => {
  const params: any = { limit };
  if (category) params.category = category;
  const response = await api.get(`/transactions/${userId}`, { params });
  return response.data;
};

export const createTransaction = async (transaction: any) => {
  const response = await api.post('/transactions', transaction);
  return response.data;
};

export const mockBankSync = async (userId: string) => {
  const response = await api.post(`/transactions/mock-sync/${userId}`);
  return response.data;
};

// Analytics APIs
export const getAnalyticsSummary = async (userId: string) => {
  const response = await api.get(`/analytics/summary/${userId}`);
  return response.data;
};

export const getInsights = async (userId: string) => {
  const response = await api.get(`/analytics/insights/${userId}`);
  return response.data;
};

export const getExpenseReductionTips = async (userId: string) => {
  const response = await api.get(`/analytics/expense-reduction/${userId}`);
  return response.data;
};

// Debt APIs
export const getDebts = async (userId: string) => {
  const response = await api.get(`/debts/${userId}`);
  return response.data;
};

export const createDebt = async (debt: any) => {
  const response = await api.post('/debts', debt);
  return response.data;
};

export const deleteDebt = async (debtId: string) => {
  const response = await api.delete(`/debts/${debtId}`);
  return response.data;
};

export const payDebt = async (debtId: string, amount: number) => {
  const response = await api.post(`/debts/${debtId}/pay`, { amount });
  return response.data;
};

export const analyzeDebts = async (userId: string, extraPayment = 0) => {
  const response = await api.get(`/debts/analysis/${userId}`, { params: { extra_payment: extraPayment } });
  return response.data;
};

// Savings APIs
export const getSavingsGoals = async (userId: string) => {
  const response = await api.get(`/savings/${userId}`);
  return response.data;
};

export const createSavingsGoal = async (goal: any) => {
  const response = await api.post('/savings', goal);
  return response.data;
};

export const contributeSavings = async (goalId: string, amount: number) => {
  const response = await api.post('/savings/contribute', { goal_id: goalId, amount });
  return response.data;
};

export const deleteSavingsGoal = async (goalId: string) => {
  const response = await api.delete(`/savings/${goalId}`);
  return response.data;
};

export const getSavingsSuggestions = async (userId: string) => {
  const response = await api.get(`/savings/suggestions/${userId}`);
  return response.data;
};

// User Profile APIs
export const getUser = async (userId: string) => {
  const response = await api.get(`/users/${userId}`);
  return response.data;
};

export const updateUser = async (
  userId: string,
  data: { name?: string; monthly_income?: number; fixed_expenses?: number; avatar?: string },
) => {
  const response = await api.put(`/users/${userId}`, data);
  return response.data;
};

export const deleteUserAccount = async (userId: string, reason?: string) => {
  const response = await api.delete(`/users/${userId}`, { data: { user_id: userId, reason } });
  return response.data;
};

export const exportUserData = async (userId: string) => {
  const response = await api.get(`/users/${userId}/export`);
  return response.data;
};

// Security & Settings APIs
export const getSecuritySettings = async (userId: string) => {
  const response = await api.get(`/users/${userId}/security`);
  return response.data;
};

export const updateSecuritySettings = async (userId: string, settings: {
  biometric_enabled?: boolean;
  transaction_alerts?: boolean;
  login_notifications?: boolean;
}) => {
  const response = await api.post(`/users/${userId}/security`, { user_id: userId, ...settings });
  return response.data;
};

export const updateLanguage = async (userId: string, language: string) => {
  const response = await api.post(`/users/${userId}/language`, { user_id: userId, language });
  return response.data;
};

export const getLinkedAccounts = async (userId: string) => {
  const response = await api.get(`/users/${userId}/linked-accounts`);
  return response.data;
};

// Support API
export const submitSupportRequest = async (userId: string, subject: string, message: string) => {
  const response = await api.post('/support', { user_id: userId, subject, message });
  return response.data;
};

// ============== CRED-LIKE FEATURES ==============

// Credit Score APIs
export const getCreditScore = async (userId: string) => {
  const response = await api.get(`/credit-score/${userId}`);
  return response.data;
};

export const payCreditCardBill = async (userId: string, cardBank: string, amount: number) => {
  const response = await api.post('/credit-cards/pay-bill', { user_id: userId, card_bank: cardBank, amount });
  return response.data;
};

// Rewards APIs
export const getRewards = async (userId: string) => {
  const response = await api.get(`/rewards/${userId}`);
  return response.data;
};

export const redeemReward = async (userId: string, dealId: string) => {
  const response = await api.post('/rewards/redeem', { user_id: userId, deal_id: dealId });
  return response.data;
};

// Bills APIs
export const getBills = async (userId: string) => {
  const response = await api.get(`/bills/${userId}`);
  return response.data;
};

export const payBill = async (userId: string, billId: string) => {
  const response = await api.post('/bills/pay', { user_id: userId, bill_id: billId });
  return response.data;
};

// ============== 1% CLUB FEATURES ==============

// Learning APIs
export const getCourses = async () => {
  const response = await api.get('/learn/courses');
  return response.data;
};

export const getArticles = async () => {
  const response = await api.get('/learn/articles');
  return response.data;
};

export const getLearningProgress = async (userId: string) => {
  const response = await api.get(`/learn/progress/${userId}`);
  return response.data;
};

export const completeModule = async (userId: string, courseId: string, moduleId: string) => {
  const response = await api.post('/learn/complete-module', { user_id: userId, course_id: courseId, module_id: moduleId });
  return response.data;
};

// Community APIs
export const getCommunityPosts = async () => {
  const response = await api.get('/community/posts');
  return response.data;
};

// ============== ACCOUNT AGGREGATOR (AA) FRAMEWORK ==============

export const getAAConsentStatus = async (userId: string) => {
  const response = await api.get(`/aa/consent-status/${userId}`);
  return response.data;
};

export const initiateAAConsent = async (userId: string, fipIds: string[]) => {
  const response = await api.post('/aa/initiate-consent', { user_id: userId, fip_ids: fipIds });
  return response.data;
};

export const confirmAAConsent = async (consentId: string, userId: string) => {
  const response = await api.post('/aa/confirm-consent', { consent_id: consentId, user_id: userId });
  return response.data;
};

export const getAggregatedData = async (userId: string) => {
  const response = await api.get(`/aa/aggregated-data/${userId}`);
  return response.data;
};

export const revokeAAConsent = async (userId: string, consentId: string) => {
  const response = await api.post('/aa/revoke-consent', { user_id: userId, consent_id: consentId });
  return response.data;
};

// ============== SECURITY & COMPLIANCE ==============

export const getAuditLog = async (userId: string) => {
  const response = await api.get(`/security/audit-log/${userId}`);
  return response.data;
};

export const getPrivacySettings = async (userId: string) => {
  const response = await api.get(`/security/privacy-settings/${userId}`);
  return response.data;
};

export const updatePrivacySettings = async (userId: string, settings: any) => {
  const response = await api.post('/security/update-privacy', { user_id: userId, settings });
  return response.data;
};

export const getRBIComplianceInfo = async () => {
  const response = await api.get('/compliance/rbi-info');
  return response.data;
};

// ============== UPI PAYMENTS ==============

export const getUPILinkedAccounts = async (userId: string) => {
  const response = await api.get(`/upi/linked-accounts/${userId}`);
  return response.data;
};

export const getRecentPayees = async (userId: string) => {
  const response = await api.get(`/upi/recent-payees/${userId}`);
  return response.data;
};

export const sendMoneyUPI = async (userId: string, recipientUpi: string, amount: number, note: string, sourceAccount: string) => {
  const response = await api.post('/upi/send-money', { user_id: userId, recipient_upi: recipientUpi, amount, note, source_account: sourceAccount });
  return response.data;
};

export const requestMoneyUPI = async (userId: string, fromUpi: string, amount: number, note: string) => {
  const response = await api.post('/upi/request-money', { user_id: userId, from_upi: fromUpi, amount, note });
  return response.data;
};

export const getUPIHistory = async (userId: string) => {
  const response = await api.get(`/upi/transaction-history/${userId}`);
  return response.data;
};

// ============== DIGITAL LOANS ==============

export const checkLoanEligibility = async (userId: string) => {
  const response = await api.get(`/loans/eligibility/${userId}`);
  return response.data;
};

export const applyForLoan = async (userId: string, loanType: string, amount: number, tenure: number, collateralIds: string[]) => {
  const response = await api.post('/loans/apply', { user_id: userId, loan_type: loanType, amount, tenure, collateral_ids: collateralIds });
  return response.data;
};

export const getActiveLoans = async (userId: string) => {
  const response = await api.get(`/loans/active/${userId}`);
  return response.data;
};

// ============== COMPREHENSIVE ACCOUNTS ==============

export const getAllAccounts = async (userId: string) => {
  const response = await api.get(`/accounts/all/${userId}`);
  return response.data;
};

export const addAccount = async (userId: string, accountType: string, accountData: any) => {
  const response = await api.post('/accounts/add', { user_id: userId, account_type: accountType, account_data: accountData });
  return response.data;
};

export const getInvestmentPortfolio = async (userId: string) => {
  const response = await api.get(`/investments/portfolio/${userId}`);
  return response.data;
};

// ============== GAME ==============

export const getGameProfile = async (userId: string) => {
  const response = await api.get(`/game/profile/${userId}`);
  return response.data;
};

export const dailyCheckIn = async (userId: string) => {
  const response = await api.post('/game/checkin', { user_id: userId });
  return response.data;
};

export const getLeaderboard = async (userId: string) => {
  const response = await api.get(`/game/leaderboard/${userId}`);
  return response.data;
};

/** Pull a human-readable message out of an axios error. */
export const errorMessage = (error: any, fallback = 'Something went wrong') => {
  const detail = error?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg;
  if (error?.message === 'Network Error') return 'Cannot reach the server. Is the backend running?';
  return fallback;
};

export default api;
