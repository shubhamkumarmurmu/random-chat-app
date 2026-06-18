const jwt=require("jsonwebtoken");
const User=require("../models/user.model")

const generateToken = async (userId) => {
  try {
    const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET, {
      expiresIn: "15m",
    });
    const refreshToken = jwt.sign({ userId }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    const user = await User.findById(userId);
    user.refreshToken = refreshToken;
    await user.save({validateBeforeSave:false});
    return { accessToken, refreshToken };
  } catch (error) {
    console.error("Error generating tokens:", error);
  }
};

module.exports=generateToken;