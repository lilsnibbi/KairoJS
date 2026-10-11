import { Events, Listener } from 'kairojs/events';

export default class ReadyListener extends Listener<typeof Events.ClientReady> {
	static override options: Listener.Options = { event: Events.ClientReady, once: true };

	override run(): void {
		const client = this.container.client;
		this.container.logger.notif(`Shard ${client.sharding.id} ready as ${client.user?.tag}; ${client.guilds.cache.size} servers.`);
	}
}
