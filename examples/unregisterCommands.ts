import { REST, Routes } from "discord.js";
import type { RESTGetCurrentApplicationResult } from "discord-api-types/v10";
import { developmentGuild, requiredEnv } from "./config";

const guildId = developmentGuild();
const rest = new REST({ version: "10" }).setToken(requiredEnv("DISCORD_TOKEN"));
const application = (await rest.get(
	Routes.currentApplication(),
)) as RESTGetCurrentApplicationResult;

await rest.put(Routes.applicationCommands(application.id), { body: [] });
console.log("Cleared all global application commands.");

if (guildId) {
	await rest.put(Routes.applicationGuildCommands(application.id, guildId), {
		body: [],
	});
	console.log(`Cleared all application commands in dev guild ${guildId}.`);
} else {
	console.log("DEV_GUILD_ID is blank; skipped guild commands.");
}
