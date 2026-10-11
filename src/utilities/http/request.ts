import { HttpError } from './HttpError';

export type ResponseFormat = 'json' | 'text' | 'bytes' | 'blob' | 'response';
export type HttpRequestOptions = RequestInit & { json?: unknown; response?: ResponseFormat };
export function request<T = unknown>(url: URL | string, options?: HttpRequestOptions & { response?: 'json' }): Promise<T>;
export function request(url: URL | string, options: HttpRequestOptions & { response: 'text' }): Promise<string>;
export function request(url: URL | string, options: HttpRequestOptions & { response: 'bytes' }): Promise<Uint8Array>;
export function request(url: URL | string, options: HttpRequestOptions & { response: 'blob' }): Promise<Blob>;
export function request(url: URL | string, options: HttpRequestOptions & { response: 'response' }): Promise<Response>;
/** Native fetch with an explicit JSON body, response format and HTTP errors. */
export async function request(url: URL | string, options: HttpRequestOptions = {}): Promise<unknown> {
	const { response = 'json', json, ...init } = options;
	if (!['json', 'text', 'bytes', 'blob', 'response'].includes(response)) throw new TypeError(`Unknown response format "${response}".`);
	if ('json' in options) {
		if ('body' in options) throw new TypeError('Use either json or body, not both.');
		init.body = JSON.stringify(json);
		if (init.body === undefined) throw new TypeError('The JSON body is not serializable.');
		const headers = new Headers(init.headers);
		if (!headers.has('content-type')) headers.set('content-type', 'application/json');
		init.headers = headers;
	}
	const result = await fetch(url, init);
	if (!result.ok) throw new HttpError(String(url), result.status, result, await result.text());
	switch (response) {
		case 'response':
			return result;
		case 'text':
			return result.text();
		case 'bytes':
			return result.bytes();
		case 'blob':
			return result.blob();
		default:
			return result.status === 204 || result.status === 205 ? undefined : result.json();
	}
}
