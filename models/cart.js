const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: [true, "User ID is required to maintain a cart"]
  },
  items: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true
      },
      quantity: {
        type: Number,
        required: true,
        default: 1,
        min: [1, "Quantity cannot be less than 1"]
      }
    }
  ]
}, { 
  timestamps: true // Isse createdAt aur updatedAt automatically ban jayenge
});

/**
 * FIXED: OverwriteModelError Fix
 * Agar 'Cart' model pehle se register hai toh wahi use hoga, 
 * warna naya compile hoga.
 */
const Cart = mongoose.models.Cart || mongoose.model("Cart", cartSchema);

module.exports = Cart;