import { hasBeenUsed } from './uniquenessDB.js';

export const DEFAULT_LISTS = {
  subjects: [
    'sleepy elephant', 'baby fox', 'bunny with carrots', 'little giraffe',
    'baby bear', 'sleepy owl', 'tiny hedgehog', 'baby deer', 'little penguin',
    'baby whale', 'sunflower', 'hot air balloon', 'rainbow cloud', 'little star',
    'crescent moon', 'baby lion', 'little turtle', 'baby duck', 'tiny mushroom',
    'little snail'
  ],
  themes: [
    'under the stars', 'in a cozy bed', 'with alphabet blocks', 'in a garden',
    'reading a book', 'playing with butterflies', 'in a rainy day', 'with a rainbow',
    'in a forest', 'near a pond', 'with balloons', 'at bedtime', 'in a meadow',
    'with flowers', 'watching the moon'
  ],
  styles: [
    'watercolor', 'flat illustration', 'soft pastel', 'line art', 'gouache painting',
    'colored pencil', 'digital painting'
  ]
};

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generate(lists = DEFAULT_LISTS, maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    const subject = pick(lists.subjects);
    const theme = pick(lists.themes);
    const style = pick(lists.styles);

    if (!hasBeenUsed(subject, theme)) {
      const prompt = `${style} ${subject} ${theme}, nursery wall art, soft colors, white background, 8x10 printable`;
      return { subject, theme, style, prompt };
    }
  }
  throw new Error('Could not find a unique concept after 10 attempts. Please expand your word lists.');
}
