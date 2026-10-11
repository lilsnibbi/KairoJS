import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { auditExports } from './exports';

const root = dirname(import.meta.dir);
const temporaryRoot = resolve(tmpdir());
const consumer = mkdtempSync(join(temporaryRoot, 'kairojs-consumer-'));
if (!resolve(consumer).startsWith(temporaryRoot + sep)) throw new Error('Unexpected consumer path');

function auditPackage(directory: string): void {
	const failures: string[] = [];
	for (const path of [
		'LICENSE',
		'README.md',
		'BREAKING_CHANGES.md',
		'docs/source-retention.md',
		'src/sharding/LICENSE',
		'src/utilities/function/debounce/LICENSE',
		'examples/.env.example'
	])
		if (!existsSync(join(directory, path))) failures.push(`Missing shipped file: ${path}`);
	if (failures.length) throw new Error(failures.join('\n'));
	auditExports(directory, failures);
	if (failures.length) throw new Error(failures.join('\n'));
}

async function run(args: string[], cwd: string): Promise<void> {
	const child = Bun.spawn([process.execPath, ...args], { cwd, stdout: 'pipe', stderr: 'pipe' });
	const [stdout, stderr, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
	if (code !== 0) throw new Error(`bun ${args.join(' ')} failed\n${stdout}${stderr}`);
}

try {
	auditPackage(root);
	const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { version: string };
	await run(['pm', 'pack', '--destination', consumer], root);
	const archive = join(consumer, `kairojs-${manifest.version}.tgz`);
	writeFileSync(
		join(consumer, 'package.json'),
		JSON.stringify({
			name: 'kairojs-smoke-consumer',
			private: true,
			type: 'module',
			dependencies: { kairojs: `file:${archive.replaceAll('\\', '/')}` }
		})
	);
	await run(['install', '--ignore-scripts'], consumer);
	const installed = join(consumer, 'node_modules/kairojs');
	auditPackage(installed);
	for (const path of new Bun.Glob('**/*').scanSync({ cwd: installed, dot: true, onlyFiles: true })) {
		const relative = path.replaceAll('\\', '/');
		if (/(^|\/)\.env(?:\.|$)/.test(relative) && !relative.endsWith('/.env.example'))
			throw new Error(`Unexpected environment file in package: ${relative}`);
		if (/^(tests|scripts|\.github)\//.test(relative)) throw new Error(`Unexpected development file in package: ${relative}`);
	}
	mkdirSync(join(consumer, 'commands'));
	writeFileSync(
		join(consumer, 'commands/ping.ts'),
		`import { Command } from 'kairojs/commands';
export default class Ping extends Command {
	static override options: Command.Options = { description: 'Ping.' };
}
`
	);
	writeFileSync(
		join(consumer, 'consumer.ts'),
		`import { Command, KairoClient } from 'kairojs';

const client = new KairoClient({ intents: [], root: import.meta.dir, modules: { commands: 'commands/*.ts' } });
try {
	await client.load();
	const command = client.modules.require('commands').get('ping');
	if (!(command instanceof Command) || command.description !== 'Ping.') {
		throw new Error('Installed package could not load the ping command.');
	}
} finally {
	await client.destroy();
}
`
	);
	await run(['consumer.ts'], consumer);
	await run([join(installed, 'examples/engine/offline.ts')], consumer);
	console.log(
		'Package smoke test passed: public exports and shipped notices audited, packed, installed, loaded one command and ran the offline engine.'
	);
} finally {
	rmSync(consumer, { recursive: true, force: true });
}
