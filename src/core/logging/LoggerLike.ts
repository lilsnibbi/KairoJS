/** The four methods KairoJS uses. Existing logger instances stay untouched. */
export interface LoggerLike {
	debug(value: unknown): unknown;
	notif(value: unknown): unknown;
	alert(value: unknown): unknown;
	error(value: unknown): unknown;
}
