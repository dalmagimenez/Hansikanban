const API_URL = '/api';
let columns = [];
let tasks = [];
let currentColumnId = null;
let draggedTask = null;

async function loadData() {
  columns = await fetch(`${API_URL}/columns`).then(r => r.json());
  tasks = await fetch(`${API_URL}/tasks`).then(r => r.json());
  renderBoard();
}

function renderBoard() {
  const board = document.getElementById('board');
  board.innerHTML = '';

  columns.forEach(column => {
    const columnTasks = tasks.filter(t => t.column_id === column.id).sort((a, b) => a.position - b.position);
    
    const columnEl = document.createElement('div');
    columnEl.className = 'column';
    columnEl.innerHTML = `
      <div class="column-header">
        <span class="column-title">${column.name}</span>
        <span class="task-count">${columnTasks.length}</span>
      </div>
      <button class="add-task-btn" data-column="${column.id}">+ Agregar tarea</button>
      <div class="tasks-container" data-column="${column.id}"></div>
    `;
    
    const tasksContainer = columnEl.querySelector('.tasks-container');
    columnTasks.forEach(task => {
      const taskEl = document.createElement('div');
      taskEl.className = `task column-${task.column_id}`;
      taskEl.draggable = true;
      taskEl.dataset.id = task.id;
      taskEl.innerHTML = `
        <span class="task-delete" data-id="${task.id}">&times;</span>
        <div class="task-title">${task.title}</div>
        ${task.description ? `<div class="task-description">${task.description}</div>` : ''}
      `;
      
      taskEl.addEventListener('dragstart', handleDragStart);
      taskEl.addEventListener('dragend', handleDragEnd);
      tasksContainer.appendChild(taskEl);
    });

    tasksContainer.addEventListener('dragover', handleDragOver);
    tasksContainer.addEventListener('drop', handleDrop);
    tasksContainer.addEventListener('dragleave', handleDragLeave);
    
    board.appendChild(columnEl);
  });

  document.querySelectorAll('.add-task-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      currentColumnId = parseInt(e.target.dataset.column);
      openModal();
    });
  });

  document.querySelectorAll('.task-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = e.target.dataset.id;
      await fetch(`${API_URL}/tasks/${id}`, { method: 'DELETE' });
      loadData();
    });
  });
}

function handleDragStart(e) {
  draggedTask = e.target;
  e.target.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}

function handleDragEnd(e) {
  e.target.classList.remove('dragging');
  document.querySelectorAll('.tasks-container').forEach(c => c.classList.remove('drag-over'));
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  const container = e.target.closest('.tasks-container');
  if (container) container.classList.add('drag-over');
}

function handleDragLeave(e) {
  const container = e.target.closest('.tasks-container');
  if (container) container.classList.remove('drag-over');
}

async function handleDrop(e) {
  e.preventDefault();
  const container = e.target.closest('.tasks-container');
  if (!container || !draggedTask) return;
  
  container.classList.remove('drag-over');
  
  const newColumnId = parseInt(container.dataset.column);
  const taskId = parseInt(draggedTask.dataset.id);
  
  const columnTasks = tasks.filter(t => t.column_id === newColumnId && t.id !== taskId);
  const newPosition = columnTasks.length + 1;
  
  await fetch(`${API_URL}/tasks/${taskId}/move`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ column_id: newColumnId, position: newPosition })
  });
  
  loadData();
}

function openModal() {
  document.getElementById('taskModal').classList.add('show');
  document.getElementById('taskTitle').value = '';
  document.getElementById('taskDescription').value = '';
  document.getElementById('taskTitle').focus();
}

function closeModal() {
  document.getElementById('taskModal').classList.remove('show');
}

document.querySelector('.close').addEventListener('click', closeModal);
document.getElementById('taskModal').addEventListener('click', (e) => {
  if (e.target.id === 'taskModal') closeModal();
});

document.getElementById('taskForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = document.getElementById('taskTitle').value;
  const description = document.getElementById('taskDescription').value;
  
  await fetch(`${API_URL}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, description, column_id: currentColumnId })
  });
  
  closeModal();
  loadData();
});

loadData();
