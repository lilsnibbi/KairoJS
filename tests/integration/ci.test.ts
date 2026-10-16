import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { assertCompleteTests, requiredRedisUrl } from "../../scripts/ciSupport";

const workflow = Bun.YAML.parse(
	readFileSync(join(import.meta.dir, "../../.github/workflows/ci.yml"), "utf8"),
) as any;
const release = workflow.jobs.release;

// Exercise the actual restricted boolean expression, not a second handwritten gate.
function eligible(options: Record<string, unknown> = {}): boolean {
	const {
		result = "success",
		required = "success",
		validated = "abc",
		sha = "abc",
		event = "push",
		refType = "branch",
		branch = "trunk",
		defaultBranch = "trunk",
		enabled = "true",
		success = true,
	} = options;
	const expression = release.if.trim().slice(3, -2).trim();
	return Function(
		"needs",
		"github",
		"vars",
		"success",
		`return (${expression});`,
	)(
		{
			validate: { result, outputs: { sha: validated } },
			required: { result: required },
		},
		{
			sha,
			event_name: event,
			ref_type: refType,
			ref_name: branch,
			event: { repository: { default_branch: defaultBranch } },
		},
		{ KAIRO_RELEASES: enabled },
		() => success,
	);
}

describe("CI release boundary", () => {
	test("release depends on all validation with least privilege and immutable checkout", () => {
		expect(Object.keys(workflow.on).sort()).toEqual([
			"pull_request",
			"push",
			"workflow_dispatch",
		]);
		expect(workflow.permissions).toEqual({});
		expect(workflow.jobs.validate.permissions).toEqual({ contents: "read" });
		expect(workflow.jobs.required.needs).toEqual(["validate"]);
		expect(release.needs).toEqual(["validate", "required"]);
		expect(workflow.jobs.required.if).toBe("${{ always() }}");
		expect(workflow.jobs.validate.steps[0].with.ref).toBe("${{ github.sha }}");
		expect(workflow.jobs.validate.steps[0].with["persist-credentials"]).toBe(
			false,
		);
		expect(
			workflow.jobs.validate.steps.some(
				(step: any) => step.run === "bun scripts/ci.ts",
			),
		).toBe(true);
		expect(
			release.steps.some((step: any) =>
				step.uses?.startsWith("actions/checkout@"),
			),
		).toBe(false);
		for (const job of Object.values(workflow.jobs) as any[]) {
			expect(job["runs-on"]).toBe("ubuntu-24.04");
			for (const step of job.steps) {
				expect(step["continue-on-error"]).toBeUndefined();
				if (step.uses) expect(step.uses).toMatch(/@[0-9a-f]{40}$/);
			}
		}
	});
	test("workflow validation invokes an existing checker", () => {
		expect(
			workflow.jobs.validate.steps.some(
				(step: any) => step.run === "bash scripts/checkActions.sh",
			),
		).toBe(true);
		expect(
			existsSync(join(import.meta.dir, "../../scripts/checkActions.sh")),
		).toBe(true);
	});
	test("only a successful enabled default-branch push of the validated SHA releases", () => {
		expect(eligible()).toBe(true);
		expect(eligible({ branch: "main", defaultBranch: "main" })).toBe(true);
	});
	for (const result of ["failure", "cancelled", "skipped", ""]) {
		test(`validation ${result || "missing"} blocks release`, () =>
			expect(eligible({ result })).toBe(false));
		test(`required gate ${result || "missing"} blocks release`, () =>
			expect(eligible({ required: result })).toBe(false));
	}
	for (const options of [
		{ event: "pull_request" },
		{ event: "workflow_dispatch" },
		{ event: "workflow_run" },
		{ branch: "feature" },
		{ refType: "tag" },
		{ enabled: "false" },
		{ enabled: "" },
		{ validated: "older" },
		{ validated: "" },
		{ success: false },
	])
		test(`blocks ${JSON.stringify(options)}`, () =>
			expect(eligible(options)).toBe(false));
});

describe("complete validation prerequisites", () => {
	test("missing, external and non-Redis endpoints fail", () => {
		for (const url of [
			undefined,
			"",
			"redis://example.com:6379",
			"https://127.0.0.1",
		])
			expect(() => requiredRedisUrl(url)).toThrow();
		expect(requiredRedisUrl("redis://127.0.0.1:6379")).toBe(
			"redis://127.0.0.1:6379",
		);
	});
	test("passing report is accepted; skipped, failed, errored and absent reports fail", () => {
		assertCompleteTests(
			'<testsuites tests="1" failures="0" skipped="0"><testcase name="ok"/></testsuites>',
		);
		for (const xml of [
			"",
			"<testsuites/>",
			"<testsuites><testcase><skipped/></testcase></testsuites>",
			'<testsuites skipped="2"><testcase/></testsuites>',
			"<testsuites><testcase><failure/></testcase></testsuites>",
			'<testsuites errors="1"><testcase/></testsuites>',
		])
			expect(() => assertCompleteTests(xml)).toThrow();
	});
});
