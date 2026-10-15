import type { Option } from '../../../result/index';

export interface IUnorderedStrategy {
	/** Matches a flag. */
	matchFlag(input: string): Option<string>;

	/** Matches an option. */
	matchOption(input: string): Option<readonly [key: string, value: string]>;
}
