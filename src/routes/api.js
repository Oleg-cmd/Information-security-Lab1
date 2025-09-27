const express = require('express');
const { body, validationResult } = require('express-validator');
const { User, Post } = require('../models');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all API routes
router.use(authenticateToken);

// GET /api/data - Get users data (protected endpoint)
router.get('/data', async (req, res) => {
  try {
    // Get all users from database using Sequelize
    const users = await User.findAll({
      attributes: ['id', 'username', 'email', 'created_at'], // Exclude password_hash
      order: [['created_at', 'DESC']]
    });
    
    // Convert to plain objects (Sequelize models to JSON)
    const userData = users.map(user => user.toJSON());

    res.status(200).json({
      message: 'Data retrieved successfully',
      data: userData,
      count: userData.length,
      requestedBy: {
        id: req.user.id,
        username: req.user.username
      }
    });

    console.log(`📊 User data requested by: ${req.user.username}`);

  } catch (error) {
    console.error('Data retrieval error:', error);
    res.status(500).json({
      error: 'Data Retrieval Error',
      message: 'An error occurred while retrieving data'
    });
  }
});

// GET /api/posts - Get all posts (protected endpoint)
router.get('/posts', async (req, res) => {
  try {
    // Get all posts with author information using Sequelize includes
    const posts = await Post.findAll({
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'username', 'email'] // Exclude password_hash
      }],
      order: [['created_at', 'DESC']]
    });
    
    // Convert to plain objects
    const postData = posts.map(post => {
      const postJson = post.toJSON();
      return {
        id: postJson.id,
        title: postJson.title,
        content: postJson.content,
        created_at: postJson.created_at,
        author: {
          id: postJson.author.id,
          username: postJson.author.username,
          email: postJson.author.email
        }
      };
    });

    res.status(200).json({
      message: 'Posts retrieved successfully',
      data: postData,
      count: postData.length,
      requestedBy: {
        id: req.user.id,
        username: req.user.username
      }
    });

    console.log(`📝 Posts requested by: ${req.user.username}`);

  } catch (error) {
    console.error('Posts retrieval error:', error);
    res.status(500).json({
      error: 'Posts Retrieval Error',
      message: 'An error occurred while retrieving posts'
    });
  }
});

// Validation rules for post creation
const postValidation = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters')
    .notEmpty()
    .withMessage('Title is required'),
  body('content')
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage('Content must be between 1 and 5000 characters')
    .notEmpty()
    .withMessage('Content is required')
];

// POST /api/posts - Create a new post (protected endpoint)
router.post('/posts', postValidation, async (req, res) => {
  try {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid input data',
        details: errors.array()
      });
    }

    const { title, content } = req.body;

    // Create post using Sequelize model (automatically protected from SQL injection)
    const newPost = await Post.create({
      title: title,
      content: content,
      author_id: req.user.id
    });

    // Fetch the created post with author information
    const postWithAuthor = await Post.findByPk(newPost.id, {
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'username', 'email']
      }]
    });

    res.status(201).json({
      message: 'Post created successfully',
      data: postWithAuthor.toJSON(),
      createdBy: {
        id: req.user.id,
        username: req.user.username
      }
    });

    console.log(`📝 Post created by: ${req.user.username} - "${title}"`);

  } catch (error) {
    console.error('Post creation error:', error);
    res.status(500).json({
      error: 'Post Creation Error',
      message: 'An error occurred while creating the post'
    });
  }
});

// GET /api/user/profile - Get current user profile
router.get('/user/profile', async (req, res) => {
  try {
    // Get fresh user data from database using Sequelize
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'username', 'email', 'created_at'] // Exclude password_hash
    });
    
    if (!user) {
      return res.status(404).json({
        error: 'User Not Found',
        message: 'User profile not found'
      });
    }

    res.status(200).json({
      message: 'Profile retrieved successfully',
      data: user.toJSON()
    });

  } catch (error) {
    console.error('Profile retrieval error:', error);
    res.status(500).json({
      error: 'Profile Error',
      message: 'An error occurred while retrieving profile'
    });
  }
});

// GET /api/stats - Get API usage statistics
router.get('/stats', async (req, res) => {
  try {
    // Get counts using Sequelize
    const userCount = await User.count();
    const postCount = await Post.count();

    const stats = {
      total_users: userCount,
      total_posts: postCount,
      current_user: {
        id: req.user.id,
        username: req.user.username
      },
      server_time: new Date().toISOString(),
      api_version: '1.0.0'
    };

    res.status(200).json({
      message: 'Statistics retrieved successfully',
      data: stats
    });

  } catch (error) {
    console.error('Stats retrieval error:', error);
    res.status(500).json({
      error: 'Statistics Error',
      message: 'An error occurred while retrieving statistics'
    });
  }
});

module.exports = router;