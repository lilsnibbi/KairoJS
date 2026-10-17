/** The four methods Rilo uses. Existing logger instances stay untouched. */
export interface LoggerLike {
	/**
	 * Write diagnostic detail.
	 * @param value - Log value.
	 * @returns The logger’s own result; Rilo ignores it.
	 */
	debug(value: unknown): unknown;
	/**
	 * Write an informational notice.
	 * @param value - Log value.
	 * @returns The logger’s own result; Rilo ignores it.
	 */
	notif(value: unknown): unknown;
	/**
	 * Write a warning.
	 * @param value - Log value.
	 * @returns The logger’s own result; Rilo ignores it.
	 */
	alert(value: unknown): unknown;
	/**
	 * Write a failure.
	 * @param value - Log value, usually an Error.
	 * @returns The logger’s own result; Rilo ignores it.
	 */
	error(value: unknown): unknown;
}
