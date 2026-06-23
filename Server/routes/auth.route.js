const controller=require("../controllers/auth.controller");
const authmiddleware=require("../middlewares/auth.middleware");
const router=require('express').Router();

router.post("/register",controller.register);
router.post("/login",controller.login);
router.get("/me",authmiddleware,controller.getMe);
router.get("/refreshToken",controller.refreshToken);
router.post("/logout",authmiddleware,controller.logout);

module.exports=router;