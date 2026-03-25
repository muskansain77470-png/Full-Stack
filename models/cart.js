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

module.exports = mongoose.model("Cart", cartSchema);