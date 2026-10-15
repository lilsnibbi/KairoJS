// Inspired by DiscordPagination. Copyright (c) 2026 lilsnibbi. MIT; see ../../../../LICENSE and ../../../../docs/source-retention.md.
import { randomUUIDv7 } from 'bun';
import {
	ActionRowBuilder,
	type APIContainerComponent,
	ButtonBuilder,
	type ButtonInteraction,
	ButtonStyle,
	ComponentType,
	ContainerBuilder,
	EmbedBuilder,
	Events,
	type Interaction,
	type InteractionCollector,
	type JSONEncodable,
	LabelBuilder,
	type Message,
	MessageFlags,
	ModalBuilder,
	type ModalSubmitInteraction,
	type RepliableInteraction,
	TextDisplayBuilder,
	TextInputBuilder,
	TextInputStyle
} from 'discord.js';
import { container } from '../../../core/Container';
import { fallbackLogger } from '../../../core/logging/console';
import { writeEvent } from '../../../core/logging/diagnostics';

const DATA: unique symbol = Symbol('paginationData');
const BUTTONS: unique symbol = Symbol('paginationButtons');
type ContainerChild = APIContainerComponent['components'][number];
export type PaginationLayoutItem = string | JSONEncodable<ContainerChild> | typeof DATA | typeof BUTTONS;
export type PaginationTarget = Message | RepliableInteraction;
export type PaginationEndReason = 'idle' | 'stopped' | 'empty' | 'singlePage' | 'deleted' | 'error' | string;
export interface PaginationButtonOptions {
	label?: string;
	emoji?: string;
	style?: ButtonStyle.Primary | ButtonStyle.Secondary | ButtonStyle.Success | ButtonStyle.Danger;
}
export interface PaginationBaseOptions {
	entriesPerPage?: number;
	idleTimeout?: number;
	modalTimeout?: number;
	ephemeral?: boolean;
	showSkipButtons?: boolean;
	emptyContent?: string;
	replacements?: Readonly<Record<string, string>>;
	buttons?: Partial<Record<'first' | 'back' | 'jump' | 'next' | 'last', PaginationButtonOptions>>;
	onEnd?: (reason: PaginationEndReason) => unknown | Promise<unknown>;
	onError?: (error: unknown) => unknown | Promise<unknown>;
}
export type PaginationOptions = PaginationBaseOptions &
	(
		| { type: 'embed'; embed?: EmbedBuilder }
		| { type: 'container'; layout?: readonly PaginationLayoutItem[]; accentColor?: number; spoiler?: boolean }
	);

const allowedMentions = { parse: [] as [], repliedUser: false };
const actions = ['first', 'back', 'jump', 'next', 'last'] as const;
type Action = (typeof actions)[number];
type Mode =
	| { type: 'embed'; embed: ReturnType<EmbedBuilder['toJSON']> }
	| { type: 'container'; layout: (ContainerChild | typeof DATA | typeof BUTTONS)[]; accentColor?: number; spoiler?: boolean };

/** One list, one message, and controls scoped to its original user. */
export class Pagination {
	static readonly DATA: typeof DATA = DATA;
	static readonly BUTTONS: typeof BUTTONS = BUTTONS;
	private readonly entries: readonly string[];
	private readonly options: PaginationBaseOptions;
	private readonly mode: Mode;
	private readonly prefix = `kairo:${randomUUIDv7()}:`;
	private readonly size: number;
	private readonly pages: number;
	private pageIndex = 0;
	private sent = false;
	private ended = false;
	private owner = '';
	private message?: Message;
	private interaction?: RepliableInteraction;
	private collector?: InteractionCollector<ButtonInteraction>;
	private queue = Promise.resolve();
	private stopping?: Promise<void>;
	private readonly modals = new Set<() => void>();

	constructor(entries: readonly string[], options: PaginationOptions = { type: 'embed' }) {
		this.size = options.entriesPerPage ?? 5;
		for (const [name, value] of Object.entries({
			entriesPerPage: this.size,
			idleTimeout: options.idleTimeout ?? 60000,
			modalTimeout: options.modalTimeout ?? 60000
		}))
			if (!Number.isSafeInteger(value) || value <= 0 || value > 2147483647)
				throw new RangeError(`${name} must be a positive integer no larger than 2147483647.`);
		if (entries.some((entry) => typeof entry !== 'string')) throw new TypeError('Pagination entries must be strings.');
		this.entries = [...entries];
		this.pages = Math.max(1, Math.ceil(entries.length / this.size));
		this.options = {
			...options,
			replacements: options.replacements && { ...options.replacements },
			buttons: options.buttons && structuredClone(options.buttons)
		};
		if (options.type === 'container') {
			const layout = options.layout ?? [DATA, BUTTONS];
			if (layout.filter((item) => item === DATA).length !== 1 || layout.filter((item) => item === BUTTONS).length !== 1)
				throw new TypeError('Container layouts need exactly one Pagination.DATA and one Pagination.BUTTONS.');
			this.mode = {
				type: 'container',
				accentColor: options.accentColor,
				spoiler: options.spoiler,
				layout: layout.map((item) =>
					item === DATA || item === BUTTONS
						? item
						: typeof item === 'string'
							? new TextDisplayBuilder().setContent(item).toJSON()
							: structuredClone(item.toJSON())
				)
			};
		} else this.mode = { type: 'embed', embed: structuredClone((options.embed ?? new EmbedBuilder()).toJSON()) };
		for (let page = 0; page < this.pages; page++) {
			const content = this.content(page);
			if (!content || content.length > (this.mode.type === 'embed' ? 4096 : 4000))
				throw new RangeError(`Pagination page ${page + 1} exceeds the text limit or is empty. Reduce entriesPerPage.`);
		}
	}

	/** The displayed page, starting at one. */
	get page(): number {
		return this.pageIndex + 1;
	}
	get pageCount(): number {
		return this.pages;
	}
	get stopped(): boolean {
		return this.ended;
	}

	/** Send once. Fresh interactions are deferred before rendering. */
	async send(target: PaginationTarget): Promise<Message> {
		if (this.sent || this.ended) throw new Error('A Pagination instance can only be sent once.');
		this.sent = true;
		try {
			if ('deferReply' in target) {
				this.interaction = target;
				this.owner = target.user.id;
				if (!target.deferred && !target.replied)
					await target.deferReply({ flags: this.options.ephemeral ? MessageFlags.Ephemeral : undefined });
				this.message = await target.editReply(this.payload());
			} else {
				this.owner = target.author.id;
				this.message = await target.reply(this.payload());
			}
			if (this.ended) {
				await this.render();
				return this.message;
			}
			if (this.pages === 1) {
				await this.stop(this.entries.length ? 'singlePage' : 'empty');
				return this.message;
			}
			const collector = this.message.createMessageComponentCollector({
				componentType: ComponentType.Button,
				idle: this.options.idleTimeout ?? 60000,
				filter: (button) => this.action(button.customId) !== undefined && button.user.id === this.owner
			});
			this.collector = collector;
			collector.on('collect', (button) => {
				void this.handle(button).catch((error) => this.fail(error));
			});
			collector.on('ignore', (button) => {
				if (this.action(button.customId) !== undefined && button.user.id !== this.owner)
					void button.deferUpdate().catch((error) => this.report(error));
			});
			collector.on('end', (_collected, reason) => {
				void this.stop(reason).catch((error) => this.report(error));
			});
			return this.message;
		} catch (error) {
			this.ended = true;
			this.cleanup();
			throw error;
		}
	}

	/** Stop collectors and disable controls after any queued update finishes. */
	stop(reason: PaginationEndReason = 'stopped'): Promise<void> {
		if (this.stopping) return this.stopping;
		this.ended = true;
		// Assign the promise before stopping the collector, whose end event is synchronous.
		this.stopping = Promise.resolve().then(async () => {
			this.cleanup();
			await this.queue;
			try {
				if (this.message) await this.render();
			} catch (error) {
				if (!this.isDeleted(error)) this.report(error);
			}
			await this.options.onEnd?.(reason);
		});
		return this.stopping;
	}

	private cleanup(): void {
		this.collector?.stop('stopped');
		for (const cancel of this.modals) cancel();
		this.modals.clear();
	}
	private action(id: string): Action | undefined {
		return actions.find((action) => id === this.prefix + action);
	}
	private async handle(button: ButtonInteraction): Promise<void> {
		if (this.ended) {
			await button.deferUpdate();
			return;
		}
		const action = this.action(button.customId);
		if (action === 'jump') {
			await this.openModal(button);
			return;
		}
		await button.deferUpdate();
		this.enqueue(() => {
			if (action === 'first') this.pageIndex = 0;
			else if (action === 'last') this.pageIndex = this.pages - 1;
			else this.pageIndex = Math.max(0, Math.min(this.pages - 1, this.pageIndex + (action === 'back' ? -1 : 1)));
		});
	}
	private enqueue(change: () => void): void {
		this.queue = this.queue
			.then(async () => {
				if (!this.ended) {
					change();
					await this.render();
				}
			})
			.catch((error) => this.fail(error));
	}
	private async openModal(button: ButtonInteraction): Promise<void> {
		const id = `${this.prefix}jump:${randomUUIDv7()}`;
		const input = 'page';
		const modal = new ModalBuilder()
			.setCustomId(id)
			.setTitle('Jump to page')
			.addLabelComponents(
				new LabelBuilder()
					.setLabel(`Page number (1–${this.pages})`)
					.setTextInputComponent(
						new TextInputBuilder()
							.setCustomId(input)
							.setStyle(TextInputStyle.Short)
							.setRequired(true)
							.setMinLength(1)
							.setMaxLength(String(this.pages).length)
					)
			);
		const listener = (interaction: Interaction) => {
			if (!interaction.isModalSubmit() || interaction.customId !== id || interaction.user.id !== this.owner) return;
			cancel();
			void this.submit(interaction, input).catch((error) => this.fail(error));
		};
		const timeout = setTimeout(() => cancel(), this.options.modalTimeout ?? 60000);
		const cancel = () => {
			clearTimeout(timeout);
			button.client.off(Events.InteractionCreate, listener);
			this.modals.delete(cancel);
		};
		this.modals.add(cancel);
		button.client.on(Events.InteractionCreate, listener);
		try {
			await button.showModal(modal);
		} catch (error) {
			cancel();
			throw error;
		}
	}
	private async submit(submission: ModalSubmitInteraction, input: string): Promise<void> {
		if (this.ended) {
			await submission.deferUpdate();
			return;
		}
		const value = submission.fields.getTextInputValue(input).trim();
		const page = /^\d+$/.test(value) ? Number(value) : NaN;
		if (!Number.isSafeInteger(page) || page < 1 || page > this.pages) {
			await submission.reply({ content: `Choose a page from 1 to ${this.pages}.`, flags: MessageFlags.Ephemeral, allowedMentions });
			return;
		}
		await submission.deferUpdate();
		if (!this.ended) this.collector?.resetTimer();
		this.enqueue(() => {
			this.pageIndex = page - 1;
		});
	}
	private content(page: number): string {
		let text = this.entries.length
			? this.entries.slice(page * this.size, (page + 1) * this.size).join('\n')
			: (this.options.emptyContent ?? 'No data to show');
		for (const [key, value] of Object.entries(this.options.replacements ?? {})) if (key) text = text.replaceAll(key, () => value);
		return text;
	}
	private row(): ActionRowBuilder<ButtonBuilder> {
		const create = (action: Action, label: string, disabled: boolean) => {
			const options = this.options.buttons?.[action];
			const button = new ButtonBuilder()
				.setCustomId(this.prefix + action)
				.setLabel(options?.label ?? label)
				.setStyle(options?.style ?? ButtonStyle.Secondary)
				.setDisabled(this.ended || disabled);
			if (options?.emoji) button.setEmoji(options.emoji);
			return button;
		};
		const buttons = [
			create('back', 'Previous', this.pageIndex === 0),
			create('jump', `${this.page}/${this.pages}`, this.pages === 1),
			create('next', 'Next', this.pageIndex === this.pages - 1)
		];
		if (this.options.showSkipButtons) {
			buttons.unshift(create('first', 'First', this.pageIndex === 0));
			buttons.push(create('last', 'Last', this.pageIndex === this.pages - 1));
		}
		return new ActionRowBuilder<ButtonBuilder>().addComponents(buttons);
	}
	private payload() {
		const mode = this.mode;
		if (mode.type === 'embed')
			return {
				embeds: [new EmbedBuilder(mode.embed).setDescription(this.content(this.pageIndex))],
				components: this.entries.length ? [this.row()] : [],
				allowedMentions
			};
		const components = mode.layout.flatMap((item) =>
			item === DATA
				? [new TextDisplayBuilder().setContent(this.content(this.pageIndex)).toJSON()]
				: item === BUTTONS
					? this.entries.length
						? [this.row().toJSON()]
						: []
					: [structuredClone(item)]
		);
		return {
			components: [new ContainerBuilder({ components, accent_color: mode.accentColor, spoiler: mode.spoiler })],
			flags: MessageFlags.IsComponentsV2 as const,
			allowedMentions
		};
	}
	private async render(): Promise<void> {
		if (this.interaction) await this.interaction.editReply(this.payload());
		else await this.message?.edit(this.payload());
	}
	private isDeleted(error: unknown): boolean {
		return typeof error === 'object' && error !== null && 'code' in error && error.code === 10008;
	}
	private fail(error: unknown): void {
		if (!this.isDeleted(error)) this.report(error);
		void this.stop(this.isDeleted(error) ? 'deleted' : 'error').catch((cause) => this.report(cause));
	}
	private report(error: unknown): void {
		if (!this.options.onError) {
			this.logError(error);
			return;
		}
		const callbackFailed = (cause: unknown) => this.logError(new AggregateError([error, cause], 'Pagination error callback failed.'));
		try {
			void Promise.resolve(this.options.onError(error)).catch(callbackFailed);
		} catch (cause) {
			callbackFailed(cause);
		}
	}
	private logError(error: unknown): void {
		try {
			writeEvent(container.logger ?? fallbackLogger(), 'error', {
				component: 'pagination',
				event: 'interaction_failed',
				message: 'Pagination interaction failed.',
				error
			});
		} catch (cause) {
			writeEvent(fallbackLogger(), 'error', {
				component: 'pagination',
				event: 'error_reporting_failed',
				message: 'Pagination error reporting failed.',
				error: new AggregateError([error, cause])
			});
		}
	}
}
