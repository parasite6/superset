import { afterEach, describe, expect, test } from "bun:test";
import path from "node:path";
import {
	clearLinuxLaunchCache,
	detectInstalledLinuxApps,
	getCachedLinuxLaunchSpec,
	type LinuxDetectorDeps,
	linuxLaunchCommandsFromCache,
	selectIndexedBinary,
	setLinuxLaunchCacheForTests,
} from "./linux-apps";

function deps(overrides: Partial<LinuxDetectorDeps> = {}): LinuxDetectorDeps {
	return {
		homedir: () => "/home/you",
		pathEnv: "",
		exists: () => false,
		listFlatpakApps: () => [],
		...overrides,
	};
}

describe("detectInstalledLinuxApps", () => {
	test("finds cursor on PATH", () => {
		const cursor = "/usr/bin/cursor";
		const result = detectInstalledLinuxApps(
			deps({
				pathEnv: "/usr/bin:/usr/local/bin",
				exists: (p) => p === cursor,
			}),
		);
		const found = result.get("cursor");
		expect(found?.command).toBe(cursor);
		expect(found?.argsFor("/proj")).toEqual(["/proj"]);
	});

	test("finds ~/.local/bin/cursor even when that dir is missing from PATH", () => {
		const shim = path.join("/home/you", ".local/bin/cursor");
		const result = detectInstalledLinuxApps(
			deps({
				pathEnv: "/usr/bin",
				exists: (p) => p === shim,
			}),
		);
		expect(result.get("cursor")?.command).toBe(shim);
	});

	test("PATH hit wins over ~/.local/bin", () => {
		const onPath = "/opt/bin/cursor";
		const shim = path.join("/home/you", ".local/bin/cursor");
		const result = detectInstalledLinuxApps(
			deps({
				pathEnv: "/opt/bin",
				exists: (p) => p === onPath || p === shim,
			}),
		);
		expect(result.get("cursor")?.command).toBe(onPath);
	});

	test("finds a well-known extra binary when PATH misses it", () => {
		const extra = "/usr/share/cursor/bin/cursor";
		const result = detectInstalledLinuxApps(
			deps({
				exists: (p) => p === extra,
			}),
		);
		expect(result.get("cursor")?.command).toBe(extra);
	});

	test("falls back to flatpak run when no binary exists", () => {
		const result = detectInstalledLinuxApps(
			deps({
				listFlatpakApps: () => ["com.visualstudio.code", "org.gnome.Ptyxis"],
			}),
		);
		const vscode = result.get("vscode");
		expect(vscode?.command).toBe("flatpak");
		expect(vscode?.argsFor("/proj")).toEqual([
			"run",
			"com.visualstudio.code",
			"/proj",
		]);
		expect(result.get("ptyxis")?.command).toBe("flatpak");
	});

	test("finds snap binaries under /snap/bin", () => {
		const result = detectInstalledLinuxApps(
			deps({
				exists: (p) => p === "/snap/bin/code",
			}),
		);
		expect(result.get("vscode")?.command).toBe("/snap/bin/code");
	});

	test("finds JetBrains Toolbox scripts", () => {
		const idea = path.join(
			"/home/you",
			".local/share/JetBrains/Toolbox/scripts/idea",
		);
		const result = detectInstalledLinuxApps(
			deps({
				exists: (p) => p === idea,
			}),
		);
		expect(result.get("intellij")?.command).toBe(idea);
	});

	test("never reports macOS-only apps", () => {
		const result = detectInstalledLinuxApps(
			deps({
				pathEnv: "/usr/bin",
				exists: (p) =>
					p === "/usr/bin/xcode" ||
					p === "/usr/bin/iterm" ||
					p === "/usr/bin/terminal",
			}),
		);
		expect(result.has("xcode")).toBe(false);
		expect(result.has("iterm")).toBe(false);
		expect(result.has("terminal")).toBe(false);
		expect(result.has("appcode")).toBe(false);
	});

	test("does not include finder (caller treats it as always available)", () => {
		const result = detectInstalledLinuxApps(deps());
		expect(result.has("finder")).toBe(false);
	});

	test("does not treat the Devin agent CLI as Devin Desktop", () => {
		const cli = path.join("/home/you", ".local/bin/devin");
		const result = detectInstalledLinuxApps(
			deps({
				pathEnv: "/home/you/.local/bin",
				exists: (p) => p === cli,
			}),
		);
		expect(result.has("devin")).toBe(false);
	});

	test("finds Devin Desktop via the official windsurf bin shim", () => {
		const desktop = path.join(
			"/home/you",
			".codeium/windsurf/bin/devin-desktop",
		);
		const result = detectInstalledLinuxApps(
			deps({
				exists: (p) => p === desktop,
			}),
		);
		expect(result.get("devin")?.command).toBe(desktop);
	});

	test("finds a Devin Linux tar.gz extract under Documents, preferring the newer folder name", () => {
		const newer = path.join(
			"/home/you",
			"Documents/Devin-linux-x64-3.8.20/Devin/bin/devin-desktop",
		);
		const older = path.join(
			"/home/you",
			"Documents/Devin-linux-x64-3.7.16/Devin/bin/devin-desktop",
		);
		const result = detectInstalledLinuxApps(
			deps({
				listDir: (dir) =>
					dir === "/home/you/Documents"
						? ["Devin-linux-x64-3.7.16", "Devin-linux-x64-3.8.20", "other"]
						: [],
				exists: (p) => p === newer || p === older,
			}),
		);
		expect(result.get("devin")?.command).toBe(newer);
	});

	test("filename index prefers the bin/ shell wrapper over the Electron binary", () => {
		const elf = "/opt/somewhere/Devin/devin-desktop";
		const wrapper = "/opt/somewhere/Devin/bin/devin-desktop";
		const man = "/usr/share/man/man1/devin-desktop.1";
		const png =
			"/opt/somewhere/Devin/resources/app/media/devin-desktop-welcome.png";
		const result = detectInstalledLinuxApps(
			deps({
				indexedFiles: (name) =>
					name === "devin-desktop" ? [elf, wrapper, man, png] : [],
				exists: (p) => p === elf || p === wrapper,
				isShellScript: (p) => p === wrapper,
			}),
		);
		expect(result.get("devin")?.command).toBe(wrapper);
	});

	test("selectIndexedBinary prefers a shebang script when nothing lives in bin/", () => {
		const elf = "/home/you/apps/devin-desktop";
		const script = "/home/you/apps/launch/devin-desktop";
		expect(
			selectIndexedBinary(
				"devin-desktop",
				[elf, script],
				(p) => p === elf || p === script,
				(p) => p === script,
			),
		).toBe(script);
	});

	test("kitty launch uses --directory so the path is a cwd not a command", () => {
		const kitty = "/usr/bin/kitty";
		const result = detectInstalledLinuxApps(
			deps({
				pathEnv: "/usr/bin",
				exists: (p) => p === kitty,
			}),
		);
		expect(result.get("kitty")?.argsFor("/proj")).toEqual([
			"--directory",
			"/proj",
		]);
	});

	test("ptyxis launch uses --working-directory, not --dir", () => {
		const ptyxis = "/usr/bin/ptyxis";
		const result = detectInstalledLinuxApps(
			deps({
				pathEnv: "/usr/bin",
				exists: (p) => p === ptyxis,
			}),
		);
		expect(result.get("ptyxis")?.argsFor("/proj")).toEqual([
			"--new-window",
			"--working-directory=/proj",
		]);
	});
});

describe("linux launch cache", () => {
	afterEach(() => {
		clearLinuxLaunchCache();
	});

	test("setLinuxLaunchCacheForTests stores a spec for getCachedLinuxLaunchSpec", () => {
		setLinuxLaunchCacheForTests(
			new Map([
				[
					"cursor",
					{
						command: "/home/you/.local/bin/cursor",
						argsFor: (targetPath) => [targetPath],
					},
				],
			]),
		);
		expect(getCachedLinuxLaunchSpec("cursor")?.command).toBe(
			"/home/you/.local/bin/cursor",
		);
		expect(getCachedLinuxLaunchSpec("zed")).toBeUndefined();
	});
});

describe("linuxLaunchCommandsFromCache", () => {
	afterEach(() => {
		clearLinuxLaunchCache();
	});

	test("returns undefined when unscanned so callers can use static CLI names", () => {
		expect(linuxLaunchCommandsFromCache("cursor", "/proj")).toBeUndefined();
	});

	test("returns the cached absolute path and null for apps that were not found", () => {
		setLinuxLaunchCacheForTests(
			new Map([
				[
					"cursor",
					{
						command: "/home/you/.local/bin/cursor",
						argsFor: (targetPath) => [targetPath],
					},
				],
			]),
		);
		expect(linuxLaunchCommandsFromCache("cursor", "/proj")).toEqual([
			{ command: "/home/you/.local/bin/cursor", args: ["/proj"] },
		]);
		expect(linuxLaunchCommandsFromCache("zed", "/proj")).toBeNull();
	});
});
