import { container } from '../../core/modules/index';
import { ServiceStore } from './ServiceStore';

/** Shared service modules. Use get() so names cannot overwrite framework methods. */
export class Services {
	readonly store = new ServiceStore();
	constructor() {
		container.services = this;
	}
	get(name: string) {
		return this.store.get(name);
	}
}
