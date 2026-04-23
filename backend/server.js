require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./utils/db');
const config = require('./config/config');

// Import routes
const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');

// Initialize express app
const app = express();

// Middleware to ensure DB is connected before processing requests
app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (error) {
        console.error('Database connection middleware error:', error);
        res.status(503).json({
            success: false,
            message: 'Database connection failed. Please try again in a moment.',
            error: error.message
        });
    }
});

// Middleware - Allow all origins in development
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, or file://)
        if (!origin) return callback(null, true);
        // Allow all other origins
        callback(null, true);
    },
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const passport = require('./config/passport');
app.use(passport.initialize());

// Request logging middleware (development)
if (config.nodeEnv === 'development') {
    app.use((req, res, next) => {
        console.log(`${req.method} ${req.path}`);
        next();
    });
}

// Health check route
app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString()
    });
});

// Debug Route - Check connectivity
app.get('/api/debug', (req, res) => {
    res.json({
        message: 'API is working',
        mongoState: require('mongoose').connection.readyState,
        env: config.nodeEnv
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/payment', require('./routes/payment'));

// Serve Static Assets
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Serve index.html for any other route (SPA styling)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// 404 handler (handled by * route above for pages, but keep for API safety if logic changes)
// Use specific middleware for /api/* 404s if needed, but generic catch-all above handles most.

// Global error handler
app.use((err, req, res, next) => {
    console.error('Global error handler:', err);

    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error',
        ...(config.nodeEnv === 'development' && { stack: err.stack })
    });
});

// Start server
// Start server only if run directly OR if NOT running in Vercel ((fallback for local dev))
if (require.main === module || !process.env.VERCEL) {
    const PORT = config.port;
    app.listen(PORT, () => {
        console.log(`
╔════════════════════════════════════════════╗
║                                            ║
║   🚀 To-Do List Backend Server Running    ║
║                                            ║
║   Port: ${PORT}                              ║
║   Environment: ${config.nodeEnv}              ║
║   Database: MongoDB                        ║
║                                            ║
╚════════════════════════════════════════════╝
        `);
    });
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('❌ Unhandled Promise Rejection:', err);
    // Do NOT exit process in serverless environment
});

module.exports = app;
