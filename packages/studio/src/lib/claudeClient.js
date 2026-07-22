const MODEL = 'claude-sonnet-4-6';

function getKey() {
  return localStorage.getItem('claude_api_key') || '';
}

export function hasClaudeKey() {
  return !!getKey();
}

export function setClaudeKey(key) {
  localStorage.setItem('claude_api_key', key.trim());
}

export async function callClaudeWithImage(systemPrompt, userPrompt, imageUrl) {
  const key = getKey();
  if (!key) {
    const err = new Error('Claude API key not set');
    err.code = 'MISSING_CLAUDE_KEY';
    throw err;
  }

  // Fetch via server proxy to bypass CORS/CDN restrictions on external image URLs
  const imgRes = await fetch(`/api/proxy-image?url=${encodeURIComponent(imageUrl)}`);
  if (!imgRes.ok) throw new Error(`Could not fetch image (${imgRes.status}) — check the URL is a direct image link`);
  const blob = await imgRes.blob();
  const mediaType = blob.type || 'image/jpeg';
  const b64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: b64 } },
          { type: 'text', text: userPrompt },
        ],
      }],
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`Claude API error ${res.status}: ${detail.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = data.content?.[0]?.text || '';
  const cleaned = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error(`Claude returned non-JSON: ${text.slice(0, 200)}`);
  }
}

export async function callClaude(systemPrompt, userPrompt) {
  const key = getKey();
  if (!key) {
    const err = new Error('Claude API key not set');
    err.code = 'MISSING_CLAUDE_KEY';
    throw err;
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`Claude API error ${res.status}: ${detail.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = data.content?.[0]?.text || '';
  const cleaned = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error(`Claude returned non-JSON: ${text.slice(0, 200)}`);
  }
}
