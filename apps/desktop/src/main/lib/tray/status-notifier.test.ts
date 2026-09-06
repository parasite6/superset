import { describe, expect, test } from "bun:test";
import { isStatusNotifierHostRegistered } from "./status-notifier";

describe("isStatusNotifierHostRegistered", () => {
	test("treats busctl b true as registered", async () => {
		const registered = await isStatusNotifierHostRegistered(async () => ({
			stdout: "b true\n",
			stderr: "",
		}));
		expect(registered).toBe(true);
	});

	test("treats a missing watcher as not registered", async () => {
		const registered = await isStatusNotifierHostRegistered(async () => {
			throw new Error("Unknown object");
		});
		expect(registered).toBe(false);
	});
});
