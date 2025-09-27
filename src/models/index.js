const { Sequelize, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const path = require('path');

// Initialize Sequelize with SQLite
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '..', '..', 'data', 'secure_api.db'),
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: true
  }
});

// User model with automatic password hashing
const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      len: [3, 30],
      isAlphanumeric: true
    }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password_hash: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [8, 200] // Allow both plain passwords and hashed passwords
    }
  }
}, {
  tableName: 'users',
  hooks: {
    beforeCreate: async (user) => {
      if (user.password_hash && user.password_hash.length < 60) {
        // This is a plain password, hash it
        user.password_hash = await bcrypt.hash(user.password_hash, 12);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password_hash') && user.password_hash.length < 60) {
        // This is a plain password, hash it
        user.password_hash = await bcrypt.hash(user.password_hash, 12);
      }
    }
  }
});

// Post model with foreign key constraints
const Post = sequelize.define('Post', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [1, 200],
      notEmpty: true
    }
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      len: [1, 5000],
      notEmpty: true
    }
  },
  author_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  }
}, {
  tableName: 'posts'
});

// Define associations
User.hasMany(Post, { foreignKey: 'author_id', as: 'posts' });
Post.belongsTo(User, { foreignKey: 'author_id', as: 'author' });

// User instance methods
User.prototype.validatePassword = async function(password) {
  return await bcrypt.compare(password, this.password_hash);
};

User.prototype.toSafeJSON = function() {
  const { password_hash, ...safeUser } = this.toJSON();
  return safeUser;
};

// Static methods for secure operations
User.findByCredentials = async function(username, password) {
  try {
    const user = await this.findOne({
      where: {
        [Sequelize.Op.or]: [
          { username: username },
          { email: username }
        ]
      }
    });

    if (!user) {
      return null;
    }

    const isValidPassword = await user.validatePassword(password);
    if (!isValidPassword) {
      return null;
    }

    return user;
  } catch (error) {
    console.error('Authentication error:', error);
    throw error;
  }
};

// Initialize database
const initDatabase = async () => {
  try {
    // Test connection
    await sequelize.authenticate();
    console.log('📊 Database connection established successfully');

    // Create tables
    await sequelize.sync({ force: false });
    console.log('✅ Database tables synchronized');

    // Create default users if they don't exist
    await createDefaultUsers();
    
  } catch (error) {
    console.error('Unable to connect to database:', error);
    throw error;
  }
};

// Create default users for testing
const createDefaultUsers = async () => {
  const defaultUsers = [
    { username: 'admin', email: 'admin@example.com', password_hash: 'Admin123!' },
    { username: 'user1', email: 'user1@example.com', password_hash: 'User123!' },
    { username: 'testuser', email: 'test@example.com', password_hash: 'Test123!' }
  ];

  for (const userData of defaultUsers) {
    try {
      const existingUser = await User.findOne({
        where: {
          [Sequelize.Op.or]: [
            { username: userData.username },
            { email: userData.email }
          ]
        }
      });

      if (!existingUser) {
        await User.create(userData);
        console.log(`✅ Default user created: ${userData.username}`);
      }
    } catch (error) {
      console.error(`Error creating user ${userData.username}:`, error.message);
    }
  }
};

module.exports = {
  sequelize,
  User,
  Post,
  initDatabase
};