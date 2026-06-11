# Etsy Pipeline — Claude AI Integration Design Spec

**Date:** 2026-06-11
**Project:** Open Generative AI
**Status:** Approved
**Extends:** `2026-06-09-etsy-pipeline-design.md`

---

## Overview

Replaces the curated word-list `ideaEngine.js` with a two-stage Claude AI pipeline. Claude handles both keyword research (ATLAS role) and Etsy listing copy generation (FORGE role), informed by the Etsy Ads Master Plan methodology. The result is a daily pack that includes a keyword-backed image prompt AND production-ready Etsy copy — all before fal.ai image generation begins.

A human review gate sits between the two Claude calls so the user can approve or regenerate the keyword before spending image generation credits.

---

## Goals

- Replace random concept generation with Claude-driven keyword research grounded in Etsy SEO best practices
- Generate a full Etsy listing pack (title, 13 tags, description, image prompt) in a single pipeline run
- Give the user a review point between keyword selection and image generation
- Support two input modes: category toggles (default) and free-text seed (manual)
- Ensure Claude is aware of past concepts so it picks fresh, differentiated keywords

---

## Architecture

### New Files

| File | Responsibility |
|---|---|
| `src/lib/atlasEngine.js` | Call 1 — Claude picks a keyword given category/seed + history |
| `src/lib/forgeEngine.js` | Call 2 — Claude writes title, 13 tags, description, and image prompt from that keyword |
| `src/lib/claudeClient.js` | Thin wrapper: Anthropic SDK, API key management, structured JSON responses |

### Modified Files

| File | Change |
|---|---|
| `src/lib/ideaEngine.js` | Removed — replaced by atlasEngine + forgeEngine |
| `src/components/EtsyPipeline.js` | New two-step UI with keyword review gate before image generation |
| `src/lib/uniquenessDB.js` | Add `getRecentConcepts(n)` method to feed history to atlasEngine |
| `src/main.js` | Claude API key added alongside fal.ai key |

---

## Components

### claudeClient.js

Thin wrapper around the Anthropic SDK.

- Reads Claude API key from `localStorage` under key `claude_api_key`
- If key is missing, throws a typed error (`MISSING_CLAUDE_KEY`) that EtsyPipeline catches and surfaces as an inline key entry prompt (same UX pattern as the existing fal.ai AuthModal)
- Exposes one method: `call(systemPrompt, userPrompt)` → returns parsed JSON object
- Uses `claude-sonnet-4-6` model
- All prompts request structured JSON output — no free-text parsing

---

### atlasEngine.js

**Role:** ATLAS — keyword research and concept selection.

**Input:**
```js
{
  category: "Animals" | "Botanical" | "Educational",  // from toggles
  seed: string | null,                                 // from manual text input, or null
  recentConcepts: Array<{ subject, theme, keyword }>   // last 20 from uniquenessDB
}
```

**System prompt instructs Claude to:**
- Act as an Etsy SEO researcher specialising in nursery digital prints
- Apply the Etsy Ads Master Plan keyword methodology: pick a two-to-four word phrase with real buyer search intent, avoid one-word tags, prefer specific long-tail over broad terms
- Avoid any subject+theme combo already present in recentConcepts
- Return a single best keyword, not a list

**Output (structured JSON):**
```json
{
  "keyword": "watercolor elephant nursery print",
  "subject": "sleepy elephant",
  "theme": "under the stars",
  "style": "watercolor",
  "rationale": "High search intent, low competition in neutral-palette nursery niche. Not in recent history."
}
```

**Retry logic:** If the returned subject+theme combo exists in uniquenessDB despite the history hint, re-call up to 3 times before surfacing a "please change category or seed" warning to the user.

---

### forgeEngine.js

**Role:** FORGE — Etsy listing copy and image prompt generation.

**Input:** The full atlasEngine output object.

**System prompt instructs Claude to:**
- Apply the Etsy Ads Master Plan copy formulas:
  - Title: `Adjective + Adjective + Noun, Adjective + Adjective + Noun` — comma-separated, no vertical bars, no promotional phrases
  - Tags: all 13 slots filled, every tag a two-word `Adjective + Noun` phrase, no one-word tags
  - Description: feel-good opening paragraph weaving in title and tag keywords naturally, followed by a bulleted list of key product info, closing CTA
- Write an image prompt aligned with TinyDream Store Image Language v1: premium watercolor finish, single clear hero, breathing room, gentle cohesive styling, no clipart or mascot energy

**Output (structured JSON):**
```json
{
  "title": "Watercolor Elephant Nursery Print, Soft Pastel Wall Art, Printable Nursery Decor",
  "tags": ["nursery print", "elephant art", "watercolor print", "baby room decor", "soft pastel art", "nursery wall art", "printable poster", "baby shower gift", "animal nursery", "gender neutral art", "boho nursery", "instant download", "digital download"],
  "description": "This watercolor elephant nursery print brings a soft, dreamy feeling to any baby's room...\n\n• Instant digital download\n• 8x10 printable, 300 DPI\n• White background, print-ready\n• Compatible with home printers and print shops\n\nGrab yours today for instant access.",
  "imagePrompt": "Watercolor sleepy elephant under the stars, nursery wall art, soft pastel colors, white background, single centered subject, breathing room, premium printable illustration, 8x10"
}
```

---

## UI Flow (EtsyPipeline.js)

### Step 1 — Input
- Category toggles (Animals / Botanical / Educational) — default mode
- Optional free-text seed input field: "Or describe an idea..."
- "Generate Keyword" button

### Step 2 — Keyword Review (new gate)
- Shows: keyword, subject, theme, style, rationale from atlasEngine
- Two actions: **"Use This Keyword"** → proceeds to forgeEngine | **"Try Another"** → re-calls atlasEngine
- This step does NOT call forgeEngine or fal.ai — zero image credits spent until user approves

### Step 3 — Pack Generation
- Calls forgeEngine → shows title, tags, description, imagePrompt in the UI
- Calls muapi.generateImage(imagePrompt) → polls fal.ai
- Shows image preview when ready
- "Copy Title", "Copy Tags", "Copy Description" buttons for easy Etsy paste
- "Download Image" + desktop notification on completion

### Step 4 — Save
- uniquenessDB.save() with the full combined entry (both Claude outputs + image filename)
- Day marked as run

---

## Data Flow

```
User selects category (or types seed text)
  └─> atlasEngine.generateKeyword(category, seed, recentConcepts)
        └─> claudeClient.call() → { keyword, subject, theme, style, rationale }
              └─> UI shows keyword + rationale for review
                    └─> User approves or regenerates
                          └─> forgeEngine.generatePack(keyword, subject, theme, style)
                                └─> claudeClient.call() → { title, tags, description, imagePrompt }
                                      └─> muapi.generateImage(imagePrompt, model)
                                            └─> Poll fal.ai until complete
                                                  └─> uniquenessDB.save(fullEntry)
                                                        └─> Download image + notify user
```

---

## uniquenessDB.js Changes

Add one method:

```js
getRecentConcepts(n = 20) {
  return this.getAll()
    .slice(-n)
    .map(e => ({ subject: e.subject, theme: e.theme, keyword: e.keyword }));
}
```

The full saved entry schema expands to include all new fields:

```json
{
  "id": "uuid",
  "date": "2026-06-11",
  "keyword": "watercolor elephant nursery print",
  "subject": "sleepy elephant",
  "theme": "under the stars",
  "style": "watercolor",
  "rationale": "...",
  "title": "Watercolor Elephant Nursery Print, ...",
  "tags": ["nursery print", ...],
  "description": "...",
  "imagePrompt": "...",
  "filename": "etsy-2026-06-11-sleepy-elephant-stars.png",
  "status": "approved"
}
```

---

## Error Handling

| Scenario | Handling |
|---|---|
| Claude API key missing | Inline key entry prompt, same UX pattern as fal.ai AuthModal |
| atlasEngine call fails | Show error, allow retry — day NOT marked as run |
| forgeEngine call fails | Show error, retry from keyword review step — atlasEngine NOT re-called |
| 3 uniqueness re-rolls exhausted | Warn user to change category or seed — do not generate |
| fal.ai generation fails | Show error, retry from image step — neither Claude call re-runs |
| Notification permission denied | Silently skip, image still saves normally |

---

## Out of Scope

- Etsy API direct upload
- Multiple images per day
- Cloud sync of history
- Streaming Claude responses in the UI
- Fine-tuning or custom model usage
