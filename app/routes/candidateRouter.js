const express = require('express');
const router = express.Router();
const candidateController = require('../Controllers/candidateController');
const { createUpload } = require('../middlewares/cloudinaryUpload');
const { requireSignInCandidate, isCandidate, isAdmin, requireSignIn } = require('../middlewares/authMiddleware');

const upload = createUpload('candidates');

// Public routes
router.post('/register', upload, candidateController.register);
router.post('/login', candidateController.login);
router.post('/send-otp', candidateController.sendOTP);
router.post('/verify-otp', candidateController.verifyOTP);
router.post('/forgot-password', candidateController.forgotPassword);
router.post('/reset-password', candidateController.resetPassword);

// Protected routes
router.get('/me', requireSignInCandidate, isCandidate, candidateController.current);
router.put('/update', requireSignInCandidate, isCandidate, upload, candidateController.update);
router.delete('/:id', requireSignInCandidate, isAdmin, candidateController.delete);
router.put('/block/:id', requireSignInCandidate, isAdmin, candidateController.block);
router.put('/reactivate/:id', requireSignInCandidate, isAdmin, candidateController.reactivate);
router.get('/',candidateController.getAll);
router.get('/:id', requireSignInCandidate, isAdmin, candidateController.getById);

module.exports = router;