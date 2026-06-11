import { save, getAll, getRecentConcepts } from '../lib/uniquenessDB.js';
import { checkAndRun, markRunToday, hasRunToday } from '../lib/scheduler.js';
import { muapi } from '../lib/muapi.js';
import { t2iModels } from '../lib/models.js';
import { generateKeyword } from '../lib/atlasEngine.js';
import { generatePack } from '../lib/forgeEngine.js';
import { hasClaudeKey, setClaudeKey } from '../lib/claudeClient.js';

export function EtsyPipeline() {
    const container = document.createElement('div');
    container.className = 'w-full h-full flex flex-col items-center bg-app-bg relative p-4 md:p-6 overflow-y-auto custom-scrollbar overflow-x-hidden';

    // --- State ---
    const nanoBanana = t2iModels.find(m => m.id === 'nano-banana') || t2iModels[0];
    let selectedModel = nanoBanana.id;
    let selectedModelName = nanoBanana.name;
    let isRunning = false;
    let dropdownOpen = false;
    let lastImageUrl = '';
    let currentKeyword = null;
    let currentPack = null;
    let selectedCategory = 'Animals';
    let seedText = '';
    const generationHistory = [];

    // ==========================================
    // 1. HERO
    // ==========================================
    const hero = document.createElement('div');
    hero.className = 'flex flex-col items-center mb-10 animate-fade-in-up';
    hero.innerHTML = `
        <div class="mb-8 relative group">
            <div class="absolute inset-0 bg-primary/20 blur-[100px] rounded-full opacity-40 group-hover:opacity-70 transition-opacity duration-1000"></div>
            <div class="relative w-24 h-24 bg-teal-900/40 rounded-3xl flex items-center justify-center border border-white/5 overflow-hidden">
                <div class="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20 shadow-glow relative z-10">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="text-primary">
                        <path d="M6 2L3 6v15a2 2 0 002 2h14a2 2 0 002-2V6l-3-4H6z"/>
                        <line x1="3" y1="6" x2="21" y2="6"/>
                        <path d="M16 10a4 4 0 01-8 0"/>
                    </svg>
                </div>
                <div class="absolute top-4 right-4 text-primary animate-pulse">🎨</div>
            </div>
        </div>
        <h1 class="text-2xl sm:text-4xl md:text-6xl font-black text-white tracking-widest uppercase mb-4 text-center px-4">Etsy Pipeline</h1>
        <p class="text-secondary text-sm font-medium tracking-wide opacity-60">AI-powered nursery art — keyword research → listing copy → image</p>
    `;
    container.appendChild(hero);

    // ==========================================
    // 2. CONTROL BAR
    // ==========================================
    const controlWrapper = document.createElement('div');
    controlWrapper.className = 'w-full max-w-4xl relative z-40 animate-fade-in-up';

    const bar = document.createElement('div');
    bar.className = 'w-full bg-[#111]/90 backdrop-blur-xl border border-white/10 rounded-[2rem] p-4 md:p-5 flex flex-col gap-4 shadow-3xl';

    // Category toggles
    const categoryRow = document.createElement('div');
    categoryRow.className = 'flex flex-col gap-3 px-2';

    const categoryLabel = document.createElement('div');
    categoryLabel.className = 'text-[10px] font-bold text-secondary uppercase tracking-widest';
    categoryLabel.textContent = 'Category';

    const categoryBtns = document.createElement('div');
    categoryBtns.className = 'flex gap-2 flex-wrap';

    ['Animals', 'Botanical', 'Educational'].forEach(cat => {
        const btn = document.createElement('button');
        btn.className = `px-4 py-2 rounded-2xl text-xs font-bold transition-all border ${cat === selectedCategory ? 'bg-primary text-black border-primary' : 'bg-white/5 text-white/60 border-white/5 hover:bg-white/10'}`;
        btn.textContent = cat;
        btn.onclick = () => {
            selectedCategory = cat;
            categoryBtns.querySelectorAll('button').forEach(b => {
                b.className = 'px-4 py-2 rounded-2xl text-xs font-bold transition-all border bg-white/5 text-white/60 border-white/5 hover:bg-white/10';
            });
            btn.className = 'px-4 py-2 rounded-2xl text-xs font-bold transition-all border bg-primary text-black border-primary';
        };
        categoryBtns.appendChild(btn);
    });

    const seedLabel = document.createElement('div');
    seedLabel.className = 'text-[10px] font-bold text-secondary uppercase tracking-widest mt-1';
    seedLabel.textContent = 'Or describe an idea (optional)';

    const seedInput = document.createElement('input');
    seedInput.type = 'text';
    seedInput.placeholder = 'e.g. something with foxes, autumn theme...';
    seedInput.className = 'w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-primary/50 transition-colors';
    seedInput.oninput = (e) => { seedText = e.target.value; };

    categoryRow.appendChild(categoryLabel);
    categoryRow.appendChild(categoryBtns);
    categoryRow.appendChild(seedLabel);
    categoryRow.appendChild(seedInput);
    bar.appendChild(categoryRow);

    // Model + schedule row
    const controlsRow = document.createElement('div');
    controlsRow.className = 'flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 px-2 pt-3 border-t border-white/5';

    const controlsLeft = document.createElement('div');
    controlsLeft.className = 'flex items-center gap-2 flex-wrap';

    const createControlBtn = (icon, label, id, tooltip) => {
        const btn = document.createElement('button');
        btn.id = id;
        btn.className = 'flex items-center gap-1.5 md:gap-2.5 px-3 md:px-4 py-2 md:py-2.5 bg-white/5 hover:bg-white/10 rounded-xl md:rounded-2xl transition-all border border-white/5 group whitespace-nowrap';
        if (tooltip) btn.setAttribute('data-tooltip', tooltip);
        btn.innerHTML = `
            ${icon}
            <span id="${id}-label" class="text-xs font-bold text-white group-hover:text-primary transition-colors">${label}</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" class="opacity-20 group-hover:opacity-100 transition-opacity"><path d="M6 9l6 6 6-6"/></svg>
        `;
        return btn;
    };

    const modelBtn = createControlBtn(`
        <div class="w-5 h-5 bg-primary rounded-md flex items-center justify-center shadow-lg shadow-primary/20">
            <span class="text-[10px] font-black text-black">G</span>
        </div>
    `, selectedModelName, 'etsy-model-btn', 'Select AI generation model');

    const scheduleChip = document.createElement('div');
    scheduleChip.id = 'schedule-chip';
    scheduleChip.className = 'flex items-center gap-2 px-3 py-2 bg-white/5 rounded-2xl border border-white/5';
    scheduleChip.innerHTML = `
        <div class="w-2 h-2 rounded-full ${hasRunToday() ? 'bg-green-400' : 'bg-yellow-400'}"></div>
        <span class="text-xs font-bold text-white/60">${hasRunToday() ? 'Ran today' : 'Not run today'}</span>
    `;

    const totalChip = document.createElement('div');
    totalChip.className = 'flex items-center gap-2 px-3 py-2 bg-white/5 rounded-2xl border border-white/5';
    totalChip.innerHTML = `
        <span class="text-xs text-white/40">Total:</span>
        <span id="total-count" class="text-xs font-bold text-primary">${getAll().length}</span>
    `;

    controlsLeft.appendChild(modelBtn);
    controlsLeft.appendChild(scheduleChip);
    controlsLeft.appendChild(totalChip);

    const runBtn = document.createElement('button');
    runBtn.id = 'run-now-btn';
    runBtn.className = 'bg-primary text-black px-6 md:px-8 py-3 rounded-xl md:rounded-[1.5rem] font-black text-sm md:text-base hover:shadow-glow hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2.5 w-full sm:w-auto shadow-lg';
    runBtn.innerHTML = 'Generate Keyword ✨';

    controlsRow.appendChild(controlsLeft);
    controlsRow.appendChild(runBtn);
    bar.appendChild(controlsRow);

    const statusRow = document.createElement('div');
    statusRow.className = 'px-2 pt-3 border-t border-white/5';
    statusRow.innerHTML = `<p id="pipeline-status" class="text-sm text-white/50">Select a category and click "Generate Keyword" — or type a seed idea first.</p>`;
    bar.appendChild(statusRow);

    controlWrapper.appendChild(bar);
    container.appendChild(controlWrapper);

    // ==========================================
    // 2b. CLAUDE KEY PANEL
    // ==========================================
    const claudeKeyPanel = document.createElement('div');
    claudeKeyPanel.className = 'w-full max-w-4xl mt-4 hidden';
    claudeKeyPanel.id = 'claude-key-panel';
    claudeKeyPanel.innerHTML = `
        <div class="bg-yellow-900/20 border border-yellow-500/30 rounded-2xl p-5 flex flex-col gap-3">
            <span class="text-yellow-400 text-sm font-bold">⚠ Claude API key required</span>
            <p class="text-white/50 text-xs">The AI keyword and copy generation uses Claude (Anthropic). Add your API key to continue.</p>
            <div class="flex gap-2">
                <input type="password" id="claude-key-input" placeholder="sk-ant-..." class="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-primary/50 transition-colors" />
                <button id="claude-key-save" class="bg-primary text-black px-4 py-2 rounded-xl text-xs font-black hover:scale-105 transition-all">Save</button>
            </div>
        </div>
    `;
    container.appendChild(claudeKeyPanel);

    claudeKeyPanel.querySelector('#claude-key-save').onclick = () => {
        const val = claudeKeyPanel.querySelector('#claude-key-input').value.trim();
        if (val) {
            setClaudeKey(val);
            claudeKeyPanel.classList.add('hidden');
            updateStatus('Claude key saved. Click "Generate Keyword" to start.');
        }
    };

    // ==========================================
    // 3. KEYWORD REVIEW PANEL
    // ==========================================
    const keywordPanel = document.createElement('div');
    keywordPanel.className = 'w-full max-w-4xl mt-6 hidden';
    keywordPanel.id = 'etsy-keyword-panel';
    keywordPanel.innerHTML = `
        <div class="bg-[#111]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex flex-col gap-4">
            <div class="flex items-center gap-2">
                <div class="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                <span class="text-[10px] font-bold text-secondary uppercase tracking-widest">Step 1 — Keyword Research</span>
            </div>
            <div class="flex flex-col gap-3">
                <div class="flex items-start justify-between gap-4">
                    <div class="flex flex-col gap-1">
                        <span class="text-[10px] text-white/30 uppercase tracking-widest">Keyword</span>
                        <span id="kw-keyword" class="text-white font-bold text-lg"></span>
                    </div>
                    <div class="flex flex-col gap-1 text-right">
                        <span class="text-[10px] text-white/30 uppercase tracking-widest">Style</span>
                        <span id="kw-style" class="text-primary font-bold text-sm"></span>
                    </div>
                </div>
                <div class="flex gap-6">
                    <div class="flex flex-col gap-1">
                        <span class="text-[10px] text-white/30 uppercase tracking-widest">Subject</span>
                        <span id="kw-subject" class="text-white/80 text-sm"></span>
                    </div>
                    <div class="flex flex-col gap-1">
                        <span class="text-[10px] text-white/30 uppercase tracking-widest">Theme</span>
                        <span id="kw-theme" class="text-white/80 text-sm"></span>
                    </div>
                </div>
                <div class="flex flex-col gap-1">
                    <span class="text-[10px] text-white/30 uppercase tracking-widest">Rationale</span>
                    <span id="kw-rationale" class="text-white/50 text-xs italic"></span>
                </div>
            </div>
            <div class="flex gap-3 pt-2 border-t border-white/5">
                <button id="kw-approve-btn" class="bg-primary text-black px-6 py-2.5 rounded-2xl text-xs font-black hover:scale-105 transition-all shadow-glow">Use This Keyword →</button>
                <button id="kw-retry-btn" class="bg-white/10 hover:bg-white/20 px-6 py-2.5 rounded-2xl text-xs font-bold transition-all border border-white/5 text-white">Try Another</button>
            </div>
        </div>
    `;
    container.appendChild(keywordPanel);

    // ==========================================
    // 4. IMAGE PREVIEW PANEL
    // ==========================================
    const imagePanel = document.createElement('div');
    imagePanel.className = 'w-full max-w-4xl mt-6 hidden';
    imagePanel.id = 'etsy-image-panel';

    const imagePanelInner = document.createElement('div');
    imagePanelInner.className = 'bg-[#111]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex flex-col items-center gap-5';

    const imgEl = document.createElement('img');
    imgEl.id = 'etsy-preview-img';
    imgEl.className = 'max-h-[60vh] max-w-full rounded-2xl shadow-3xl border border-white/10 object-contain';

    const conceptLabel = document.createElement('p');
    conceptLabel.id = 'etsy-concept-label';
    conceptLabel.className = 'text-white/60 text-sm text-center';

    const imgControls = document.createElement('div');
    imgControls.className = 'flex gap-3';

    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'bg-primary text-black px-6 py-2.5 rounded-2xl text-xs font-black transition-all shadow-glow active:scale-95 hover:scale-105';
    downloadBtn.textContent = '↓ Download';

    const openFolderBtn = document.createElement('button');
    openFolderBtn.id = 'etsy-open-folder-btn';
    openFolderBtn.className = 'bg-white/10 hover:bg-white/20 px-6 py-2.5 rounded-2xl text-xs font-bold transition-all border border-white/5 text-white';
    openFolderBtn.textContent = 'Open Downloads';

    imgControls.appendChild(downloadBtn);
    imgControls.appendChild(openFolderBtn);
    imagePanelInner.appendChild(imgEl);
    imagePanelInner.appendChild(conceptLabel);
    imagePanelInner.appendChild(imgControls);
    imagePanel.appendChild(imagePanelInner);
    container.appendChild(imagePanel);

    // ==========================================
    // 4b. LISTING COPY PANEL
    // ==========================================
    const copyPanel = document.createElement('div');
    copyPanel.className = 'w-full max-w-4xl mt-6 hidden';
    copyPanel.id = 'etsy-copy-panel';
    copyPanel.innerHTML = `
        <div class="bg-[#111]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex flex-col gap-5">
            <div class="flex items-center gap-2">
                <div class="w-2 h-2 rounded-full bg-primary"></div>
                <span class="text-[10px] font-bold text-secondary uppercase tracking-widest">Etsy Listing Copy</span>
            </div>
            <div class="flex flex-col gap-2">
                <div class="flex items-center justify-between">
                    <span class="text-[10px] text-white/30 uppercase tracking-widest">Title</span>
                    <button class="copy-btn text-[10px] text-primary hover:text-white transition-colors font-bold" data-field="title">Copy</button>
                </div>
                <p id="listing-title" class="text-white/80 text-sm bg-white/5 rounded-xl px-4 py-3 border border-white/5"></p>
            </div>
            <div class="flex flex-col gap-2">
                <div class="flex items-center justify-between">
                    <span class="text-[10px] text-white/30 uppercase tracking-widest">Tags (13)</span>
                    <button class="copy-btn text-[10px] text-primary hover:text-white transition-colors font-bold" data-field="tags">Copy</button>
                </div>
                <p id="listing-tags" class="text-white/80 text-sm bg-white/5 rounded-xl px-4 py-3 border border-white/5 font-mono"></p>
            </div>
            <div class="flex flex-col gap-2">
                <div class="flex items-center justify-between">
                    <span class="text-[10px] text-white/30 uppercase tracking-widest">Description</span>
                    <button class="copy-btn text-[10px] text-primary hover:text-white transition-colors font-bold" data-field="desc">Copy</button>
                </div>
                <p id="listing-desc" class="text-white/80 text-sm bg-white/5 rounded-xl px-4 py-3 border border-white/5 whitespace-pre-wrap"></p>
            </div>
            <div class="flex flex-col gap-2">
                <div class="flex items-center justify-between">
                    <span class="text-[10px] text-white/30 uppercase tracking-widest">Image Prompt (sent to fal.ai)</span>
                    <button class="copy-btn text-[10px] text-primary hover:text-white transition-colors font-bold" data-field="prompt">Copy</button>
                </div>
                <p id="listing-prompt" class="text-white/60 text-xs bg-white/5 rounded-xl px-4 py-3 border border-white/5 font-mono"></p>
            </div>
        </div>
    `;
    container.appendChild(copyPanel);

    copyPanel.querySelectorAll('.copy-btn').forEach(btn => {
        btn.onclick = () => {
            if (!currentPack) return;
            const field = btn.dataset.field;
            const text = field === 'title' ? currentPack.title
                : field === 'tags' ? currentPack.tags.join(', ')
                : field === 'desc' ? currentPack.description
                : currentPack.imagePrompt;
            navigator.clipboard.writeText(text).then(() => {
                const orig = btn.textContent;
                btn.textContent = 'Copied!';
                setTimeout(() => { btn.textContent = orig; }, 1500);
            });
        };
    });

    // History sidebar
    const historySidebar = document.createElement('div');
    historySidebar.className = 'fixed right-0 top-0 h-full w-20 md:w-24 bg-black/60 backdrop-blur-xl border-l border-white/5 z-50 flex flex-col items-center py-4 gap-3 overflow-y-auto transition-all duration-500 translate-x-full opacity-0';
    historySidebar.id = 'etsy-history-sidebar';

    const historyLabel = document.createElement('div');
    historyLabel.className = 'text-[9px] font-bold text-muted uppercase tracking-widest mb-2';
    historyLabel.textContent = 'History';
    historySidebar.appendChild(historyLabel);

    const historyList = document.createElement('div');
    historyList.className = 'flex flex-col gap-2 w-full px-2';
    historySidebar.appendChild(historyList);

    container.appendChild(historySidebar);

    // ==========================================
    // 5. CONCEPT HISTORY
    // ==========================================
    const historySection = document.createElement('div');
    historySection.className = 'w-full max-w-4xl mt-6 mb-10';
    historySection.innerHTML = `
        <div class="bg-[#111]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex flex-col gap-3">
            <h3 class="text-[10px] font-bold text-secondary uppercase tracking-widest">Concept History</h3>
            <div id="etsy-history-list" class="flex flex-col gap-2"></div>
        </div>
    `;
    container.appendChild(historySection);

    // ==========================================
    // 6. MODEL DROPDOWN
    // ==========================================
    const dropdown = document.createElement('div');
    dropdown.className = 'absolute z-50 transition-all opacity-0 pointer-events-none scale-95 origin-bottom-left glass rounded-3xl p-3 w-[calc(100vw-3rem)] max-w-xs shadow-4xl border border-white/10 flex flex-col';
    container.appendChild(dropdown);

    const closeDropdown = () => {
        dropdown.classList.add('opacity-0', 'pointer-events-none', 'scale-95');
        dropdown.classList.remove('opacity-100', 'pointer-events-auto', 'scale-100');
        dropdownOpen = false;
    };

    const showModelDropdown = (anchorBtn) => {
        dropdown.innerHTML = `
            <div class="flex flex-col h-full max-h-[70vh]">
                <div class="px-2 pb-3 mb-2 border-b border-white/5 shrink-0">
                    <div class="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-2.5 border border-white/5 focus-within:border-primary/50 transition-colors">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" class="text-muted"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                        <input type="text" id="etsy-model-search" placeholder="Search models..." class="bg-transparent border-none text-xs text-white focus:ring-0 w-full p-0">
                    </div>
                </div>
                <div class="text-[10px] font-bold text-secondary uppercase tracking-widest px-3 py-2 shrink-0">Available models</div>
                <div id="etsy-model-list" class="flex flex-col gap-1.5 overflow-y-auto custom-scrollbar pr-1 pb-2"></div>
            </div>
        `;
        dropdown.classList.remove('opacity-0', 'pointer-events-none', 'scale-95');
        dropdown.classList.add('opacity-100', 'pointer-events-auto', 'scale-100');

        const list = dropdown.querySelector('#etsy-model-list');

        const renderModels = (filter = '') => {
            list.innerHTML = '';
            const filtered = t2iModels.filter(m =>
                m.name.toLowerCase().includes(filter.toLowerCase()) ||
                m.id.toLowerCase().includes(filter.toLowerCase())
            );
            filtered.forEach(m => {
                const item = document.createElement('div');
                item.className = `flex items-center justify-between p-3.5 hover:bg-white/5 rounded-2xl cursor-pointer transition-all border border-transparent hover:border-white/5 ${selectedModel === m.id ? 'bg-white/5 border-white/5' : ''}`;
                item.innerHTML = `
                    <div class="flex items-center gap-3.5">
                        <div class="w-10 h-10 bg-primary/10 text-primary border border-white/5 rounded-xl flex items-center justify-center font-black text-sm shadow-inner uppercase">${m.name.charAt(0)}</div>
                        <span class="text-xs font-bold text-white tracking-tight">${m.name}</span>
                    </div>
                    ${selectedModel === m.id ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" stroke-width="4"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
                `;
                item.onclick = (e) => {
                    e.stopPropagation();
                    selectedModel = m.id;
                    selectedModelName = m.name;
                    document.getElementById('etsy-model-btn-label').textContent = selectedModelName;
                    closeDropdown();
                };
                list.appendChild(item);
            });
        };

        renderModels();

        const searchInput = dropdown.querySelector('#etsy-model-search');
        searchInput.onclick = (e) => e.stopPropagation();
        searchInput.oninput = (e) => renderModels(e.target.value);

        const btnRect = anchorBtn.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        if (window.innerWidth < 768) {
            dropdown.style.left = '50%';
            dropdown.style.transform = 'translateX(-50%)';
        } else {
            dropdown.style.left = `${btnRect.left - containerRect.left}px`;
            dropdown.style.transform = '';
        }
        dropdown.style.bottom = `${containerRect.bottom - btnRect.top + 8}px`;
    };

    modelBtn.onclick = (e) => {
        e.stopPropagation();
        if (dropdownOpen) closeDropdown();
        else {
            dropdownOpen = true;
            showModelDropdown(modelBtn);
        }
    };

    window.onclick = () => closeDropdown();

    // ==========================================
    // 7. HELPERS
    // ==========================================
    const updateStatus = (msg) => {
        const el = container.querySelector('#pipeline-status');
        if (el) el.textContent = msg;
    };

    const addToHistory = (entry) => {
        generationHistory.unshift(entry);
        try {
            localStorage.setItem('fal_history', JSON.stringify(generationHistory.slice(0, 50)));
            localStorage.setItem('etsy_history', JSON.stringify(generationHistory.slice(0, 50)));
        } catch { /* ignore */ }
        historySidebar.classList.remove('translate-x-full', 'opacity-0');
        historySidebar.classList.add('translate-x-0', 'opacity-100');
        renderHistory();
    };

    const downloadImageFile = async (url, filename) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);
        } catch {
            window.open(url, '_blank');
        }
    };

    const showImageFromHistory = (entry) => {
        imagePanel.classList.remove('hidden');
        imgEl.src = entry.url;
        conceptLabel.textContent = entry.prompt?.substring(0, 80) || '';
        lastImageUrl = entry.url;
        imagePanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    const renderHistory = () => {
        historyList.innerHTML = '';
        generationHistory.forEach((entry, idx) => {
            const thumb = document.createElement('div');
            thumb.className = `relative group/thumb cursor-pointer rounded-xl overflow-hidden border-2 transition-all duration-300 ${idx === 0 ? 'border-primary shadow-glow' : 'border-white/10 hover:border-white/30'}`;
            thumb.innerHTML = `
                <img src="${entry.url}" alt="${entry.prompt?.substring(0, 30) || 'Generated'}" class="w-full aspect-square object-cover">
                <div class="absolute inset-0 bg-black/60 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center gap-1">
                    <button class="hist-download p-1.5 bg-primary rounded-lg text-black hover:scale-110 transition-transform" title="Download">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                    </button>
                </div>
            `;
            thumb.onclick = (e) => {
                if (e.target.closest('.hist-download')) {
                    downloadImageFile(entry.url, `etsy-${entry.id || idx}.png`);
                    return;
                }
                showImageFromHistory(entry);
                historyList.querySelectorAll('div').forEach(t => {
                    t.classList.remove('border-primary', 'shadow-glow');
                    t.classList.add('border-white/10');
                });
                thumb.classList.remove('border-white/10');
                thumb.classList.add('border-primary', 'shadow-glow');
            };
            historyList.appendChild(thumb);
        });
    };

    const renderConceptHistory = () => {
        const list = container.querySelector('#etsy-history-list');
        if (!list) return;
        const all = getAll().slice().reverse().slice(0, 10);
        if (all.length === 0) {
            list.innerHTML = '<p class="text-xs text-white/30 text-center py-2">No concepts generated yet.</p>';
            return;
        }
        list.innerHTML = all.map(e => `
            <div class="text-xs text-white/50 bg-white/5 rounded-xl px-4 py-3 border border-white/5 flex items-center justify-between">
                <div class="flex flex-col gap-0.5">
                    <span class="text-white/80 font-medium">${e.subject} — ${e.theme}</span>
                    ${e.keyword ? `<span class="text-primary/60 text-[10px]">${e.keyword}</span>` : ''}
                </div>
                <div class="flex items-center gap-3">
                    <span class="text-white/30">${e.date}</span>
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/20 text-primary">${e.status}</span>
                </div>
            </div>
        `).join('');
        const countEl = container.querySelector('#total-count');
        if (countEl) countEl.textContent = getAll().length;
    };

    const showNotification = (title, body) => {
        if (Notification.permission === 'granted') {
            new Notification(title, { body });
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(p => {
                if (p === 'granted') new Notification(title, { body });
            });
        }
    };

    const showCopyPanel = (pack) => {
        copyPanel.classList.remove('hidden');
        copyPanel.querySelector('#listing-title').textContent = pack.title;
        copyPanel.querySelector('#listing-tags').textContent = pack.tags.join(', ');
        copyPanel.querySelector('#listing-desc').textContent = pack.description;
        copyPanel.querySelector('#listing-prompt').textContent = pack.imagePrompt;
        copyPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    // ==========================================
    // 8. PIPELINE LOGIC
    // ==========================================
    async function runKeywordStep() {
        if (isRunning) return;

        if (!hasClaudeKey()) {
            claudeKeyPanel.classList.remove('hidden');
            claudeKeyPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        isRunning = true;
        runBtn.disabled = true;
        runBtn.innerHTML = `<span class="animate-spin inline-block mr-2 text-black">◌</span> Researching...`;
        keywordPanel.classList.add('hidden');

        try {
            updateStatus('Asking Claude to research the best keyword...');
            const recentConcepts = getRecentConcepts(20);
            currentKeyword = await generateKeyword({ category: selectedCategory, seed: seedText || null, recentConcepts });

            keywordPanel.querySelector('#kw-keyword').textContent = currentKeyword.keyword;
            keywordPanel.querySelector('#kw-subject').textContent = currentKeyword.subject;
            keywordPanel.querySelector('#kw-theme').textContent = currentKeyword.theme;
            keywordPanel.querySelector('#kw-style').textContent = currentKeyword.style;
            keywordPanel.querySelector('#kw-rationale').textContent = currentKeyword.rationale;
            keywordPanel.classList.remove('hidden');
            keywordPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });

            updateStatus(`Keyword ready: "${currentKeyword.keyword}" — approve or try another.`);
        } catch (err) {
            if (err.code === 'MISSING_CLAUDE_KEY') {
                claudeKeyPanel.classList.remove('hidden');
                claudeKeyPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
                updateStatus('Claude API key required. Enter it above.');
            } else {
                updateStatus(`Error: ${err.message}`);
            }
            console.error('[EtsyPipeline]', err);
        } finally {
            isRunning = false;
            runBtn.disabled = false;
            runBtn.innerHTML = 'Generate Keyword ✨';
        }
    }

    async function runPackStep() {
        if (isRunning || !currentKeyword) return;
        isRunning = true;

        const approveBtn = keywordPanel.querySelector('#kw-approve-btn');
        approveBtn.disabled = true;
        approveBtn.textContent = '⟳ Generating copy...';

        try {
            updateStatus('Generating Etsy listing copy...');
            currentPack = await generatePack(currentKeyword);
            showCopyPanel(currentPack);

            updateStatus(`Generating image with ${selectedModelName}...`);
            approveBtn.textContent = '⟳ Generating image...';

            const result = await muapi.generateImage({ prompt: currentPack.imagePrompt, model: selectedModel });
            const imageUrl = result?.url || result?.images?.[0]?.url;
            if (!imageUrl) throw new Error('No image URL returned from fal.ai');

            lastImageUrl = imageUrl;

            const date = new Date().toISOString().split('T')[0];
            const slug = (s) => s.toLowerCase().replace(/\s+/g, '-');
            const filename = `etsy-${date}-${slug(currentKeyword.subject)}-${slug(currentKeyword.theme)}.png`;

            downloadImageFile(imageUrl, filename);

            const entry = { ...currentKeyword, ...currentPack, date, filename, status: 'approved' };
            save(entry);
            markRunToday();

            addToHistory({
                id: Date.now().toString(),
                url: imageUrl,
                prompt: currentPack.imagePrompt,
                model: selectedModel,
                timestamp: new Date().toISOString(),
            });

            const chip = container.querySelector('#schedule-chip');
            if (chip) {
                chip.innerHTML = `
                    <div class="w-2 h-2 rounded-full bg-green-400"></div>
                    <span class="text-xs font-bold text-white/60">Ran today</span>
                `;
            }

            imagePanel.classList.remove('hidden');
            imgEl.src = imageUrl;
            conceptLabel.textContent = `${currentKeyword.subject} — ${currentKeyword.theme}`;
            imagePanel.scrollIntoView({ behavior: 'smooth', block: 'center' });

            showNotification('New Etsy print ready!', `${currentKeyword.subject} ${currentKeyword.theme} — saved to Downloads`);
            updateStatus('Done! Image saved to Downloads. Copy your listing text above.');
            renderConceptHistory();

        } catch (err) {
            updateStatus(`Error: ${err.message}`);
            console.error('[EtsyPipeline]', err);
        } finally {
            isRunning = false;
            approveBtn.disabled = false;
            approveBtn.textContent = 'Use This Keyword →';
        }
    }

    // ==========================================
    // 9. EVENT HANDLERS
    // ==========================================
    runBtn.addEventListener('click', runKeywordStep);
    keywordPanel.querySelector('#kw-approve-btn').addEventListener('click', runPackStep);
    keywordPanel.querySelector('#kw-retry-btn').addEventListener('click', runKeywordStep);

    downloadBtn.onclick = () => {
        if (lastImageUrl) {
            const date = new Date().toISOString().split('T')[0];
            downloadImageFile(lastImageUrl, `etsy-${date}.png`);
        }
    };

    openFolderBtn.addEventListener('click', () => {
        if (window.localAI?.openDownloads) {
            window.localAI.openDownloads();
        } else {
            updateStatus('Images are saved to your Downloads folder.');
        }
    });

    // ==========================================
    // 10. INIT
    // ==========================================
    renderConceptHistory();

    try {
        const saved = JSON.parse(localStorage.getItem('etsy_history') || '[]');
        if (saved.length > 0) {
            saved.forEach(e => generationHistory.push(e));
            historySidebar.classList.remove('translate-x-full', 'opacity-0');
            historySidebar.classList.add('translate-x-0', 'opacity-100');
            renderHistory();
        }
    } catch (e) { /* ignore */ }

    const hasKey = !!(window.__FAL_KEY__ || localStorage.getItem('fal_key'));
    if (hasKey) {
        checkAndRun(() => {
            if (hasClaudeKey()) {
                runKeywordStep();
            } else {
                claudeKeyPanel.classList.remove('hidden');
                updateStatus('⚠ Claude API key required for AI generation. Enter it above.');
            }
        });
    } else {
        updateStatus('⚠ No fal.ai API key set. Go to Settings → set your key, then come back.');
    }

    return container;
}
