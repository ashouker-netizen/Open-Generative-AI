// Etsy Ads Master Plan methodology — full rules used as Claude system prompt context.
// Extracted from the Etsy Ads Master Plan & Slow Sales Solutions masterclass.

export const ETSY_KEYWORD_RULES = `
KEYWORD SELECTION RULES (Etsy Ads Master Plan):
- Pick a 2–4 word phrase with real, specific buyer search intent
- Avoid one-word keywords — they are too broad and waste ad budget on window shoppers
- Prefer specific long-tail over generic broad terms
- The phrase must be something a parent, gift-buyer, or nursery decorator would actually type into Etsy search
- Apply the "Resounding Yes" rule: if this keyword wouldn't DEFINITELY convert that buyer, remove it. Only use keywords where the answer is a resounding yes — this buyer is looking for exactly this.
- Avoid broad tags like "gift for her" or single-word tags — they pull in wide, irrelevant traffic
- The keyword must match the buyer's specific intent, not just describe the product loosely
`.trim();

export const ETSY_TITLE_RULES = `
TITLE RULES (Etsy Ads Master Plan):
FORMAT: Adjective + Adjective + Noun, Adjective + Adjective + Noun (repeat 2–3 keyword phrase pairs)

THE STACKING TECHNIQUE (critical):
- Find multiple highly-searched two-word phrases that share the same root noun
  Example: "Minimalist planner", "Aesthetic planner", "Printable planner" → stack adjectives: "Minimalist Aesthetic Printable Planner"
- This fits more keywords in fewer characters, capturing all three search phrases at once
- Apply this same stacking logic across your full title

SEPARATOR RULE (character space matters):
- Use COMMAS ONLY to separate phrases — never vertical bars ( | ) or dashes ( - )
- Vertical bar requires a space before AND after = 3 characters used
- Comma requires only one space after = 2 characters used
- Across a full title, this saves enough space to fit an ENTIRE extra keyword = thousands more impressions

NEVER include promotional phrases:
- No "15% off", "Free Shipping", "Ships Fast", "Instant Download", "Comes with...", "Sale"
- These waste precious character space and do not improve ranking

Good example: "Watercolor Elephant Nursery Print, Soft Pastel Baby Wall Art, Printable Nursery Decor"
Good example: "Minimalist Weekly Planner Printable, Aesthetic Budget Tracker, Editable Canva Template"
`.trim();

export const ETSY_TAG_RULES = `
TAG RULES (Etsy Ads Master Plan):
- Fill ALL 13 tag slots — every empty slot is a missed ranking opportunity
- Every tag = exactly TWO words: Adjective + Noun (e.g. "nursery print", "baby shower", "wall art")
- NEVER use one-word tags (e.g. "printable", "nursery") — too broad, wastes ad budget on window shoppers
- Mix of tag types across the 13 slots:
  1. Exact-match keyphrases (match your title keywords)
  2. Occasion-based (e.g. "baby shower", "new baby", "gender reveal")
  3. Buyer-intent phrases (e.g. "instant download", "printable art", "digital print")
  4. Gift phrases (e.g. "baby gift", "nursery gift", "new parent")
  5. Style descriptors (e.g. "boho nursery", "minimalist art", "pastel decor")
- Apply the "Resounding Yes" rule to every tag: if a tag wouldn't definitely attract the right buyer, remove it
`.trim();

export const ETSY_DESCRIPTION_RULES = `
DESCRIPTION RULES (Etsy Ads Master Plan):
DO NOT paste the title verbatim into the description — the algorithm penalises this.

STRUCTURE (follow this exact order):
1. FEEL-GOOD OPENING PARAGRAPH (1–3 sentences):
   - Naturally weave in title keywords and tags — write like a human, not a keyword list
   - Speak to the buyer's emotion or need ("perfect for creating a calm, dreamy nursery atmosphere")
   - Example: "This watercolor elephant nursery print brings a soft, dreamy feeling to any baby's room — ideal for parents searching for minimalist nursery wall art or a thoughtful baby shower gift."

2. BULLET LIST (essential buying info):
   - What's included (number of files, variants)
   - File formats (PDF, PNG, JPG)
   - Sizes included (e.g. 8x10, A4, A5, 5x7)
   - Resolution (300 DPI, print-ready)
   - How to use (instant download, open in any PDF viewer or print shop)
   - Compatibility if relevant

3. CALL TO ACTION (1 sentence at the end):
   - Short, direct, warm
   - Examples: "Get yours today for instant access.", "Grab one today and transform your nursery.", "Purchase now for instant download."
`.trim();

export const ETSY_ALGORITHM_RULES = `
ETSY ALGORITHM CONTEXT (shapes how copy should be written):
- Etsy ranks listings based on human behaviour — Click-Through Rate (CTR) and Conversion Rate — not just keywords
- The title and tags are the only SEO levers; the description supports conversion but does not rank
- Every word in the title must earn its place by targeting a real buyer search phrase
- Vague or generic phrasing lowers CTR and buries the listing
- The goal is to reach the EXACT buyer who is ready to purchase — not the broadest possible audience
`.trim();

export const TINYDREAM_IMAGE_RULES = `
TINYDREAM STORE IMAGE LANGUAGE v1 (visual rules for the fal.ai image prompt):
1. Premium watercolor finish — soft, refined, tasteful, printable; NEVER clipart or sticker-like
2. Single clear hero — one main subject or one dominant focal point; NO crowded scenes or scattered attention
3. Breathing room first — bright/plain background, centered composition, generous negative space
4. Gentle cohesive styling — calm expressions, soft shapes, restrained supporting details, NO loud mascot energy
5. Flexible theme, consistent quality — colors and themes may change, but the result must look like it belongs to the same premium nursery store

ALWAYS AVOID in image prompts:
- clipart, sticker feel, heavy outlines, mascot energy, cheap-cute aesthetics
- crowded compositions, filler leaves, random props, scattered attention
- harsh contrast, loud saturation, neon tones, shiny or glitter effects
- typography or text inside the artwork
- any style that would look out of place beside a premium watercolor nursery print

BRAND FIT TEST: before finalising the prompt, ask — would this look natural next to the last 6 TinyDream listings in the same shop? If not, revise it.
`.trim();
