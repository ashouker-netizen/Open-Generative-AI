import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

// ── fal.ai endpoint map (from muapi.js) ───────────────────────────────────────

const FAL_ENDPOINTS = {
  // Text-to-image
  'nano-banana': 'fal-ai/nano-banana-2',
  'nano-banana-pro': 'fal-ai/nano-banana-pro',
  'flux-dev': 'fal-ai/flux/dev',
  'flux-schnell': 'fal-ai/flux/schnell',
  'flux-2-dev': 'fal-ai/flux-2/dev',
  'flux-2-pro': 'fal-ai/flux-2/pro',
  'flux-kontext-dev': 'fal-ai/flux/kontext/dev',
  'flux-kontext-pro': 'fal-ai/flux/kontext/pro',
  'flux-kontext-max': 'fal-ai/flux/kontext/max',
  'gpt4o-image': 'openai/gpt-image-2',
  'gpt-image-2': 'openai/gpt-image-2',
  'midjourney-v7': 'fal-ai/midjourney/v7',
  'ideogram-v3': 'fal-ai/ideogram/v3',
  'qwen-image': 'fal-ai/qwen-image',
  'reve-image': 'fal-ai/reve/image',
  'hidream-fast': 'fal-ai/hidream-i1-fast',
  'hidream-full': 'fal-ai/hidream-i1-full',
  'google-imagen4': 'fal-ai/imagen4/preview',
  'google-imagen4-ultra': 'fal-ai/imagen4/preview/ultra',
  'sdxl': 'fal-ai/fast-sdxl',
  'seedream-v3': 'fal-ai/bytedance/seedream/v3',
  'seedream-v4': 'fal-ai/bytedance/seedream/v4',
  'seedream-5': 'fal-ai/seedream/v5',
  'hunyuan-image': 'fal-ai/hunyuan-image-2.1',
  'leonardoai': 'fal-ai/leonardoai/phoenix',
  'kling-image': 'fal-ai/kling-o1/text-to-image',
  // Image-to-image / editing
  'ai-upscaler': 'fal-ai/esrgan',
  'ai-face-swap': 'easel-ai/advanced-face-swap',
  'ai-background-remover': 'fal-ai/birefnet/v2',
  'ai-product-shot': 'fal-ai/image-apps-v2/product-photography',
  'ai-skin-enhancer': 'fal-ai/image-apps-v2/portrait-enhance',
  'ai-colorize': 'fal-ai/ddcolor',
  'ai-ghibli': 'fal-ai/ghiblify',
  'ai-outpaint': 'fal-ai/image-apps-v2/outpaint',
  'ai-object-eraser': 'fal-ai/image-apps-v2/object-removal',
  'flux-kontext-dev-edit': 'fal-ai/flux/kontext/dev',
  'flux-kontext-pro-edit': 'fal-ai/flux/kontext/pro',
  'gpt4o-edit': 'openai/gpt-image-2/edit',
  'qwen-edit': 'fal-ai/qwen-image/edit',
  'midjourney-v7-edit': 'fal-ai/midjourney/v7/edit',
  // Text-to-video
  'seedance-lite-t2v': 'fal-ai/bytedance/seedance/v1/lite/text-to-video',
  'seedance-pro-t2v': 'fal-ai/bytedance/seedance/v1/pro/text-to-video',
  'seedance-v2-t2v': 'bytedance/seedance-2.0/text-to-video',
  'kling-t2v': 'fal-ai/kling-video/v3.0/pro/text-to-video',
  'kling-v2.6-t2v': 'fal-ai/kling-video/v2.6/pro/text-to-video',
  'veo3': 'fal-ai/veo3',
  'veo3-fast': 'fal-ai/veo3/fast',
  'veo3.1': 'fal-ai/veo3.1',
  'veo3.1-fast': 'fal-ai/veo3.1/fast',
  'wan2.5-t2v': 'fal-ai/wan/2.5/text-to-video',
  'wan2.6-t2v': 'fal-ai/wan/2.6/text-to-video',
  'hunyuan-video': 'fal-ai/hunyuan-video',
  'pixverse-v5.5': 'fal-ai/pixverse/v5.5/text-to-video',
  'minimax-hailuo': 'fal-ai/minimax/hailuo-02/pro/text-to-video',
  'sora-2': 'fal-ai/sora-2/text-to-video',
  'ltx-2-pro': 'fal-ai/ltx/2/pro/text-to-video',
  'grok-video': 'xai/grok-imagine-video/text-to-video',
  // Image-to-video (Cinema Studio)
  'kling-i2v': 'fal-ai/kling-video/v3.0/pro',
  'seedance-pro-i2v': 'fal-ai/bytedance/seedance/v1/pro/image-to-video',
  'seedance-v2-i2v': 'bytedance/seedance-2.0/image-to-video',
  'veo3-i2v': 'fal-ai/veo3/image-to-video',
  'veo3.1-i2v': 'fal-ai/veo3.1/image-to-video',
  'wan2.5-i2v': 'fal-ai/wan/2.5/image-to-video',
  'wan2.6-i2v': 'fal-ai/wan/2.6/image-to-video',
  'pixverse-v5.5-i2v': 'fal-ai/pixverse/v5.5/image-to-video',
  'minimax-hailuo-i2v': 'fal-ai/minimax/hailuo-02/pro/image-to-video',
  'sora-2-i2v': 'fal-ai/sora-2/image-to-video',
  'hunyuan-i2v': 'fal-ai/hunyuan-video-image-to-video',
  'ltx-2-pro-i2v': 'fal-ai/ltx/2/pro/image-to-video',
  'midjourney-v7-i2v': 'fal-ai/midjourney/v7/image-to-video',
  'grok-i2v': 'xai/grok-imagine-video/image-to-video',
  // Lip sync (LipSync Studio)
  'sync-lipsync': 'fal-ai/sync/lipsync',
  'latentsync': 'fal-ai/latentsync/video',
  'creatify-lipsync': 'fal-ai/creatify/lipsync',
  'veed-lipsync': 'fal-ai/veed/lipsync',
  'ltx-lipsync': 'fal-ai/ltx/2.3/lipsync',
  'infinitetalk': 'fal-ai/infinitetalk/image-to-video',
  // Video-to-video
  'video-watermark-remover': 'fal-ai/video-watermark-remover',
  'infinitetalk-v2v': 'fal-ai/infinitetalk/video-to-video',
  'wan-effects': 'fal-ai/wan-effects',
};

// ── fal.ai submit + poll ───────────────────────────────────────────────────────

const sleep = ms => new Promise(r => setTimeout(r, ms));

function cleanInput(input) {
  const out = {};
  for (const [k, v] of Object.entries(input)) {
    if (v !== undefined && v !== null && v !== '') out[k] = v;
  }
  return out;
}

function pickOutputUrl(result) {
  return (
    result?.images?.[0]?.url ||
    result?.image?.url ||
    result?.videos?.[0]?.url ||
    result?.audio?.url ||
    result?.output?.url ||
    result?.url ||
    result?.outputs?.[0] ||
    result?.output
  );
}

async function submitAndPoll(endpointId, input, maxAttempts = 180, interval = 2500) {
  const key = process.env.FAL_KEY;
  if (!key) throw new Error('FAL_KEY env var not set');

  const base = 'https://queue.fal.run';
  const headers = { Authorization: `Key ${key}`, 'Content-Type': 'application/json' };

  const submitRes = await fetch(`${base}/${endpointId}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(cleanInput(input)),
  });
  const submitText = await submitRes.text();
  const submitData = submitText ? JSON.parse(submitText) : {};
  if (!submitRes.ok) throw new Error(`fal submit ${submitRes.status}: ${submitText.slice(0, 200)}`);

  const requestId = submitData.request_id || submitData.requestId || submitData.id;
  if (!requestId) {
    const url = pickOutputUrl(submitData);
    return url ? { url, ...submitData } : submitData;
  }

  const reqBase = `${base}/${endpointId}/requests/${requestId}`;
  for (let i = 0; i < maxAttempts; i++) {
    await sleep(interval);
    const statusRes = await fetch(`${reqBase}/status`, { headers: { Authorization: `Key ${key}` } });
    const statusData = await statusRes.json().catch(() => ({}));
    const s = String(statusData?.status || '').toUpperCase();
    if (s === 'COMPLETED' || s === 'SUCCEEDED' || s === 'SUCCESS') {
      const resultRes = await fetch(reqBase, { headers: { Authorization: `Key ${key}` } });
      const result = await resultRes.json();
      const url = pickOutputUrl(result);
      return url ? { url, ...result } : result;
    }
    if (s === 'FAILED' || s === 'ERROR' || s === 'CANCELLED') {
      throw new Error(`Generation failed: ${statusData?.error?.message || statusData?.error || 'unknown'}`);
    }
  }
  throw new Error('Generation timed out');
}

function resolveEndpoint(model) {
  return FAL_ENDPOINTS[model] || model;
}

// ── Claude caller (for Etsy tools) ────────────────────────────────────────────

async function callClaude(systemPrompt, userPrompt) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY env var not set');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-opus-4-8',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });
  if (!res.ok) throw new Error(`Claude API error ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const text = data.content?.[0]?.text || '';
  const cleaned = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  try { return JSON.parse(cleaned); } catch {
    throw new Error(`Claude returned non-JSON: ${text.slice(0, 300)}`);
  }
}

// ── Etsy skill rules ──────────────────────────────────────────────────────────

const ETSY_RULES = `ETSY ALGORITHM: Ranks on CTR and Conversion Rate. Title and tags are the only SEO levers.
KEYWORD: 2–4 word phrase with real buyer intent. Apply "Resounding Yes" rule.
TITLE STACKING: Multiple highly-searched two-word phrases sharing a root noun, comma-separated.
TAGS: Fill ALL 13 slots. Every tag = exactly TWO words (Adjective + Noun).
DESCRIPTION: Feel-good opening → 5 bullet points → call to action. Do not paste title verbatim.
TINYDREAM IMAGE: Premium watercolor finish. Single clear hero. Bright plain background. Centered. No clipart.`;

// ── MCP Server ────────────────────────────────────────────────────────────────

const server = new McpServer({ name: 'open-generative-ai', version: '1.0.0' });

// ── IMAGE STUDIO: Text-to-image ───────────────────────────────────────────────

server.tool(
  'generate_image',
  'Generate an image from a text prompt (Image Studio)',
  {
    prompt: z.string().describe('Image generation prompt'),
    model: z.string().default('nano-banana').describe(
      'Model ID. Options: nano-banana, nano-banana-pro, flux-dev, flux-schnell, flux-2-pro, flux-kontext-pro, gpt-image-2, gpt4o-image, midjourney-v7, ideogram-v3, qwen-image, reve-image, hidream-fast, hidream-full, google-imagen4, google-imagen4-ultra, sdxl, seedream-v3, seedream-v4, seedream-5, hunyuan-image, leonardoai, kling-image'
    ),
    aspect_ratio: z.string().default('1:1').describe('Aspect ratio: 1:1, 16:9, 9:16, 4:3, 3:4'),
    seed: z.number().optional().describe('Seed for reproducibility'),
  },
  async ({ prompt, model, aspect_ratio, seed }) => {
    const result = await submitAndPoll(resolveEndpoint(model), { prompt, aspect_ratio, seed });
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

// ── IMAGE STUDIO: Image-to-image / editing ────────────────────────────────────

server.tool(
  'edit_image',
  'Edit or transform an image using an image URL and prompt (Image Studio)',
  {
    prompt: z.string().describe('Edit instruction or description'),
    image_url: z.string().describe('URL of the source image'),
    model: z.string().default('flux-kontext-pro-edit').describe(
      'Model ID. Options: flux-kontext-dev-edit, flux-kontext-pro-edit, gpt4o-edit, qwen-edit, midjourney-v7-edit, ai-upscaler, ai-face-swap, ai-background-remover, ai-product-shot, ai-skin-enhancer, ai-colorize, ai-ghibli, ai-outpaint, ai-object-eraser'
    ),
    strength: z.number().min(0).max(1).default(0.6).optional().describe('Edit strength (0-1)'),
    aspect_ratio: z.string().default('1:1').optional(),
  },
  async ({ prompt, image_url, model, strength, aspect_ratio }) => {
    const result = await submitAndPoll(resolveEndpoint(model), { prompt, image_url, strength, aspect_ratio });
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

// ── VIDEO STUDIO: Text-to-video ───────────────────────────────────────────────

server.tool(
  'generate_video',
  'Generate a video from a text prompt (Video Studio)',
  {
    prompt: z.string().describe('Video generation prompt'),
    model: z.string().default('kling-t2v').describe(
      'Model ID. Options: seedance-lite-t2v, seedance-pro-t2v, seedance-v2-t2v, kling-t2v, kling-v2.6-t2v, veo3, veo3-fast, veo3.1, veo3.1-fast, wan2.5-t2v, wan2.6-t2v, hunyuan-video, pixverse-v5.5, minimax-hailuo, sora-2, ltx-2-pro, grok-video'
    ),
    aspect_ratio: z.string().default('16:9').describe('Aspect ratio: 16:9, 9:16, 1:1, 4:3'),
    duration: z.number().default(5).optional().describe('Duration in seconds'),
    resolution: z.string().optional().describe('Resolution: 480p, 720p, 1080p'),
  },
  async ({ prompt, model, aspect_ratio, duration, resolution }) => {
    const result = await submitAndPoll(resolveEndpoint(model), { prompt, aspect_ratio, duration, resolution }, 360, 2500);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

// ── CINEMA STUDIO: Image-to-video ─────────────────────────────────────────────

server.tool(
  'image_to_video',
  'Animate an image into a video (Cinema Studio)',
  {
    image_url: z.string().describe('URL of the source image to animate'),
    prompt: z.string().optional().describe('Optional motion description'),
    model: z.string().default('kling-i2v').describe(
      'Model ID. Options: kling-i2v, seedance-pro-i2v, seedance-v2-i2v, veo3-i2v, veo3.1-i2v, wan2.5-i2v, wan2.6-i2v, pixverse-v5.5-i2v, minimax-hailuo-i2v, sora-2-i2v, hunyuan-i2v, ltx-2-pro-i2v, midjourney-v7-i2v, grok-i2v'
    ),
    aspect_ratio: z.string().default('16:9').optional(),
    duration: z.number().default(5).optional().describe('Duration in seconds'),
  },
  async ({ image_url, prompt, model, aspect_ratio, duration }) => {
    const result = await submitAndPoll(resolveEndpoint(model), { image_url, prompt, aspect_ratio, duration }, 360, 2500);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

// ── LIPSYNC STUDIO ────────────────────────────────────────────────────────────

server.tool(
  'lip_sync',
  'Sync audio to a face image or video (LipSync Studio)',
  {
    audio_url: z.string().describe('URL of the audio file (mp3/wav)'),
    image_url: z.string().optional().describe('URL of the face image (use this OR video_url)'),
    video_url: z.string().optional().describe('URL of the source video (use this OR image_url)'),
    model: z.string().default('sync-lipsync').describe(
      'Model ID. Options: sync-lipsync, latentsync, creatify-lipsync, veed-lipsync, ltx-lipsync, infinitetalk'
    ),
    prompt: z.string().optional().describe('Optional style prompt'),
  },
  async ({ audio_url, image_url, video_url, model, prompt }) => {
    if (!image_url && !video_url) throw new Error('Provide either image_url or video_url');
    const result = await submitAndPoll(resolveEndpoint(model), { audio_url, image_url, video_url, prompt }, 360, 2500);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

// ── VIDEO-TO-VIDEO ────────────────────────────────────────────────────────────

server.tool(
  'video_to_video',
  'Transform or process an existing video',
  {
    video_url: z.string().describe('URL of the source video'),
    model: z.string().default('video-watermark-remover').describe(
      'Model ID. Options: video-watermark-remover, infinitetalk-v2v, wan-effects'
    ),
    prompt: z.string().optional().describe('Style or effect prompt'),
    image_url: z.string().optional().describe('Reference image (for face-swap style models)'),
  },
  async ({ video_url, model, prompt, image_url }) => {
    const result = await submitAndPoll(resolveEndpoint(model), { video_url, prompt, image_url }, 360, 2500);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

// ── ETSY PIPELINE ─────────────────────────────────────────────────────────────

server.tool(
  'generate_etsy_keyword',
  'Research the best Etsy SEO keyword for a nursery digital print (Etsy Pipeline)',
  {
    category: z.enum(['Animals', 'Botanical', 'Educational']),
    seed: z.string().optional().describe('Optional seed idea or subject'),
    recentConcepts: z.array(z.string()).optional().describe('Recent subject/theme combos to avoid'),
  },
  async ({ category, seed, recentConcepts = [] }) => {
    const history = recentConcepts.length
      ? `\nAvoid: ${recentConcepts.map(c => `- ${c}`).join('\n')}`
      : '';
    const system = `You are an Etsy SEO researcher for nursery digital prints.\n${ETSY_RULES}\nStyle options: watercolor, soft pastel, gouache painting, colored pencil, flat illustration\nRespond ONLY with valid JSON: {"keyword":"","subject":"","theme":"","style":"","rationale":""}`;
    const result = await callClaude(system, `Category: ${category}${seed ? `\nSeed: ${seed}` : ''}${history}`);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  'generate_etsy_pack',
  'Generate Etsy listing title, 13 tags, description, and image prompt (Etsy Pipeline)',
  {
    keyword: z.string(),
    subject: z.string(),
    theme: z.string(),
    style: z.string(),
  },
  async ({ keyword, subject, theme, style }) => {
    const system = `You are an Etsy listing copywriter for TinyDream nursery prints.\n${ETSY_RULES}\nImage prompt format: "{style} {subject} {theme}, nursery wall art, soft colors, white background, single centered subject, 8x10"\nRespond ONLY with valid JSON: {"title":"","tags":["13 two-word tags"],"description":"","imagePrompt":""}`;
    const result = await callClaude(system, `Keyword: "${keyword}"\nSubject: ${subject}\nTheme: ${theme}\nStyle: ${style}`);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  'run_etsy_pipeline',
  'Full Etsy pipeline: keyword research → listing pack → generate image (Etsy Pipeline)',
  {
    category: z.enum(['Animals', 'Botanical', 'Educational']),
    seed: z.string().optional(),
    image_model: z.string().default('nano-banana').describe('fal.ai image model ID'),
  },
  async ({ category, seed, image_model }) => {
    const kwSystem = `Etsy SEO researcher for nursery prints.\n${ETSY_RULES}\nStyle options: watercolor, soft pastel, gouache painting, colored pencil, flat illustration\nRespond ONLY with JSON: {"keyword":"","subject":"","theme":"","style":"","rationale":""}`;
    const kw = await callClaude(kwSystem, `Category: ${category}${seed ? `\nSeed: ${seed}` : ''}`);

    const packSystem = `Etsy listing copywriter for TinyDream.\n${ETSY_RULES}\nImage prompt: "{style} {subject} {theme}, nursery wall art, soft colors, white background, 8x10"\nRespond ONLY with JSON: {"title":"","tags":[],"description":"","imagePrompt":""}`;
    const pack = await callClaude(packSystem, `Keyword: "${kw.keyword}"\nSubject: ${kw.subject}\nTheme: ${kw.theme}\nStyle: ${kw.style}`);

    const image = await submitAndPoll(resolveEndpoint(image_model), { prompt: pack.imagePrompt, aspect_ratio: '3:4' });
    return { content: [{ type: 'text', text: JSON.stringify({ keyword: kw, pack, image }, null, 2) }] };
  }
);

// ── LIST AVAILABLE MODELS ─────────────────────────────────────────────────────

server.tool(
  'list_models',
  'List all available model IDs grouped by capability',
  {},
  async () => {
    const models = {
      text_to_image: ['nano-banana', 'nano-banana-pro', 'flux-dev', 'flux-schnell', 'flux-2-pro', 'flux-kontext-pro', 'flux-kontext-max', 'gpt-image-2', 'gpt4o-image', 'midjourney-v7', 'ideogram-v3', 'qwen-image', 'reve-image', 'hidream-fast', 'hidream-full', 'google-imagen4', 'google-imagen4-ultra', 'sdxl', 'seedream-v3', 'seedream-v4', 'seedream-5', 'hunyuan-image', 'leonardoai', 'kling-image'],
      image_editing: ['flux-kontext-dev-edit', 'flux-kontext-pro-edit', 'gpt4o-edit', 'qwen-edit', 'midjourney-v7-edit', 'ai-upscaler', 'ai-face-swap', 'ai-background-remover', 'ai-product-shot', 'ai-skin-enhancer', 'ai-colorize', 'ai-ghibli', 'ai-outpaint', 'ai-object-eraser'],
      text_to_video: ['seedance-lite-t2v', 'seedance-pro-t2v', 'seedance-v2-t2v', 'kling-t2v', 'kling-v2.6-t2v', 'veo3', 'veo3-fast', 'veo3.1', 'veo3.1-fast', 'wan2.5-t2v', 'wan2.6-t2v', 'hunyuan-video', 'pixverse-v5.5', 'minimax-hailuo', 'sora-2', 'ltx-2-pro', 'grok-video'],
      image_to_video: ['kling-i2v', 'seedance-pro-i2v', 'seedance-v2-i2v', 'veo3-i2v', 'veo3.1-i2v', 'wan2.5-i2v', 'wan2.6-i2v', 'pixverse-v5.5-i2v', 'minimax-hailuo-i2v', 'sora-2-i2v', 'hunyuan-i2v', 'ltx-2-pro-i2v', 'midjourney-v7-i2v', 'grok-i2v'],
      lip_sync: ['sync-lipsync', 'latentsync', 'creatify-lipsync', 'veed-lipsync', 'ltx-lipsync', 'infinitetalk'],
      video_to_video: ['video-watermark-remover', 'infinitetalk-v2v', 'wan-effects'],
    };
    return { content: [{ type: 'text', text: JSON.stringify(models, null, 2) }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
