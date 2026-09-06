import { describe, expect, test } from "bun:test";
import {
	canInitTray,
	isGnomeDesktop,
	resolveKeepInTray,
	shouldDestroyTrayOnDisable,
	shouldPromptQuitConfirmation,
} from "./keep-in-tray";

describe("resolveKeepInTray", () => {
	test("null means on for Linux and off elsewhere", () => {
		expect(resolveKeepInTray(null, true)).toBe(true);
		expect(resolveKeepInTray(undefined, true)).toBe(true);
		expect(resolveKeepInTray(null, false)).toBe(false);
	});

	test("an explicit value wins", () => {
		expect(resolveKeepInTray(false, true)).toBe(false);
		expect(resolveKeepInTray(true, false)).toBe(true);
	});
});

describe("canInitTray", () => {
	test("macOS always initializes", () => {
		expect(canInitTray("darwin", false)).toBe(true);
		expect(canInitTray("darwin", true)).toBe(true);
	});

	test("Linux follows keep-in-tray", () => {
		expect(canInitTray("linux", true)).toBe(true);
		expect(canInitTray("linux", false)).toBe(false);
	});

	test("Windows never initializes", () => {
		expect(canInitTray("win32", true)).toBe(false);
	});
});

describe("shouldDestroyTrayOnDisable", () => {
	test("Linux keeps the icon for the process lifetime", () => {
		expect(shouldDestroyTrayOnDisable("linux")).toBe(false);
	});

	test("other platforms may destroy on disable", () => {
		expect(shouldDestroyTrayOnDisable("darwin")).toBe(true);
		expect(shouldDestroyTrayOnDisable("win32")).toBe(true);
	});
});

describe("shouldPromptQuitConfirmation", () => {
	test("skips when keep-in-tray is on even if confirm-on-quit is stored true", () => {
		expect(
			shouldPromptQuitConfirmation({
				skipQuitConfirmation: false,
				isDev: false,
				confirmOnQuit: true,
				keepInTray: true,
			}),
		).toBe(false);
	});

	test("prompts when tray is off and confirm-on-quit is on", () => {
		expect(
			shouldPromptQuitConfirmation({
				skipQuitConfirmation: false,
				isDev: false,
				confirmOnQuit: true,
				keepInTray: false,
			}),
		).toBe(true);
	});

	test("never prompts in dev or when the caller skipped confirmation", () => {
		expect(
			shouldPromptQuitConfirmation({
				skipQuitConfirmation: true,
				isDev: false,
				confirmOnQuit: true,
				keepInTray: false,
			}),
		).toBe(false);
		expect(
			shouldPromptQuitConfirmation({
				skipQuitConfirmation: false,
				isDev: true,
				confirmOnQuit: true,
				keepInTray: false,
			}),
		).toBe(false);
	});
});

describe("isGnomeDesktop", () => {
	test("matches GNOME even when other desktop ids are listed", () => {
		expect(isGnomeDesktop("GNOME")).toBe(true);
		expect(isGnomeDesktop("ubuntu:GNOME")).toBe(true);
		expect(isGnomeDesktop("GNOME-Classic:GNOME")).toBe(true);
	});

	test("rejects KDE and unset", () => {
		expect(isGnomeDesktop("KDE")).toBe(false);
		expect(isGnomeDesktop(undefined)).toBe(false);
		expect(isGnomeDesktop("")).toBe(false);
	});
});
