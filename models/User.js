const mongoose = require("mongoose");

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
      select: false, // Hidden by default for security
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

userSchema.virtual('isAdmin').get(function() {
  return this.role === 'admin';
});

module.exports = mongoose.model("User", userSchema);