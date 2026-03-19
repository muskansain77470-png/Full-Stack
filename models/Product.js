const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true },
    category: {
      type: String,
      required: true,
      enum: ["Junk", "Drink", "Desert"],
    },
    // Added default: 10 so items aren't born "Sold Out"
    stock: { type: Number, default: 10, min: 0 }, 
    description: String,
    image: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);