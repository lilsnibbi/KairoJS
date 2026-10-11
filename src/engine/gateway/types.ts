import type {
	GatewayDispatchEvents,
	GatewayDispatchPayload,
	GatewayMessageUpdateDispatch,
	GatewayMessageUpdateDispatchData,
	GatewayReceivePayload
} from 'discord-api-types/v10';

/** Conservatively accept omitted update fields while retaining every native field type. */
export type $MessageUpdateData = Partial<GatewayMessageUpdateDispatchData> & Pick<GatewayMessageUpdateDispatchData, 'id' | 'channel_id'>;
export type $GatewayDispatch =
	| Exclude<GatewayDispatchPayload, { t: GatewayDispatchEvents.MessageUpdate }>
	| (Omit<GatewayMessageUpdateDispatch, 'd'> & { d: $MessageUpdateData });
export type $GatewayPacket = Exclude<GatewayReceivePayload, GatewayDispatchPayload> | $GatewayDispatch;
