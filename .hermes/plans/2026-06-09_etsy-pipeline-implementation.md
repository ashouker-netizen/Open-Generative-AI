# Etsy Daily Print Pipeline — Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Add an "Etsy Pipeline" tab to Open Generative AI that generates 1 unique nursery-style print per day via fal.ai, saves it to Downloads, sends a desktop notification, and tracks all past concepts to prevent repeats.

**Architecture:** A new `EtsyPipeline.js` tab component orchestrates three new library modules — `ideaEngine.js` (prompt generation from curated word lists), `uniquenessDB.js` (localStorage-based concept history), and `scheduler.js` (auto-trigger on app open). The existing `muapi.js` fal.ai client is reused unchanged.

**Tech Stack:** Vanilla JS, Vite, Tailwind CSS v4, fal.ai (via existing muapi.js), localStorage, Web Notifications API, Electron shell API

**Spec:** `docs/superpowers/specs/2026-06-09-etsy-pipeline-design.md`

---

## Task 1: Create uniquenessDB.js

**Objective:** localStorage-backed store that tracks past concepts and enforces uniqueness.

**Files:**
- Create: `src/lib/uniquenessDB.js`

**Step 1: Write the module**

```js
// src/lib/uniquenessDB.js
const STORAGE_KEY = 'etsy_pipeline_history';

export function getAll() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function hasBeenUsed(subject, theme) {
  const history = getAll();
  return history.some(e => e.subject === subject && e.theme === theme);
}

export function save(entry) {
  const history = getAll();
  history.push({ ...entry, id: crypto.randomUUID() });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

export function getCount() {
  return getAll().length;
}
```

**Step 2: Verify manually in browser console**
```js
import { save, hasBeenUsed, getCount } from './src/lib/uniquenessDB.js';
save({ subject: 'elephant', theme: 'stars', style: 'watercolor', date: '2026-06-09', filename: 'test.png', status: 'approved' });
console.log(hasBeenUsed('elephant', 'stars')); // true
console.log(hasBeenUsed('bunny', 'garden')); // false
console.log(getCount()); // 1
```

**Step 3: Commit**
```bash
git add src/lib/uniquenessDB.js
git commit -m "feat: add uniquenessDB module for concept tracking"
```

---

## Task 2: Create ideaEngine.js

**Objective:** Generate unique nursery print prompts from curated word lists, with uniqueness re-roll logic.

**Files:**
- Create: `src/lib/ideaEngine.js`

**Step 1: Write the module**

```js
// src/lib/ideaEngine.js
import { hasBeenUsed } from './uniquenessDB.js';

export const DEFAULT_LISTS = {
  subjects: [
    'sleepy elephant', 'baby fox', 'bunny with carrots', 'little giraffe',
    'baby bear', 'sleepy owl', 'tiny hedgehog', 'baby deer', 'little penguin',
    'baby whale', 'sunflower', 'hot air balloon', 'rainbow cloud', 'little star',
    'crescent moon', 'baby lion', 'little turtle', 'baby duck', 'tiny mushroom',
    'little snail'
  ],
  themes: [
    'under the stars', 'in a cozy bed', 'with alphabet blocks', 'in a garden',
    'reading a book', 'playing with butterflies', 'in a rainy day', 'with a rainbow',
    'in a forest', 'near a pond', 'with balloons', 'at bedtime', 'in a meadow',
    'with flowers', 'watching the moon'
  ],
  styles: [
    'watercolor', 'flat illustration', 'soft pastel', 'line art', 'gouache painting',
    'colored pencil', 'digital painting'
  ]
};

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generate(lists = DEFAULT_LISTS, maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    const subject = pick(lists.subjects);
    const theme = pick(lists.themes);
    const style = pick(lists.styles);

    if (!hasBeenUsed(subject, theme)) {
      const prompt = `${style} ${subject} ${theme}, nursery wall art, soft colors, white background, 8x10 printable`;
      return { subject, theme, style, prompt };
    }
  }
  throw new Error('Could not find a unique concept after 10 attempts. Please expand your word lists.');
}
```

**Step 2: Verify in browser console**
```js
import { generate } from './src/lib/ideaEngine.js';
const concept = generate();
console.log(concept);
// { subject: 'sleepy owl', theme: 'under the stars', style: 'watercolor', prompt: '...' }
```

**Step 3: Commit**
```bash
git add src/lib/ideaEngine.js
git commit -m "feat: add ideaEngine for nursery print concept generation"
```

---

## Task 3: Create scheduler.js

**Objective:** Auto-trigger pipeline on app open if today's run hasn't happened yet and the hour is >= configured run hour.

**Files:**
- Create: `src/lib/scheduler.js`

**Step 1: Write the module**

```js
// src/lib/scheduler.js
const LAST_RUN_KEY = 'etsy_last_run_date';
const DEFAULT_RUN_HOUR = 8;

export function getLastRunDate() {
  return localStorage.getItem(LAST_RUN_KEY);
}

export function markRunToday() {
  const today = new Date().toISOString().split('T')[0];
  localStorage.setItem(LAST_RUN_KEY, today);
}

export function hasRunToday() {
  const today = new Date().toISOString().split('T')[0];
  return getLastRunDate() === today;
}

export function shouldAutoRun(runHour = DEFAULT_RUN_HOUR) {
  return !hasRunToday() && new Date().getHours() >= runHour;
}

export function checkAndRun(runPipelineFn, runHour = DEFAULT_RUN_HOUR) {
  if (shouldAutoRun(runHour)) {
    runPipelineFn();
  }
}
```

**Step 2: Commit**
```bash
git add src/lib/scheduler.js
git commit -m "feat: add scheduler for daily pipeline auto-trigger"
```

---

## Task 4: Create EtsyPipeline.js component

**Objective:** Main tab UI — sidebar controls, image preview, run button, history list, orchestration logic.

**Files:**
- Create: `src/components/EtsyPipeline.js`

**Step 1: Write the component**

```js
// src/components/EtsyPipeline.js
import { generate } from '../lib/ideaEngine.js';
import { save, getAll, hasBeenUsed } from '../lib/uniquenessDB.js';
import { checkAndRun, markRunToday, hasRunToday } from '../lib/scheduler.js';
import { generateImage } from '../lib/muapi.js';

export function EtsyPipeline() {
  const container = document.createElement('div');
  container.className = 'etsy-pipeline flex h-full';

  // State
  let currentEntry = null;
  let isRunning = false;

  // ---- Sidebar ----
  const sidebar = document.createElement('div');
  sidebar.className = 'w-64 bg-white/5 p-4 flex flex-col gap-4 border-r border-white/10';
  sidebar.innerHTML = `
    <h2 class="text-lg font-semibold text-cyan-400">🛍️ Etsy Pipeline</h2>
    <button id="run-now-btn" class="bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-2 px-4 rounded-lg transition">
      ▶ Run Now
    </button>
    <div class="text-sm text-white/60" id="run-status">
      ${hasRunToday() ? '✅ Already ran today' : '⏳ Not run today yet'}
    </div>
    <div class="text-xs text-white/40">Auto-runs at 8am when app opens</div>
    <hr class="border-white/10"/>
    <div class="text-xs text-white/60">Total generated: <span id="total-count">${getAll().length}</span></div>
  `;

  // ---- Main area ----
  const main = document.createElement('div');
  main.className = 'flex-1 p-6 flex flex-col gap-6';
  main.innerHTML = `
    <div id="pipeline-status" class="text-white/60 text-sm">Ready. Click "Run Now" or wait for auto-run.</div>
    <div id="image-preview" class="hidden flex flex-col gap-3">
      <img id="preview-img" class="max-w-sm rounded-xl shadow-lg" />
      <div id="concept-label" class="text-white/80 text-sm"></div>
      <button id="open-folder-btn" class="text-xs text-cyan-400 hover:text-cyan-300 w-fit">📁 Open Downloads Folder</button>
    </div>
    <div id="history-section" class="mt-4">
      <h3 class="text-sm font-semibold text-white/60 mb-2">History</h3>
      <div id="history-list" class="flex flex-col gap-2"></div>
    </div>
  `;

  container.appendChild(sidebar);
  container.appendChild(main);

  // ---- Helpers ----
  function updateStatus(msg) {
    main.querySelector('#pipeline-status').textContent = msg;
  }

  function showNotification(title, body) {
    if (Notification.permission === 'granted') {
      new Notification(title, { body });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(p => {
        if (p === 'granted') new Notification(title, { body });
      });
    }
  }

  function downloadImage(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  }

  function buildFilename(subject, theme, date) {
    const slug = (s) => s.toLowerCase().replace(/\s+/g, '-');
    return `etsy-${date}-${slug(subject)}-${slug(theme)}.png`;
  }

  function renderHistory() {
    const list = main.querySelector('#history-list');
    const all = getAll().slice().reverse().slice(0, 10);
    list.innerHTML = all.map(e => `
      <div class="text-xs text-white/50 bg-white/5 rounded px-3 py-2">
        <span class="text-white/80">${e.subject} ${e.theme}</span> — ${e.date}
        <span class="ml-2 text-cyan-400">${e.status}</span>
      </div>
    `).join('');
    main.querySelector('#total-count') && (main.querySelector('#total-count').textContent = getAll().length);
  }

  // ---- Run pipeline ----
  async function runPipeline() {
    if (isRunning) return;
    isRunning = true;
    const runBtn = sidebar.querySelector('#run-now-btn');
    runBtn.disabled = true;
    runBtn.textContent = '⏳ Generating...';

    try {
      updateStatus('🎨 Generating new nursery concept...');

      // 1. Generate concept
      const concept = generate();
      updateStatus(`✏️ Concept: "${concept.subject} ${concept.theme}" — calling fal.ai...`);

      // 2. Generate image via existing muapi.js
      const imageUrl = await generateImage({ prompt: concept.prompt });

      // 3. Build filename + download
      const date = new Date().toISOString().split('T')[0];
      const filename = buildFilename(concept.subject, concept.theme, date);
      downloadImage(imageUrl, filename);

      // 4. Save to DB
      const entry = { ...concept, date, filename, status: 'approved' };
      save(entry);
      markRunToday();
      currentEntry = entry;

      // 5. Show preview
      const preview = main.querySelector('#image-preview');
      preview.classList.remove('hidden');
      main.querySelector('#preview-img').src = imageUrl;
      main.querySelector('#concept-label').textContent = `"${concept.prompt}"`;
      sidebar.querySelector('#run-status').textContent = '✅ Already ran today';

      // 6. Notify
      showNotification('🎨 New Etsy print ready!', `${concept.subject} ${concept.theme} — saved to Downloads`);

      updateStatus('✅ Done! Image saved to Downloads.');
      renderHistory();

    } catch (err) {
      updateStatus(`❌ Error: ${err.message}`);
      console.error('[EtsyPipeline]', err);
    } finally {
      isRunning = false;
      runBtn.disabled = false;
      runBtn.textContent = '▶ Run Now';
    }
  }

  // ---- Event listeners ----
  sidebar.querySelector('#run-now-btn').addEventListener('click', runPipeline);
  main.querySelector('#open-folder-btn')?.addEventListener('click', () => {
    // Electron shell API
    if (window.electronAPI?.openDownloads) {
      window.electronAPI.openDownloads();
    } else {
      updateStatus('📁 Images are saved to your Downloads folder.');
    }
  });

  // ---- Init ----
  renderHistory();
  checkAndRun(runPipeline);

  return container;
}
```

**Step 2: Commit**
```bash
git add src/components/EtsyPipeline.js
git commit -m "feat: add EtsyPipeline tab component"
```

---

## Task 5: Wire up the tab in main.js

**Objective:** Add the Etsy Pipeline tab to the app navigation so it renders alongside the Image Studio.

**Files:**
- Modify: `src/main.js`

**Step 1: Read current main.js**
```bash
cat src/main.js
```

**Step 2: Add import and tab**

Add at the top of `src/main.js`:
```js
import { EtsyPipeline } from './components/EtsyPipeline.js';
```

Find where the Header/Studio tabs are rendered and add a tab button for "🛍️ Etsy Pipeline" that swaps the main content area to render `EtsyPipeline()` when clicked. Follow the exact same pattern already used for the Image Studio tab.

**Step 3: Verify app loads with new tab visible**
```bash
npm run dev
```
Open browser, confirm "🛍️ Etsy Pipeline" tab appears and clicking it renders the pipeline UI.

**Step 4: Commit**
```bash
git add src/main.js
git commit -m "feat: wire Etsy Pipeline tab into app navigation"
```

---

## Task 6: Wire muapi.js generateImage export

**Objective:** Confirm `generateImage` is exported from `muapi.js` in a way EtsyPipeline can call it, or add a thin wrapper if needed.

**Files:**
- Read: `src/lib/muapi.js`
- Possibly modify: `src/lib/muapi.js`

**Step 1: Check existing exports**
```bash
grep -n "export\|function generate" src/lib/muapi.js
```

**Step 2: If `generateImage` is not exported as a named export**, add:
```js
export { generateImage };
// or wrap the existing generation call as:
export async function generateImage({ prompt, model = 'flux-schnell' }) {
  // call existing internal generation logic
}
```

Follow the existing code patterns exactly — do not refactor.

**Step 3: Commit if changed**
```bash
git add src/lib/muapi.js
git commit -m "feat: export generateImage from muapi for pipeline use"
```

---

## Task 7: Electron shell integration (Open Folder button)

**Objective:** Make the "Open Downloads Folder" button actually open Finder on macOS via Electron's shell API.

**Files:**
- Modify: `electron/` (check existing preload/main files)

**Step 1: Check existing Electron setup**
```bash
ls electron/
cat electron/main.js | head -60
cat electron/preload.js 2>/dev/null | head -40
```

**Step 2: Add IPC handler in `electron/main.js`**
```js
const { shell } = require('electron');
const path = require('path');
const os = require('os');

ipcMain.handle('open-downloads', () => {
  shell.openPath(path.join(os.homedir(), 'Downloads'));
});
```

**Step 3: Expose via preload**
```js
// In contextBridge.exposeInMainWorld block
openDownloads: () => ipcRenderer.invoke('open-downloads'),
```

**Step 4: Verify**
Run the Electron app, click "Open Downloads Folder" — Finder should open to ~/Downloads.

**Step 5: Commit**
```bash
git add electron/main.js electron/preload.js
git commit -m "feat: add open-downloads IPC handler for Etsy Pipeline"
```

---

## Task 8: End-to-end smoke test

**Objective:** Verify the full pipeline works from click to saved file.

**Step 1: Start dev server**
```bash
npm run dev
```

**Step 2: Open app, navigate to Etsy Pipeline tab**

**Step 3: Click "Run Now"**
- Status should update: "Generating concept... → calling fal.ai... → Done!"
- Image preview should appear
- A file `etsy-YYYY-MM-DD-*.png` should appear in Downloads
- Desktop notification should fire

**Step 4: Check uniqueness**
- Click "Run Now" again → should show "Already ran today" confirmation
- Clear `etsy_last_run_date` from localStorage, click Run Now again → should generate a DIFFERENT concept (different subject+theme combo)

**Step 5: Check history**
- History panel should show the generated entries with correct date and status

**Step 6: Final commit**
```bash
git add -A
git commit -m "feat: Etsy Pipeline complete — daily nursery print generator"
```

---

## Files Summary

| File | Action |
|------|--------|
| `src/lib/uniquenessDB.js` | Create |
| `src/lib/ideaEngine.js` | Create |
| `src/lib/scheduler.js` | Create |
| `src/components/EtsyPipeline.js` | Create |
| `src/main.js` | Modify — add tab |
| `src/lib/muapi.js` | Modify if needed — export generateImage |
| `electron/main.js` | Modify — add open-downloads IPC |
| `electron/preload.js` | Modify — expose openDownloads |
