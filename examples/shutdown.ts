export function onShutdown(close: () => Promise<unknown>): void {
	let closing = false;
	const stop = () => {
		if (closing) return;
		closing = true;
		void close().catch((error) => {
			console.error('Shutdown failed:', error);
			process.exitCode = 1;
		});
	};
	process.once('SIGINT', stop);
	process.once('SIGTERM', stop);
}
