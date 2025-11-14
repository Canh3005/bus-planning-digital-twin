// backend/controllers/userController.js
const userService = require('../services/userService');

class UserController {
  // POST /api/auth/register
  async register(req, res) {
    try {
      const result = await userService.register(req.body);
      
      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: result.data
      });
    } catch (error) {
      console.error('Register error:', error);
      
      // Handle duplicate key errors
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        return res.status(400).json({
          success: false,
          message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`
        });
      }

      // Handle validation errors
      if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({
          success: false,
          message: messages.join(', ')
        });
      }

      res.status(400).json({
        success: false,
        message: error.message || 'Registration failed'
      });
    }
  }

  // POST /api/auth/login
  async login(req, res) {
    try {
      const result = await userService.login(req.body);
      
      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: result.data
      });
    } catch (error) {
      console.error('Login error:', error);
      
      res.status(401).json({
        success: false,
        message: error.message || 'Login failed'
      });
    }
  }

  // GET /api/auth/me
  async getMe(req, res) {
    try {
      const result = await userService.getMe(req.user.id);
      
      res.status(200).json({
        success: true,
        data: result.data
      });
    } catch (error) {
      console.error('Get me error:', error);
      
      res.status(404).json({
        success: false,
        message: error.message || 'User not found'
      });
    }
  }

  // GET /api/users (Admin only)
  async getAllUsers(req, res) {
    try {
      const result = await userService.getAllUsers();
      
      res.status(200).json({
        success: true,
        count: result.data.length,
        data: result.data
      });
    } catch (error) {
      console.error('Get all users error:', error);
      
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch users'
      });
    }
  }

  // DELETE /api/users/:id (Admin only)
  async deleteUser(req, res) {
    try {
      const result = await userService.deleteUser(req.params.id);
      
      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      console.error('Delete user error:', error);
      
      res.status(404).json({
        success: false,
        message: error.message || 'Failed to delete user'
      });
    }
  }
}

module.exports = new UserController();
