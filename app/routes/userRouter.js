const express = require('express');
const router = express.Router();
const userController = require('../Controllers/userController');
const { createUpload } = require('../middlewares/cloudinaryUpload');
const { requireSignIn, isAdmin, isSelfOrAdmin } = require('../middlewares/authMiddleware');

const upload = createUpload('users');

// Public routes
router.post('/register', upload, userController.register);
router.post('/login', userController.login);
router.post('/send-otp', userController.sendOTP);
router.post('/verify-otp', userController.verifyOTP);
router.post('/forgot-password', userController.forgotPassword);
router.post('/reset-password', userController.resetPassword);

// Protected routes
router.get('/me', requireSignIn, userController.current);
router.put('/update', requireSignIn, upload, userController.update);
router.delete('/:id', requireSignIn, isSelfOrAdmin, userController.delete);
router.put('/block/:id', requireSignIn, isAdmin, userController.block);
router.put('/reactivate/:id', requireSignIn, isAdmin, userController.reactivate);
router.get('/', requireSignIn, isAdmin, userController.getAll);
router.get('/:id', requireSignIn, isSelfOrAdmin, userController.getById);

module.exports = router;