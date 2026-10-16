export function requiredRedisUrl(value: string | undefined): string {
	if (!value)
		throw new Error(
			"Complete validation requires KAIRO_TEST_REDIS_URL; Redis tests must not skip.",
		);
	const url = new URL(value);
	if (
		url.protocol !== "redis:" ||
		!["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)
	)
		throw new Error("CI requires a disposable loopback Redis.");
	return value;
}

export function assertCompleteTests(xml: string): void {
	if (!/<testsuites?[\s>]/.test(xml) || !/<testcase[\s>]/.test(xml))
		throw new Error("Missing or empty JUnit test report.");
	if (
		/<(?:skipped|failure|error)\b/.test(xml) ||
		/\b(?:skipped|failures|errors)=["'][1-9]\d*["']/.test(xml)
	)
		throw new Error(
			"Complete validation rejects skipped, failed or errored tests.",
		);
}
