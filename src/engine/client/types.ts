import type { APIMessage, GatewayReadyDispatchData, GatewayResumedDispatch } from 'discord-api-types/v10';
import type { $CacheDeletion, $CacheEntry, $CacheOptions } from '../cache/types';
import type { $Clock } from '../common';
import type { $GatewayOptions, $GatewayState } from '../gateway/GatewayShard';
import type { $GatewayDispatch, $MessageUpdateData } from '../gateway/types';
import type { $RestOptions } from '../rest/RestClient';
import type { EngineInteraction } from './EngineInteraction';
import type { EngineMessage } from './EngineMessage';

export interface $EngineFailure {
	source: 'gateway' | 'handler' | 'client';
	error: Error;
	fatal: boolean;
}
export interface $EngineEvents {
	ready: GatewayReadyDispatchData;
	resumed: GatewayResumedDispatch['d'];
	dispatch: $GatewayDispatch;
	messageCreate: EngineMessage;
	messageUpdate: { payload: $MessageUpdateData; cached: $CacheEntry<APIMessage> | undefined };
	interactionCreate: EngineInteraction;
	cacheDelete: $CacheDeletion;
	gatewayState: $GatewayState;
}
export interface $EngineOptions {
	token: string;
	intents: number;
	clock?: $Clock;
	cache?: $CacheOptions;
	rest?: $RestOptions;
	gateway?: Partial<Omit<$GatewayOptions, 'token' | 'intents' | 'clock' | 'identify'>>;
	maxPendingHandlers?: number;
	/** Must return synchronously. Errors thrown here are contained. */
	onError?: (failure: $EngineFailure) => void;
	/** Supply the existing coordinator's permit when multiple processes share a bot. */
	waitForIdentify?: (shardId: number, signal: AbortSignal) => Promise<void>;
}
