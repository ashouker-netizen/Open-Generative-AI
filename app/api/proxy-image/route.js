export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');
  if (!url) return new Response('Missing url param', { status: 400 });

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
    });
    if (!res.ok) return new Response(`Upstream ${res.status}`, { status: res.status });
    const buffer = await res.arrayBuffer();
    return new Response(buffer, {
      headers: { 'Content-Type': res.headers.get('content-type') || 'image/jpeg' },
    });
  } catch (err) {
    return new Response(`Proxy error: ${err.message}`, { status: 502 });
  }
}
