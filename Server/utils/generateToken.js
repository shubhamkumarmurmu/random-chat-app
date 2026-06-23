const config=require('../config/config');
const jwt =require('jsonwebtoken');

function generateToken(user) {
  const accessToken = jwt.sign(
    { id: user._id, username: user.username },
    config.JWT_SECRET,
    { expiresIn: "5m" },
  );
  const refreshToken=jwt.sign(
    { id: user._id, username: user.username },
    config.JWT_SECRET,
    { expiresIn: '7d' }
  );
  return {accessToken,refreshToken};
}

module.exports=generateToken;
