import type { Services } from './Services';

export * from './Service';
export * from './ServiceStore';
export * from './Services';

declare module 'discord.js' {
	export interface Client {
		services: Services;
	}
}
