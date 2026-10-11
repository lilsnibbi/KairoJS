import { GatewayIntentBits } from 'discord-api-types/v10';
import { EngineClient } from 'kairojs/engine';

if (!Bun.argv.includes('--live')) {
	console.log('Opt-in only: set DISCORD_TOKEN yourself, then run bun examples/engine/live.ts --live');
	process.exit(0);
}
const token = process.env.DISCORD_TOKEN;
if (!token) throw new Error('Set DISCORD_TOKEN before using --live.');
const client = new EngineClient({
	token,
	intents: GatewayIntentBits.Guilds | GatewayIntentBits.GuildMessages | GatewayIntentBits.MessageContent,
	onError: ({ source, fatal, error }) => console.error(source, fatal ? 'fatal' : 'recovering', error.message)
});
client.on('messageCreate', async (message) => {
	if (!message.data.author.bot && message.data.content === '!engine-ping')
		await message.reply({ content: 'Pong from Kairo engine.', allowed_mentions: { parse: [] } });
});
client.on('interactionCreate', async (interaction) => {
	if (interaction.data.type === 2 && interaction.data.data.name === 'engine-ping')
		await interaction.reply({ content: 'Pong from Kairo engine.', allowed_mentions: { parse: [] } });
});
process.once('SIGINT', () => client.close());
process.once('SIGTERM', () => client.close());
await client.connect();
console.log('Engine connected. Send !engine-ping in a channel where the bot can read and reply.');
