import "./contracts";
import { VirelloClient, type } from "virello";

if (process.env.SHARD_TEST_MODE === "exit") process.exit(23);
if (
	process.env.SHARD_TEST_FAIL_COUNT &&
	JSON.parse(process.env.VIRELLO_SHARD!).count >=
		Number(process.env.SHARD_TEST_FAIL_COUNT)
)
	process.exit(23);
if (process.env.SHARD_TEST_MODE === "noBoot")
	await new Promise(() => setInterval(() => {}, 1000));
const logger = { debug() {}, notif() {}, alert() {}, error() {} };
const client = new VirelloClient({
	intents: [],
	logger,
	extensions: {
		localisation: false,
		scheduledtasks: false,
		patternCommands: false,
		subcommands: false,
		services: false,
	},
});
let aborted = 0;
let loggedIn = false;
if (process.env.SHARD_TEST_MODE === "scaling") {
	Reflect.set(client, "isReady", () => loggedIn);
	for (let index = 0; index < 100; index++)
		client.guilds.cache.set(String(index), {} as never);
}
client.sharding.handle("loginState", () => loggedIn);
client.sharding.handle(
	"probe",
	(data, context) => ({
		shard: client.sharding.id!,
		pid: process.pid,
		value: data.value,
		source: context.source,
	}),
	type({ value: "number" }).assert,
);
client.sharding.handle("relay", (data) =>
	client.sharding.request(data.target, "probe", { value: data.value }),
);
client.sharding.handle("all", async () =>
	(await client.sharding.broadcast("probe", { value: 8 })).map((v) => v.shard),
);
client.sharding.handle("fail", () => {
	if (process.env.SHARD_TEST_MODE === "largeError")
		throw new Error("\0🙂".repeat(500));
	throw new Error("Intentional handler failure");
});
client.sharding.handle("slow", async (data, context) => {
	await new Promise<void>((done) => {
		const abort = () => {
			aborted++;
			clearTimeout(timer);
			done();
		};
		const timer = setTimeout(() => {
			context.signal.removeEventListener("abort", abort);
			done();
		}, data.ms);
		context.signal.addEventListener("abort", abort, { once: true });
	});
	return "finished";
});
client.sharding.handle("abortCount", () => aborted);
client.sharding.handle("crash", () => process.exit(42));
client.sharding.handle("oversized", () => "x".repeat(100000));
client.sharding.handle("lossy", () => ({ value: undefined }));
client.sharding.handle("hung", () => new Promise<null>(() => {}));
client.sharding.handle("identify", async () => {
	const throttler = await client.options.ws!.buildIdentifyThrottler!(
		null as never,
	);
	await throttler.waitForIdentify(
		client.sharding.id!,
		new AbortController().signal,
	);
	const at = Date.now();
	client.sharding.identified();
	return { at, hooked: !!client.options.ws?.buildIdentifyThrottler };
});
if (
	process.env.SHARD_TEST_MODE === "login" ||
	process.env.SHARD_TEST_MODE === "scaling"
) {
	// Exercise VirelloClient.login and the actual installed throttler, replacing only Discord network connection.
	Reflect.set(client.ws, "connect", async () => {
		const throttler = await client.options.ws!.buildIdentifyThrottler!(
			null as never,
		);
		await throttler.waitForIdentify(
			client.sharding.id!,
			new AbortController().signal,
		);
		if (process.env.SHARD_TEST_MODE === "scaling") loggedIn = true;
		client.emit("shardReady", client.sharding.id!, new Set());
	});
	await client.login("offline-test-placeholder");
	loggedIn = true;
} else await client.sharding.connect();
if (process.env.SHARD_TEST_MODE === "wedged")
	while (true) {
		/* Owned test process simulates a blocked event loop. */
	}
