/** Kairo ships source TypeScript; this in-memory bundle verifies the standalone engine dependency graph. */
const result = await Bun.build({
	entrypoints: ['src/public/engine.ts'],
	target: 'bun',
	format: 'esm',
	metafile: true
});
if (!result.success) throw new AggregateError(result.logs, 'Engine bundle failed.');
const graph = JSON.stringify(result.metafile);
if (/node_modules[\\/](discord\.js|@discordjs|@ovencord)/.test(graph))
	throw new Error('Engine bundle contains an unintended Discord runtime dependency.');
console.log(
	'Engine bundle passed: ' +
		result.outputs.reduce((sum, output) => sum + output.size, 0) +
		' bytes; no discord.js, @discordjs or Ovencord runtime in the graph. Package remains source-only.'
);

export {};
