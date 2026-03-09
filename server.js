const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const db = new Database('kanban.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS columns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    position INTEGER NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    column_id INTEGER NOT NULL,
    position INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (column_id) REFERENCES columns(id) ON DELETE CASCADE
  );
`);

const initColumns = db.prepare('SELECT COUNT(*) as count FROM columns').get();
if (initColumns.count === 0) {
  const insertColumn = db.prepare('INSERT INTO columns (name, position) VALUES (?, ?)');
  insertColumn.run('Por Hacer', 0);
  insertColumn.run('En Progreso', 1);
  insertColumn.run('QA', 2);
  insertColumn.run('Completado', 3);
}

app.get('/api/columns', (req, res) => {
  const columns = db.prepare('SELECT * FROM columns ORDER BY position').all();
  res.json(columns);
});

app.get('/api/tasks', (req, res) => {
  const tasks = db.prepare('SELECT * FROM tasks ORDER BY position').all();
  res.json(tasks);
});

app.post('/api/tasks', (req, res) => {
  const { title, description, column_id } = req.body;
  const maxPosition = db.prepare('SELECT MAX(position) as max FROM tasks WHERE column_id = ?').get(column_id);
  const position = (maxPosition.max || 0) + 1;
  
  const result = db.prepare('INSERT INTO tasks (title, description, column_id, position) VALUES (?, ?, ?, ?)').run(title, description, column_id, position);
  res.json({ id: result.lastInsertRowid, title, description, column_id, position });
});

app.put('/api/tasks/:id', (req, res) => {
  const { title, description, column_id, position } = req.body;
  db.prepare('UPDATE tasks SET title = ?, description = ?, column_id = ?, position = ? WHERE id = ?').run(title, description, column_id, position, req.params.id);
  res.json({ success: true });
});

app.patch('/api/tasks/:id/move', (req, res) => {
  const { column_id, position } = req.body;
  db.prepare('UPDATE tasks SET column_id = ?, position = ? WHERE id = ?').run(column_id, position, req.params.id);
  res.json({ success: true });
});

app.delete('/api/tasks/:id', (req, res) => {
  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Kanban server running on port ${PORT}`);
});
