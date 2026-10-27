const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

const db = new sqlite3.Database('./database.sqlite', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    return;
  }

  db.run(`CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT 0,
    priority TEXT NOT NULL DEFAULT 'Medium'
  )`, (createError) => {
    if (createError) {
      console.error('Error creating tasks table:', createError.message);
      return;
    }

    db.all('PRAGMA table_info(tasks)', (schemaError, columns) => {
      if (schemaError) {
        console.error('Error checking tasks table schema:', schemaError.message);
        return;
      }

      const startServer = () => {
        console.log('Tasks table ready.');
        app.listen(PORT, () => {
          console.log(`Server is running live on http://localhost:${PORT}`);
        });
      };

      if (columns.some((column) => column.name === 'priority')) {
        startServer();
        return;
      }

      db.run(
        "ALTER TABLE tasks ADD COLUMN priority TEXT NOT NULL DEFAULT 'Medium'",
        (migrationError) => {
          if (migrationError) {
            console.error('Error adding task priority column:', migrationError.message);
            return;
          }
          startServer();
        },
      );
    });
  });
});

// ================= ROUTES =================

// GET: Fetch all tasks
app.get('/api/tasks', (req, res) => {
  const query = `SELECT * FROM tasks`;
  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    // Convert SQLite 0/1 integers back to booleans for React
    const tasks = rows.map(task => ({
      ...task,
      completed: Boolean(task.completed)
    }));
    res.json(tasks);
  });
});

// POST: Add a new task
app.post('/api/tasks', (req, res) => {
  const { text, priority } = req.body || {};
  if (typeof text !== 'string' || text.trim() === '') {
    return res.status(400).json({ error: 'Task text is required' });
  }
  if (priority !== undefined && !['High', 'Medium', 'Low'].includes(priority)) {
    return res.status(400).json({ error: 'Priority must be High, Medium, or Low' });
  }
  const taskPriority = priority || 'Medium';

  db.run(
    'INSERT INTO tasks (text, completed, priority) VALUES (?, 0, ?)',
    [text.trim(), taskPriority],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({
        id: this.lastID,
        text: text.trim(),
        completed: false,
        priority: taskPriority,
      });
    },
  );
});

// PUT: Update a task (toggle completion or edit text)
app.put('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  const { text, completed, priority } = req.body || {};
  if (text !== undefined && (typeof text !== 'string' || text.trim() === '')) {
    return res.status(400).json({ error: 'Task text cannot be empty' });
  }
  if (completed !== undefined && typeof completed !== 'boolean') {
    return res.status(400).json({ error: 'Completed must be a boolean' });
  }
  if (priority !== undefined && !['High', 'Medium', 'Low'].includes(priority)) {
    return res.status(400).json({ error: 'Priority must be High, Medium, or Low' });
  }

  db.get(`SELECT * FROM tasks WHERE id = ?`, [id], (err, task) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const updatedText = text !== undefined ? text.trim() : task.text;
    const updatedCompleted =
      completed !== undefined ? (completed ? 1 : 0) : task.completed;
    const updatedPriority = priority !== undefined ? priority : task.priority;

    const query = `UPDATE tasks SET text = ?, completed = ?, priority = ? WHERE id = ?`;
    db.run(
      query,
      [updatedText, updatedCompleted, updatedPriority, id],
      function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({
        id: Number(id),
        text: updatedText,
        completed: Boolean(updatedCompleted),
        priority: updatedPriority,
      });
      },
    );
  });
});

app.delete('/api/tasks/completed', (req, res) => {
  db.run('DELETE FROM tasks WHERE completed = 1', function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({
      message: 'Completed tasks deleted successfully',
      deletedCount: this.changes,
    });
  });
});

// DELETE: Remove a task
app.delete('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM tasks WHERE id = ?', [id], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json({ message: 'Task deleted successfully', id: Number(id) });
  });
});