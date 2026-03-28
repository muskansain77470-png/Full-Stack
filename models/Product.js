const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: { 
      type: String, 
      required: true 
    },
    price: { 
      type: Number, 
      required: true 
    },
    category: {
      type: String,
      required: true,
      enum: ["Junk", "Drink", "Desert"], // Make sure your frontend matches these names
    },
    // Stock management logic
    stock: { 
      type: Number, 
      default: 10, 
      min: 0 
    }, 
    description: String,
    image: String,
  },
  { timestamps: true }
);

/**
 * FIXED: OverwriteModelError Fix
 * Hum pehle check karenge ki 'Product' model mongoose.models mein hai ya nahi.
 * Agar hai, toh wahi use karenge, warna naya banayenge.
 */
const Product = mongoose.models.Product || mongoose.model("Product", productSchema);

module.exports = Product;