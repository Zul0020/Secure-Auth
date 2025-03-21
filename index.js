const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Resend } = require('resend');
const db = require('./db');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'onboarding@resend.dev';
const resend = new Resend(process.env.RESEND_API_KEY);

// CORS configuration
const corsOptions = {
  origin: NODE_ENV === 'production' 
    ? ['https://secureauth01.netlify.app/', 'http://127.0.0.1:5500', 'http://localhost:5500'] 
    : ['http://127.0.0.1:5500', 'http://localhost:5500'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};
// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', environment: NODE_ENV });
});

// Generate OTP
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Access denied' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// Signup endpoint
app.post('/api/signup', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check if user exists
        const userExists = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userExists.rows.length > 0) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Generate OTP
        const otp = generateOTP();
        const otpExpiry = new Date();
        otpExpiry.setMinutes(otpExpiry.getMinutes() + 10); // OTP valid for 10 minutes

        // Create user
        const newUser = await db.query(
            'INSERT INTO users (email, password, otp, otp_expiry) VALUES ($1, $2, $3, $4) RETURNING id, email',
            [email, hashedPassword, otp, otpExpiry]
        );

        // Send OTP email with better formatting
        await resend.emails.send({
            from: SENDER_EMAIL,
            to: email,
            subject: 'Verify Your Account - SecureAuth',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #333; text-align: center;">Welcome to SecureAuth!</h2>
                    <div style="background-color: #f9f9f9; border-radius: 5px; padding: 20px; margin: 20px 0;">
                        <p style="font-size: 16px; color: #444;">Your verification code is:</p>
                        <h1 style="text-align: center; color: #007bff; letter-spacing: 5px; font-size: 32px; margin: 20px 0;">${otp}</h1>
                        <p style="color: #666; font-size: 14px;">This code will expire in 10 minutes.</p>
                    </div>
                    <p style="color: #888; font-size: 12px; text-align: center;">If you didn't request this code, please ignore this email.</p>
                </div>
            `
        });

        // Generate token
        const token = jwt.sign(
            { id: newUser.rows[0].id, email: newUser.rows[0].email },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({
            token,
            message: 'Signup successful. Please check your email for verification code.'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Signin endpoint
app.post('/api/signin', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check if user exists
        const user = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (user.rows.length === 0) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Check password
        const validPassword = await bcrypt.compare(password, user.rows[0].password);
        if (!validPassword) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Generate token
        const token = jwt.sign(
            { id: user.rows[0].id, email: user.rows[0].email },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({
            token,
            isVerified: user.rows[0].is_verified,
            username: user.rows[0].username
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Verify OTP endpoint
app.post('/api/verify', authenticateToken, async (req, res) => {
    try {
        const { email, otp } = req.body;

        // Check if user exists
        const user = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (user.rows.length === 0) {
            return res.status(400).json({ message: 'User not found' });
        }

        // Check if OTP is valid and not expired
        if (user.rows[0].otp !== otp) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        if (new Date() > new Date(user.rows[0].otp_expiry)) {
            return res.status(400).json({ message: 'OTP expired' });
        }

        // Update user verification status
        await db.query(
            'UPDATE users SET is_verified = true, otp = null, otp_expiry = null WHERE email = $1',
            [email]
        );

        res.json({ message: 'Account verified successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Resend OTP endpoint
app.post('/api/resend-otp', authenticateToken, async (req, res) => {
    try {
        const { email } = req.body;

        // Generate new OTP
        const otp = generateOTP();
        const otpExpiry = new Date();
        otpExpiry.setMinutes(otpExpiry.getMinutes() + 10);

        // Update user's OTP
        await db.query(
            'UPDATE users SET otp = $1, otp_expiry = $2 WHERE email = $3',
            [otp, otpExpiry, email]
        );

        // Send new OTP email with better formatting
        await resend.emails.send({
            from: SENDER_EMAIL,
            to: email,
            subject: 'New Verification Code - SecureAuth',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #333; text-align: center;">New Verification Code</h2>
                    <div style="background-color: #f9f9f9; border-radius: 5px; padding: 20px; margin: 20px 0;">
                        <p style="font-size: 16px; color: #444;">Your new verification code is:</p>
                        <h1 style="text-align: center; color: #007bff; letter-spacing: 5px; font-size: 32px; margin: 20px 0;">${otp}</h1>
                        <p style="color: #666; font-size: 14px;">This code will expire in 10 minutes.</p>
                    </div>
                    <p style="color: #888; font-size: 12px; text-align: center;">If you didn't request this code, please ignore this email.</p>
                </div>
            `
        });

        res.json({ message: 'New verification code sent successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} in ${NODE_ENV} mode`);
}); 
