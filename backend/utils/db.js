const mongoose = require('mongoose');
const config = require('../config/config');

let cachedDB = null;

const connectDB = async () => {
    if (cachedDB) {
        return cachedDB;
    }

    try {
        const maskedUri = config.mongodbUri.replace(/\/\/.*@/, '//****:****@');
        console.log(`📡 Attempting to connect to MongoDB: ${maskedUri}`);
        
        // Set global mongoose options
        mongoose.set('bufferCommands', false);

        const conn = await mongoose.connect(config.mongodbUri, {
            serverSelectionTimeoutMS: 5000,
            // These are default in Mongoose 6+, but good to be explicit for clarity
            autoIndex: true, 
        });

        cachedDB = conn;
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

        // Handle connection events
        mongoose.connection.on('error', (err) => {
            console.error('❌ MongoDB connection error:', err);
            cachedDB = null; // Clear cache on error
        });

        mongoose.connection.on('disconnected', () => {
            console.log('⚠️  MongoDB disconnected');
            cachedDB = null; // Clear cache on disconnect
        });

        return cachedDB;
    } catch (error) {
        console.error('❌ Error connecting to MongoDB:', error.message);
        cachedDB = null;
        throw error; // Throw so the caller knows it failed
    }
};

module.exports = connectDB;
