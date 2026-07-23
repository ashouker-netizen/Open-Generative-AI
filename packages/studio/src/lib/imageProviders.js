// Imagen 4: POST /v1beta/models/{model}:predict  →  predictions[0].bytesBase64Encoded
async function generateWithImagen(prompt, key, nativeModel) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${nativeModel}:predict?key=${key}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ instances: [{ prompt }], parameters: { sampleCount: 1 } }),
    }
  );
  if (!res.ok) {
    const t = await res.text().catch(() => res.statusText);
    throw new Error(`Imagen ${res.status}: ${t.slice(0, 300)}`);
  }
  const data = await res.json();
  const pred = data.predictions?.[0];
  if (!pred?.bytesBase64Encoded) throw new Error('No image returned from Imagen');
  return `data:${pred.mimeType || 'image/png'};base64,${pred.bytesBase64Encoded}`;
}

// Gemini image models (gemini-3.1-flash-image etc): standard generateContent, parses inlineData
function parseGeminiImage(data) {
  const parts = data.candidates?.[0]?.content?.parts || [];
  const part = parts.find(p => p.inlineData);
  if (!part) return null;
  return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
}

async function generateWithGeminiContent(prompt, key, nativeModel) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/${nativeModel}:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    }
  );
  if (!res.ok) {
    const t = await res.text().catch(() => res.statusText);
    throw new Error(`Gemini ${res.status}: ${t.slice(0, 300)}`);
  }
  const data = await res.json();
  const url = parseGeminiImage(data);
  if (!url) throw new Error('No image returned from Gemini');
  return url;
}

async function toDataUrl(url) {
  if (url.startsWith('data:')) return url;
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function generateMockupWithGeminiContent(prompt, artworkDataUrl, key, nativeModel) {
  const dataUrl = await toDataUrl(artworkDataUrl);
  const [header, b64] = dataUrl.split(',');
  const mimeType = header.match(/data:([^;]+)/)?.[1] || 'image/png';
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/${nativeModel}:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [
          { inlineData: { mimeType, data: b64 } },
          { text: prompt },
        ]}],
      }),
    }
  );
  if (!res.ok) {
    const t = await res.text().catch(() => res.statusText);
    throw new Error(`Gemini ${res.status}: ${t.slice(0, 300)}`);
  }
  const data = await res.json();
  const url = parseGeminiImage(data);
  if (!url) throw new Error('No mockup image returned from Gemini');
  return url;
}

export async function generateWithGemini(prompt, key, nativeModel, apiType) {
  if (apiType === 'imagen') return generateWithImagen(prompt, key, nativeModel);
  return generateWithGeminiContent(prompt, key, nativeModel);
}

export async function generateMockupWithGemini(prompt, artworkDataUrl, key, nativeModel, apiType) {
  if (apiType === 'imagen') {
    // Imagen doesn't support image input — fall back to text-only prompt
    return generateWithImagen(prompt, key, nativeModel);
  }
  return generateMockupWithGeminiContent(prompt, artworkDataUrl, key, nativeModel);
}

function dataUrlToBlob(dataUrl) {
  const [header, b64] = dataUrl.split(',');
  const mimeType = header.match(/data:([^;]+)/)?.[1] || 'image/png';
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
}

export async function generateMockupWithOpenAI(prompt, artworkDataUrl, key, nativeModel, quality, maskBlob = null) {
  const blob = dataUrlToBlob(artworkDataUrl);
  const formData = new FormData();
  formData.append('image', blob, 'artwork.png');
  if (maskBlob) formData.append('mask', maskBlob, 'mask.png');
  formData.append('prompt', prompt);
  formData.append('model', nativeModel);
  formData.append('n', '1');
  formData.append('size', '1024x1024');
  if (quality) formData.append('quality', quality);
  const res = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: { authorization: `Bearer ${key}` },
    body: formData,
  });
  if (!res.ok) {
    const t = await res.text().catch(() => res.statusText);
    throw new Error(`OpenAI ${res.status}: ${t.slice(0, 200)}`);
  }
  const data = await res.json();
  const b64 = data.data?.[0]?.b64_json;
  const url = data.data?.[0]?.url;
  if (!b64 && !url) throw new Error('No mockup image returned from OpenAI');
  return b64 ? `data:image/png;base64,${b64}` : url;
}

export async function generateWithOpenAI(prompt, key, nativeModel = 'gpt-image-1', quality = 'medium') {
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model: nativeModel, prompt, n: 1, size: '1024x1024', quality }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => res.statusText);
    throw new Error(`OpenAI ${res.status}: ${t.slice(0, 200)}`);
  }
  const data = await res.json();
  const b64 = data.data?.[0]?.b64_json;
  const url = data.data?.[0]?.url;
  if (!b64 && !url) throw new Error('No image returned from OpenAI');
  return b64 ? `data:image/png;base64,${b64}` : url;
}
