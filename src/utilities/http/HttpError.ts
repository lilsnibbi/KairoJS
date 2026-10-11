/** A non-successful HTTP response. The body is consumed once and retained as text. */
export class HttpError extends Error {
	override name = 'HttpError';
	constructor(
		readonly url: string,
		readonly status: number,
		readonly response: Response,
		readonly body: string
	) {
		super(`Request to "${url}" failed with HTTP ${status}.`);
	}
	/** Parse the saved body as JSON. */
	json(): unknown {
		return JSON.parse(this.body);
	}
}
