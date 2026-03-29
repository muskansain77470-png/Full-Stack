const mongoose = require("mongoose");

/**
 * Order Schema
 * Defines the structure for customer orders, including items, pricing, and status.
 */
const orderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User", // Must match the model name in your User schema file
        required: [true, "User ID is required to place an order"]
    },
    items: [
        {
            productId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Product", // Must match the model name in your Product schema file
                required: [true, "Product ID is required"]
            },
            quantity: {
                type: Number,
                required: [true, "Quantity is required"],
                min: [1, "Quantity cannot be less than 1"]
            },
            price: {
                type: Number,
                required: [true, "Price at the time of order is required"] 
                // Note: Always store the price at purchase time to prevent 
                // historical order totals from changing if product prices are updated.
            }
        }
    ],
    totalAmount: {
        type: Number,
        required: [true, "Total amount is required"],
        min: [0, "Total amount cannot be negative"]
    },
    status: {
        type: String,
        // Restricting values to specific order states for better control
        enum: ["Pending", "Preparing", "Ready", "Delivered", "Cancelled"],
        default: 'Pending' 
    },
    displayDate: {
        type: String, 
        // Generates a human-readable date string (e.g., 29 Mar 2026)
        default: () => {
            const date = new Date();
            return date.toLocaleDateString("en-IN", {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
        }
    }
}, { 
    // Automatically adds 'createdAt' and 'updatedAt' fields
    timestamps: true 
});

/**
 * Model Export with Overwrite Protection
 * Checks if the 'Order' model is already compiled to prevent 
 * 'OverwriteModelError' during hot-reloads (Nodemon) or redeployments.
 */
const Order = mongoose.models.Order || mongoose.model("Order", orderSchema);

module.exports = Order;