'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { generateKeyword } from '../lib/atlasEngine.js';
import { generatePack, analyzeImageForListing } from '../lib/forgeEngine.js';
import { getAll, save, getRecentConcepts } from '../lib/uniquenessDB.js';
import { markRunToday } from '../lib/scheduler.js';
import { hasClaudeKey, setClaudeKey } from '../lib/claudeClient.js';
import { generateWithGemini, generateWithOpenAI, generateMockupWithGemini, generateMockupWithOpenAI } from '../lib/imageProviders.js';
import { saveMockups, loadMockups, saveImage, loadImage } from '../lib/mockupStore.js';
import { pickFolder, savePrintToFolder } from '../lib/folderSaver.js';
import { resizeForPrint } from '../lib/imageResizer.js';

const CATEGORIES = ['Animals', 'Botanical', 'Educational'];
const HISTORY_KEY = 'etsy_history';
const SESSION_KEY = 'etsy_session';

const ETSY_MODELS = [
  { id: 'gpt-image-1',          name: 'GPT Image 1',            provider: 'openai', nativeModel: 'gpt-image-1', quality: 'medium' },
  { id: 'gpt-image-1-hd',       name: 'GPT Image 1 HD',         provider: 'openai', nativeModel: 'gpt-image-1', quality: 'high' },
  { id: 'gemini-flash-image',   name: 'Gemini 3.1 Flash Image', provider: 'gemini', nativeModel: 'gemini-3.1-flash-image',      apiType: 'generateContent' },
  { id: 'imagen-4-fast',        name: 'Imagen 4 Fast',          provider: 'gemini', nativeModel: 'imagen-4.0-fast-generate-001',  apiType: 'imagen' },
  { id: 'imagen-4',             name: 'Imagen 4',               provider: 'gemini', nativeModel: 'imagen-4.0-generate-001',       apiType: 'imagen' },
  { id: 'imagen-4-ultra',       name: 'Imagen 4 Ultra',         provider: 'gemini', nativeModel: 'imagen-4.0-ultra-generate-001', apiType: 'imagen' },
];

function getGeminiKey() { return localStorage.getItem('gemini_api_key') || ''; }
function saveGeminiKey(k) { localStorage.setItem('gemini_api_key', k.trim()); }
function getOpenAIKey() { return localStorage.getItem('openai_api_key') || ''; }
function saveOpenAIKey(k) { localStorage.setItem('openai_api_key', k.trim()); }

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
}

// Survives component unmount/remount (tab switches) without localStorage size limits
const _imgCache = { imageUrl: '', mockups: [] };

function loadSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || '{}'); } catch { return {}; }
}

function saveHistory(items) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, 50))); } catch {}
}

async function downloadImage(url, filename) {
  try {
    // data URLs can be used directly without fetching
    if (url.startsWith('data:')) {
      const a = Object.assign(document.createElement('a'), { href: url, download: filename });
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    } else {
      const blob = await fetch(url).then(r => r.blob());
      const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: filename });
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    }
  } catch { window.open(url, '_blank'); }
}

export default function EtsyPipeline({ apiKey }) {
  const [initSession] = useState(loadSession);
  const [model, setModel] = useState(ETSY_MODELS[0].id);
  const modelName = ETSY_MODELS.find(m => m.id === model)?.name ?? model;
  const [category, setCategory] = useState('Animals');
  const [seed, setSeed] = useState('');
  const [imageLink, setImageLink] = useState('');
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState(
    (_imgCache.imageUrl || initSession.keyword)
      ? 'Previous session restored — generate a new keyword to start fresh.'
      : 'Select a category and click "Generate Keyword" — or type a seed idea first.'
  );
  const [keyword, setKeyword] = useState(initSession.keyword || null);
  const [pack, setPack] = useState(initSession.pack || null);
  const [imageUrl, setImageUrl] = useState(_imgCache.imageUrl || '');
  const [mockups, setMockups] = useState(_imgCache.mockups || []);
  const [history, setHistory] = useState(loadHistory);
  const [conceptHistory, setConceptHistory] = useState(() => getAll().slice().reverse().slice(0, 10));
  const refreshConceptHistory = () => setConceptHistory(getAll().slice().reverse().slice(0, 10));
  const [claudeInput, setClaudeInput] = useState('');
  const [showClaudePanel, setShowClaudePanel] = useState(false);
  const [geminiInput, setGeminiInput] = useState('');
  const [showGeminiPanel, setShowGeminiPanel] = useState(false);
  const [openaiInput, setOpenaiInput] = useState('');
  const [showOpenAIPanel, setShowOpenAIPanel] = useState(false);
  const [showKeyword, setShowKeyword] = useState(false);
  const [showPack, setShowPack] = useState(false);
  const [modelSearch, setModelSearch] = useState('');
  const [modelOpen, setModelOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [driveStatus, setDriveStatus] = useState('');
  const [driveSaving, setDriveSaving] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const maskCanvasRef = useRef(null);
  const isPaintingRef = useRef(false);
  const [editPrompt, setEditPrompt] = useState('');
  const [editRunning, setEditRunning] = useState(false);
  const modelBtnRef = useRef(null);

  const currentProvider = ETSY_MODELS.find(m => m.id === model)?.provider;

  useEffect(() => {
    // Images go to module-level cache (no size limit, survives tab switches)
    _imgCache.imageUrl = imageUrl;
    _imgCache.mockups = mockups;
    // Text-only session persisted to localStorage for page-reload restore
    try { localStorage.setItem(SESSION_KEY, JSON.stringify({ keyword, pack })); } catch {}
  }, [keyword, pack, imageUrl, mockups]);

  const pushHistory = useCallback((entry) => {
    setHistory(prev => {
      const next = [entry, ...prev];
      saveHistory(next);
      return next;
    });
  }, []);

  async function runAnalyzeLink() {
    if (running || !imageLink.trim()) return;
    if (!hasClaudeKey()) { setShowClaudePanel(true); return; }
    setRunning(true);
    setShowKeyword(false);
    setPack(null);
    setStatus('Asking Claude to analyze the image...');
    try {
      const result = await analyzeImageForListing(imageLink.trim());
      const { keyword: kw, subject, theme, style, rationale, ...packFields } = result;
      setKeyword({ keyword: kw, subject, theme, style, rationale });
      setPack(packFields);
      setShowPack(true);
      setImageUrl('');
      setMockups([]);
      setStatus(`Analysis done — keyword: "${kw}". Review the listing copy, then generate your image.`);
    } catch (err) {
      if (err.code === 'MISSING_CLAUDE_KEY') setShowClaudePanel(true);
      else setStatus(`Error: ${err.message}`);
    } finally {
      setRunning(false);
    }
  }

  async function runKeyword() {
    if (running) return;
    if (!hasClaudeKey()) { setShowClaudePanel(true); return; }
    setRunning(true);
    setKeyword(null);
    setShowKeyword(false);
    setStatus('Asking Claude to research the best keyword...');
    try {
      const recent = getRecentConcepts(20);
      const kw = await generateKeyword({ category, seed: seed || null, recentConcepts: recent });
      setKeyword(kw);
      setShowKeyword(true);
      setStatus(`Keyword ready: "${kw.keyword}" — approve or try another.`);
    } catch (err) {
      if (err.code === 'MISSING_CLAUDE_KEY') setShowClaudePanel(true);
      else setStatus(`Error: ${err.message}`);
    } finally {
      setRunning(false);
    }
  }

  const MOCKUP_PROMPTS = [
    `Place this artwork print in a white wooden frame centered on the wall above a white wooden crib with a soft grey muslin blanket. Warm morning sunlight filters through sheer curtains. Cozy pastel nursery decor. Photorealistic interior photography.`,
    `Place this artwork print in a slim white frame on a sage green painted nursery wall. A natural wood rocking chair with a cream knit throw sits nearby, with a small potted eucalyptus plant. Golden hour soft light. Cozy Scandinavian nursery style. Photorealistic.`,
    `Place this artwork print in a white frame above a white changing table with folded pastel blankets and a small bunny plush. Warm beige linen textured wall. Soft diffused window light. Minimalist cozy nursery. Photorealistic interior photography.`,
  ];

  async function buildMockups(artworkUrl, entryId) {
    const results = await Promise.allSettled(
      MOCKUP_PROMPTS.map(p => generateMockupForEtsy(p, artworkUrl))
    );
    const generated = results.filter(r => r.status === 'fulfilled' && r.value).map(r => r.value);
    const failed = results.filter(r => r.status === 'rejected');
    if (failed.length) {
      console.error('Mockup errors:', failed.map(r => r.reason));
      failed.forEach((f, i) => console.error(`Mockup ${i} error:`, f.reason?.message, f.reason));
    }
    if (generated.length) {
      setMockups(generated);
      if (entryId) saveMockups(entryId, generated).catch(() => {});
    } else if (failed.length) {
      throw new Error(failed[0].reason?.message || 'Mockup generation failed');
    }
    return generated;
  }

  async function runPack() {
    if (running || !keyword) return;
    setRunning(true);
    setShowKeyword(false);
    setMockups([]);
    setStatus(pack ? `Generating image with ${modelName}...` : 'Generating Etsy listing copy...');
    try {
      const p = pack || await generatePack(keyword);
      if (!pack) { setPack(p); setShowPack(true); }
      setStatus(`Generating image with ${modelName}...`);

      const url = await generateForEtsy(p.imagePrompt);

      setImageUrl(url);

      const date = new Date().toISOString().split('T')[0];
      const slug = s => s.toLowerCase().replace(/\s+/g, '-');
      const filename = `etsy-${date}-${slug(keyword.subject)}-${slug(keyword.theme)}.png`;
      downloadImage(url, filename);

      const entryId = Date.now().toString();
      const entry = { ...keyword, ...p, date, filename, status: 'approved', entryId };
      save(entry);
      saveImage(entryId, url).catch(() => {});
      refreshConceptHistory();
      markRunToday();
      pushHistory({ id: entryId, url, prompt: p.imagePrompt, model, timestamp: new Date().toISOString() });

      setStatus('Generating nursery room mockups (3)...');
      const generatedMockups = await buildMockups(url, entryId);
      setStatus('Done! Image and mockups ready. Copy your listing text above.');
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    } finally {
      setRunning(false);
    }
  }

  async function generateForEtsy(prompt) {
    const m = ETSY_MODELS.find(x => x.id === model);
    if (m?.provider === 'gemini') {
      const key = getGeminiKey();
      if (!key) { setShowGeminiPanel(true); throw new Error('Gemini API key not set'); }
      return generateWithGemini(prompt, key, m.nativeModel, m.apiType);
    } else {
      const key = getOpenAIKey();
      if (!key) { setShowOpenAIPanel(true); throw new Error('OpenAI API key not set'); }
      return generateWithOpenAI(prompt, key, m.nativeModel, m.quality);
    }
  }

  // Initialize mask canvas to match image dimensions when modal opens
  useEffect(() => {
    if (!showEditModal || !maskCanvasRef.current || !imageUrl) return;
    const img = new Image();
    img.onload = () => {
      const c = maskCanvasRef.current;
      if (!c) return;
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      c.getContext('2d').clearRect(0, 0, c.width, c.height);
    };
    img.src = imageUrl;
  }, [showEditModal, imageUrl]);

  function paintMask(e) {
    const canvas = maskCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    const ctx = canvas.getContext('2d');
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(255, 80, 80, 0.7)';
    ctx.beginPath();
    ctx.arc(x, y, 30 * (canvas.width / rect.width), 0, Math.PI * 2);
    ctx.fill();
  }

  function clearMask() {
    const c = maskCanvasRef.current;
    if (c) c.getContext('2d').clearRect(0, 0, c.width, c.height);
  }

  function buildMaskBlob(paintCanvas) {
    const { width, height } = paintCanvas;
    const out = document.createElement('canvas');
    out.width = width; out.height = height;
    const ctx = out.getContext('2d');
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
    const src = paintCanvas.getContext('2d').getImageData(0, 0, width, height);
    const dst = ctx.getImageData(0, 0, width, height);
    for (let i = 0; i < src.data.length; i += 4) {
      if (src.data[i + 3] > 10) {
        dst.data[i] = dst.data[i + 1] = dst.data[i + 2] = dst.data[i + 3] = 0;
      }
    }
    ctx.putImageData(dst, 0, 0);
    return new Promise(r => out.toBlob(r, 'image/png'));
  }

  async function editImage() {
    if (!imageUrl || !editPrompt.trim()) return;
    setEditRunning(true);
    const promptText = editPrompt.trim();
    try {
      const m = ETSY_MODELS.find(x => x.id === model);
      const instruction = `You are an image editor. I will give you an image and ONE specific correction to apply. Make ONLY that change. Do not alter the style, colors, composition, subject, background, or any other element. Preserve everything exactly as it is except for the one correction. Correction: ${promptText}`;
      let newUrl;

      if (m?.provider === 'openai') {
        const maskBlob = maskCanvasRef.current ? await buildMaskBlob(maskCanvasRef.current) : null;
        newUrl = await generateMockupWithOpenAI(instruction, imageUrl, getOpenAIKey(), m.nativeModel, m.quality, maskBlob);
      } else if (m?.apiType === 'generateContent') {
        // Gemini image models: inlineData works perfectly
        newUrl = await generateMockupWithGemini(instruction, imageUrl, getGeminiKey(), m.nativeModel, m.apiType);
      } else {
        // Imagen: no image input support — fall back to Gemini generateContent if key available
        const geminiKey = getGeminiKey();
        const geminiModel = ETSY_MODELS.find(x => x.apiType === 'generateContent');
        if (geminiKey && geminiModel) {
          newUrl = await generateMockupWithGemini(instruction, imageUrl, geminiKey, geminiModel.nativeModel, geminiModel.apiType);
        } else {
          throw new Error('Imagen models do not support image editing. Set a Gemini key to enable editing with Imagen.');
        }
      }

      setImageUrl(newUrl);
      setShowEditModal(false);
      setEditPrompt('');
      clearMask();

      // Save edited version as a new history entry
      const entryId = Date.now().toString();
      const date = new Date().toISOString().split('T')[0];
      const entry = { ...(keyword || {}), ...(pack || {}), date, entryId, status: 'approved', editNote: promptText };
      save(entry);
      saveImage(entryId, newUrl).catch(() => {});
      refreshConceptHistory();
      pushHistory({ id: entryId, url: newUrl, prompt: `[edit] ${promptText}`, model, timestamp: new Date().toISOString() });

      setStatus('Image updated — regenerating mockups…');
      await new Promise(r => setTimeout(r, 2000));
      await buildMockups(newUrl, entryId);
      setStatus('Done!');
    } catch (err) {
      setStatus(`Edit error: ${err.message}`);
      setShowEditModal(false);
    } finally {
      setEditRunning(false);
    }
  }

  async function generateMockupForEtsy(prompt, artworkUrl) {
    const m = ETSY_MODELS.find(x => x.id === model);
    // Prefer Gemini for mockups — it accepts inlineData and faithfully preserves the artwork.
    // Fall back to OpenAI edits only if no Gemini key is set.
    const geminiKey = getGeminiKey();
    if (geminiKey) {
      const geminiModel = ETSY_MODELS.find(x => x.provider === 'gemini' && x.apiType === 'generateContent');
      if (geminiModel) {
        return generateMockupWithGemini(prompt, artworkUrl, geminiKey, geminiModel.nativeModel, geminiModel.apiType);
      }
    }
    if (m?.provider === 'gemini') {
      return generateMockupWithGemini(prompt, artworkUrl, getGeminiKey(), m.nativeModel, m.apiType);
    }
    return generateMockupWithOpenAI(prompt, artworkUrl, getOpenAIKey(), m.nativeModel, m.quality);
  }

  async function saveToDrive() {
    if (!imageUrl) return;
    setDriveSaving(true);
    setDriveStatus('');
    try {
      // Must pick folder first — browser requires user gesture at this point
      const root = await pickFolder();
      const date = new Date().toISOString().split('T')[0];
      const folderName = keyword ? `${date} — ${keyword.subject} — ${keyword.theme}` : `${date} — TinyDream Print`;
      const sizedFiles = await resizeForPrint(imageUrl, msg => setDriveStatus(msg));
      await savePrintToFolder(root, folderName, sizedFiles, msg => setDriveStatus(msg));
      setDriveStatus('All files saved!');
    } catch (err) {
      if (err.name === 'AbortError') { setDriveStatus(''); return; }
      setDriveStatus(`Error: ${err.message}`);
    } finally {
      setDriveSaving(false);
    }
  }

  function restoreEntry(e) {
    setKeyword({ keyword: e.keyword, subject: e.subject, theme: e.theme, style: e.style, rationale: e.rationale });
    setPack({ title: e.title, tags: e.tags, description: e.description, imagePrompt: e.imagePrompt });
    setShowPack(true);
    setImageUrl('');
    setMockups([]);
    setStatus(`Restored: "${e.keyword || e.editNote || 'entry'}" — ${e.date}`);
    if (e.entryId) {
      loadImage(e.entryId).then(img => { if (img) setImageUrl(img); }).catch(() => {});
      loadMockups(e.entryId).then(m => { if (m.length) setMockups(m); }).catch(() => {});
    }
  }

  const filteredModels = ETSY_MODELS.filter(m =>
    m.name.toLowerCase().includes(modelSearch.toLowerCase()) ||
    m.id.toLowerCase().includes(modelSearch.toLowerCase())
  );


  return (
    <div className="w-full h-full flex flex-col items-center bg-[#050505] p-4 md:p-6 overflow-y-auto">

      {/* Hero */}
      <div className="flex flex-col items-center mb-10">
        <div className="mb-8 w-24 h-24 bg-teal-900/40 rounded-3xl flex items-center justify-center border border-white/5">
          <div className="w-16 h-16 bg-cyan-400/10 rounded-2xl flex items-center justify-center border border-cyan-400/20">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-cyan-400">
              <path d="M6 2L3 6v15a2 2 0 002 2h14a2 2 0 002-2V6l-3-4H6z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 01-8 0"/>
            </svg>
          </div>
        </div>
        <h1 className="text-4xl md:text-6xl font-black text-white tracking-widest uppercase mb-4 text-center">Etsy Pipeline</h1>
        <p className="text-white/40 text-sm">AI-powered nursery art — keyword research → listing copy → image</p>
      </div>

      {/* Control bar */}
      <div className="w-full max-w-4xl relative z-40">
        <div className="w-full bg-[#111]/90 backdrop-blur-xl border border-white/10 rounded-[2rem] p-4 md:p-5 flex flex-col gap-4">

          {/* Category + seed */}
          <div className="flex flex-col gap-3 px-2">
            <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Category</div>
            <div className="flex gap-2 flex-wrap">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all border ${
                    category === cat
                      ? 'bg-cyan-400 text-black border-cyan-400'
                      : 'bg-white/5 text-white/60 border-white/5 hover:bg-white/10'
                  }`}
                >{cat}</button>
              ))}
            </div>
            <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-1">Or describe an idea (optional)</div>
            <input
              type="text"
              value={seed}
              onChange={e => setSeed(e.target.value)}
              placeholder="e.g. something with foxes, autumn theme..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-cyan-400/50 transition-colors"
            />
          </div>

          {/* Analyze existing image */}
          <div className="flex flex-col gap-2 px-2 pt-3 border-t border-white/5">
            <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Or analyze an existing Etsy image</div>
            <div className="flex gap-2">
              <input
                type="url"
                value={imageLink}
                onChange={e => setImageLink(e.target.value)}
                placeholder="https://i.etsystatic.com/..."
                className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-cyan-400/50 transition-colors"
              />
              <button
                onClick={runAnalyzeLink}
                disabled={running || !imageLink.trim()}
                className="bg-white/10 hover:bg-white/20 border border-white/10 text-white px-5 py-2.5 rounded-2xl text-xs font-black transition-all disabled:opacity-40 whitespace-nowrap"
              >
                {running && imageLink.trim() ? '◌ Analyzing...' : 'Analyze →'}
              </button>
            </div>
          </div>

          {/* Model + run */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 px-2 pt-3 border-t border-white/5">
            <div className="flex items-center gap-2 flex-wrap relative">
              {/* Model picker */}
              <button
                ref={modelBtnRef}
                onClick={() => setModelOpen(o => !o)}
                className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5 text-xs font-bold text-white"
              >
                <div className="w-5 h-5 bg-cyan-400 rounded-md flex items-center justify-center">
                  <span className="text-[10px] font-black text-black">G</span>
                </div>
                {modelName}
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" className="opacity-30"><path d="M6 9l6 6 6-6"/></svg>
              </button>

              {/* Model dropdown */}
              {modelOpen && (
                <div className="absolute top-full left-0 mt-2 z-50 bg-[#111] border border-white/10 rounded-2xl p-3 w-72 shadow-2xl flex flex-col gap-2">
                  <input
                    autoFocus
                    type="text"
                    value={modelSearch}
                    onChange={e => setModelSearch(e.target.value)}
                    placeholder="Search models..."
                    className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-cyan-400/50"
                    onClick={e => e.stopPropagation()}
                  />
                  <div className="flex flex-col gap-1 max-h-60 overflow-y-auto">
                    {filteredModels.map(m => (
                      <div
                        key={m.id}
                        onClick={() => { setModel(m.id); setModelOpen(false); setModelSearch(''); }}
                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all hover:bg-white/5 ${model === m.id ? 'bg-white/5' : ''}`}
                      >
                        <div className="w-8 h-8 bg-cyan-400/10 text-cyan-400 rounded-lg flex items-center justify-center font-black text-sm uppercase">{m.name[0]}</div>
                        <span className="text-xs font-bold text-white">{m.name}</span>
                        {model === m.id && <svg className="ml-auto" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Status chips */}
              <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-2xl border border-white/5">
                <span className="text-xs text-white/40">Total:</span>
                <span className="text-xs font-bold text-cyan-400">{getAll().length}</span>
              </div>
              <button onClick={() => setShowClaudePanel(p => !p)} className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 text-xs font-bold text-white/60 hover:text-white transition-all">
                🔑 Claude
              </button>
              {currentProvider === 'gemini'
                ? <button onClick={() => setShowGeminiPanel(p => !p)} className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 text-xs font-bold text-white/60 hover:text-white transition-all">🔑 Gemini</button>
                : <button onClick={() => setShowOpenAIPanel(p => !p)} className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 text-xs font-bold text-white/60 hover:text-white transition-all">🔑 OpenAI</button>
              }
            </div>

            <button
              onClick={runKeyword}
              disabled={running || !!imageLink.trim()}
              className="bg-cyan-400 text-black px-8 py-3 rounded-[1.5rem] font-black text-sm hover:shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-60 disabled:scale-100 w-full sm:w-auto"
            >
              {running && !keyword ? '◌ Researching...' : 'Generate Keyword ✨'}
            </button>
          </div>

          {/* Status */}
          <div className="px-2 pt-3 border-t border-white/5">
            <p className="text-sm text-white/50">{status}</p>
          </div>
        </div>
      </div>

      {/* Claude key panel */}
      {showClaudePanel && (
        <div className="w-full max-w-4xl mt-4">
          <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-2xl p-5 flex flex-col gap-3">
            <span className="text-yellow-400 text-sm font-bold">⚠ Claude API key required</span>
            <p className="text-white/50 text-xs">The AI keyword and copy generation uses Claude (Anthropic). Add your API key to continue.</p>
            <div className="flex gap-2">
              <input
                type="password"
                value={claudeInput}
                onChange={e => setClaudeInput(e.target.value)}
                placeholder="sk-ant-..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-cyan-400/50"
              />
              <button
                onClick={() => { if (claudeInput) { setClaudeKey(claudeInput); setShowClaudePanel(false); setStatus('Claude key saved. Click "Generate Keyword" to start.'); } }}
                className="bg-cyan-400 text-black px-4 py-2 rounded-xl text-xs font-black hover:scale-105 transition-all"
              >Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Gemini key panel */}
      {showGeminiPanel && (
        <div className="w-full max-w-4xl mt-4">
          <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-2xl p-5 flex flex-col gap-3">
            <span className="text-yellow-400 text-sm font-bold">Gemini API key required</span>
            <p className="text-white/50 text-xs">Get your key at <span className="text-cyan-400">aistudio.google.com/apikey</span></p>
            <div className="flex gap-2">
              <input type="password" value={geminiInput} onChange={e => setGeminiInput(e.target.value)} placeholder="AIza..." className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-cyan-400/50"/>
              <button onClick={() => { if (geminiInput) { saveGeminiKey(geminiInput); setShowGeminiPanel(false); setGeminiInput(''); setStatus('Gemini key saved.'); } }} className="bg-cyan-400 text-black px-4 py-2 rounded-xl text-xs font-black hover:scale-105 transition-all">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* OpenAI key panel */}
      {showOpenAIPanel && (
        <div className="w-full max-w-4xl mt-4">
          <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-2xl p-5 flex flex-col gap-3">
            <span className="text-yellow-400 text-sm font-bold">⚠ OpenAI API key required for GPT models</span>
            <p className="text-white/50 text-xs">Get your key at <span className="text-cyan-400">platform.openai.com/api-keys</span></p>
            <div className="flex gap-2">
              <input type="password" value={openaiInput} onChange={e => setOpenaiInput(e.target.value)} placeholder="sk-..." className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-cyan-400/50"/>
              <button onClick={() => { if (openaiInput) { saveOpenAIKey(openaiInput); setShowOpenAIPanel(false); setOpenaiInput(''); setStatus('OpenAI key saved.'); } }} className="bg-cyan-400 text-black px-4 py-2 rounded-xl text-xs font-black hover:scale-105 transition-all">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Keyword review panel */}
      {showKeyword && keyword && (
        <div className="w-full max-w-4xl mt-6">
          <div className="bg-[#111]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"/>
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Step 1 — Keyword Research</span>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-white/30 uppercase tracking-widest">Keyword</span>
                  <span className="text-white font-bold text-lg">{keyword.keyword}</span>
                </div>
                <div className="flex flex-col gap-1 text-right">
                  <span className="text-[10px] text-white/30 uppercase tracking-widest">Style</span>
                  <span className="text-cyan-400 font-bold text-sm">{keyword.style}</span>
                </div>
              </div>
              <div className="flex gap-6">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-white/30 uppercase tracking-widest">Subject</span>
                  <span className="text-white/80 text-sm">{keyword.subject}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-white/30 uppercase tracking-widest">Theme</span>
                  <span className="text-white/80 text-sm">{keyword.theme}</span>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-white/30 uppercase tracking-widest">Rationale</span>
                <span className="text-white/50 text-xs italic">{keyword.rationale}</span>
              </div>
            </div>
            <div className="flex gap-3 pt-2 border-t border-white/5">
              <button
                onClick={runPack}
                disabled={running}
                className="bg-cyan-400 text-black px-6 py-2.5 rounded-2xl text-xs font-black hover:scale-105 transition-all disabled:opacity-60 disabled:scale-100"
              >
                {running && keyword ? '⟳ Generating...' : 'Use This Keyword →'}
              </button>
              <button
                onClick={runKeyword}
                disabled={running}
                className="bg-white/10 hover:bg-white/20 px-6 py-2.5 rounded-2xl text-xs font-bold transition-all border border-white/5 text-white disabled:opacity-60"
              >Try Another</button>
            </div>
          </div>
        </div>
      )}

      {/* Generated image */}
      {imageUrl && (
        <div className="w-full max-w-4xl mt-6">
          <div className="bg-[#111]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex flex-col items-center gap-5">
            <div className="relative w-full flex justify-center">
              <img src={imageUrl} alt="Generated" onClick={() => setLightbox(imageUrl)} className="max-h-[60vh] max-w-full rounded-2xl shadow-2xl border border-white/10 object-contain cursor-zoom-in"/>
              <button
                onClick={() => setShowEditModal(true)}
                title="Edit image"
                className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-xl px-3 py-1.5 text-xs font-bold backdrop-blur-sm border border-white/10 transition-all"
              >✏️ Edit</button>
            </div>
            <p className="text-white/60 text-sm text-center">{keyword ? `${keyword.subject} — ${keyword.theme}` : ''}</p>
            <div className="flex gap-3 flex-wrap justify-center">
              <button
                onClick={() => downloadImage(imageUrl, `etsy-${new Date().toISOString().split('T')[0]}.png`)}
                className="bg-cyan-400 text-black px-6 py-2.5 rounded-2xl text-xs font-black hover:scale-105 transition-all"
              >↓ Download</button>
              <button
                onClick={saveToDrive}
                disabled={driveSaving}
                className="bg-white/10 hover:bg-white/20 text-white px-6 py-2.5 rounded-2xl text-xs font-black hover:scale-105 transition-all disabled:opacity-60 disabled:scale-100 border border-white/10"
              >{driveSaving ? 'Saving…' : '📁 Save All Sizes'}</button>
            </div>
            {driveStatus && <p className="text-white/50 text-xs text-center">{driveStatus}</p>}
          </div>
        </div>
      )}

      {/* Nursery mockups */}
      {mockups.length > 0 && (
        <div className="w-full max-w-4xl mt-6">
          <div className="bg-[#111]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-cyan-400"/>
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Nursery Room Mockups</span>
              </div>
              <button
                onClick={() => mockups.forEach((url, i) => downloadImage(url, `etsy-mockup-${i + 1}.png`))}
                className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border border-cyan-500/20"
              >↓ Download All</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {mockups.map((url, i) => (
                <div key={i} className="flex flex-col gap-2">
                  <img src={url} alt={`Nursery mockup ${i + 1}`} onClick={() => setLightbox(url)} className="w-full rounded-xl border border-white/10 object-cover aspect-square cursor-zoom-in"/>
                  <button
                    onClick={() => downloadImage(url, `etsy-mockup-${i + 1}.png`)}
                    className="bg-white/10 hover:bg-white/20 text-white/70 hover:text-white px-3 py-2 rounded-xl text-xs font-bold transition-all border border-white/10"
                  >↓ Download</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Listing copy panel */}
      {pack && (
        <div className="w-full max-w-4xl mt-6">
          <div className="bg-[#111]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <button onClick={() => setShowPack(o => !o)} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-cyan-400"/>
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Etsy Listing Copy</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={`text-white/30 transition-transform ${showPack ? 'rotate-180' : ''}`}><path d="M6 9l6 6 6-6"/></svg>
              </button>
              {!imageUrl && keyword && (
                <button
                  onClick={runPack}
                  disabled={running}
                  className="bg-cyan-400 text-black px-5 py-2 rounded-2xl text-xs font-black hover:scale-105 transition-all disabled:opacity-60 disabled:scale-100"
                >
                  {running ? '⟳ Generating...' : 'Generate Image →'}
                </button>
              )}
            </div>
            {showPack && [
              { label: 'Title', value: pack.title, mono: false },
              { label: 'Tags (13)', value: pack.tags.join(', '), mono: true },
              { label: 'Description', value: pack.description, mono: false, pre: true },
              { label: 'Image Prompt', value: pack.imagePrompt, mono: true },
            ].map(({ label, value, mono, pre }) => (
              <CopyField key={label} label={label} value={value} mono={mono} pre={pre}/>
            ))}
          </div>
        </div>
      )}

      {/* Concept history */}
      <div className="w-full max-w-4xl mt-6 mb-10">
        <div className="bg-[#111]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex flex-col gap-3">
          <button
            onClick={() => setHistoryOpen(o => !o)}
            className="flex items-center justify-between w-full text-left"
          >
            <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
              Concept History <span className="text-white/20">({conceptHistory.length})</span>
            </h3>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={`text-white/30 transition-transform ${historyOpen ? 'rotate-180' : ''}`}><path d="M6 9l6 6 6-6"/></svg>
          </button>
          {historyOpen && (conceptHistory.length === 0
            ? <p className="text-xs text-white/30 text-center py-2">No concepts generated yet.</p>
            : conceptHistory.map((e, i) => (
              <div
                key={i}
                onClick={() => restoreEntry(e)}
                className="text-xs text-white/50 bg-white/5 hover:bg-white/10 rounded-xl px-4 py-3 border border-white/5 flex items-center justify-between cursor-pointer transition-colors"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-white/80 font-medium">{e.subject || 'Edit'} — {e.theme || ''}</span>
                  {e.editNote && <span className="text-amber-400/70 text-[10px]">✏️ {e.editNote}</span>}
                  {!e.editNote && e.keyword && <span className="text-cyan-400/60 text-[10px]">{e.keyword}</span>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-white/30">{e.date}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-400/20 text-cyan-400">{e.status}</span>
                  {e.entryId && (
                    <button
                      onClick={ev => { ev.stopPropagation(); loadImage(e.entryId).then(img => { if (img) downloadImage(img, e.filename || `etsy-${e.date}.png`); }); }}
                      className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-colors"
                    >↓</button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Click-outside to close model dropdown */}
      {modelOpen && <div className="fixed inset-0 z-30" onClick={() => setModelOpen(false)}/>}

      {/* Edit image modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => !editRunning && setShowEditModal(false)}>
          <div className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-lg flex flex-col gap-4 mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <span className="text-white font-bold text-sm">Edit Image</span>
              <span className="text-white/30 text-xs">{ETSY_MODELS.find(x => x.id === model)?.name}</span>
            </div>
            {/* Mask painter — brush over the area to change */}
            <div className="relative rounded-xl overflow-hidden" style={{ lineHeight: 0 }}>
              <img src={imageUrl} alt="Edit target" className="w-full rounded-xl" />
              <canvas
                ref={maskCanvasRef}
                className="absolute inset-0 w-full h-full rounded-xl cursor-crosshair"
                style={{ opacity: 0.7 }}
                onMouseDown={e => { isPaintingRef.current = true; paintMask(e); }}
                onMouseMove={e => { if (isPaintingRef.current) paintMask(e); }}
                onMouseUp={() => { isPaintingRef.current = false; }}
                onMouseLeave={() => { isPaintingRef.current = false; }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/30 text-xs">Paint over the area you want to change</span>
              <button onClick={clearMask} className="text-white/30 hover:text-white text-xs transition-colors">Clear mask</button>
            </div>
            <textarea
              autoFocus
              value={editPrompt}
              onChange={e => setEditPrompt(e.target.value)}
              placeholder="Describe what to change — e.g. 'make the background light blue' or 'add a small rainbow above the bunny'"
              rows={4}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-cyan-400/50 resize-none"
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) editImage(); }}
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowEditModal(false)} disabled={editRunning} className="px-4 py-2 rounded-xl text-xs font-bold text-white/40 hover:text-white transition-colors">Cancel</button>
              <button
                onClick={editImage}
                disabled={editRunning || !editPrompt.trim()}
                className="bg-cyan-400 text-black px-5 py-2 rounded-xl text-xs font-black hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100"
              >{editRunning ? 'Regenerating…' : 'Apply Correction'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="Enlarged" className="max-h-[90vh] max-w-[90vw] rounded-2xl shadow-2xl object-contain"/>
        </div>
      )}
    </div>
  );
}

function CopyField({ label, value, mono, pre }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  };
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-white/30 uppercase tracking-widest">{label}</span>
        <button onClick={copy} className="text-[10px] text-cyan-400 hover:text-white transition-colors font-bold">
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <p className={`text-white/80 text-sm bg-white/5 rounded-xl px-4 py-3 border border-white/5 ${mono ? 'font-mono' : ''} ${pre ? 'whitespace-pre-wrap' : ''}`}>
        {value}
      </p>
    </div>
  );
}
