/** A failed HTTP response; paths never expose interaction or webhook tokens. */
export class RestError extends Error {
	public constructor(
		public readonly status: number,
		public readonly body: unknown
	) {
		super(`Discord REST returned HTTP ${status}`);
		this.name = 'RestError';
	}
}
