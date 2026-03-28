const mongoose = require("mongoose");

/**
 * Order Schema
 * Defines the structure for customer orders, including items, pricing, and status.
 */
const orderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: [true, "User ID is required"]
    },
    items: [
        {
            productId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Product",
                required: [true, "Product ID is required"]
            },
            quantity: {
                type: Number,
                required: [true, "Quantity is required"],
                min: [1, "Quantity cannot be less than 1"]
            },
            price: {
                type: Number,
                // Required set to false to prevent validation errors if the controller 
                // fails to pass the price during the initial save process.
                required: false 
            }
        }
    ],
    totalAmount: {
        type: Number,
        required: [true, "Total amount is required"]
    },
    status: {
        type: String,
        // Using a default value; 'enum' is omitted here to allow flexibility 
        // between different case formats (e.g., 'pending' vs 'Pending').
        default: 'Pending' 
    },
    displayDate: {
        type: String, 
        // If the date is not provided by the controller, this function 
        // automatically generates a date string in the Indian locale format.
        default: () => new Date().toLocaleDateString("en-IN")
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

/**
 * FIXED: OverwriteModelError Fix
 * Agar model pehle se compiled hai toh use use karega, 
 * warna naya compile karega. Isse nodemon crash nahi hoga.
 */
const Order = mongoose.models.Order || mongoose.model("Order", orderSchema);

module.exports = Order;