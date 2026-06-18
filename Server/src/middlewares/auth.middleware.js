const asyncHandler = require("../utils/asyncHandler");
const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const generateToken = require("../utils/generateToken");

const authMiddleware = asyncHandler(async (req, res, next) => {
  const refreshToken = req.cookies.refreshToken;
    const accessToken = req.headers["authorization"]?.split(" ")[1];
    if (!accessToken || !refreshToken) {
      return res
        .status(401)
        .json({ message: "Access or refresh token missing" });
    }
    try {
      const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
      req.userId = decoded.userId;
      next();
    } catch (error) {
      const decoded = jwt.verify(
        refreshToken,
        process.env.JWT_SECRET
      );
      const user = await User.findById(decoded.userId);
      if (!user || user.refreshToken !== refreshToken) {
        return res.status(401).json({ message: "Invalid refresh token" });
      }
      const {newAccessToken,newRefreshToken}=generateToken(user._id)
      console.log("refreshtoken",refreshToken)
      res.cookie("refreshToken", newRefreshToken, {
        httpOnly: true,
        sameSite: "Strict",
        secure: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.setHeader("Authorization", `Bearer ${newRefreshToken}`);

      req.userId = decoded.userId;
      next();
    }
});

module.exports = { authMiddleware };