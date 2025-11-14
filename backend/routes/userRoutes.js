// backend/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

// Public routes (không cần đăng nhập)
router.post('/auth/register', userController.register);
router.post('/auth/login', userController.login);

// Protected routes (cần đăng nhập)
router.get('/auth/me', protect, userController.getMe);

// Admin routes (cần đăng nhập + role admin)
router.get('/users', protect, authorize('admin'), userController.getAllUsers);
router.delete('/users/:id', protect, authorize('admin'), userController.deleteUser);

module.exports = router;
