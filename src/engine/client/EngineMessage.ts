import type {
	APIMessage,
	RESTPostAPIChannelMessageJSONBody,
} from "discord-api-types/v10";
import type { RestClient } from "../rest/RestClient";

/** A thin helper over a native message object; data may be a live cache object. */
export class EngineMessage {
	public constructor(
		public readonly data: APIMessage,
		private readonly rest: RestClient,
	) {}
	public reply(body: RESTPostAPIChannelMessageJSONBody): Promise<APIMessage> {
		return this.rest.createMessage(this.data.channel_id, {
			...body,
			message_reference: {
				message_id: this.data.id,
				channel_id: this.data.channel_id,
				...body.message_reference,
			},
		});
	}
}
