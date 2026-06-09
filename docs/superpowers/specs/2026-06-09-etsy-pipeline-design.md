# Etsy Daily Print Pipeline — Design Spec

**Date:** 2026-06-09  
**Project:** Open Generative AI  
**Status:** Approved

---

## Overview

A new "Etsy Pipeline" tab inside the Open Generative AI app that generates one unique nursery-style digital print per day using fal.ai, saves it to a local folder, and sends a desktop notification for review. The pipeline tracks all past concepts to guarantee no repeats in the Etsy shop.

---

## Goals

- Generate 1 unique nursery print idea + image per day
- Never repeat a concept already generated (enforced by local database)
- Save image to local folder with a descriptive filename
- Notify the user when the image is ready
- Allow manual trigger anytime + automatic trigger when app opens each morning
- Build inside the existing Open Generative AI app, reusing the existing fal.ai integration

---

## Architecture

The feature is a self-contained module added to the existing Vite/Vanilla JS frontend. No backend server is required.

### New Files

| File | Responsibility |
|------|----------------|
| `src/components/EtsyPipeline.js` | Main tab component — UI, orchestration, user controls |
| `src/lib/ideaEngine.js` | Generates unique nursery print concepts from curated word lists |
| `src/lib/uniquenessDB.js` | Tracks past concepts in localStorage; enforces uniqueness |
| `src/lib/scheduler.js` | Auto-triggers pipeline on app open if daily run hasn't happened yet |

### Modified Files

| File | Change |
|------|--------|
| `src/main.js` | Add Etsy Pipeline tab to navigation and render `EtsyPipeline` component |

---

## Components

### EtsyPipeline.js

Main tab UI with:
- **Sidebar:** "Run Now" button, schedule indicator (shows time of next auto-run), category mix toggles (Animals, Botanical, Educational)
- **Main area:** Preview of today's generated image, concept label, model used, status badge, "Open Folder" button
- **History panel:** Scrollable list of past generated concepts with date, filename, and status (approved / skipped)

Orchestration flow:
1. On mount, call `scheduler.checkAndRun()`
2. On "Run Now", call `runPipeline()`
3. `runPipeline()` → `ideaEngine.generate()` → `muapi.generateImage()` → save image → notify user → update `uniquenessDB`

---

### ideaEngine.js

Generates a nursery print concept by combining randomized elements from curated lists:

```
Subject  × Theme  × Style  → Prompt
```

**Subject examples:** sleepy elephant, baby fox, bunny with carrots, sunflower, hot air balloon  
**Theme examples:** under the stars, in a cozy bed, with alphabet blocks, in a garden, reading a book  
**Style examples:** watercolor, flat illustration, soft pastel, line art, gouache painting  

**Prompt format:**
```
"{Style} {Subject} {Theme}, nursery wall art, soft colors, white background, 8x10 printable"
```

**Example output:**
> "Watercolor sleepy elephant under the stars, nursery wall art, soft colors, white background, 8x10 printable"

The word lists are editable from the settings panel in the UI.

---

### uniquenessDB.js

Stored in `localStorage` under key `etsy_pipeline_history`.

**Entry schema:**
```json
{
  "id": "uuid",
  "date": "2026-06-09",
  "subject": "sleepy elephant",
  "theme": "under the stars",
  "style": "watercolor",
  "prompt": "full prompt string",
  "filename": "etsy-2026-06-09-sleepy-elephant-stars.png",
  "status": "approved" | "skipped"
}
```

**Uniqueness rule:** A concept is considered duplicate if the same `subject + theme` combo already exists in the DB, regardless of style. Before generating, the engine checks for this and re-rolls up to 10 times to find a unique combo. If 10 attempts fail (extremely unlikely), it logs a warning and prompts the user to expand their word lists.

**Methods:**
- `hasBeenUsed(subject, theme)` → boolean
- `save(entry)` → void
- `getAll()` → array
- `getCount()` → number

---

### scheduler.js

On every app open, checks whether today's pipeline run has already happened:

```js
const lastRun = localStorage.getItem('etsy_last_run_date');
const today = new Date().toISOString().split('T')[0];
const hour = new Date().getHours();

if (lastRun !== today && hour >= 8) {
  runPipeline();
}
```

- Configured run hour defaults to 8am, adjustable from the UI
- Only 1 auto-run per day (enforced by `etsy_last_run_date`)
- Manual "Run Now" bypasses the time check but still respects the 1-per-day rule (shows a confirmation if already run today)

---

### Image Saving & Notifications

**Saving:**
- Uses the browser download API (`<a download>`) to trigger a file save
- Filename format: `etsy-YYYY-MM-DD-{subject}-{theme}.png` (spaces replaced with hyphens, lowercase)
- Saves to the user's default Downloads folder
- "Open Folder" button opens `~/Downloads` in Finder via Electron shell API

**Notifications:**
- Uses Web Notifications API (available in Electron)
- Requests permission on first pipeline run
- Message format: `"🎨 New Etsy print ready! {Subject} {Theme} — saved to Downloads"`
- Clicking the notification focuses the app and navigates to the Etsy Pipeline tab

---

## Data Flow

```
App opens
  └─> scheduler.checkAndRun()
        └─> [if not run today and hour >= 8]
              └─> ideaEngine.generate()
                    └─> uniquenessDB.hasBeenUsed() → re-roll if needed
                          └─> muapi.generateImage(prompt, model)
                                └─> Poll fal.ai until complete
                                      └─> Download image file
                                            └─> uniquenessDB.save(entry)
                                                  └─> Show notification
                                                        └─> Update UI
```

---

## Model Selection

Uses the existing `models.js` and `muapi.js` infrastructure. Default model: **flux-schnell** (fast, good quality for illustration-style images). The model can be changed from the pipeline settings panel.

---

## Error Handling

| Error | Handling |
|-------|----------|
| fal.ai API failure | Show error in UI, allow retry, do not mark day as "run" |
| No API key | Open existing `AuthModal` (same as Image Studio) |
| 10 uniqueness re-roll failures | Warn user to expand word lists, do not generate |
| Notification permission denied | Silently skip notification, image still saves |
| Download blocked | Show manual download button as fallback |

---

## Out of Scope

- Etsy API integration (uploading directly to Etsy) — manual upload by user
- Multiple images per day
- AI-powered prompt generation (LLM) — curated word lists only for now
- Cloud sync of history

---

## Success Criteria

1. Pipeline generates a new unique nursery print image each day with no concept repeats
2. Image is saved to Downloads with a descriptive filename
3. User receives a desktop notification when the image is ready
4. The uniqueness database accurately tracks all past concepts
5. Manual trigger works anytime from the UI
6. Auto-trigger fires correctly on app open when conditions are met
