// Only the example subprocess loads this preload. No Discord request leaves the fixture.
const originalFetch = globalThis.fetch;
globalThis.fetch = Object.assign(async (input: RequestInfo | URL): Promise<Response> => {
	if (String(input) !== 'https://discord.com/api/v10/gateway/bot') throw new Error('Unexpected fixture HTTP request.');
	return Response.json({ session_start_limit: { total: 10, remaining: 10, reset_after: 60000, max_concurrency: 1 } });
}, originalFetch);
