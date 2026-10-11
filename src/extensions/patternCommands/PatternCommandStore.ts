import { AliasModuleStore } from '../../core/modules/index';
import { PatternCommand } from './PatternCommand';

export class PatternCommandStore extends AliasModuleStore<PatternCommand> {
	public constructor() {
		super(PatternCommand, { name: 'patterns' });
	}
}
