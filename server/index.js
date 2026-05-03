 // server/index.js - Complete Secure Backend
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

const app = express();

// ========== SECURITY MIDDLEWARE ==========
app.use(helmet()); // Protects against XSS, clickjacking, etc.
app.use(cors({
    origin: 'http://localhost:5173', // React dev server
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// ========== RATE LIMITING (Protects against brute force) ==========
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: 'Too many requests, please try again later.'
});
app.use('/api/', limiter);

// Stricter limiter for login
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5, // Only 5 login attempts per 15 minutes
    message: 'Too many login attempts, please try again later.'
});

// ========== REGEX WHITELISTING PATTERNS ==========
const patterns = {
    fullName: /^[A-Za-z\s'-]{2,50}$/,
    idNumber: /^[0-9]{13}$/, // South African ID (13 digits)
    accountNumber: /^[0-9]{6,15}$/, // 6-15 digits
    password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    amount: /^[0-9]+(\.[0-9]{1,2})?$/,
    currency: /^[A-Z]{3}$/,
    swiftCode: /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/
};

// ========== MONGODB CONNECTION ==========
// You'll add your MongoDB URI here later - for now, we'll use a local fallback
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/portal_db';

mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ MongoDB connected successfully'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

// ========== DATABASE SCHEMAS ==========
const userSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    idNumber: { type: String, required: true, unique: true },
    accountNumber: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    balance: { type: Number, default: 10000 }, // Starting balance for demo
    createdAt: { type: Date, default: Date.now }
});

const paymentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    recipientName: { type: String, required: true },
    recipientAccount: { type: String, required: true },
    recipientBank: { type: String, required: true },
    swiftCode: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, required: true, default: 'USD' },
    status: { type: String, default: 'pending' },
    reference: { type: String },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Payment = mongoose.model('Payment', paymentSchema);

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-this-in-production';
const JWT_EXPIRY = '24h';

// ========== HELPER FUNCTIONS ==========
const generateToken = (userId) => {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
};

const verifyToken = (req, res, next) => {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid or expired token.' });
    }
};

// ========== REGISTER API ==========
app.post('/api/register',
    body('fullName').matches(patterns.fullName).withMessage('Invalid full name format'),
    body('idNumber').matches(patterns.idNumber).withMessage('ID number must be 13 digits'),
    body('accountNumber').matches(patterns.accountNumber).withMessage('Account number must be 6-15 digits'),
    body('password').matches(patterns.password).withMessage('Password must have at least 8 characters, 1 uppercase, 1 lowercase, 1 number, and 1 special character'),
    async (req, res) => {
        // Check validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        
        const { fullName, idNumber, accountNumber, password } = req.body;
        
        try {
            // Check if user already exists
            const existingUser = await User.findOne({ 
                $or: [{ idNumber }, { accountNumber }] 
            });
            
            if (existingUser) {
                return res.status(400).json({ error: 'User with this ID or account number already exists' });
            }
            
            // Hash password (bcrypt automatically adds salt)
            const hashedPassword = await bcrypt.hash(password, 12);
            
            const user = new User({
                fullName,
                idNumber,
                accountNumber,
                password: hashedPassword
            });
            
            await user.save();
            
            // Generate token and set cookie
            const token = generateToken(user._id);
            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 24 * 60 * 60 * 1000 // 24 hours
            });
            
            res.status(201).json({ 
                success: true, 
                message: 'Registration successful!',
                user: { id: user._id, fullName: user.fullName, accountNumber: user.accountNumber, balance: user.balance }
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Registration failed. Please try again.' });
        }
    }
);

// ========== LOGIN API ==========
app.post('/api/login',
    loginLimiter,
    body('accountNumber').matches(patterns.accountNumber).withMessage('Invalid account number format'),
    body('password').notEmpty().withMessage('Password is required'),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        
        const { accountNumber, password } = req.body;
        
        try {
            const user = await User.findOne({ accountNumber });
            
            if (!user) {
                return res.status(401).json({ error: 'Invalid account number or password' });
            }
            
            const isValidPassword = await bcrypt.compare(password, user.password);
            
            if (!isValidPassword) {
                return res.status(401).json({ error: 'Invalid account number or password' });
            }
            
            const token = generateToken(user._id);
            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 24 * 60 * 60 * 1000
            });
            
            res.json({ 
                success: true, 
                message: 'Login successful!',
                user: { id: user._id, fullName: user.fullName, accountNumber: user.accountNumber, balance: user.balance }
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Login failed. Please try again.' });
        }
    }
);

// ========== LOGOUT API ==========
app.post('/api/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ success: true, message: 'Logged out successfully' });
});

// ========== GET CURRENT USER ==========
app.get('/api/me', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('-password');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ user });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// ========== GET USER BALANCE ==========
app.get('/api/balance', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('balance accountNumber');
        res.json({ balance: user.balance, accountNumber: user.accountNumber });
    } catch (error) {
        res.status(500).json({ error: 'Could not fetch balance' });
    }
});

// ========== INTERNATIONAL PAYMENT API ==========
app.post('/api/payment',
    verifyToken,
    body('recipientName').matches(/^[A-Za-z\s'-]{2,100}$/).withMessage('Invalid recipient name'),
    body('recipientAccount').matches(patterns.accountNumber).withMessage('Invalid recipient account number'),
    body('recipientBank').matches(/^[A-Za-z\s]{2,100}$/).withMessage('Invalid bank name'),
    body('swiftCode').matches(patterns.swiftCode).withMessage('Invalid SWIFT/BIC code'),
    body('amount').matches(patterns.amount).withMessage('Invalid amount format'),
    body('currency').matches(patterns.currency).withMessage('Invalid currency code (3 letters)'),
    body('reference').optional().isLength({ max: 100 }),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        
        const { recipientName, recipientAccount, recipientBank, swiftCode, amount, currency, reference } = req.body;
        const paymentAmount = parseFloat(amount);
        
        try {
            const user = await User.findById(req.userId);
            
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }
            
            if (user.balance < paymentAmount) {
                return res.status(400).json({ error: 'Insufficient balance' });
            }
            
            // Deduct balance
            user.balance -= paymentAmount;
            await user.save();
            
            // Create payment record
            const payment = new Payment({
                userId: req.userId,
                recipientName,
                recipientAccount,
                recipientBank,
                swiftCode,
                amount: paymentAmount,
                currency,
                reference: reference || `Payment to ${recipientName}`,
                status: 'completed'
            });
            
            await payment.save();
            
            res.json({
                success: true,
                message: 'Payment processed successfully!',
                transactionId: payment._id,
                newBalance: user.balance,
                payment: {
                    amount: paymentAmount,
                    currency,
                    recipient: recipientName,
                    date: payment.createdAt
                }
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Payment failed. Please try again.' });
        }
    }
);

// ========== GET PAYMENT HISTORY ==========
app.get('/api/payments', verifyToken, async (req, res) => {
    try {
        const payments = await Payment.find({ userId: req.userId }).sort({ createdAt: -1 }).limit(20);
        res.json({ payments });
    } catch (error) {
        res.status(500).json({ error: 'Could not fetch payment history' });
    }
});

// ========== HEALTH CHECK ==========
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ========== START SERVER ==========
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📡 API available at http://localhost:${PORT}/api/health`);
});
