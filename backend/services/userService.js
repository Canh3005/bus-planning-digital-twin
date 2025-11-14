// backend/services/userService.js
const User = require('../models/User');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';

class UserService {
  // Tạo JWT token
  generateToken(userId) {
    return jwt.sign({ id: userId }, JWT_SECRET, {
      expiresIn: JWT_EXPIRE
    });
  }

  // Đăng ký user mới
  async register(userData) {
    try {
      const { username, email, password, role } = userData;

      // Kiểm tra email đã tồn tại
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        throw new Error('Email already exists');
      }

      // Kiểm tra username đã tồn tại
      const existingUsername = await User.findOne({ username });
      if (existingUsername) {
        throw new Error('Username already exists');
      }

      // Tạo user mới
      const user = await User.create({
        username,
        email,
        password,
        role: role || 'user'
      });

      // Tạo token
      const token = this.generateToken(user._id);

      return {
        success: true,
        data: {
          user: {
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt
          },
          token
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // Đăng nhập
  async login(credentials) {
    try {
      const { email, password } = credentials;

      // Validate input
      if (!email || !password) {
        throw new Error('Please provide email and password');
      }

      // Tìm user và lấy cả password (vì select: false)
      const user = await User.findOne({ email }).select('+password');
      
      if (!user) {
        throw new Error('Invalid email or password');
      }

      // Kiểm tra password
      const isPasswordCorrect = await user.comparePassword(password);
      
      if (!isPasswordCorrect) {
        throw new Error('Invalid email or password');
      }

      // Tạo token
      const token = this.generateToken(user._id);

      return {
        success: true,
        data: {
          user: {
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt
          },
          token
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // Lấy thông tin user từ token
  async getMe(userId) {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        throw new Error('User not found');
      }

      return {
        success: true,
        data: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // Verify token
  verifyToken(token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      return decoded;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  // Lấy tất cả users (admin only)
  async getAllUsers() {
    try {
      const users = await User.find().select('-password');
      return {
        success: true,
        data: users
      };
    } catch (error) {
      throw error;
    }
  }

  // Xóa user (admin only)
  async deleteUser(userId) {
    try {
      const user = await User.findByIdAndDelete(userId);
      
      if (!user) {
        throw new Error('User not found');
      }

      return {
        success: true,
        message: 'User deleted successfully'
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new UserService();
