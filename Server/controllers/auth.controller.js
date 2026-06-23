const UserModel = require("../models/user.model");
const generateToken = require("../utils/generateToken");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const config = require("../config/config");

async function register(req, res, next) {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res
        .status(400)
        .json({ message: "Please provide username, email and password" });
    }
    if (password.length < 8) {
      return res
        .status(400)
        .json({ message: "Password must be at least 8 characters" });
    }

    const existingUser = await UserModel.findOne({
      $or: [{ email: email.toLowerCase() }, { username }],
    });

    if (existingUser) {
      return res
        .status(409)
        .json({ message: "Username or email already in use" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await UserModel.create({
      username,
      email: email.toLowerCase(),
      password: hashedPassword,
    });

    const { accessToken, refreshToken } = generateToken(user);

    const hashRefreshToken = await bcrypt.hash(refreshToken, salt);

    user.refreshToken = hashRefreshToken;
    await user.save();

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: "Strict",
    });

    res.status(201).json({
      accessToken,
      user: { id: user._id, username: user.username, email: user.email },
    });
  } catch (err) {
    console.error("Signup error:", err.message);
    res.status(500).json({ message: "Server error during signup" });
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Please provide email and password" });
    }

    const user = await UserModel.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const { accessToken, refreshToken } = generateToken(user);

    const salt = await bcrypt.genSalt(10);
    const hashRefreshToken = await bcrypt.hash(refreshToken, salt);

    user.refreshToken = hashRefreshToken;
    await user.save();

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: "Strict",
    });

    res.json({
      accessToken,
      user: { id: user._id, username: user.username, email: user.email },
    });
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ message: "Server error during login" });
  }
}

async function getMe(req, res, next) {
  try {
    const user = await UserModel.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
}

async function refreshToken(req, res, next) {
  const token = req.cookies.refreshToken;

  if (!token)
    return res
      .status(401)
      .json({ message: "No token provided, authorization denied" });

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    const user = await UserModel.findById(decoded.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!user.refreshToken) {
      return res.status(401).json({
        message: "Authorization denied",
      });
    }
    const match = await bcrypt.compare(token, user.refreshToken);
    if (!match)
      return res.status(401).json({ message: "authorization denied" });
    const { accessToken, refreshToken } = generateToken(user);
    const salt = await bcrypt.genSalt(10);
    const hashRefreshToken = await bcrypt.hash(refreshToken, salt);

    user.refreshToken = hashRefreshToken;
    await user.save();
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: "Strict",
    });

    res.json({
      accessToken,
      user: { id: user._id, username: user.username, email: user.email },
    });
  } catch (err) {
    return res.status(401).json({ message: "Token is invalid or expired" });
  }
}

async function logout(req, res, next) {
  try {
    const user = await UserModel.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    user.refreshToken = null;
    await user.save();
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: true,
      sameSite: "Strict",
    });
    res.json({
      message: "logout successfully",
    });
  } catch (error) {
    console.log("logout error:", error);
    res.status(500).json({ message: "Server error during logout" });
  }
}

module.exports = { register, login, getMe, refreshToken, logout };
