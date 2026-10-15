import { expectTypeOf } from 'expect-type';
import type { KairoClient, ShardManager, ShardResult } from '../../src/index';

declare module 'kairojs' {
	interface ShardRequests {
		typedExample: { input: { count: number }; output: string };
	}
}
export function verifyShardingTypes(client: KairoClient, manager: ShardManager) {
	expectTypeOf(client.sharding.request(0, 'typedExample', { count: 1 })).toEqualTypeOf<Promise<string>>();
	expectTypeOf(manager.broadcast('typedExample', { count: 1 })).toEqualTypeOf<Promise<ShardResult<string>[]>>();
	client.sharding.handle('typedExample', (input, context) => {
		expectTypeOf(input.count).toEqualTypeOf<number>();
		expectTypeOf(context.source).toEqualTypeOf<number | null>();
		return String(input.count);
	});
	// @ts-expect-error Contract rejects wrong input.
	void client.sharding.request(0, 'typedExample', { count: 'bad' });
	// @ts-expect-error Contract rejects wrong handler output.
	client.sharding.handle('typedExample', () => 1);
	// @ts-expect-error No dynamic eval broadcast API.
	void client.sharding.broadcastEval;
}
