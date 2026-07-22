import { callClaude, callClaudeWithImage } from './claudeClient.js';
import { ETSY_TITLE_RULES, ETSY_TAG_RULES, ETSY_DESCRIPTION_RULES, ETSY_ALGORITHM_RULES, TINYDREAM_IMAGE_RULES } from './etsySkill.js';

const SYSTEM_PROMPT = `You are an expert Etsy listing copywriter for a premium nursery digital print shop called TinyDream.

You write SEO-optimised listing copy using the Etsy Ads Master Plan methodology — exactly as taught in the masterclass. Every word earns its place.

${ETSY_ALGORITHM_RULES}

${ETSY_TITLE_RULES}

${ETSY_TAG_RULES}

${ETSY_DESCRIPTION_RULES}

${TINYDREAM_IMAGE_RULES}

IMAGE PROMPT RULES (for fal.ai generation):
- Build the prompt around the TinyDream Store Image Language above
- Format: "{style} {subject} {theme}, nursery wall art, soft colors, white background, single centered subject, breathing room, premium printable illustration, 8x10"
- The prompt must pass the Brand Fit Test: would this look natural beside the last 6 TinyDream listings?

RESPONSE FORMAT — You MUST respond with ONLY a valid JSON object. No explanation, no markdown fences, no extra text:
{
  "title": "full Etsy title using stacking technique with comma separators — no promotional phrases",
  "tags": ["two word tag", "two word tag", "two word tag", "two word tag", "two word tag", "two word tag", "two word tag", "two word tag", "two word tag", "two word tag", "two word tag", "two word tag", "two word tag"],
  "description": "feel-good opening paragraph (1-3 sentences weaving in keywords naturally)\\n\\n• bullet point 1\\n• bullet point 2\\n• bullet point 3\\n• bullet point 4\\n• bullet point 5\\n\\nCall to action sentence.",
  "imagePrompt": "full fal.ai generation prompt following TinyDream image rules"
}

IMPORTANT: The tags array must contain EXACTLY 13 items. Every tag must be exactly two words.`;

const ANALYZE_SYSTEM = `You are an expert Etsy SEO analyst and copywriter for a premium nursery digital print shop called TinyDream.

You look at nursery art print images and generate complete, optimized Etsy listing copy using the Etsy Ads Master Plan methodology.

${ETSY_ALGORITHM_RULES}

${ETSY_TITLE_RULES}

${ETSY_TAG_RULES}

${ETSY_DESCRIPTION_RULES}

${TINYDREAM_IMAGE_RULES}

IMAGE PROMPT RULES:
- Do NOT recreate the image — REMIX it. Keep the same subject and nursery theme but reimagine it with a fresh twist: change the color palette, shift the art style, add or remove elements, or reframe the composition. The result should feel inspired by the original, not copied from it.
- Format: "{style} {subject} {theme}, nursery wall art, soft colors, white background, single centered subject, breathing room, premium printable illustration, 8x10"
- The prompt must pass the TinyDream Brand Fit Test: would this look natural beside the last 6 TinyDream listings?

RESPONSE FORMAT — You MUST respond with ONLY a valid JSON object. No explanation, no markdown fences, no extra text:
{
  "keyword": "primary 2-4 word Etsy search phrase with buyer intent",
  "subject": "main subject of the artwork",
  "theme": "visual theme or mood",
  "style": "art style detected (e.g. watercolor, boho, minimalist line art)",
  "rationale": "one sentence on why this keyword converts",
  "title": "full Etsy title using stacking technique with comma separators",
  "tags": ["two word tag", "two word tag", "two word tag", "two word tag", "two word tag", "two word tag", "two word tag", "two word tag", "two word tag", "two word tag", "two word tag", "two word tag", "two word tag"],
  "description": "feel-good opening paragraph\\n\\n• bullet point 1\\n• bullet point 2\\n• bullet point 3\\n• bullet point 4\\n• bullet point 5\\n\\nCall to action sentence.",
  "imagePrompt": "remix image prompt — same subject, fresh interpretation for TinyDream"
}

IMPORTANT: tags must be EXACTLY 13 items, each exactly two words.`;

/**
 * Analyze an existing nursery art image URL and generate a full listing pack.
 * @param {string} imageUrl
 */
export async function analyzeImageForListing(imageUrl) {
  const userPrompt = `Analyze this nursery art print image. Identify the art style, subject, and theme. Then write a complete TinyDream Etsy listing pack for this type of artwork. For the imagePrompt, do NOT recreate the image — remix it: keep the subject and nursery mood but use a different art style, color palette, or composition angle so it feels fresh and original.`;

  const result = await callClaudeWithImage(ANALYZE_SYSTEM, userPrompt, imageUrl);

  if (!result.keyword || !result.title || !Array.isArray(result.tags) || result.tags.length !== 13 || !result.description || !result.imagePrompt) {
    throw new Error('Claude returned incomplete analysis. Please try again.');
  }

  return result;
}

/**
 * Generate a full Etsy listing pack from an atlas keyword result.
 *
 * @param {{ keyword: string, subject: string, theme: string, style: string }} concept
 * @returns {Promise<{ title, tags, description, imagePrompt }>}
 */
export async function generatePack({ keyword, subject, theme, style }) {
  const userPrompt = `Keyword: "${keyword}"
Subject: ${subject}
Theme: ${theme}
Style: ${style}

Write the complete Etsy listing pack for this TinyDream nursery digital print.

Remember:
- Title: MUST use the stacking technique — stack multiple adjectives around shared root nouns to fit more search phrases in fewer characters. Do NOT repeat the same noun across separate phrases. Bad: "Elephant Nursery Print, Baby Elephant Wall Art" (repeats Elephant). Good: "Watercolor Sleepy Elephant Nursery Print, Soft Pastel Printable Baby Wall Art". Comma separators only, no promotional phrases.
- Tags: exactly 13 two-word tags mixing exact-match, occasion, buyer-intent, gift phrases
- Description: feel-good opening paragraph first, then bullet list of product info, then CTA
- Image prompt: must pass the TinyDream Brand Fit Test`;

  const result = await callClaude(SYSTEM_PROMPT, userPrompt);

  if (!result.title || !Array.isArray(result.tags) || result.tags.length !== 13 || !result.description || !result.imagePrompt) {
    throw new Error('Claude returned incomplete listing pack. Please try again.');
  }

  return result;
}
