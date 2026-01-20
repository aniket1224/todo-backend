const express = require('express');
const cors = require('cors');
require('dotenv').config();

const connectDB = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

/* Test route */
app.get('/', (req, res) => {
  res.send('Backend is running 🚀');
});

/* GET all tasks */
app.get('/tasks', async (req, res) => {
  const db = await connectDB();
  const tasks = await db.collection('tasks').find().toArray();
  res.json(tasks);
});

/* POST new task */
app.post('/tasks', async (req, res) => {
  const db = await connectDB();
  const result = await db.collection('tasks').insertOne({
    name: req.body.name,
    createdAt: new Date()
  });
  res.status(201).json(result);
});

/* DELETE task */
app.delete('/tasks/:id', async (req, res) => {
  const db = await connectDB();
  await db.collection('tasks').deleteOne({
    _id: new require('mongodb').ObjectId(req.params.id)
  });
  res.status(204).send();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
