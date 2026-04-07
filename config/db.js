const mongoose = require("mongoose");

const connectDB = async () => {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;

    if (!uri) {
        console.error("❌ Error: MongoDB URI is missing!");
        process.exit(1);
    }

    try {
        // Timeout ko 5s se badha kar 15s kar rahe hain slow internet ke liye
        const options = {
            serverSelectionTimeoutMS: 15000, 
            socketTimeoutMS: 45000,
            family: 4 
        };

        // Important: Buffering ko tabhi false karein jab connection confirm ho jaye
        console.log("⏳ Connecting to MongoDB...");
        await mongoose.connect(uri, options);
        
        // Connection ke BAAD buffering disable karein taaki errors na aayein
        mongoose.set('bufferCommands', false);
        
        console.log("✅ MongoDB Connected Successfully");
    } catch (err) {
        console.error("❌ MongoDB Connection Failed!");
        console.error("Reason:", err.message);
        
        if (err.message.includes('ETIMEDOUT') || err.message.includes('selection timed out')) {
            console.log("👉 FIX: Please go to MongoDB Atlas -> Network Access -> Add IP 0.0.0.0/0");
        }
        process.exit(1); 
    }
};

module.exports = connectDB;