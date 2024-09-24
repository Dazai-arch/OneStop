const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const session = require("express-session"); // Import express-session

dotenv.config();
const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "./frontend")));
app.use(express.static(path.join(__dirname, "./Profileimage")));
app.use(express.static(path.join(__dirname, "./assets")));

// Set up session middleware
app.use(
  session({
    secret: "your-secret-key", // Use a strong secret key
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }, // Set 'secure: true' if using HTTPS
  })
);

const mongoURI = process.env.MONGO_URI;
const dbNAME = process.env.DB_NAME;

mongoose
  .connect(mongoURI, {
    dbName: dbNAME,
  })
  .then(() => {
    console.log("Connected to MongoDB successfully!");
  })
  .catch((err) => {
    console.error("Error connecting to MongoDB:", err);
  });

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  designation: { type: String, required: true },
  phone: { type: String, required: true },
  password: { type: String, required: true },
  image: { type: String, default: null },
  date: { type: Date, default: Date.now },
});

const User = mongoose.model("User", userSchema);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "./frontend/html/signup.html"));
});

app.post("/signup", async (req, res) => {
  const { email, username, designation, phone, password } = req.body;

  try {
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      console.log(`Signup attempt with existing email: ${email}`);
      return res
        .status(400)
        .json({ message: `Email ${email} is already in use.` });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      email,
      username,
      designation,
      phone,
      password: hashedPassword,
    });

    const savedUser = await newUser.save();
    console.log(`New user signed up: Email: ${email}, Username: ${username}`);

    // Store the user ID in the session
    req.session.userId = savedUser._id;

    res.status(201).json({ message: "Signup successful!" });
  } catch (error) {
    console.error("Error during signup:", error);
    res.status(500).json({ message: "Signup failed. Please try again." });
  }
});

app.post("/save-profile-image", async (req, res) => {
  const { imagePath } = req.body;

  // Get user ID from the session
  const userId = req.session.userId;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (!imagePath) {
    return res.status(400).json({ message: "No image path provided" });
  }

  try {
    // Update the user document with the selected image path
    await User.findByIdAndUpdate(userId, { image: imagePath });

    console.log(
      `Profile image updated for user ID: ${userId}, Image path: ${imagePath}`
    );

    res.status(200).json({ message: "Profile image saved!" });
  } catch (error) {
    console.error("Error saving profile image:", error);
    res.status(500).json({ message: "Failed to save profile image" });
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ message: "Email and password are required." });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      console.log(`User not found for email: ${email}`);
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      console.log(`Password mismatch for user: ${email}`);
      return res.status(401).json({ message: "Invalid email or password." });
    }

    // Store the user ID in the session after login
    req.session.userId = user._id;

    console.log(`User logged in: ${email}`);
    res.status(200).json({ message: "Login successful.", userId: user._id });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ message: "Login failed due to an error." });
  }
});

let resetCodes = {};

app.post("/send-reset-code", async (req, res) => {
  const { email } = req.body;

  try {
    console.log("Received email:", email);

    const user = await User.findOne({ email });
    if (!user) {
      console.log("Email not found:", email);
      return res.status(400).json({ message: "Email not found" });
    }

    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    resetCodes[email] = resetCode;
    console.log("Generated reset code:", resetCode);

    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL,
      to: email,
      subject: "Password Reset Code",
      text: `Your password reset code for OneStop is: ${resetCode}`,
    };

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error("Error sending mail:", err);
        return res.status(500).json({ message: "Error sending reset code" });
      }
      console.log("Email sent:", info.response);
      res.json({ message: "Reset code sent to your email!" });
    });
  } catch (error) {
    console.error("Error in /send-reset-code:", error);
    res.status(500).json({ message: "An error occurred during the request." });
  }
});

app.post("/verify-reset-code", async (req, res) => {
  const { email, code } = req.body;

  if (resetCodes[email] && resetCodes[email] === code) {
    return res.json({
      success: true,
      message: "Code verified, proceed to reset your password",
    });
  }

  res.status(400).json({ success: false, message: "Invalid reset code" });
});

app.post("/reset-password", async (req, res) => {
  const { email, newPassword } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    user.password = hashedPassword;
    await user.save();

    delete resetCodes[email];

    res.json({ message: "Password reset successfully!" });
  } catch (error) {
    res.status(500).json({ message: "Error resetting password." });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
