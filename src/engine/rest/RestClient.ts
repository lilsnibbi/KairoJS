import type {
	APIGuildMember,
	APIMessage,
	RESTGetAPIChannelResult,
	RESTGetAPIGatewayBotResult,
	RESTPostAPIChannelMessageJSONBody,
	RESTPostAPIInteractionCallbackJSONBody
} from 'discord-api-types/v10';
import { Routes } from 'discord-api-types/v10';
import { type $Clock, delay, endpoint, integer, systemClock } from '../common';
import { type $RouteKey, RateLimits, routeKey } from './RateLimits';
import { RequestQueue } from './RequestQueue';
import { RestError } from './RestError';

export type $Fetch = (input: string | URL, init?: RequestInit) => Promise<Response>;
export interface $RestOptions {
	baseURL?: string;
	fetch?: $Fetch;
	clock?: $Clock;
	maxPendingRequests?: number;
	maxConcurrentRequests?: number;
	maxRetries?: number;
	maxRateLimitRetries?: number;
	timeoutMs?: number;
	maxResponseBytes?: number;
}
export interface $RestRequest {
	method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
	path: string;
	body?: unknown;
	auth?: boolean;
	signal?: AbortSignal;
}

async function readResponse(response: Response, maximum: number): Promise<unknown> {
	if (response.status === 204 || !response.body) return undefined;
	const reader = response.body.getReader();
	const chunks: Uint8Array[] = [];
	let size = 0;
	try {
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;
			size += value.byteLength;
			if (size > maximum) throw new Error('REST response exceeds maxResponseBytes.');
			chunks.push(value);
		}
	} catch (error) {
		await reader.cancel().catch(() => {});
		throw error;
	} finally {
		reader.releaseLock();
	}
	const bytes = new Uint8Array(size);
	let offset = 0;
	for (const chunk of chunks) {
		bytes.set(chunk, offset);
		offset += chunk.byteLength;
	}
	const text = new TextDecoder().decode(bytes);
	if (!text) return undefined;
	try {
		return JSON.parse(text) as unknown;
	} catch {
		if (response.ok) throw new Error('REST returned invalid JSON.');
		return text;
	}
}

/** Discord REST over Bun fetch. No environment variables are read by the engine. */
export class RestClient {
	readonly #token: string;
	private readonly fetcher: $Fetch;
	private readonly clock: $Clock;
	private readonly queue: RequestQueue;
	private readonly rates: RateLimits;
	private readonly lifetime = new AbortController();
	private readonly base: string;
	private readonly retries: number;
	private readonly rateRetries: number;
	private readonly timeout: number;
	private readonly responseLimit: number;
	private readonly maximumPending: number;
	private pending = 0;

	public constructor(token: string, options: $RestOptions = {}) {
		this.#token = token;
		if (!token.trim()) throw new TypeError('A bot token is required.');
		this.base = endpoint(options.baseURL ?? 'https://discord.com/api/v10').href.replace(/\/$/, '');
		this.fetcher = options.fetch ?? fetch;
		this.clock = options.clock ?? systemClock;
		this.maximumPending = integer(options.maxPendingRequests ?? 1024, 'maxPendingRequests', 1);
		this.queue = new RequestQueue(this.maximumPending, options.maxConcurrentRequests ?? 8, this.clock);
		this.rates = new RateLimits(this.clock);
		this.retries = integer(options.maxRetries ?? 2, 'maxRetries');
		this.rateRetries = integer(options.maxRateLimitRetries ?? 5, 'maxRateLimitRetries');
		this.timeout = integer(options.timeoutMs ?? 15_000, 'timeoutMs', 1);
		this.responseLimit = integer(options.maxResponseBytes ?? 8 * 1024 * 1024, 'maxResponseBytes', 1);
	}
	public get pendingRequests(): number {
		return this.pending;
	}
	public close(): void {
		this.lifetime.abort(new Error('REST client closed.'));
	}

	public request<T>(request: $RestRequest): Promise<T> {
		if (
			!request.path.startsWith('/') ||
			request.path.startsWith('//') ||
			request.path.includes('\\') ||
			request.path.includes('#') ||
			request.path.charCodeAt(request.path.length - 1) <= 0x20 ||
			/[\t\r\n]/.test(request.path) ||
			request.path
				.replace(/%2e/gi, '.')
				.split(/[/?]/)
				.some((part) => part === '..' || part === '.')
		)
			return Promise.reject(new TypeError('REST paths must be absolute API paths without traversal.'));
		const signal = request.signal ? AbortSignal.any([request.signal, this.lifetime.signal]) : this.lifetime.signal;
		if (signal.aborted) return Promise.reject(signal.reason);
		if (this.pending >= this.maximumPending) return Promise.reject(new Error('REST queue capacity exceeded.'));
		let body: string | undefined;
		try {
			body = request.body === undefined ? undefined : JSON.stringify(request.body);
		} catch (error) {
			return Promise.reject(error);
		}
		const snapshot = { ...request };
		this.pending++;
		return this.execute<T>(snapshot, body, signal).finally(() => {
			this.pending--;
		});
	}
	private async execute<T>(request: $RestRequest, body: string | undefined, signal: AbortSignal): Promise<T> {
		const route = routeKey(request.method, request.path);
		const safeRetry = ['GET', 'PUT', 'DELETE'].includes(request.method);
		let attempts = 0;
		let rateAttempts = 0;
		for (;;) {
			signal.throwIfAborted();
			let response: Response;
			let result: unknown;
			try {
				({ response, result } = await this.queue.add(
					() => this.attempt(request, body, signal, route),
					signal,
					() => this.rates.key(route),
					() => this.rates.readyAt(route)
				));
			} catch (error) {
				signal.throwIfAborted();
				if (!safeRetry || attempts++ >= this.retries) throw error;
				await delay(this.clock, Math.min(500 * 2 ** (attempts - 1), 8000), signal);
				continue;
			}
			if (response.status === 429) {
				if (rateAttempts++ >= this.rateRetries) throw new RestError(response.status, result);
				continue;
			}
			if (response.status >= 500 && safeRetry && attempts++ < this.retries) {
				await delay(this.clock, Math.min(500 * 2 ** (attempts - 1), 8000), signal);
				continue;
			}
			if (!response.ok) throw new RestError(response.status, result);
			return result as T;
		}
	}
	private async attempt(
		request: $RestRequest,
		body: string | undefined,
		signal: AbortSignal,
		route: $RouteKey
	): Promise<{ response: Response; result: unknown }> {
		signal.throwIfAborted();
		const controller = new AbortController();
		const attemptSignal = AbortSignal.any([signal, controller.signal]);
		const timer = this.clock.setTimeout(() => controller.abort(new Error('REST request timed out.')), this.timeout);
		try {
			const headers = new Headers({ 'User-Agent': 'KairoEngine (https://discord.com/developers/docs, 0.1.0)' });
			if (request.auth !== false) headers.set('Authorization', `Bot ${this.#token}`);
			if (body !== undefined) headers.set('Content-Type', 'application/json');
			const response = await this.fetcher(this.base + request.path, {
				method: request.method,
				headers,
				body,
				signal: attemptSignal,
				redirect: 'error'
			});
			this.rates.observe(route, response.headers);
			const result = await readResponse(response, this.responseLimit);
			attemptSignal.throwIfAborted();
			// Publish cooldowns before releasing this bucket's scheduler slot.
			if (response.status === 429) this.rates.limited(route, response.headers, result);
			return { response, result };
		} finally {
			this.clock.clearTimeout(timer);
		}
	}
	public getGatewayBot(signal?: AbortSignal): Promise<RESTGetAPIGatewayBotResult> {
		return this.request({ method: 'GET', path: Routes.gatewayBot(), signal });
	}
	public getMember(guildId: string, userId: string, signal?: AbortSignal): Promise<APIGuildMember> {
		return this.request({ method: 'GET', path: Routes.guildMember(guildId, userId), signal });
	}
	public getChannel(channelId: string, signal?: AbortSignal): Promise<RESTGetAPIChannelResult> {
		return this.request({ method: 'GET', path: Routes.channel(channelId), signal });
	}
	public getMessage(channelId: string, messageId: string, signal?: AbortSignal): Promise<APIMessage> {
		return this.request({ method: 'GET', path: Routes.channelMessage(channelId, messageId), signal });
	}
	public createMessage(channelId: string, body: RESTPostAPIChannelMessageJSONBody, signal?: AbortSignal): Promise<APIMessage> {
		return this.request({ method: 'POST', path: Routes.channelMessages(channelId), body, signal });
	}
	public interactionCallback(id: string, token: string, body: RESTPostAPIInteractionCallbackJSONBody, signal?: AbortSignal): Promise<void> {
		return this.request({ method: 'POST', path: Routes.interactionCallback(id, token), auth: false, body, signal });
	}
}
