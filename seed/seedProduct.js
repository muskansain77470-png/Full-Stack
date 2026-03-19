require("dotenv").config();
const mongoose = require("mongoose");
const Product = require("../models/Product"); // <- correct path

const products = [
  { name: "Burger", price: 120, image: "/images/Burger.png", category: "Junk" },
  { name: "CholeBature", price: 320, image: "/images/CholeBature.jpg", category: "Junk" },
  { name: "ColdCoffee", price: 180, image: "/images/ColdCoffee.jpg", category: "Drink" },
  { name: "Cookies", price: 380, image: "/images/Cookies.avif", category: "Junk" },
  { name: "Icecream", price: 140, image: "/images/Icecream.jpg", category: "Desert" },
  { name: "Momose", price: 100, image: "/images/Momose.avif", category: "Junk" },
  { name: "Fries", price: 150, image: "/images/Fries.jpg", category: "Junk" },
  { name: "Pizza", price: 120, image: "/images/Pizza.jpg", category: "Junk" },
  { name: "Rasmalai", price: 480, image: "/images/Rasmalai.webp", category: "Desert" }
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected for seeding");

    await Product.deleteMany({});
    console.log("Existing products cleared");

    await Product.insertMany(products);
    console.log("Products seeded successfully");

    process.exit();
  } catch (err) {
    console.error("Seeding error:", err);
    process.exit(1);
  }
}

seed();
