import { describe, expect, test } from "bun:test";
import type { ExternalApp } from "@superset/local-db";
import { filterByInstalled, resolveOpenInApp } from "./filterByInstalled";

const APPS = [
	{ id: "cursor" as const },
	{ id: "xcode" as const },
	{ id: "zed" as const },
];

describe("filterByInstalled", () => {
	test("returns all apps when installed is null (macOS / unscanned)", () => {
		expect(filterByInstalled(APPS, null)).toEqual([...APPS]);
	});

	test("keeps only installed ids", () => {
		const installed = new Set<ExternalApp>(["cursor", "zed"]);
		expect(filterByInstalled(APPS, installed)).toEqual([
			{ id: "cursor" },
			{ id: "zed" },
		]);
	});
});

describe("resolveOpenInApp", () => {
	test("keeps the saved app when it is installed", () => {
		expect(
			resolveOpenInApp("cursor", new Set<ExternalApp>(["cursor", "zed"])),
		).toBe("cursor");
	});

	test("falls back to finder when the saved app is missing on this machine", () => {
		expect(resolveOpenInApp("cursor", new Set<ExternalApp>(["zed"]))).toBe(
			"finder",
		);
	});

	test("falls back to finder when nothing is saved", () => {
		expect(resolveOpenInApp(null, new Set<ExternalApp>(["cursor"]))).toBe(
			"finder",
		);
	});
});
