// All sizes at 300 DPI, portrait orientation
const RATIO_GROUPS = [
  {
    ratio: '2꞉3',
    files: [
      { label: '8x12in',  w: 2400,  h: 3600  },
      { label: '10x15in', w: 3000,  h: 4500  },
      { label: '12x18in', w: 3600,  h: 5400  },
      { label: '16x24in', w: 4800,  h: 7200  },
      { label: '20x30in', w: 6000,  h: 9000  },
      { label: '24x36in', w: 7200,  h: 10800 },
    ],
  },
  {
    ratio: '3꞉4',
    files: [
      { label: '9x12in',  w: 2700, h: 3600 },
      { label: '12x16in', w: 3600, h: 4800 },
      { label: '15x20in', w: 4500, h: 6000 },
      { label: '18x24in', w: 5400, h: 7200 },
      { label: '24x32in', w: 7200, h: 9600 },
    ],
  },
  {
    ratio: '5꞉7',
    files: [
      { label: '5x7in', w: 1500, h: 2100 },
    ],
  },
];

function resizeToCanvas(img, w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  // Scale to fill (cover), centered
  const scale = Math.max(w / img.width, h / img.height);
  const sw = img.width * scale;
  const sh = img.height * scale;
  ctx.drawImage(img, (w - sw) / 2, (h - sh) / 2, sw, sh);
  return canvas;
}

function canvasToBlob(canvas) {
  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

// Returns [{ ratio, files: [{ label, blob }] }]
export async function resizeForPrint(dataUrl, onProgress) {
  const img = await loadImage(dataUrl);
  const result = [];

  for (const group of RATIO_GROUPS) {
    const files = [];
    for (const size of group.files) {
      onProgress?.(`Resizing ${group.ratio} — ${size.label}…`);
      const canvas = resizeToCanvas(img, size.w, size.h);
      const blob = await canvasToBlob(canvas);
      files.push({ label: size.label, blob });
    }
    result.push({ ratio: group.ratio, files });
  }

  return result;
}
