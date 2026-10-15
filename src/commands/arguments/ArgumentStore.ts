import { AliasModuleStore } from '../../core/modules/index';
import { Argument } from './Argument';

export class ArgumentStore extends AliasModuleStore<Argument, 'arguments'> {
	public constructor() {
		super(Argument, { name: 'arguments' });
	}
}
