import type {
	APIInteraction,
	APIInteractionResponseCallbackData,
	RESTPostAPIInteractionCallbackJSONBody,
} from "discord-api-types/v10";
import {
	InteractionResponseType,
	InteractionType,
} from "discord-api-types/v10";
import type { RestClient } from "../rest/RestClient";
import { RestError } from "../rest/RestError";

export type $InteractionReplyState =
	"unanswered" | "pending" | "answered" | "unknown";

/** Uses native callback bodies and prevents concurrent initial responses. */
export class EngineInteraction {
	private current: $InteractionReplyState = "unanswered";
	public constructor(
		public readonly data: APIInteraction,
		private readonly rest: RestClient,
	) {}
	public get replyState(): $InteractionReplyState {
		return this.current;
	}
	public reply(data: APIInteractionResponseCallbackData): Promise<void> {
		if (
			![
				InteractionType.ApplicationCommand,
				InteractionType.MessageComponent,
				InteractionType.ModalSubmit,
			].includes(this.data.type)
		)
			return Promise.reject(
				new TypeError(
					"This interaction requires a different native callback type.",
				),
			);
		return this.respond({
			type: InteractionResponseType.ChannelMessageWithSource,
			data,
		});
	}
	public async respond(
		body: RESTPostAPIInteractionCallbackJSONBody,
	): Promise<void> {
		if (this.current !== "unanswered")
			throw new Error(
				"Interaction initial response is already pending or consumed.",
			);
		this.current = "pending";
		try {
			await this.rest.interactionCallback(this.data.id, this.data.token, body);
			this.current = "answered";
		} catch (error) {
			this.current =
				error instanceof RestError && error.status >= 400 && error.status < 500
					? "unanswered"
					: "unknown";
			throw error;
		}
	}
}
