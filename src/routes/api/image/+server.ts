import { error, type RequestHandler } from '@sveltejs/kit';

const MAX_BYTES = 25 * 1024 * 1024;
const TIMEOUT_MS = 15_000;

/**
 * Same-origin image proxy so cross-origin URLs without CORS headers still work.
 * Restricted to public http(s) hosts to limit SSRF.
 * ponytail: hostname and literal IP checks only, DNS rebinding is not covered,
 * resolve the host and check the IP if this is ever exposed to untrusted traffic
 */
export const GET: RequestHandler = async ({ url, fetch }) => {
	const target = url.searchParams.get('url');
	if (!target) throw error(400, 'missing url');

	let parsed: URL;
	try {
		parsed = new URL(target);
	} catch {
		throw error(400, 'invalid url');
	}
	if (!isPublicHttpUrl(parsed)) throw error(400, 'url not allowed');

	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

	try {
		const response = await fetch(parsed.href, {
			signal: controller.signal,
			redirect: 'follow',
			headers: { accept: 'image/*' }
		});
		if (!response.ok) throw error(502, 'upstream error');
		const finalUrl = response.url;
		if (finalUrl && !isPublicHttpUrl(new URL(finalUrl))) throw error(400, 'redirect not allowed');

		const type = response.headers.get('content-type') ?? '';
		if (!type.startsWith('image/')) throw error(415, 'not an image');

		const body = await readCapped(response, MAX_BYTES);
		return new Response(body, {
			headers: { 'content-type': type, 'cache-control': 'public, max-age=3600' }
		});
	} finally {
		clearTimeout(timer);
	}
};

async function readCapped(response: Response, max: number): Promise<ArrayBuffer> {
	const reader = response.body?.getReader();
	if (!reader) {
		const buffer = await response.arrayBuffer();
		if (buffer.byteLength > max) throw error(413, 'image too large');
		return buffer;
	}

	const chunks: Uint8Array[] = [];
	let total = 0;
	for (;;) {
		const { done, value } = await reader.read();
		if (done) break;
		total += value.byteLength;
		if (total > max) {
			await reader.cancel();
			throw error(413, 'image too large');
		}
		chunks.push(value);
	}

	const merged = new Uint8Array(total);
	let offset = 0;
	for (const chunk of chunks) {
		merged.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return merged.buffer;
}

function isPublicHttpUrl(url: URL): boolean {
	if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
	if (url.username || url.password) return false;

	const host = url.hostname.toLowerCase();
	if (host === 'localhost' || host.endsWith('.localhost')) return false;
	if (host.endsWith('.local') || host.endsWith('.internal')) return false;
	if (host === '0.0.0.0' || host === '::1' || host === '[::1]') return false;
	return !isPrivateIpv4(host);
}

function isPrivateIpv4(host: string): boolean {
	const match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
	if (!match) return false;

	const [a, b] = [Number(match[1]), Number(match[2])];
	if (a === 10 || a === 127) return true;
	if (a === 169 && b === 254) return true;
	if (a === 172 && b >= 16 && b <= 31) return true;
	if (a === 192 && b === 168) return true;
	return false;
}
