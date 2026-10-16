import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RedisClient } from "bun";
import { assertCompleteTests, requiredRedisUrl } from "./ciSupport";

const root = join(import.meta.dir, "..");
const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
if (manifest.packageManager !== `bun@${Bun.version}`)
	throw new Error("Use the exact packageManager Bun version.");
const redis = new RedisClient(
	requiredRedisUrl(process.env.KAIRO_TEST_REDIS_URL),
	{ connectionTimeout: 5000, autoReconnect: false },
);
try {
	await redis.connect();
	if ((await redis.send("PING", [])) !== "PONG")
		throw new Error("Redis readiness failed.");
	console.log("Disposable Redis ready; complete integration coverage enabled.");
} finally {
	redis.close();
}
const reportDirectory = mkdtempSync(join(tmpdir(), "kairo-ci-"));
async function run(...args: string[]): Promise<void> {
	console.log(`::group::bun ${args.join(" ")}`);
	const child = Bun.spawn([process.execPath, ...args], {
		cwd: root,
		stdout: "inherit",
		stderr: "inherit",
	});
	const code = await child.exited;
	console.log("::endgroup::");
	if (code !== 0)
		throw new Error(`bun ${args.join(" ")} failed with exit code ${code}`);
}
try {
	const report = join(reportDirectory, "tests.xml");
	// Keep sequential: tests create and remove temporary TypeScript discovery fixtures.
	await run("test", "--reporter=junit", `--reporter-outfile=${report}`);
	assertCompleteTests(readFileSync(report, "utf8"));
	await run("run", "typecheck");
	await run("run", "lint:check");
	await run("examples/offline.ts");
	await run("examples/engine/offline.ts");
	console.log(
		"Complete validation passed: no skipped tests, types, Biome and both offline examples.",
	);
} finally {
	rmSync(reportDirectory, { recursive: true, force: true });
}
