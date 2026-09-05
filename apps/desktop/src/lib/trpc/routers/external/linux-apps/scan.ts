import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import { promisify } from "node:util";
import type { ExternalApp } from "@superset/local-db";
import { getShellEnvironment } from "lib/trpc/routers/workspaces/utils/shell-env";
import { filenameIndexCliNames } from "./candidates";
import {
	detectInstalledLinuxApps,
	LINUX_APPS_CACHE_TTL_MS,
	type LinuxLaunchSpec,
	linuxLaunchCacheTime,
	peekLinuxLaunchCache,
	replaceLinuxLaunchCache,
} from "./linux-apps";

const execFileAsync = promisify(execFile);
const INDEX_TIMEOUT_MS = 4_000;

function fileExists(absolutePath: string): boolean {
	try {
		return fs.existsSync(absolutePath);
	} catch {
		return false;
	}
}

function isShellScript(absolutePath: string): boolean {
	try {
		const fd = fs.openSync(absolutePath, "r");
		try {
			const buf = Buffer.alloc(2);
			const n = fs.readSync(fd, buf, 0, 2, 0);
			return n >= 2 && buf[0] === 0x23 && buf[1] === 0x21;
		} finally {
			fs.closeSync(fd);
		}
	} catch {
		return false;
	}
}

function parseIndexHitLine(line: string): string | null {
	const trimmed = line.trim();
	if (!trimmed) return null;
	if (trimmed.startsWith("file://")) {
		try {
			const url = new URL(trimmed);
			if (url.protocol !== "file:") return null;
			return decodeURIComponent(url.pathname);
		} catch {
			return null;
		}
	}
	if (trimmed.startsWith("/")) return trimmed;
	return null;
}

async function stdoutPaths(command: string, args: string[]): Promise<string[]> {
	try {
		const { stdout } = await execFileAsync(command, args, {
			timeout: INDEX_TIMEOUT_MS,
		});
		return stdout
			.split("\n")
			.map(parseIndexHitLine)
			.filter((hit): hit is string => hit !== null);
	} catch {
		return [];
	}
}

/**
 * Look up a basename in GNOME LocalSearch (no sudo) and, if present, the
 * existing plocate/mlocate DB. Never runs `updatedb`.
 */
async function listIndexedPaths(name: string): Promise<string[]> {
	const hits = new Set<string>();
	const [localSearchHits, plocateHits] = await Promise.all([
		stdoutPaths("localsearch", ["search", "-f", "-l", "50", name]),
		stdoutPaths("plocate", ["-b", "-e", name]),
	]);
	for (const hit of localSearchHits) hits.add(hit);
	for (const hit of plocateHits) hits.add(hit);
	if (hits.size === 0) {
		for (const hit of await stdoutPaths("locate", ["-b", "-e", name])) {
			hits.add(hit);
		}
	}
	if (hits.size === 0) {
		for (const hit of await stdoutPaths("mlocate", ["-b", "-e", name])) {
			hits.add(hit);
		}
	}
	return [...hits];
}

async function collectIndexedFiles(): Promise<Map<string, string[]>> {
	const indexed = new Map<string, string[]>();
	await Promise.all(
		filenameIndexCliNames().map(async (name) => {
			indexed.set(name, await listIndexedPaths(name));
		}),
	);
	return indexed;
}

async function listFlatpakAppIds(): Promise<string[]> {
	try {
		const { stdout } = await execFileAsync(
			"flatpak",
			["list", "--app", "--columns=application"],
			{ timeout: 5_000 },
		);
		return stdout
			.split("\n")
			.map((line) => line.trim())
			.filter(Boolean);
	} catch {
		return [];
	}
}

export async function scanLinuxApps(): Promise<
	Map<ExternalApp, LinuxLaunchSpec>
> {
	const shellEnv = await getShellEnvironment();
	const pathEnv = shellEnv.PATH ?? process.env.PATH ?? "";
	const [flatpakIds, indexed] = await Promise.all([
		listFlatpakAppIds(),
		collectIndexedFiles(),
	]);
	return detectInstalledLinuxApps({
		homedir: () => os.homedir(),
		pathEnv,
		exists: fileExists,
		listFlatpakApps: () => flatpakIds,
		listDir: (dir) => {
			try {
				return fs.readdirSync(dir);
			} catch {
				return [];
			}
		},
		indexedFiles: (name) => indexed.get(name) ?? [],
		isShellScript,
	});
}

export async function ensureLinuxAppsScanned(options?: {
	forceRefresh?: boolean;
}): Promise<Map<ExternalApp, LinuxLaunchSpec>> {
	const existing = peekLinuxLaunchCache();
	const now = Date.now();
	if (
		!options?.forceRefresh &&
		existing &&
		now - linuxLaunchCacheTime() < LINUX_APPS_CACHE_TTL_MS
	) {
		return existing;
	}
	const next = await scanLinuxApps();
	replaceLinuxLaunchCache(next);
	return next;
}
