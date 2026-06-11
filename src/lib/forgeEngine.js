import { callClaude } from './claudeClient.js';
import { ETSY_TITLE_RULES, ETSY_TAG_RULES, ETSY_DESCRIPTION_RULES, TINYDREAM_IMAGE_RULES } from './etsySkill.js';

const SYSTEM_PROMPT = `You are an Etsy listing copywriter specialising in nursery digital print shops.

You write SEO-optimised listing copy using the Etsy Ads Master Plan methodology.

${ETSY_TITLE_RULES}

${ETSY_TAG_RULES}

${ETSY_DESCRIPTION_RULES}

${TINYDREAM_IMAGE_RULES}

For the image prompt: format as "{style} {subject} {theme}, nursery wall art, soft colors, white background, single centered subject, breathing room, premium printable illustration, 8x10"

You MUST respond with ONLY a valid JSON object — no explanation, no markdown fences, no extra text:
{
  "title": "full Etsy title string",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6", "tag7", "tag8", "tag9", "tag10", "tag11", "tag12", "tag13"],
  "description": "full description with bullet list and CTA",
  "imagePrompt": "full fal.ai generation prompt"
}`;

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

Write the complete Etsy listing pack for this nursery digital print.`;

  const result = await callClaude(SYSTEM_PROMPT, userPrompt);

  if (!result.title || !Array.isArray(result.tags) || result.tags.length !== 13 || !result.description || !result.imagePrompt) {
    throw new Error('Claude returned incomplete listing pack. Please try again.');
  }

  return result;
}
