const express = require('express');
const router = express.Router();
const {registerController, loginController,refreshController,logoutController, forgetPasswordController} = require('../controllers/auth.controller');
const {authMiddleware} = require('../middlewares/auth.middleware');

router.post('/register', registerController);
router.post('/login', loginController);
router.get('/logout', authMiddleware, logoutController);
router.post('/forgetpassword', forgetPasswordController);
router.post('/',authMiddleware,(req,res)=>{
    res.send("hello world");
    console.log("reseive");
});

module.exports = router;