import { callClaude } from './claudeClient.js';
import { hasBeenUsed } from './uniquenessDB.js';
import { ETSY_KEYWORD_RULES, ETSY_ALGORITHM_RULES, TINYDREAM_IMAGE_RULES } from './etsySkill.js';

const SYSTEM_PROMPT = `You are an Etsy SEO researcher specialising in nursery digital prints.

Your job is to pick ONE specific keyword + concept for a nursery wall art digital print listing.

${ETSY_ALGORITHM_RULES}

${ETSY_KEYWORD_RULES}

${TINYDREAM_IMAGE_RULES}

STYLE OPTIONS — pick the one that best fits the concept:
watercolor, soft pastel, gouache painting, colored pencil, flat illustration

UNIQUENESS: Never repeat a subject+theme combo from the recent history provided to you.

RESPONSE FORMAT — You MUST respond with ONLY a valid JSON object. No explanation, no markdown fences, no extra text:
{
  "keyword": "two to four word Etsy search phrase a buyer would actually type",
  "subject": "specific subject (e.g. sleepy elephant, baby fox, sunflower)",
  "theme": "specific theme (e.g. under the stars, in a cozy bed, with alphabet blocks)",
  "style": "one of: watercolor, soft pastel, gouache painting, colored pencil, flat illustration",
  "rationale": "one sentence: why this keyword has real buyer demand and fits the TinyDream niche"
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
    : '\nNo concepts generated yet — pick anything that fits the niche well.';

  const userPrompt = seed
    ? `Category: ${category}\nUser seed idea: "${seed}"${historyText}\n\nPick a keyword and concept inspired by the seed idea. Apply the Resounding Yes rule — the keyword must target a buyer who is definitely searching for this exact thing.`
    : `Category: ${category}${historyText}\n\nPick the best keyword and concept for this category. Apply the Resounding Yes rule — the keyword must target a buyer who is definitely searching for this exact thing.`;

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
