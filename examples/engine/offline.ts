import { EngineClient } from 'kairojs/engine';
import { MockDiscord } from './MockDiscord';

const server = new MockDiscord();
const client = new EngineClient({
	token: 'local-fixture-not-a-real-token',
	intents: 0,
	rest: { baseURL: server.baseURL },
	cache: { messagesPerChannel: 10 },
	onError: ({ error, fatal }) => {
		if (fatal) console.error(error.message);
	}
});
const replied = Promise.withResolvers<void>();
const resumed = Promise.withResolvers<void>();
client.on('messageCreate', async (message) => {
	await message.reply({ content: 'Pong from the original Kairo engine.', allowed_mentions: { parse: [] } });
	replied.resolve();
});
client.on('resumed', () => resumed.resolve());
const timeout = setTimeout(() => {
	replied.reject(new Error('Offline example timed out.'));
	resumed.reject(new Error('Resume timed out.'));
}, 5000);
// Attach both promises immediately so failure cleanup cannot cause an unhandled rejection.
const finished = Promise.all([replied.promise, resumed.promise]);
try {
	await client.connect();
	server.dispatch('MESSAGE_CREATE', MockDiscord.message());
	await replied.promise;
	server.reconnect();
	await finished;
	if (server.sentMessages.length !== 1 || server.connections !== 2) throw new Error('Unexpected offline protocol result.');
	console.log('Offline engine passed: native WebSocket connect, cached message, REST reply and session resume.');
} finally {
	clearTimeout(timeout);
	client.close();
	await server.stop();
}
