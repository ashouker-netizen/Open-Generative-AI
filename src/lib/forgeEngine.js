import { callClaude } from './claudeClient.js';
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
- Title: use the stacking technique, comma separators only, no promotional phrases
- Tags: exactly 13 two-word tags mixing exact-match, occasion, buyer-intent, gift phrases
- Description: feel-good opening paragraph first, then bullet list of product info, then CTA
- Image prompt: must pass the TinyDream Brand Fit Test`;

  const result = await callClaude(SYSTEM_PROMPT, userPrompt);

  if (!result.title || !Array.isArray(result.tags) || result.tags.length !== 13 || !result.description || !result.imagePrompt) {
    throw new Error('Claude returned incomplete listing pack. Please try again.');
  }

  return result;
}
