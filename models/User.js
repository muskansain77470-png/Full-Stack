const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please use a valid email address"],
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      select: false, // Security: Query mein password default mein nahi aayega
    },
    avatar: {
      type: String,
      default: "/images/default-avatar.png",
    },
    role: {
      type: String,
      enum: {
        values: ["user", "admin"],
        message: '{VALUE} is not a valid role'
      },
      default: "user", 
    },
    isVerified: {
      type: Boolean,
      default: false, 
    },
    otp: {
      type: String, 
    },
    otpExpires: {
      type: Date, 
    },
  },
  { 
    timestamps: true, 
    toJSON: { virtuals: true }, 
    toObject: { virtuals: true }
  }
);

/**
 * 1. Password Hashing Middleware
 * FIXED: 'next' parameter ko remove kiya gaya hai kyunki async function 
 * automatically promise return karta hai.
 */
userSchema.pre("save", async function () {
  // Username spaces remove logic (Bina space wala username backend stability ke liye acha hai)
  if (this.isModified("username")) {
    this.username = this.username.replace(/\s+/g, "");
  }

  // Password hashing logic
  if (this.isModified("password")) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  // Yahan next() call karne ki zaroorat nahi hai
});

/**
 * 2. Helper Method: Password match check karne ke liye
 * Controller ise login ke waqt use karega
 */
userSchema.methods.comparePassword = async function (enteredPassword) {
  // this.password tabhi milega jab controller mein .select("+password") use kiya ho
  return await bcrypt.compare(enteredPassword, this.password);
};

/**
 * 3. Virtual field to check if user is admin
 */
userSchema.virtual('isAdmin').get(function() {
  return this.role === 'admin';
});

module.exports = mongoose.model("User", userSchema);