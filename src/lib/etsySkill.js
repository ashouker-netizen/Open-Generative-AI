// Core rules from the Etsy Ads Master Plan methodology.
// Imported into atlasEngine and forgeEngine system prompts.

export const ETSY_KEYWORD_RULES = `
KEYWORD SELECTION RULES (Etsy Ads Master Plan):
- Pick a 2–4 word phrase with real buyer search intent
- Avoid one-word keywords — too broad, wastes budget
- Prefer specific long-tail over generic broad terms
- The phrase must be something a parent or gift-buyer would actually type into Etsy search
`.trim();

export const ETSY_TITLE_RULES = `
TITLE RULES (Etsy Ads Master Plan):
- Format: Adjective + Adjective + Noun, Adjective + Adjective + Noun (2–3 pairs separated by commas)
- Use commas ONLY — never vertical bars ( | ) or dashes (they waste character space)
- No promotional phrases: no "Sale", "Free", "Ships Fast", "Instant", "15% off"
- Stack adjectives in front of shared root nouns to fit more keywords in fewer characters
- Good example: "Watercolor Elephant Nursery Print, Soft Pastel Baby Wall Art, Printable Nursery Decor"
`.trim();

export const ETSY_TAG_RULES = `
TAG RULES (Etsy Ads Master Plan):
- Fill all 13 tag slots
- Every tag = exactly two words: Adjective + Noun (e.g. "nursery print", "baby shower", "wall art")
- Never use one-word tags — too broad, wastes ad budget on window shoppers
- Mix of: exact-match keyphrases, occasion-based (baby shower gift), buyer-intent, gift phrases
`.trim();

export const ETSY_DESCRIPTION_RULES = `
DESCRIPTION RULES (Etsy Ads Master Plan):
- Opening 2–3 sentences naturally weave in title keywords and tags (not a keyword dump)
- Followed by a bullet list: file formats, sizes, what's included, compatibility
- Short CTA at the end ("Get yours today for instant access.")
`.trim();

export const TINYDREAM_IMAGE_RULES = `
TINYDREAM STORE IMAGE LANGUAGE (visual rules for image prompt):
- Premium watercolor finish — soft, refined, tasteful, printable; never clipart or sticker-like
- Single clear hero — one main subject, one dominant focal point; no crowded scenes
- Breathing room — bright/plain background, centered composition, generous negative space
- Gentle cohesive styling — calm expressions, soft shapes, restrained details, no mascot energy
ALWAYS AVOID in image prompts: clipart, heavy outlines, mascot energy, crowded compositions,
harsh contrast, loud saturation, neon tones, typography inside the artwork
`.trim();
