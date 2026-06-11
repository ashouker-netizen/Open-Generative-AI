import { callClaude } from './claudeClient.js';
import { hasBeenUsed } from './uniquenessDB.js';
import { ETSY_KEYWORD_RULES, TINYDREAM_IMAGE_RULES } from './etsySkill.js';

const SYSTEM_PROMPT = `You are an Etsy SEO researcher specialising in nursery digital prints.

Your job is to pick ONE specific keyword + concept for a nursery wall art digital print listing.

${ETSY_KEYWORD_RULES}

${TINYDREAM_IMAGE_RULES}

The style must be one of: watercolor, soft pastel, gouache painting, colored pencil, flat illustration.
Never repeat a subject+theme combo from the recent history provided.

You MUST respond with ONLY a valid JSON object — no explanation, no markdown fences, no extra text:
{
  "keyword": "two to four word Etsy search phrase",
  "subject": "specific subject (e.g. sleepy elephant)",
  "theme": "specific theme (e.g. under the stars)",
  "style": "one of: watercolor, soft pastel, gouache painting, colored pencil, flat illustration",
  "rationale": "one sentence explaining why this keyword has buyer demand and fits the niche"
}`;

/**
 * Pick a keyword for the given category and optional seed text.
 * Retries up to maxRetries times if the returned subject+theme is already used.
 *
 * @param {{ category: string, seed: string|null, recentConcepts: Array }} opts
 * @param {number} maxRetries
 * @returns {Promise<{ keyword, subject, theme, style, rationale }>}
 */
export async function generateKeyword({ category, seed, recentConcepts }, maxRetries = 3) {
  const historyText = recentConcepts.length > 0
    ? `\nRecent concepts to AVOID repeating:\n${recentConcepts.map(c => `- ${c.subject} / ${c.theme}`).join('\n')}`
    : '\nNo concepts generated yet — pick anything good.';

  const userPrompt = seed
    ? `Category: ${category}\nUser seed idea: "${seed}"${historyText}\n\nPick a keyword and concept inspired by the seed idea.`
    : `Category: ${category}${historyText}\n\nPick the best keyword and concept for this category.`;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const result = await callClaude(SYSTEM_PROMPT, userPrompt);

    if (!result.keyword || !result.subject || !result.theme || !result.style) {
      throw new Error('Claude returned incomplete keyword data. Please try again.');
    }

    if (!hasBeenUsed(result.subject, result.theme)) {
      return result;
    }
  }

  throw new Error('Could not find a unique concept after 3 attempts. Please change your category or seed.');
}
