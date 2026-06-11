export function HistoryGallery() {
    const container = document.createElement('div');
    container.className = 'w-full h-full overflow-y-auto custom-scrollbar bg-app-bg p-6';

    // --- Load history ---
    let history = [];
    try {
        history = JSON.parse(localStorage.getItem('fal_history') || '[]');
    } catch { /* ignore */ }

    // --- Lightbox ---
    const lightbox = document.createElement('div');
    lightbox.className = 'fixed inset-0 bg-black/90 backdrop-blur-xl z-[100] flex items-center justify-center hidden';
    lightbox.innerHTML = `
        <button id="lb-close" class="absolute top-4 right-4 text-white/60 hover:text-white text-3xl leading-none">✕</button>
        <img id="lb-img" src="" class="max-w-[90vw] max-h-[90vh] rounded-2xl shadow-2xl object-contain" />
        <div id="lb-meta" class="absolute bottom-6 left-1/2 -translate-x-1/2 text-center text-white/60 text-xs max-w-xl px-4"></div>
    `;
    lightbox.onclick = (e) => { if (e.target === lightbox) lightbox.classList.add('hidden'); };
    lightbox.querySelector('#lb-close').onclick = () => lightbox.classList.add('hidden');
    document.body.appendChild(lightbox);

    function openLightbox(entry) {
        lightbox.querySelector('#lb-img').src = entry.url;
        lightbox.querySelector('#lb-meta').textContent = entry.prompt || '';
        lightbox.classList.remove('hidden');
    }

    // --- Download helper ---
    async function downloadImage(url, filename) {
        try {
            const res = await fetch(url);
            const blob = await res.blob();
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = filename;
            a.click();
        } catch { window.open(url, '_blank'); }
    }

    // --- Format timestamp ---
    function formatDate(ts) {
        if (!ts) return '';
        try {
            return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        } catch { return ''; }
    }

    // --- Render ---
    function render() {
        container.innerHTML = '';

        // Header row
        const header = document.createElement('div');
        header.className = 'flex items-center justify-between max-w-7xl mx-auto mb-6';
        header.innerHTML = `
            <div>
                <h1 class="text-2xl font-bold text-white">History</h1>
                <p class="text-sm text-white/40 mt-0.5">${history.length} generation${history.length !== 1 ? 's' : ''} across all studios</p>
            </div>
        `;

        if (history.length > 0) {
            const clearBtn = document.createElement('button');
            clearBtn.className = 'text-xs text-red-400 hover:text-red-300 border border-red-400/30 hover:border-red-300/50 px-3 py-1.5 rounded-lg transition-all';
            clearBtn.textContent = 'Clear All History';
            let confirming = false;
            clearBtn.onclick = () => {
                if (!confirming) {
                    confirming = true;
                    clearBtn.textContent = 'Are you sure? Click again to confirm';
                    clearBtn.classList.add('bg-red-500/10');
                    setTimeout(() => {
                        confirming = false;
                        clearBtn.textContent = 'Clear All History';
                        clearBtn.classList.remove('bg-red-500/10');
                    }, 3000);
                } else {
                    localStorage.removeItem('fal_history');
                    localStorage.removeItem('etsy_history');
                    history = [];
                    render();
                }
            };
            header.appendChild(clearBtn);
        }

        container.appendChild(header);

        // Empty state
        if (history.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'flex flex-col items-center justify-center h-[60vh] text-center gap-4';
            empty.innerHTML = `
                <div class="text-6xl opacity-20">🖼️</div>
                <p class="text-white/40 text-lg font-medium">No history yet</p>
                <p class="text-white/25 text-sm">Images you generate in Image Studio, Etsy Pipeline, and other tabs will appear here.</p>
            `;
            container.appendChild(empty);
            return;
        }

        // Grid
        const grid = document.createElement('div');
        grid.className = 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 max-w-7xl mx-auto';

        history.forEach((entry, idx) => {
            const card = document.createElement('div');
            card.className = 'group relative bg-white/5 border border-white/8 rounded-2xl overflow-hidden cursor-pointer hover:border-white/20 hover:scale-[1.02] transition-all duration-200';

            const slug = (entry.prompt || 'image').substring(0, 20).replace(/\s+/g, '-').toLowerCase();
            const filename = `fal-${entry.id || idx}-${slug}.jpg`;

            card.innerHTML = `
                <div class="aspect-square overflow-hidden bg-white/5">
                    <img src="${entry.url}" alt="${entry.prompt?.substring(0, 40) || 'Generated image'}"
                         class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                         loading="lazy" />
                </div>
                <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3 gap-1">
                    <p class="text-white text-[11px] font-medium leading-snug line-clamp-2">${entry.prompt || ''}</p>
                    <div class="flex items-center justify-between">
                        <span class="text-white/50 text-[10px]">${entry.model || ''}</span>
                        <span class="text-white/40 text-[10px]">${formatDate(entry.timestamp)}</span>
                    </div>
                </div>
                <button class="dl-btn absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 hover:bg-primary rounded-lg p-1.5 text-white hover:text-black" title="Download">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                </button>
            `;

            card.onclick = (e) => {
                if (e.target.closest('.dl-btn')) {
                    e.stopPropagation();
                    downloadImage(entry.url, filename);
                    return;
                }
                openLightbox(entry);
            };

            grid.appendChild(card);
        });

        container.appendChild(grid);
        container.appendChild(lightbox);
    }

    render();

    // Clean up lightbox on unmount (when navigating away)
    const observer = new MutationObserver(() => {
        if (!document.body.contains(container)) {
            lightbox.remove();
            observer.disconnect();
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return container;
}
