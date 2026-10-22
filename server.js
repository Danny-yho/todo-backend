const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.sourcePort || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Temporary in-memory database (we can connect to MongoDB or SQLite later!)
let tasks = [
  { id: 1, text: 'Learn React components', completed: true },
  { id: 2, text: 'Build a Node/Express backend', completed: false }
];

// 1. GET: Fetch all tasks
app.get('/api/tasks', (req, res) => {
  res.json(tasks);
});

// 2. POST: Add a new task
app.post('/api/tasks', (req, res) => {
  const newTask = {
    id: Date.now(),
    text: req.body.text,
    completed: false
  };
  tasks.push(newTask);
  res.status(201).json(newTask);
});

// 3. PUT: Toggle or update a task
app.put('/api/tasks/:id', (req, res) => {
  const taskId = parseInt(req.params.id);
  tasks = tasks.map(task => 
    task.id === taskId ? { ...task, ...req.body } : task
  );
  const updatedTask = tasks.find(task => task.id === taskId);
  res.json(updatedTask);
});

// 4. DELETE: Remove a task
app.delete('/api/tasks/:id', (req, res) => {
  const taskId = parseInt(req.params.id);
  tasks = tasks.filter(task => task.id !== taskId);
  res.json({ message: 'Task deleted successfully', id: taskId });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running live on http://localhost:${PORT}`);
});