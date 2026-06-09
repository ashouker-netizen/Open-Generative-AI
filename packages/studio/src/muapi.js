import { getModelById, getVideoModelById, getI2IModelById, getI2VModelById, getV2VModelById, getLipSyncModelById } from './models.js';

const isHttpApp = () => typeof window !== 'undefined' && window.location?.protocol?.startsWith('http');

const queueBase = () => (isHttpApp() ? '/api/fal/queue' : 'https://queue.fal.run');
const filesBase = () => (isHttpApp() ? '/api/fal/files' : 'https://api.fal.ai/v1/serverless/files');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const encodeTargetPath = (value) => String(value || '')
    .replace(/^\/+/, '')
    .split('/')
    .filter(Boolean)
    .map(encodeURIComponent)
    .join('/');

const FALLBACK_FAL_ENDPOINTS = {
    'nano-banana': 'fal-ai/nano-banana-2',
    'nano-banana-pro': 'fal-ai/nano-banana-pro',
    'nano-banana-2': 'fal-ai/nano-banana-2',
    'nano-banana-2-edit': 'fal-ai/nano-banana-2/edit',
    'nano-banana-edit': 'fal-ai/nano-banana-2/edit',
    'nano-banana-pro-edit': 'fal-ai/nano-banana-pro/edit',
    'flux-dev': 'fal-ai/flux/dev',
    'flux-dev-image': 'fal-ai/flux/dev',
    'flux-schnell': 'fal-ai/flux/schnell',
    'flux-schnell-image': 'fal-ai/flux/schnell',
    'flux-2-dev': 'fal-ai/flux-2/dev',
    'flux-2-flex': 'fal-ai/flux-2/flex',
    'flux-2-pro': 'fal-ai/flux-2/pro',
    'flux-redux': 'fal-ai/flux/redux',
    'flux-pulid': 'fal-ai/flux/pulid',
    'flux-kontext-dev-t2i': 'fal-ai/flux/kontext/dev',
    'flux-kontext-pro-t2i': 'fal-ai/flux/kontext/pro',
    'flux-kontext-max-t2i': 'fal-ai/flux/kontext/max',
    'flux-kontext-dev-i2i': 'fal-ai/flux/kontext/dev',
    'flux-kontext-pro-i2i': 'fal-ai/flux/kontext/pro',
    'flux-kontext-max-i2i': 'fal-ai/flux/kontext/max',
    'flux-kontext-effects': 'fal-ai/flux/kontext/effects',
    'gpt-image-1.5': 'fal-ai/gpt-image-1.5',
    'gpt-image-1.5-edit': 'fal-ai/gpt-image-1.5/edit',
    'gpt-image-2': 'openai/gpt-image-2',
    'gpt-image-2-text-to-image': 'openai/gpt-image-2',
    'gpt-image-2-image-to-image': 'openai/gpt-image-2/edit',
    'gpt4o-text-to-image': 'openai/gpt-image-2',
    'gpt4o-image-to-image': 'openai/gpt-image-2/edit',
    'gpt4o-edit': 'openai/gpt-image-2/edit',
    'midjourney-v7-text-to-image': 'fal-ai/midjourney/v7',
    'midjourney-v7-image-to-image': 'fal-ai/midjourney/v7/edit',
    'midjourney-v7-style-reference': 'fal-ai/midjourney/v7/reference',
    'midjourney-v7-omni-reference': 'fal-ai/midjourney/v7/reference',
    'ideogram-v3-t2i': 'fal-ai/ideogram/v3',
    'ideogram-v3-reframe': 'fal-ai/ideogram/v3/reframe',
    'ideogram-character': 'fal-ai/ideogram/character',
    'qwen-image': 'fal-ai/qwen-image',
    'qwen-image-edit': 'fal-ai/qwen-image/edit',
    'qwen-image-edit-plus': 'fal-ai/qwen-image/edit',
    'qwen-image-edit-plus-lora': 'fal-ai/qwen-image/edit',
    'qwen-image-edit-2511': 'fal-ai/qwen-image/edit',
    'qwen-text-to-image-2512': 'fal-ai/qwen-image',
    'reve-text-to-image': 'fal-ai/reve/image',
    'reve-image-edit': 'fal-ai/reve/image/edit',
    'leonardoai-phoenix-1.0': 'fal-ai/leonardoai/phoenix',
    'leonardoai-lucid-origin': 'fal-ai/leonardoai/lucid-origin',
    'hunyuan-image-2.1': 'fal-ai/hunyuan-image-2.1',
    'hunyuan-image-3.0': 'fal-ai/hunyuan-image-3.0',
    'bytedance-seedream-v3': 'fal-ai/bytedance/seedream/v3',
    'bytedance-seedream-v4': 'fal-ai/bytedance/seedream/v4',
    'bytedance-seedream-v4.5': 'fal-ai/bytedance/seedream/v4.5',
    'bytedance-seedream-v4.5-edit': 'fal-ai/bytedance/seedream/v4.5/edit',
    'seedream-5.0': 'fal-ai/seedream/v5',
    'seedream-5.0-edit': 'fal-ai/seedream/v5/edit',
    'seededit': 'fal-ai/seedream/edit',
    'seededit-image': 'fal-ai/seedream/edit',
    'seedvr2-image-upscale': 'fal-ai/seedvr2/upscale',
    'topaz-image-upscale': 'fal-ai/topaz/image-upscale',
    'video-watermark-remover': 'fal-ai/video-watermark-remover',
    'kling-o1-text-to-image': 'fal-ai/kling-o1/text-to-image',
    'kling-o1-edit-image': 'fal-ai/kling-o1/edit-image',
    'kling-o1-image-to-video': 'fal-ai/kling-o1/image-to-video',
    'kling-o1-reference-to-video': 'fal-ai/kling-o1/reference-to-video',
    'kling-o1-standard-image-to-video': 'fal-ai/kling-o1/standard/image-to-video',
    'kling-o1-standard-reference-to-video': 'fal-ai/kling-o1/standard/reference-to-video',
    'kling-v2.1-master-i2v': 'fal-ai/kling-video/v2.1/master',
    'kling-v2.1-standard-i2v': 'fal-ai/kling-video/v2.1/standard',
    'kling-v2.1-pro-i2v': 'fal-ai/kling-video/v2.1/pro',
    'kling-v2.5-turbo-pro-i2v': 'fal-ai/kling-video/v2.5/turbo/pro',
    'kling-v2.5-turbo-std-i2v': 'fal-ai/kling-video/v2.5/turbo/standard',
    'kling-v3.0-pro-image-to-video': 'fal-ai/kling-video/v3.0/pro',
    'kling-v3.0-standard-image-to-video': 'fal-ai/kling-video/v3.0/standard',
    'kling-v3.0-std-motion-control': 'fal-ai/kling-video/v3.0/motion-control',
    'kling-v3.0-pro-motion-control': 'fal-ai/kling-video/v3.0/pro/motion-control',
    'kling-v2.6-std-motion-control': 'fal-ai/kling-video/v2.6/motion-control',
    'wan2.1-text-to-image': 'fal-ai/wan/2.1/text-to-image',
    'wan2.2-text-to-image': 'fal-ai/wan/2.2/text-to-image',
    'wan2.5-text-to-image': 'fal-ai/wan/2.5/text-to-image',
    'wan2.6-text-to-image': 'fal-ai/wan/2.6/text-to-image',
    'wan2.1-image-to-video': 'fal-ai/wan/2.1/image-to-video',
    'wan2.1-reference-video': 'fal-ai/wan/2.1/reference-video',
    'wan2.2-image-to-video': 'fal-ai/wan/2.2/image-to-video',
    'wan2.2-spicy-image-to-video': 'fal-ai/wan/2.2/spicy-image-to-video',
    'wan2.5-image-to-video': 'fal-ai/wan/2.5/image-to-video',
    'wan2.5-image-to-video-fast': 'fal-ai/wan/2.5/image-to-video-fast',
    'wan2.6-image-to-video': 'fal-ai/wan/2.6/image-to-video',
    'wan2.6-text-to-video': 'fal-ai/wan/2.6/text-to-video',
    'wan2.2-speech-to-video': 'fal-ai/wan/2.2/speech-to-video',
    'latentsync-video': 'fal-ai/latentsync/video',
    'sync-lipsync': 'fal-ai/sync/lipsync',
    'creatify-lipsync': 'fal-ai/creatify/lipsync',
    'veed-lipsync': 'fal-ai/veed/lipsync',
    'infinitetalk-image-to-video': 'fal-ai/infinitetalk/image-to-video',
    'infinitetalk-video-to-video': 'fal-ai/infinitetalk/video-to-video',
    'ltx-2.3-lipsync': 'fal-ai/ltx/2.3/lipsync',
    'ltx-2-19b-lipsync': 'fal-ai/ltx/2-19b/lipsync',
    'ltx-2-pro-image-to-video': 'fal-ai/ltx/2/pro/image-to-video',
    'ltx-2-fast-image-to-video': 'fal-ai/ltx/2/fast/image-to-video',
    'ltx-2-19b-image-to-video': 'fal-ai/ltx/2-19b/image-to-video',

    // ── Text-to-image ────────────────────────────────────────────────────────
    'flux-dev-lora': 'fal-ai/flux-lora',
    'hidream-i1-fast': 'fal-ai/hidream-i1-fast',
    'hidream-i1-dev': 'fal-ai/hidream-i1-dev',
    'hidream-i1-full': 'fal-ai/hidream-i1-full',
    'google-imagen4': 'fal-ai/imagen4/preview',
    'google-imagen4-fast': 'fal-ai/imagen4/preview/fast',
    'google-imagen4-ultra': 'fal-ai/imagen4/preview/ultra',
    'sdxl-image': 'fal-ai/fast-sdxl',
    'flux-krea-dev': 'fal-ai/flux/krea',
    'grok-imagine-text-to-image': 'xai/grok-imagine-image',
    'z-image-turbo': 'fal-ai/z-image/turbo',
    'z-image-base': 'fal-ai/z-image',
    'vidu-q2-text-to-image': 'fal-ai/vidu/q2/text-to-image',
    'flux-2-klein-4b': 'fal-ai/flux-2/klein/4b',
    'flux-2-klein-9b': 'fal-ai/flux-2/klein/9b',
    'minimax-image-01': 'fal-ai/minimax/image-01',

    // ── Image-to-image / editing ─────────────────────────────────────────────
    'ai-image-upscale': 'fal-ai/esrgan',
    'ai-image-face-swap': 'easel-ai/advanced-face-swap',
    'ai-background-remover': 'fal-ai/birefnet/v2',
    'ai-product-shot': 'fal-ai/image-apps-v2/product-photography',
    'ai-product-photography': 'fal-ai/image-apps-v2/product-photography',
    'ai-skin-enhancer': 'fal-ai/image-apps-v2/portrait-enhance',
    'ai-color-photo': 'fal-ai/ddcolor',
    'ai-ghibli-style': 'fal-ai/ghiblify',
    'ai-image-extension': 'fal-ai/image-apps-v2/outpaint',
    'ai-object-eraser': 'fal-ai/image-apps-v2/object-removal',
    'bytedance-seededit-image': 'fal-ai/bytedance/seededit/v3/edit-image',
    'minimax-01-subject-reference': 'fal-ai/minimax/image-01/subject-reference',
    'bytedance-seedream-edit-v4': 'fal-ai/bytedance/seedream/v4/edit',
    'wan2.5-image-edit': 'fal-ai/wan/2.5/image-to-image',
    'wan2.6-image-edit': 'fal-ai/wan/2.6/image-to-image',
    'flux-2-dev-edit': 'fal-ai/flux-2/dev/edit',
    'flux-2-flex-edit': 'fal-ai/flux-2/flex/edit',
    'flux-2-pro-edit': 'fal-ai/flux-2/pro/edit',
    'flux-2-klein-4b-edit': 'fal-ai/flux-2/klein/4b/edit',
    'flux-2-klein-9b-edit': 'fal-ai/flux-2/klein/9b/edit',
    'vidu-q2-reference-to-image': 'fal-ai/vidu/q2/reference-to-image',
    'grok-imagine-image-to-image': 'xai/grok-imagine-image',

    // ── Text-to-video ────────────────────────────────────────────────────────
    'seedance-lite-t2v': 'fal-ai/bytedance/seedance/v1/lite/text-to-video',
    'seedance-pro-t2v': 'fal-ai/bytedance/seedance/v1/pro/text-to-video',
    'seedance-pro-t2v-fast': 'fal-ai/bytedance/seedance/v1/pro/fast/text-to-video',
    'seedance-v1.5-pro-t2v': 'fal-ai/bytedance/seedance/v1.5/pro/text-to-video',
    'seedance-v1.5-pro-t2v-fast': 'fal-ai/bytedance/seedance/v1.5/pro/fast/text-to-video',
    'seedance-v2.0-t2v': 'bytedance/seedance-2.0/text-to-video',
    'kling-v2.1-master-t2v': 'fal-ai/kling-video/v2.1/master/text-to-video',
    'kling-v2.5-turbo-pro-t2v': 'fal-ai/kling-video/v2.5/turbo/pro/text-to-video',
    'kling-v2.6-pro-t2v': 'fal-ai/kling-video/v2.6/pro/text-to-video',
    'kling-o1-text-to-video': 'fal-ai/kling-o1/text-to-video',
    'kling-v3.0-pro-text-to-video': 'fal-ai/kling-video/v3.0/pro/text-to-video',
    'kling-v3.0-standard-text-to-video': 'fal-ai/kling-video/v3.0/standard/text-to-video',
    'veo3-text-to-video': 'fal-ai/veo3',
    'veo3-fast-text-to-video': 'fal-ai/veo3/fast',
    'veo3.1-text-to-video': 'fal-ai/veo3.1',
    'veo3.1-fast-text-to-video': 'fal-ai/veo3.1/fast',
    'veo3.1-lite-text-to-video': 'fal-ai/veo3.1/lite',
    'wan2.1-text-to-video': 'fal-ai/wan/2.1/text-to-video',
    'wan2.2-text-to-video': 'fal-ai/wan/2.2/text-to-video',
    'wan2.5-text-to-video': 'fal-ai/wan/2.5/text-to-video',
    'wan2.5-text-to-video-fast': 'fal-ai/wan/2.5/text-to-video-fast',
    'hunyuan-text-to-video': 'fal-ai/hunyuan-video',
    'hunyuan-fast-text-to-video': 'fal-ai/hunyuan-video-v1.5/text-to-video',
    'pixverse-v4.5-t2v': 'fal-ai/pixverse/v4.5/text-to-video',
    'pixverse-v5-t2v': 'fal-ai/pixverse/v5/text-to-video',
    'pixverse-v5.5-t2v': 'fal-ai/pixverse/v5.5/text-to-video',
    'minimax-hailuo-02-standard-t2v': 'fal-ai/minimax/hailuo-02/standard/text-to-video',
    'minimax-hailuo-02-pro-t2v': 'fal-ai/minimax/hailuo-02/pro/text-to-video',
    'minimax-hailuo-2.3-pro-t2v': 'fal-ai/minimax/hailuo-2.3/pro/text-to-video',
    'minimax-hailuo-2.3-standard-t2v': 'fal-ai/minimax/hailuo-2.3/standard/text-to-video',
    'openai-sora-2-text-to-video': 'fal-ai/sora-2/text-to-video',
    'openai-sora-2-pro-text-to-video': 'fal-ai/sora-2/text-to-video/pro',
    'vidu-v2.0-t2v': 'fal-ai/vidu/q2/text-to-video',
    'grok-imagine-text-to-video': 'xai/grok-imagine-video/text-to-video',
    'ltx-2-pro-text-to-video': 'fal-ai/ltx/2/pro/text-to-video',
    'ltx-2-fast-text-to-video': 'fal-ai/ltx/2/fast/text-to-video',
    'ltx-2-19b-text-to-video': 'fal-ai/ltx/2-19b/text-to-video',

    // ── Image-to-video ───────────────────────────────────────────────────────
    'veo3-image-to-video': 'fal-ai/veo3/image-to-video',
    'veo3-fast-image-to-video': 'fal-ai/veo3/fast/image-to-video',
    'veo3.1-image-to-video': 'fal-ai/veo3.1/image-to-video',
    'veo3.1-fast-image-to-video': 'fal-ai/veo3.1/fast/image-to-video',
    'veo3.1-lite-image-to-video': 'fal-ai/veo3.1/lite/image-to-video',
    'veo3.1-reference-to-video': 'fal-ai/veo3.1/reference-to-video',
    'hunyuan-image-to-video': 'fal-ai/hunyuan-video-image-to-video',
    'pixverse-v4.5-i2v': 'fal-ai/pixverse/v4.5/image-to-video',
    'pixverse-v5-i2v': 'fal-ai/pixverse/v5/image-to-video',
    'pixverse-v5.5-i2v': 'fal-ai/pixverse/v5.5/image-to-video',
    'vidu-v2.0-i2v': 'fal-ai/vidu/q2/image-to-video/pro',
    'vidu-q1-reference': 'fal-ai/vidu/q1/reference-to-video',
    'vidu-q2-reference': 'fal-ai/vidu/q2/reference-to-video/pro',
    'vidu-q2-turbo-start-end-video': 'fal-ai/vidu/q2/image-to-video/turbo',
    'vidu-q2-pro-start-end-video': 'fal-ai/vidu/q2/image-to-video/pro',
    'minimax-hailuo-02-standard-i2v': 'fal-ai/minimax/hailuo-02/standard/image-to-video',
    'minimax-hailuo-02-pro-i2v': 'fal-ai/minimax/hailuo-02/pro/image-to-video',
    'minimax-hailuo-2.3-pro-i2v': 'fal-ai/minimax/hailuo-2.3/pro/image-to-video',
    'minimax-hailuo-2.3-standard-i2v': 'fal-ai/minimax/hailuo-2.3/standard/image-to-video',
    'minimax-hailuo-2.3-fast': 'fal-ai/minimax/hailuo-2.3-fast/pro/image-to-video',
    'seedance-lite-i2v': 'fal-ai/bytedance/seedance/v1/lite/image-to-video',
    'seedance-pro-i2v': 'fal-ai/bytedance/seedance/v1/pro/image-to-video',
    'seedance-pro-i2v-fast': 'fal-ai/bytedance/seedance/v1/pro/fast/image-to-video',
    'seedance-lite-reference-to-video': 'fal-ai/bytedance/seedance/v1/lite/reference-to-video',
    'seedance-v1.5-pro-i2v': 'fal-ai/bytedance/seedance/v1.5/pro/image-to-video',
    'seedance-v1.5-pro-i2v-fast': 'fal-ai/bytedance/seedance/v1.5/pro/fast/image-to-video',
    'seedance-v2.0-i2v': 'bytedance/seedance-2.0/image-to-video',
    'openai-sora-2-image-to-video': 'fal-ai/sora-2/image-to-video',
    'openai-sora-2-pro-image-to-video': 'fal-ai/sora-2/image-to-video/pro',
    'kling-v2.6-pro-i2v': 'fal-ai/kling-video/v2.6/pro',
    'grok-imagine-image-to-video': 'xai/grok-imagine-video/image-to-video',
    'midjourney-v7-image-to-video': 'fal-ai/midjourney/v7/image-to-video',
    'ai-video-effects': 'fal-ai/wan-effects',
    'generate_wan_ai_effects': 'fal-ai/wan-effects',
    'ovi-text-to-video': 'fal-ai/ovi',
    'ovi-image-to-video': 'fal-ai/ovi/image-to-video',
    'wan2.2-5b-fast-t2v': 'fal-ai/wan/2.2-5b/text-to-video',
    'ai-anime-generator': 'fal-ai/anime-diffusion',
    'chroma-image': 'fal-ai/chroma',
    'neta-lumina': 'fal-ai/neta-ai/lumina-v2',
    'perfect-pony-xl': 'fal-ai/pony-v7',
    'seedance-v2.0-extend': 'fal-ai/bytedance/seedance/v2/extend',
};

function getStoredKey() {
    if (typeof window === 'undefined') return '';
    return (
        window.__FAL_KEY__ ||
        localStorage.getItem('fal_key') ||
        ''
    );
}

function getApiKey() {
    const key = getStoredKey().trim();
    if (!key) throw new Error('API key missing. Please set your fal.ai key in Settings.');
    return key;
}

function falHeaders(key, extra = {}) {
    return {
        Authorization: `Key ${key}`,
        ...extra,
    };
}

function cleanInput(input = {}) {
    const next = {};
    for (const [key, value] of Object.entries(input)) {
        if (value === undefined || value === null || value === '') continue;
        next[key] = value;
    }
    return next;
}

const GPT_IMAGE_2_IMAGE_SIZE_BY_ASPECT_RATIO = {
    '1:1': 'square_hd',
    '16:9': 'landscape_16_9',
    '9:16': 'portrait_16_9',
    '4:3': 'landscape_4_3',
    '3:4': 'portrait_4_3',
    auto: 'auto',
};

const GPT_IMAGE_1_5_IMAGE_SIZE_BY_ASPECT_RATIO = {
    '1:1': '1024x1024',
    '2:3': '1024x1536',
    '3:2': '1536x1024',
};

const IDEOGRAM_IMAGE_SIZE_BY_ASPECT_RATIO = {
    '1:1': 'square_hd',
    '16:9': 'landscape_16_9',
    '9:16': 'portrait_16_9',
    '4:3': 'landscape_4_3',
    '3:4': 'portrait_4_3',
};

function isGptImage2Model(modelInfo, modelId) {
    return modelInfo?.family === 'gpt-2' || String(modelId || '').startsWith('gpt-image-2');
}

function isGptImage15Model(modelInfo, modelId) {
    return modelInfo?.family === 'gpt-1.5' || String(modelId || '').startsWith('gpt-image-1.5');
}

function isIdeogramModel(modelInfo, modelId) {
    return modelInfo?.family === 'ideogram' || String(modelId || '').startsWith('ideogram');
}

function isVeo31Model(modelInfo, modelId) {
    return modelInfo?.family === 'veo3.1' || String(modelId || '').startsWith('veo3.1');
}

function usesImageUrlsList(modelInfo, modelId) {
    return isGptImage2Model(modelInfo, modelId) || isGptImage15Model(modelInfo, modelId);
}

function toGptImage2ImageSize(aspectRatio) {
    return GPT_IMAGE_2_IMAGE_SIZE_BY_ASPECT_RATIO[aspectRatio] || aspectRatio || undefined;
}

function toGptImage15ImageSize(aspectRatio) {
    return GPT_IMAGE_1_5_IMAGE_SIZE_BY_ASPECT_RATIO[aspectRatio] || aspectRatio || undefined;
}

function toIdeogramImageSize(aspectRatio) {
    return IDEOGRAM_IMAGE_SIZE_BY_ASPECT_RATIO[aspectRatio] || aspectRatio || undefined;
}

function resolveFalEndpoint(modelRef) {
    if (!modelRef) throw new Error('Model selection is missing.');
    if (typeof modelRef === 'string') return FALLBACK_FAL_ENDPOINTS[modelRef] || modelRef;
    const candidates = [
        modelRef.falEndpoint,
        modelRef.endpoint,
        modelRef.id,
    ].filter(Boolean);
    for (const candidate of candidates) {
        if (FALLBACK_FAL_ENDPOINTS[candidate]) return FALLBACK_FAL_ENDPOINTS[candidate];
    }
    return candidates[0];
}

function buildQueueUrl(endpointId) {
    return `${queueBase()}/${endpointId}`;
}

function buildRequestUrl(endpointId, requestId) {
    return `${queueBase()}/${endpointId}/requests/${requestId}`;
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

async function parseMaybeJson(response) {
    const text = await response.text();
    if (!text) return null;
    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
}

async function submitAndPoll(endpointId, input, key, onRequestId, maxAttempts = 120, interval = 2000) {
    const submitResponse = await fetch(buildQueueUrl(endpointId), {
        method: 'POST',
        headers: falHeaders(key, { 'Content-Type': 'application/json' }),
        body: JSON.stringify(cleanInput(input)),
    });

    const submitData = await parseMaybeJson(submitResponse);
    if (!submitResponse.ok) {
        const detail = typeof submitData === 'string' ? submitData : JSON.stringify(submitData || {});
        throw new Error(`fal request failed: ${submitResponse.status} ${submitResponse.statusText} - ${detail.slice(0, 200)}`);
    }

    const requestId = submitData?.request_id || submitData?.requestId || submitData?.id;
    if (!requestId) {
        return normalizeFalResult(submitData);
    }

    if (onRequestId) onRequestId(requestId);

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        await sleep(interval);
        const statusResponse = await fetch(`${buildRequestUrl(endpointId, requestId)}/status`, {
            method: 'GET',
            headers: falHeaders(key),
        });

        const statusData = await parseMaybeJson(statusResponse);
        if (!statusResponse.ok) {
            const detail = typeof statusData === 'string' ? statusData : JSON.stringify(statusData || {});
            if (statusResponse.status >= 500) continue;
            throw new Error(`fal status failed: ${statusResponse.status} ${statusResponse.statusText} - ${detail.slice(0, 200)}`);
        }

        const status = String(statusData?.status || '').toUpperCase();
        if (status === 'COMPLETED' || status === 'SUCCEEDED' || status === 'SUCCESS') {
            const resultResponse = await fetch(buildRequestUrl(endpointId, requestId), {
                method: 'GET',
                headers: falHeaders(key),
            });
            const resultData = await parseMaybeJson(resultResponse);
            if (!resultResponse.ok) {
                const detail = typeof resultData === 'string' ? resultData : JSON.stringify(resultData || {});
                throw new Error(`fal result failed: ${resultResponse.status} ${resultResponse.statusText} - ${detail.slice(0, 200)}`);
            }
            return normalizeFalResult(resultData);
        }

        if (status === 'FAILED' || status === 'ERROR' || status === 'CANCELLED' || status === 'CANCELED') {
            throw new Error(`Generation failed: ${statusData?.error?.message || statusData?.error || statusData?.message || 'Unknown error'}`);
        }

        if (attempt === maxAttempts) {
            throw new Error('Generation timed out after polling.');
        }
    }

    throw new Error('Generation timed out after polling.');
}

function normalizeFalResult(result) {
    if (!result || typeof result !== 'object') return result;
    const url = pickOutputUrl(result);
    if (!url) return result;
    return { ...result, url };
}

class MuapiClient {
    async generateImage(params) {
        const modelInfo = getModelById(params.model);
        const endpointId = resolveFalEndpoint(modelInfo || params.model);
        const isGptImage2 = isGptImage2Model(modelInfo, params.model);
        const isGptImage15 = isGptImage15Model(modelInfo, params.model);
        const isIdeogram = isIdeogramModel(modelInfo, params.model);
        const needsImageSize = isGptImage2 || isGptImage15 || isIdeogram;
        const imageSize = isGptImage2 ? toGptImage2ImageSize(params.aspect_ratio)
            : isGptImage15 ? toGptImage15ImageSize(params.aspect_ratio)
            : isIdeogram ? toIdeogramImageSize(params.aspect_ratio)
            : undefined;
        const input = {
            prompt: params.prompt,
            aspect_ratio: needsImageSize ? undefined : params.aspect_ratio,
            image_size: imageSize,
            resolution: needsImageSize ? undefined : params.resolution,
            quality: params.quality,
            seed: params.seed && params.seed !== -1 ? params.seed : undefined,
        };
        if (usesImageUrlsList(modelInfo, params.model) && params.images_list?.length) {
            input.image_urls = params.images_list;
        } else if (params.image_url) {
            input.image_url = params.image_url;
            input.strength = params.strength || 0.6;
        } else if (params.images_list) {
            input.images_list = params.images_list;
        }
        if (modelInfo?.inputs?.width && params.width) input.width = params.width;
        if (modelInfo?.inputs?.height && params.height) input.height = params.height;
        if (modelInfo?.inputs?.num_images && params.num_images) input.num_images = params.num_images;
        if (params.style) input.style = params.style;
        if (params.render_speed) input.render_speed = params.render_speed;
        if (params.name) input.name = params.name;
        return submitAndPoll(endpointId, input, getApiKey(), params.onRequestId, 180, 2000);
    }

    async generateVideo(params) {
        const modelInfo = getVideoModelById(params.model);
        const endpointId = resolveFalEndpoint(modelInfo || params.model);
        const isVeo31 = isVeo31Model(modelInfo, params.model);
        const input = {
            prompt: params.prompt,
            aspect_ratio: params.aspect_ratio,
            duration: isVeo31 && typeof params.duration === 'number' ? `${params.duration}s` : params.duration,
            resolution: params.resolution,
            quality: params.quality,
            mode: params.mode,
            image_url: params.image_url,
            images_list: params.images_list,
        };
        return submitAndPoll(endpointId, input, getApiKey(), params.onRequestId, 360, 2500);
    }

    async generateI2I(params) {
        const modelInfo = getI2IModelById(params.model);
        const endpointId = resolveFalEndpoint(modelInfo || params.model);
        const isGptImage2 = isGptImage2Model(modelInfo, params.model);
        const isIdeogram = isIdeogramModel(modelInfo, params.model);
        const needsImageSize = isGptImage2 || isIdeogram;
        const imageSize = isGptImage2 ? toGptImage2ImageSize(params.aspect_ratio)
            : isIdeogram ? toIdeogramImageSize(params.aspect_ratio)
            : undefined;
        const wantsImageUrls = usesImageUrlsList(modelInfo, params.model);
        const imageField = modelInfo?.imageField || 'image_url';
        const imagesList = params.images_list?.length > 0 ? params.images_list : (params.image_url ? [params.image_url] : null);

        const input = {
            prompt: params.prompt || '',
            aspect_ratio: needsImageSize ? undefined : params.aspect_ratio,
            image_size: imageSize,
            resolution: needsImageSize ? undefined : params.resolution,
            quality: params.quality,
            seed: params.seed && params.seed !== -1 ? params.seed : undefined,
            name: params.name,
        };

        if (imagesList) {
            if (wantsImageUrls) {
                input.image_urls = imagesList;
            } else if (imageField === 'images_list') {
                input.images_list = imagesList;
            } else {
                input[imageField] = imagesList[0];
            }
        }

        return submitAndPoll(endpointId, input, getApiKey(), params.onRequestId, 180, 2000);
    }

    async generateI2V(params) {
        const modelInfo = getI2VModelById(params.model);
        const endpointId = resolveFalEndpoint(modelInfo || params.model);
        const imageField = modelInfo?.imageField || 'image_url';
        const isVeo31 = isVeo31Model(modelInfo, params.model);
        const input = {
            prompt: params.prompt,
            aspect_ratio: params.aspect_ratio,
            duration: isVeo31 && typeof params.duration === 'number' ? `${params.duration}s` : params.duration,
            resolution: params.resolution,
            quality: params.quality,
            mode: params.mode,
            name: params.name,
        };

        if (params.image_url) {
            if (imageField === 'images_list') {
                input.images_list = [params.image_url];
            } else {
                input[imageField] = params.image_url;
            }
        }

        if (modelInfo?.lastImageField && params.last_image) {
            input[modelInfo.lastImageField] = params.last_image;
        }

        return submitAndPoll(endpointId, input, getApiKey(), params.onRequestId, 360, 2500);
    }

    async processV2V(params) {
        const modelInfo = getV2VModelById(params.model);
        const endpointId = resolveFalEndpoint(modelInfo || params.model);
        const input = {
            video_url: params.video_url,
            image_url: params.image_url,
            prompt: params.prompt,
        };
        return submitAndPoll(endpointId, input, getApiKey(), params.onRequestId, 360, 2500);
    }

    async processLipSync(params) {
        const modelInfo = getLipSyncModelById(params.model);
        const endpointId = resolveFalEndpoint(modelInfo || params.model);
        const input = {
            audio_url: params.audio_url,
            image_url: params.image_url,
            video_url: params.video_url,
            prompt: params.prompt,
            resolution: params.resolution,
            seed: params.seed && params.seed !== -1 ? params.seed : undefined,
        };
        return submitAndPoll(endpointId, input, getApiKey(), params.onRequestId, 360, 2500);
    }

    async uploadFile(file, onProgress) {
        const key = getApiKey();
        const targetPath = `uploads/${Date.now()}-${file.name || 'upload'}`;
        const formData = new FormData();
        formData.append('file_upload', file);
        if (onProgress) onProgress(5);

        const response = await fetch(`${filesBase()}/file/local/${encodeTargetPath(targetPath)}`, {
            method: 'POST',
            headers: falHeaders(key),
            body: formData,
        });

        const data = await parseMaybeJson(response);
        if (onProgress) onProgress(response.ok ? 100 : 0);
        if (!response.ok) {
            const detail = typeof data === 'string' ? data : JSON.stringify(data || {});
            throw new Error(`File upload failed: ${response.status} - ${detail.slice(0, 200)}`);
        }

        const fileUrl = data?.url || data?.file_url || data?.data?.url;
        if (!fileUrl) {
            throw new Error('No URL returned from file upload');
        }
        return fileUrl;
    }

    async pollForResult(requestId, key, maxAttempts = 120, interval = 2000, modelRef = null) {
        const endpointId = resolveFalEndpoint(modelRef);
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            await sleep(interval);
            const statusResponse = await fetch(`${buildRequestUrl(endpointId, requestId)}/status`, {
                headers: falHeaders(key),
            });
            const statusData = await parseMaybeJson(statusResponse);
            if (!statusResponse.ok) {
                if (statusResponse.status >= 500) continue;
                const detail = typeof statusData === 'string' ? statusData : JSON.stringify(statusData || {});
                throw new Error(`fal status failed: ${statusResponse.status} - ${detail.slice(0, 200)}`);
            }
            const status = String(statusData?.status || '').toUpperCase();
            if (status === 'COMPLETED' || status === 'SUCCEEDED' || status === 'SUCCESS') {
                const resultResponse = await fetch(buildRequestUrl(endpointId, requestId), {
                    headers: falHeaders(key),
                });
                const resultData = await parseMaybeJson(resultResponse);
                if (!resultResponse.ok) {
                    const detail = typeof resultData === 'string' ? resultData : JSON.stringify(resultData || {});
                    throw new Error(`fal result failed: ${resultResponse.status} - ${detail.slice(0, 200)}`);
                }
                return normalizeFalResult(resultData);
            }
            if (status === 'FAILED' || status === 'ERROR' || status === 'CANCELLED' || status === 'CANCELED') {
                throw new Error(`Generation failed: ${statusData?.error?.message || statusData?.error || statusData?.message || 'Unknown error'}`);
            }
            if (attempt === maxAttempts) throw new Error('Generation timed out after polling.');
        }
        throw new Error('Generation timed out after polling.');
    }

    getDimensionsFromAR(ar) {
        switch (ar) {
            case '1:1': return [1024, 1024];
            case '16:9': return [1280, 720];
            case '9:16': return [720, 1280];
            case '4:3': return [1152, 864];
            case '3:2': return [1216, 832];
            case '21:9': return [1536, 640];
            default: return [1024, 1024];
        }
    }

    // Legacy compatibility for callers that still expect a balance method.
    async getUserBalance() {
        return { balance: null, provider: 'fal' };
    }
}

export const muapi = new MuapiClient();

// All call sites pass (apiKey, params) but the class methods fetch the key internally.
// When two args are given, skip the first (apiKey) and use the second (params).
const unwrap = (a, b) => (b !== undefined ? b : a);
export const generateImage = (a, b) => muapi.generateImage(unwrap(a, b));
export const generateVideo = (a, b) => muapi.generateVideo(unwrap(a, b));
export const generateI2I = (a, b) => muapi.generateI2I(unwrap(a, b));
export const generateI2V = (a, b) => muapi.generateI2V(unwrap(a, b));
export const processV2V = (a, b) => muapi.processV2V(unwrap(a, b));
export const processLipSync = (a, b) => muapi.processLipSync(unwrap(a, b));
export const uploadFile = (a, b, c) => muapi.uploadFile(b !== undefined ? b : a, c);
export const getUserBalance = (...args) => muapi.getUserBalance(...args);

export async function generateMarketingStudioAd() {
    return { url: null };
}

export async function getTemplateAgents() {
    return [];
}

export async function getUserAgents() {
    return [];
}

export async function getUserConversations() {
    return [];
}

export async function getAppInterests() {
    return [];
}

export async function registerAppInterest() {
    return { ok: true };
}

export async function getWorkflowInputs() {
    return { input_data: { properties: {} } };
}

export async function getAllNodeSchemas() {
    return [];
}

export async function getWorkflowData() {
    return { nodes: [], edges: [] };
}

export async function createWorkflow(_apiKey, payload = {}) {
    return { workflow_id: payload.workflow_id || 'new' };
}

export async function deleteWorkflow() {
    return { ok: true };
}

export async function updateWorkflowName() {
    return { ok: true };
}

export async function getTemplateWorkflows() {
    return [];
}

export async function getUserWorkflows() {
    return [];
}

export async function getPublishedWorkflows() {
    return [];
}

export async function executeWorkflow() {
    return { ok: true };
}
