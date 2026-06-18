const User = require("../models/user.model");
const asyncHandler = require("../utils/asyncHandler");
const jwt = require("jsonwebtoken");
const cookie = require("cookie-parser");
const generateToken=require("../utils/generateToken")

const registerController = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;
  const usernameExists = await User.findOne({username});
  const emailExists = await User.findOne({email});
  if(usernameExists){
    return res.status(400).json({ message: "Username already exists" });
  }
  if(emailExists){
    return res.status(400).json({ message: "Email already exists" });
  }
  const user = await User.create({ username, email, password });
  res
    .status(201)
    .json({ message: "User registered successfully", userId: user._id });
});

const loginController = asyncHandler(async (req, res) => {
  const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: "Invalid username or password" });
    }
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Invalid username or password" });
    }
    const { accessToken, refreshToken } = await generateToken(user._id);
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      sameSite: "Strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.setHeader("Authorization", `Bearer ${refreshToken}`);
    res.status(200).json("Login Successful")
});

const logoutController = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  user.refreshToken = null;
  await user.save({validateBeforeSave:false});
  res.clearCookie("refreshToken", { httpOnly: true, sameSite: "Strict",secure:true });
  res.status(200).json({ message: "Logout successful", accessToken: null });
});

const forgetPasswordController=asyncHandler(async(req,res)=>{
  const {username,newpassword}=req.body;
  const user=await User.findOne({username});
  if(!user){
    res.status(400).json({message :"User not exist"});
  }
  user.password=newpassword;
  await user.save({validateBeforeSave:false});
  res.status(200).json({message:  "Password reset successfully"})
})

module.exports = {
  registerController,
  loginController,
  logoutController,
  forgetPasswordController
};