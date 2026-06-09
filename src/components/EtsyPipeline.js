import { generate } from '../lib/ideaEngine.js';
import { save, getAll } from '../lib/uniquenessDB.js';
import { checkAndRun, markRunToday, hasRunToday } from '../lib/scheduler.js';
import { generateImage } from '../lib/muapi.js';

export function EtsyPipeline() {
  const container = document.createElement('div');
  container.className = 'etsy-pipeline flex h-full';

  let isRunning = false;

  // ---- Sidebar ----
  const sidebar = document.createElement('div');
  sidebar.className = 'w-64 bg-white/5 p-4 flex flex-col gap-4 border-r border-white/10';
  sidebar.innerHTML = `
    <h2 class="text-lg font-semibold text-cyan-400">Etsy Pipeline</h2>
    <button id="run-now-btn" class="bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-2 px-4 rounded-lg transition">
      Run Now
    </button>
    <div class="text-sm text-white/60" id="run-status">
      ${hasRunToday() ? 'Already ran today' : 'Not run today yet'}
    </div>
    <div class="text-xs text-white/40">Auto-runs at 8am when app opens</div>
    <hr class="border-white/10"/>
    <div class="text-xs text-white/60">Total generated: <span id="total-count">${getAll().length}</span></div>
  `;

  // ---- Main area ----
  const main = document.createElement('div');
  main.className = 'flex-1 p-6 flex flex-col gap-6 overflow-y-auto';
  main.innerHTML = `
    <div id="pipeline-status" class="text-white/60 text-sm">Ready. Click "Run Now" or wait for auto-run.</div>
    <div id="image-preview" class="hidden flex flex-col gap-3">
      <img id="preview-img" class="max-w-sm rounded-xl shadow-lg" />
      <div id="concept-label" class="text-white/80 text-sm"></div>
      <button id="open-folder-btn" class="text-xs text-cyan-400 hover:text-cyan-300 w-fit">Open Downloads Folder</button>
    </div>
    <div id="history-section" class="mt-4">
      <h3 class="text-sm font-semibold text-white/60 mb-2">History</h3>
      <div id="history-list" class="flex flex-col gap-2"></div>
    </div>
  `;

  container.appendChild(sidebar);
  container.appendChild(main);

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
    const countEl = sidebar.querySelector('#total-count');
    if (countEl) countEl.textContent = getAll().length;
  }

  async function runPipeline() {
    if (isRunning) return;
    isRunning = true;
    const runBtn = sidebar.querySelector('#run-now-btn');
    runBtn.disabled = true;
    runBtn.textContent = 'Generating...';

    try {
      updateStatus('Generating new nursery concept...');

      const concept = generate();
      updateStatus(`Concept: "${concept.subject} ${concept.theme}" — calling fal.ai...`);

      const result = await generateImage({ prompt: concept.prompt, model: 'flux-schnell' });
      const imageUrl = result?.url || result?.images?.[0]?.url;
      if (!imageUrl) throw new Error('No image URL returned from fal.ai');

      const date = new Date().toISOString().split('T')[0];
      const filename = buildFilename(concept.subject, concept.theme, date);
      downloadImage(imageUrl, filename);

      const entry = { ...concept, date, filename, status: 'approved' };
      save(entry);
      markRunToday();

      const preview = main.querySelector('#image-preview');
      preview.classList.remove('hidden');
      main.querySelector('#preview-img').src = imageUrl;
      main.querySelector('#concept-label').textContent = `"${concept.prompt}"`;
      sidebar.querySelector('#run-status').textContent = 'Already ran today';

      showNotification('New Etsy print ready!', `${concept.subject} ${concept.theme} — saved to Downloads`);
      updateStatus('Done! Image saved to Downloads.');
      renderHistory();

    } catch (err) {
      updateStatus(`Error: ${err.message}`);
      console.error('[EtsyPipeline]', err);
    } finally {
      isRunning = false;
      runBtn.disabled = false;
      runBtn.textContent = 'Run Now';
    }
  }

  sidebar.querySelector('#run-now-btn').addEventListener('click', runPipeline);
  main.querySelector('#open-folder-btn')?.addEventListener('click', () => {
    if (window.localAI?.openDownloads) {
      window.localAI.openDownloads();
    } else {
      updateStatus('Images are saved to your Downloads folder.');
    }
  });

  renderHistory();
  checkAndRun(runPipeline);

  return container;
}
