import Anthropic from '@anthropic-ai/sdk';

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

/**
 * Call Claude with a system + user prompt, expect a JSON object back.
 * @param {string} systemPrompt
 * @param {string} userPrompt
 * @returns {Promise<object>} parsed JSON from Claude's response
 */
export async function callClaude(systemPrompt, userPrompt) {
  const key = getKey();
  if (!key) {
    const err = new Error('Claude API key not set');
    err.code = 'MISSING_CLAUDE_KEY';
    throw err;
  }

  const client = new Anthropic({
    apiKey: key,
    dangerouslyAllowBrowser: true,
  });

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const text = message.content?.[0]?.text || '';

  // Strip markdown code fences if Claude wraps the JSON
  const cleaned = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error(`Claude returned non-JSON response: ${text.substring(0, 200)}`);
  }
}
