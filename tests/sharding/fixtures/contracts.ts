declare module 'kairojs' {
	interface ShardRequests {
		probe: { input: { value: number }; output: { shard: number; pid: number; value: number; source: number | null } };
		relay: { input: { target: number; value: number }; output: { shard: number; pid: number; value: number; source: number | null } };
		all: { input: null; output: number[] };
		fail: { input: null; output: null };
		slow: { input: { ms: number }; output: string };
		abortCount: { input: null; output: number };
		crash: { input: null; output: null };
		identify: { input: null; output: { at: number; hooked: boolean } };
		loginState: { input: null; output: boolean };
		oversized: { input: null; output: string };
		lossy: { input: null; output: unknown };
		hung: { input: null; output: null };
	}
}

export {};
