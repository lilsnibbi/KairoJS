import { Result } from '../../../../utilities/result/index';
import type { PreconditionContainerResult } from '../Container';
import type { IPreconditionCondition } from './Condition';

/** An {@link IPreconditionCondition} which runs all containers similarly to doing (V0 || V1 [|| V2 [|| V3 ...]]). */
export const PreconditionConditionOr: IPreconditionCondition = {
	async messageSequential(message, command, entries, context) {
		let error: PreconditionContainerResult | null = null;
		for (const child of entries) {
			const result = await child.messageRun(message, command, context);
			if (result.isOk()) return result;
			error = result;
		}

		return error ?? Result.ok();
	},
	async messageParallel(message, command, entries, context) {
		const results = await Promise.all(entries.map((entry) => entry.messageRun(message, command, context)));

		let error: PreconditionContainerResult | null = null;
		for (const result of results) {
			if (result.isOk()) return result;
			error = result;
		}

		return error ?? Result.ok();
	},
	async chatInputSequential(interaction, command, entries, context) {
		let error: PreconditionContainerResult | null = null;
		for (const child of entries) {
			const result = await child.chatInputRun(interaction, command, context);
			if (result.isOk()) return result;
			error = result;
		}

		return error ?? Result.ok();
	},
	async chatInputParallel(interaction, command, entries, context) {
		const results = await Promise.all(entries.map((entry) => entry.chatInputRun(interaction, command, context)));

		let error: PreconditionContainerResult | null = null;
		for (const result of results) {
			if (result.isOk()) return result;
			error = result;
		}

		return error ?? Result.ok();
	},
	async contextMenuSequential(interaction, command, entries, context) {
		let error: PreconditionContainerResult | null = null;
		for (const child of entries) {
			const result = await child.contextMenuRun(interaction, command, context);
			if (result.isOk()) return result;
			error = result;
		}

		return error ?? Result.ok();
	},
	async contextMenuParallel(interaction, command, entries, context) {
		const results = await Promise.all(entries.map((entry) => entry.contextMenuRun(interaction, command, context)));

		let error: PreconditionContainerResult | null = null;
		for (const result of results) {
			if (result.isOk()) return result;
			error = result;
		}

		return error ?? Result.ok();
	}
};
