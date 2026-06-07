// server/index.js - Employee Portal (NO REGISTRATION) - FULL CORRECTED VERSION
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
const path = require('path');

const app = express();

// ========== SECURITY MIDDLEWARE ==========
app.use(helmet());

// ========== CORS CONFIGURATION ==========
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5000',
    'https://tangerine-cranachan-d3bf75.netlify.app'
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1) {
            return callback(null, true);
        } else {
            console.log('Blocked origin:', origin);
            return callback(new Error('Not allowed by CORS'), false);
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
}));

app.use(express.json());
app.use(cookieParser());

// ========== RATE LIMITING (Brute Force Protection) ==========
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts only
    message: 'Too many login attempts. Please try again in 15 minutes.',
    standardHeaders: true,
    legacyHeaders: false,
});

// General rate limiter for all API requests
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests. Please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

// ========== REGEX WHITELISTING PATTERNS ==========
const patterns = {
    employeeId: /^EMP[0-9]{3}$/,  // EMP001, EMP002, etc.
    fullName: /^[A-Za-z\s'-]{2,50}$/,
    password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    amount: /^[0-9]+(\.[0-9]{1,2})?$/,
    currency: /^[A-Z]{3}$/,
    swiftCode: /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/
};

// ========== MONGODB CONNECTION ==========
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/portal_db';

mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ MongoDB connected successfully'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

// ========== EMPLOYEE SCHEMA (NO REGISTRATION - Pre-created employees only) ==========
const employeeSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    employeeId: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'employee' },
    department: { type: String },
    balance: { type: Number, default: 50000 },
    createdAt: { type: Date, default: Date.now }
});

const paymentSchema = new mongoose.Schema({
    employeeId: { type: String, required: true },
    recipientName: { type: String, required: true },
    recipientAccount: { type: String, required: true },
    recipientBank: { type: String, required: true },
    swiftCode: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, required: true, default: 'USD' },
    status: { type: String, default: 'completed' },
    reference: { type: String },
    createdAt: { type: Date, default: Date.now }
});

const Employee = mongoose.model('Employee', employeeSchema);
const Payment = mongoose.model('Payment', paymentSchema);

const JWT_SECRET = process.env.JWT_SECRET || 'employee-portal-secret-key';
const JWT_EXPIRY = '8h';

// ========== HELPER FUNCTIONS ==========
const generateToken = (employeeId, role) => {
    return jwt.sign({ employeeId, role }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
};

const verifyToken = (req, res, next) => {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Access denied. Please login.' });
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.employeeId = decoded.employeeId;
        req.role = decoded.role;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid or expired session. Please login again.' });
    }
};

const verifyAdmin = (req, res, next) => {
    if (req.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

// ========== EMPLOYEE LOGIN API (NO REGISTRATION) ==========
app.post('/api/login',
    loginLimiter,
    body('employeeId').matches(patterns.employeeId).withMessage('Invalid Employee ID format (e.g., EMP001)'),
    body('password').notEmpty().withMessage('Password is required'),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        
        const { employeeId, password } = req.body;
        
        try {
            const employee = await Employee.findOne({ employeeId });
            
            if (!employee) {
                return res.status(401).json({ error: 'Invalid Employee ID or password' });
            }
            
            const isValidPassword = await bcrypt.compare(password, employee.password);
            
            if (!isValidPassword) {
                return res.status(401).json({ error: 'Invalid Employee ID or password' });
            }
            
            const token = generateToken(employee.employeeId, employee.role);
            res.cookie('token', token, {
                httpOnly: true,
                secure: true,
                sameSite: 'none',
                maxAge: 8 * 60 * 60 * 1000
            });
            
            res.json({ 
                success: true, 
                message: 'Login successful!',
                employee: { 
                    employeeId: employee.employeeId, 
                    fullName: employee.fullName, 
                    role: employee.role,
                    department: employee.department,
                    balance: employee.balance 
                }
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Login failed. Please try again.' });
        }
    }
);

// ========== LOGOUT API ==========
app.post('/api/logout', (req, res) => {
    res.clearCookie('token', {
        httpOnly: true,
        secure: true,
        sameSite: 'none'
    });
    res.json({ success: true, message: 'Logged out successfully' });
});

// ========== GET CURRENT EMPLOYEE ==========
app.get('/api/me', verifyToken, async (req, res) => {
    try {
        const employee = await Employee.findOne({ employeeId: req.employeeId }).select('-password');
        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }
        res.json({ employee });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// ========== GET EMPLOYEE BALANCE ==========
app.get('/api/balance', verifyToken, async (req, res) => {
    try {
        const employee = await Employee.findOne({ employeeId: req.employeeId }).select('balance employeeId');
        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }
        res.json({ balance: employee.balance, employeeId: employee.employeeId });
    } catch (error) {
        res.status(500).json({ error: 'Could not fetch balance' });
    }
});

// ========== INTERNATIONAL PAYMENT API ==========
app.post('/api/payment',
    verifyToken,
    body('recipientName').matches(/^[A-Za-z\s'-]{2,100}$/).withMessage('Invalid recipient name'),
    body('recipientAccount').matches(/^[0-9]{6,15}$/).withMessage('Invalid recipient account number'),
    body('recipientBank').matches(/^[A-Za-z\s]{2,100}$/).withMessage('Invalid bank name'),
    body('swiftCode').matches(patterns.swiftCode).withMessage('Invalid SWIFT/BIC code'),
    body('amount').matches(patterns.amount).withMessage('Invalid amount format'),
    body('currency').matches(patterns.currency).withMessage('Invalid currency code (3 letters)'),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        
        const { recipientName, recipientAccount, recipientBank, swiftCode, amount, currency, reference } = req.body;
        const paymentAmount = parseFloat(amount);
        
        try {
            const employee = await Employee.findOne({ employeeId: req.employeeId });
            
            if (!employee) {
                return res.status(404).json({ error: 'Employee not found' });
            }
            
            if (employee.balance < paymentAmount) {
                return res.status(400).json({ error: 'Insufficient balance' });
            }
            
            employee.balance -= paymentAmount;
            await employee.save();
            
            const payment = new Payment({
                employeeId: req.employeeId,
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
                message: 'International payment processed successfully!',
                transactionId: payment._id,
                newBalance: employee.balance,
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
        const payments = await Payment.find({ employeeId: req.employeeId }).sort({ createdAt: -1 }).limit(20);
        res.json({ payments });
    } catch (error) {
        res.status(500).json({ error: 'Could not fetch payment history' });
    }
});

// ========== ADMIN ONLY: GET ALL EMPLOYEES ==========
app.get('/api/employees', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const employees = await Employee.find({}).select('-password');
        res.json({ employees });
    } catch (error) {
        res.status(500).json({ error: 'Could not fetch employees' });
    }
});

// ========== HEALTH CHECK ==========
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ========== START SERVER ==========
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Employee Portal Server running on http://localhost:${PORT}`);
    console.log(`📡 API available at http://localhost:${PORT}/api/health`);
    console.log(`🔐 Employee login: EMP001, EMP002, EMP003`);
});

// Export for testing (optional)
module.exports = app;