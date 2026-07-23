function loadImg(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Find bounding box of magenta pixels (R>180, G<80, B>180)
function findMarker(ctx, w, h) {
  const { data } = ctx.getImageData(0, 0, w, h);
  let x0 = w, x1 = 0, y0 = h, y1 = 0, found = false;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (data[i] > 180 && data[i + 1] < 80 && data[i + 2] > 180) {
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
        found = true;
      }
    }
  }
  return found && (x1 - x0) > 20 ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } : null;
}

export async function compositeIntoMarker(roomDataUrl, artworkDataUrl) {
  const [room, art] = await Promise.all([loadImg(roomDataUrl), loadImg(artworkDataUrl)]);

  const canvas = document.createElement('canvas');
  canvas.width = room.naturalWidth || room.width;
  canvas.height = room.naturalHeight || room.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(room, 0, 0);

  const bounds = findMarker(ctx, canvas.width, canvas.height);
  if (!bounds) return roomDataUrl; // fallback: no marker found

  // White background inside marker area first
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h);

  // Draw exact artwork scaled to fill the marker area (cover, centered)
  const scale = Math.min(bounds.w / (art.naturalWidth || art.width), bounds.h / (art.naturalHeight || art.height));
  const sw = (art.naturalWidth || art.width) * scale;
  const sh = (art.naturalHeight || art.height) * scale;
  ctx.drawImage(art, bounds.x + (bounds.w - sw) / 2, bounds.y + (bounds.h - sh) / 2, sw, sh);

  return new Promise(resolve => {
    canvas.toBlob(blob => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.readAsDataURL(blob);
    }, 'image/png');
  });
}
