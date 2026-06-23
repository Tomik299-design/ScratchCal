const monthNames = [
  'leden', 'únor', 'březen', 'duben', 'květen', 'červen',
  'červenec', 'srpen', 'září', 'říjen', 'listopad', 'prosinec'
];

let currentDate = new Date();
let currentYear = currentDate.getFullYear();
let currentMonth = currentDate.getMonth(); // 0-indexed
let dayData = {}; // { 'YYYY-MM-DD': { crossed, note } }

const grid = document.getElementById('calendarGrid');
const monthNameEl = document.getElementById('monthName');
const yearNameEl = document.getElementById('yearName');
const statCrossed = document.getElementById('statCrossed');
const statTotal = document.getElementById('statTotal');
const progressFill = document.getElementById('progressFill');
const todayLine = document.getElementById('todayLine');

const noteOverlay = document.getElementById('noteOverlay');
const noteDateEl = document.getElementById('noteDate');
const noteInput = document.getElementById('noteInput');
const noteCancel = document.getElementById('noteCancel');
const noteSave = document.getElementById('noteSave');

let activeNoteDate = null;
let pressTimer = null;

function pad(n) { return n < 10 ? '0' + n : '' + n; }

function formatDateKey(y, m, d) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

function monthKey(y, m) {
  return `${y}-${pad(m + 1)}`;
}

async function loadMonth() {
  const key = monthKey(currentYear, currentMonth);
  try {
    const res = await fetch(`/api/days/${key}`);
    const data = await res.json();
    dayData = {};
    data.forEach(row => {
      dayData[row.date] = { crossed: row.crossed, note: row.note };
    });
  } catch (err) {
    console.error('Nepodarilo se nacist data:', err);
    dayData = {};
  }
  render();
}

function render() {
  monthNameEl.textContent = monthNames[currentMonth];
  yearNameEl.textContent = currentYear;

  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  // getDay: 0=ne, prevedeme na po=0 ... ne=6
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const today = new Date();
  const isCurrentMonthToday =
    today.getFullYear() === currentYear && today.getMonth() === currentMonth;

  grid.innerHTML = '';

  for (let i = 0; i < startOffset; i++) {
    const empty = document.createElement('div');
    empty.className = 'day empty';
    grid.appendChild(empty);
  }

  let crossedCount = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = formatDateKey(currentYear, currentMonth, d);
    const entry = dayData[dateKey] || { crossed: false, note: null };
    const dow = new Date(currentYear, currentMonth, d).getDay();
    const isWeekend = dow === 0 || dow === 6;
    const isToday = isCurrentMonthToday && today.getDate() === d;

    if (entry.crossed) crossedCount++;

    const cell = document.createElement('div');
    cell.className = 'day';
    if (isWeekend) cell.classList.add('weekend-day');
    if (isToday) cell.classList.add('is-today');
    if (entry.crossed) cell.classList.add('is-crossed');
    cell.dataset.date = dateKey;

    cell.innerHTML = `
      <span class="day-num">${d}</span>
      <span class="scratch">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d="M 15 20 Q 50 55 88 82" />
        </svg>
      </span>
      ${entry.note ? '<span class="note-dot"></span>' : ''}
    `;

    cell.addEventListener('click', () => onDayClick(dateKey, cell));
    cell.addEventListener('mousedown', () => startPressTimer(dateKey));
    cell.addEventListener('touchstart', () => startPressTimer(dateKey));
    cell.addEventListener('mouseup', clearPressTimer);
    cell.addEventListener('mouseleave', clearPressTimer);
    cell.addEventListener('touchend', clearPressTimer);

    grid.appendChild(cell);
  }

  statCrossed.textContent = crossedCount;
  statTotal.textContent = daysInMonth;
  progressFill.style.width = `${daysInMonth ? (crossedCount / daysInMonth) * 100 : 0}%`;

  if (isCurrentMonthToday) {
    todayLine.textContent = `dnes je ${today.getDate()}. ${monthNames[currentMonth]} ${currentYear}`;
  } else {
    todayLine.textContent = '';
  }
}

function startPressTimer(dateKey) {
  clearPressTimer();
  pressTimer = setTimeout(() => openNoteEditor(dateKey), 480);
}

function clearPressTimer() {
  if (pressTimer) {
    clearTimeout(pressTimer);
    pressTimer = null;
  }
}

let suppressClick = false;

async function onDayClick(dateKey, cell) {
  if (suppressClick) {
    suppressClick = false;
    return;
  }
  const entry = dayData[dateKey] || { crossed: false, note: null };
  const newCrossed = !entry.crossed;

  dayData[dateKey] = { crossed: newCrossed, note: entry.note || null };
  cell.classList.toggle('is-crossed', newCrossed);
  updateStats();

  try {
    await fetch(`/api/days/${dateKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ crossed: newCrossed, note: entry.note || null })
    });
  } catch (err) {
    console.error('Nepodarilo se ulozit den:', err);
  }
}

function updateStats() {
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  let crossedCount = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const key = formatDateKey(currentYear, currentMonth, d);
    if (dayData[key]?.crossed) crossedCount++;
  }
  statCrossed.textContent = crossedCount;
  progressFill.style.width = `${daysInMonth ? (crossedCount / daysInMonth) * 100 : 0}%`;
}

function openNoteEditor(dateKey) {
  suppressClick = true;
  activeNoteDate = dateKey;
  const entry = dayData[dateKey] || { crossed: false, note: null };
  const [y, m, d] = dateKey.split('-').map(Number);
  noteDateEl.textContent = `${d}. ${monthNames[m - 1]}`;
  noteInput.value = entry.note || '';
  noteOverlay.classList.add('open');
  setTimeout(() => noteInput.focus(), 50);
}

function closeNoteEditor() {
  noteOverlay.classList.remove('open');
  activeNoteDate = null;
}

noteCancel.addEventListener('click', closeNoteEditor);

noteOverlay.addEventListener('click', (e) => {
  if (e.target === noteOverlay) closeNoteEditor();
});

noteSave.addEventListener('click', async () => {
  if (!activeNoteDate) return;
  const dateKey = activeNoteDate;
  const note = noteInput.value.trim();
  const entry = dayData[dateKey] || { crossed: false, note: null };

  dayData[dateKey] = { crossed: entry.crossed, note: note || null };

  try {
    await fetch(`/api/days/${dateKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ crossed: entry.crossed, note: note || null })
    });
  } catch (err) {
    console.error('Nepodarilo se ulozit poznamku:', err);
  }

  closeNoteEditor();
  render();
});

document.getElementById('prevMonth').addEventListener('click', () => {
  currentMonth--;
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear--;
  }
  loadMonth();
});

document.getElementById('nextMonth').addEventListener('click', () => {
  currentMonth++;
  if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  }
  loadMonth();
});

loadMonth();
