const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const connectDB = require('./db');
const { ObjectId } = require('mongodb');

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

/* Test route */
app.get('/', (req, res) => {
  res.send('Backend is running 🚀');
});

/* SIGNUP */
app.post('/auth/signup', async (req, res) => {
  try {
    const db = await connectDB();
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    // Check if user already exists
    const existingUser = await db.collection('users').findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = await db.collection('users').insertOne({
      email,
      password: hashedPassword,
      createdAt: new Date()
    });

    const token = jwt.sign({ userId: result.insertedId }, JWT_SECRET, { expiresIn: '24h' });

    res.status(201).json({ 
      message: 'User created successfully',
      token,
      userId: result.insertedId
    });
  } catch (err) {
    res.status(500).json({ message: 'Error creating user', error: err.message });
  }
});

/* LOGIN */
app.post('/auth/login', async (req, res) => {
  try {
    const db = await connectDB();
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    // Find user
    const user = await db.collection('users').findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '24h' });

    res.json({ 
      message: 'Login successful',
      token,
      userId: user._id
    });
  } catch (err) {
    res.status(500).json({ message: 'Error logging in', error: err.message });
  }
});

/* LOGOUT */
app.post('/auth/logout', verifyToken, (req, res) => {
  try {
    // Token is verified by middleware, logout just confirms token invalidation
    res.json({ message: 'Logout successful' });
  } catch (err) {
    res.status(500).json({ message: 'Error logging out', error: err.message });
  }
});

/* GET all tasks (protected) */
app.get('/tasks', verifyToken, async (req, res) => {
  const db = await connectDB();

  const tasks = await db.collection('tasks')
    .find({ userId: req.userId })
    .toArray();

  res.json(tasks);
});

/* POST new task (protected) */
/* POST new task (protected) */
app.post('/tasks', verifyToken, async (req, res) => {
  const db = await connectDB();

  const task = {
    userId: req.userId,
    name: req.body.name,
    completed: false,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const result = await db.collection('tasks').insertOne(task);

  res.status(201).json({
    _id: result.insertedId,
    ...task
  });
});

/* DELETE task (protected) */
app.delete('/tasks/:id', verifyToken, async (req, res) => {
  const db = await connectDB();
  await db.collection('tasks').deleteOne({
  _id: new ObjectId(req.params.id),
  userId: req.userId
});
  res.status(204).send();
});

/* UPDATE task (protected) */
app.put('/tasks/:id', verifyToken, async (req, res) => {
  try {
    const db = await connectDB();

    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid task id' });
    }

    const { name, completed } = req.body;

    const result = await db.collection('tasks').findOneAndUpdate(
      {
        _id: new ObjectId(req.params.id),
        userId: req.userId
      },
      {
        $set: {
          name,
          completed,
          updatedAt: new Date()
        }
      },
      {
        returnDocument: 'after'
      }
    );

    if (!result) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.json({
      _id: result._id.toString(),
      name: result.name,
      completed: result.completed,
      userId: result.userId,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt
    });

  } catch (err) {
    res.status(500).json({ message: 'Error updating task', error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
