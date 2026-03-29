const mongoose = require("mongoose");

const connectDB = async () => {
    // Ensure you use the exact variable name from your .env file
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;

    console.log("Attempting to connect with URI:", uri ? "URI Found (Hidden for security)" : "URI NOT FOUND"); 

    if (!uri) {
        console.error("❌ Error: MongoDB URI is missing in .env file!");
        process.exit(1); // Stop the server if DB cannot connect
    }

    try {
        // Simple connection for Mongoose 6+ (options like useNewUrlParser are default)
        await mongoose.connect(uri);
        console.log("✅ MongoDB Connected Successfully");
    } catch (err) {
        console.error("❌ MongoDB Connection Failed:", err.message);
        // Important: Log the actual error to see if it's a whitelist/password issue
        process.exit(1); 
    }
};

module.exports = connectDB;