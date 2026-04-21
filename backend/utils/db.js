const mongoose = require('mongoose');
const config = require('../config/config');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(config.mongodbUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

        // Handle connection events
        mongoose.connection.on('error', (err) => {
            console.error('❌ MongoDB connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.log('⚠️  MongoDB disconnected');
        });

        // Graceful shutdown
        // Graceful shutdown (Not needed for serverless, usually for long running containers)
        /*process.on('SIGINT', async () => {
             await mongoose.connection.close();
             console.log('MongoDB connection closed through app termination');
             process.exit(0);
        });*/

    } catch (error) {
        console.error('❌ Error connecting to MongoDB:', error.message);
        // Do NOT exit process in serverless environment
        // process.exit(1); 
    }
};

module.exports = connectDB;
