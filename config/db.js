const mongoose = require("mongoose");

const connectDB = async () => {
    const uri = process.env.MONGODB_URI;

    // Debugging ke liye check karein string kya aa rahi hai
    console.log("Attempting to connect with URI:", uri); 

    if (!uri || (!uri.startsWith("mongodb://") && !uri.startsWith("mongodb+srv://"))) {
        console.error("❌ Error: Invalid MongoDB URI scheme!");
        return;
    }

    try {
        await mongoose.connect(uri);
        console.log("✅ MongoDB Connected Successfully");
    } catch (err) {
        console.error("❌ MongoDB Connection Failed:", err.message);
    }
};

module.exports = connectDB;