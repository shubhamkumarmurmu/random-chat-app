const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, "username is required"],
    unique: [true, "username already exist"],
    trim:true
  },
  email: {
    type: String,
    required: [true, "email is required"],
    unique: [true, "email already exist"],
    trim:true
  },
  password: {
    type:String,
    minLength:[8,"length should not be less than 8"]
  },
  isOnline: {
      type: Boolean,
      default: false,
    },
    refreshToken:{
      type:String,
      unique:true,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
},{timestamps:true});

const userModel=mongoose.model("users",userSchema);

module.exports=userModel;
