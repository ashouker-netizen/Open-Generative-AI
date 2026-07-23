const SCOPE = 'https://www.googleapis.com/auth/drive.file';

let _token = null;
let _tokenExpiry = 0;

function getClientId() {
  return localStorage.getItem('google_drive_client_id') || '';
}
export function saveClientId(id) {
  localStorage.setItem('google_drive_client_id', id.trim());
}
export function hasClientId() {
  return !!getClientId();
}

async function getToken() {
  if (_token && Date.now() < _tokenExpiry) return _token;
  const clientId = getClientId();
  if (!clientId) throw new Error('Google Drive client ID not set');

  const redirectUri = window.location.origin;
  const url =
    `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=token` +
    `&scope=${encodeURIComponent(SCOPE)}`;

  return new Promise((resolve, reject) => {
    const popup = window.open(url, 'google-oauth', 'width=520,height=620,left=200,top=100');
    if (!popup) { reject(new Error('Popup blocked — allow popups for this site')); return; }

    const timer = setInterval(() => {
      try {
        const hash = popup.location.hash;
        if (hash.includes('access_token=')) {
          clearInterval(timer);
          popup.close();
          const params = new URLSearchParams(hash.slice(1));
          const token = params.get('access_token');
          const expiresIn = parseInt(params.get('expires_in') || '3600', 10);
          _token = token;
          _tokenExpiry = Date.now() + (expiresIn - 60) * 1000;
          resolve(token);
        }
      } catch {}
      if (popup.closed) {
        clearInterval(timer);
        if (!_token) reject(new Error('Google auth cancelled'));
      }
    }, 400);
  });
}

async function drivePost(path, body, token) {
  const res = await fetch(`https://www.googleapis.com/drive/v3/${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => res.statusText);
    throw new Error(`Drive API ${res.status}: ${t.slice(0, 200)}`);
  }
  return res.json();
}

async function createFolder(name, parentId, token) {
  const data = await drivePost('files', {
    name,
    mimeType: 'application/vnd.google-apps.folder',
    ...(parentId ? { parents: [parentId] } : {}),
  }, token);
  return data.id;
}

async function uploadFile(name, blob, folderId, token) {
  const meta = JSON.stringify({ name, parents: [folderId], mimeType: 'image/png' });
  const form = new FormData();
  form.append('metadata', new Blob([meta], { type: 'application/json' }));
  form.append('file', blob, name);
  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form }
  );
  if (!res.ok) {
    const t = await res.text().catch(() => res.statusText);
    throw new Error(`Drive upload ${res.status}: ${t.slice(0, 200)}`);
  }
  return res.json();
}

// Main export: create folder structure and upload all ratio sizes
export async function savePrintToDrive(folderName, sizedFiles, onProgress) {
  const token = await getToken();

  onProgress?.('Creating Drive folder…');
  const rootId = await createFolder(folderName, null, token);

  for (const { ratio, files } of sizedFiles) {
    onProgress?.(`Uploading ${ratio} files…`);
    const subId = await createFolder(ratio, rootId, token);
    for (const { label, blob } of files) {
      await uploadFile(`${label}.png`, blob, subId, token);
    }
  }

  return `https://drive.google.com/drive/folders/${rootId}`;
}
