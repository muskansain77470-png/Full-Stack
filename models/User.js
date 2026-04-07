const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true, 
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      select: false, // Security: Password won't show in default queries
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
      type: String 
    },
    otpExpires: { 
      type: Date 
    },
  },
  { 
    timestamps: true, 
    toJSON: { virtuals: true }, 
    toObject: { virtuals: true }
  }
);

/**
 * FIXED: Password Hashing & Cleanup Middleware
 * Removed 'next' parameter because the function is 'async'.
 */
userSchema.pre("save", async function () {
  try {
    // 1. Trim username to remove accidental leading/trailing spaces
    if (this.isModified("username")) {
      this.username = this.username.trim();
    }

    // 2. Hash password only if it is modified
    if (this.isModified("password")) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }
    
    // In async hooks, simply returning (or finishing) acts as next()
  } catch (error) {
    // Throwing the error here will catch it in your controller's catch block
    throw error; 
  }
});

/**
 * Helper Method: Check if password matches
 */
userSchema.methods.comparePassword = async function (enteredPassword) {
  // This requires the password to be selected in the query (+password)
  return await bcrypt.compare(enteredPassword, this.password);
};

/**
 * Virtual field to check if user is admin
 */
userSchema.virtual('isAdmin').get(function() {
  return this.role === 'admin';
});

module.exports = mongoose.model("User", userSchema);