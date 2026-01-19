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

// Connect to database
connectDB();

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

// Serve Static Assets
app.use(express.static(path.join(__dirname, 'public')));

// Serve index.html for any other route (SPA styling)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
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
// Start server only if run directly OR if NOT running in Vercel (fallback for local dev)
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
    // Close server & exit process
    process.exit(1);
});

module.exports = app;
