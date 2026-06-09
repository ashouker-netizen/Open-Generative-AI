import { NextResponse } from 'next/server';

const FAL_QUEUE_BASE = 'https://queue.fal.run';
const FAL_FILES_BASE = 'https://api.fal.ai/v1/serverless/files';

function getApiKey(request) {
  const headerKey = request.headers.get('x-api-key');
  if (headerKey) return headerKey;
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  if (authHeader?.startsWith('Key ')) return authHeader.slice(4).trim();
  return request.cookies.get('fal_key')?.value;
}

function cleanHeaders(request) {
  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('connection');
  headers.delete('cookie');
  headers.delete('content-length');
  headers.delete('origin');
  headers.delete('referer');
  return headers;
}

function asAuthHeaders(request) {
  const headers = cleanHeaders(request);
  const apiKey = getApiKey(request);
  if (apiKey) headers.set('Authorization', `Key ${apiKey}`);
  return headers;
}

async function forwardJsonResponse(response) {
  const text = await response.text();
  const contentType = response.headers.get('content-type') || 'application/json';
  if (contentType.includes('application/json')) {
    try {
      return NextResponse.json(JSON.parse(text), { status: response.status });
    } catch {
      return new NextResponse(text, {
        status: response.status,
        headers: { 'content-type': contentType },
      });
    }
  }
  return new NextResponse(text, {
    status: response.status,
    headers: { 'content-type': contentType },
  });
}

function getRouteInfo(params) {
  const pathSegments = params?.path || [];
  const [scope, ...rest] = pathSegments;
  return { scope, rest };
}

async function proxyQueue(request, rest) {
  const targetUrl = `${FAL_QUEUE_BASE}/${rest.join('/')}${new URL(request.url).search}`;
  const headers = asAuthHeaders(request);
  const method = request.method.toUpperCase();
  const init = { method, headers };
  if (method !== 'GET' && method !== 'HEAD') {
    init.body = await request.arrayBuffer();
  }
  const response = await fetch(targetUrl, init);
  return forwardJsonResponse(response);
}

async function proxyFiles(request, rest) {
  const targetUrl = `${FAL_FILES_BASE}/${rest.join('/')}${new URL(request.url).search}`;
  const headers = asAuthHeaders(request);
  const method = request.method.toUpperCase();
  const init = { method, headers };
  if (method !== 'GET' && method !== 'HEAD') {
    init.body = await request.arrayBuffer();
  }
  const response = await fetch(targetUrl, init);
  return forwardJsonResponse(response);
}

export async function GET(request, context) {
  const { scope, rest } = getRouteInfo(await context.params);
  if (scope === 'queue') return proxyQueue(request, rest);
  if (scope === 'files') return proxyFiles(request, rest);
  return NextResponse.json({ error: 'Unknown fal route' }, { status: 404 });
}

export async function POST(request, context) {
  const { scope, rest } = getRouteInfo(await context.params);
  if (scope === 'queue') return proxyQueue(request, rest);
  if (scope === 'files') return proxyFiles(request, rest);
  return NextResponse.json({ error: 'Unknown fal route' }, { status: 404 });
}

export async function PUT(request, context) {
  const { scope, rest } = getRouteInfo(await context.params);
  if (scope === 'queue') return proxyQueue(request, rest);
  if (scope === 'files') return proxyFiles(request, rest);
  return NextResponse.json({ error: 'Unknown fal route' }, { status: 404 });
}

export async function DELETE(request, context) {
  const { scope, rest } = getRouteInfo(await context.params);
  if (scope === 'queue') return proxyQueue(request, rest);
  if (scope === 'files') return proxyFiles(request, rest);
  return NextResponse.json({ error: 'Unknown fal route' }, { status: 404 });
}
