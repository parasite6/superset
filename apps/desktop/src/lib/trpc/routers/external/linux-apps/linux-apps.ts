import path from "node:path";
import type { ExternalApp } from "@superset/local-db";
import {
	LINUX_APP_CANDIDATES,
	type LinuxAppCandidate,
	type LinuxExtractLayout,
	MACOS_ONLY_EXTERNAL_APPS,
} from "./candidates";

export type LinuxLaunchSpec = {
	command: string;
	argsFor: (targetPath: string) => string[];
};

export type LinuxDetectorDeps = {
	homedir: () => string;
	pathEnv: string;
	exists: (absolutePath: string) => boolean;
	listFlatpakApps: () => string[];
	/** Directory listing for portable extract scans. Omitted in tests that do not need it. */
	listDir?: (absolutePath: string) => string[];
	/** Hits from GNOME LocalSearch / plocate, keyed by basename (e.g. `devin-desktop`). */
	indexedFiles?: (basename: string) => string[];
	/** True when the file starts with `#!` (VS Code-style `bin/` launchers). */
	isShellScript?: (absolutePath: string) => boolean;
};

const SEARCH_DIR_EXTRAS = [
	".local/bin",
	".local/share/JetBrains/Toolbox/scripts",
] as const;

const ABSOLUTE_EXTRA_DIRS = ["/usr/bin", "/usr/local/bin", "/snap/bin"];

export const LINUX_APPS_CACHE_TTL_MS = 60_000;

let cache: Map<ExternalApp, LinuxLaunchSpec> | null = null;
let cacheTime = 0;

function extraSearchDirs(homedir: string): string[] {
	return [
		...SEARCH_DIR_EXTRAS.map((rel) => path.join(homedir, rel)),
		...ABSOLUTE_EXTRA_DIRS,
	];
}

export function searchDirs(pathEnv: string, homedir: string): string[] {
	const fromEnv = pathEnv.split(path.delimiter).filter(Boolean);
	const seen = new Set(fromEnv);
	const extras = extraSearchDirs(homedir).filter((dir) => !seen.has(dir));
	return [...fromEnv, ...extras];
}

function expandHome(template: string, homedir: string): string {
	return template.replaceAll("{home}", homedir);
}

function pathArgsFor(candidate: LinuxAppCandidate): LinuxLaunchSpec["argsFor"] {
	return candidate.pathArgs ?? ((targetPath) => [targetPath]);
}

function resolveCli(
	cli: string,
	dirs: string[],
	exists: (absolutePath: string) => boolean,
): string | null {
	for (const dir of dirs) {
		const candidate = path.join(dir, cli);
		if (exists(candidate)) return candidate;
	}
	return null;
}

function resolveExtractLayout(
	layout: LinuxExtractLayout,
	homedir: string,
	exists: (absolutePath: string) => boolean,
	listDir: ((absolutePath: string) => string[]) | undefined,
): string | null {
	if (!listDir) return null;
	for (const parentTemplate of layout.parentDirs) {
		const parent = expandHome(parentTemplate, homedir);
		let names: string[];
		try {
			names = listDir(parent);
		} catch {
			continue;
		}
		const matches = names
			.filter((name) => name.startsWith(layout.dirPrefix))
			.sort()
			.reverse();
		for (const name of matches) {
			const binary = path.join(parent, name, layout.binaryRel);
			if (exists(binary)) return binary;
		}
	}
	return null;
}

function isUnusableIndexedHit(filePath: string, basename: string): boolean {
	if (path.basename(filePath) !== basename) return true;
	const lower = filePath.replaceAll("\\", "/").toLowerCase();
	if (lower.includes("/resources/")) return true;
	if (lower.includes("/completions/")) return true;
	if (lower.includes("/share/man/")) return true;
	if (lower.includes("/man/man")) return true;
	return /\.(png|jpe?g|svg|md|1)$/i.test(filePath);
}

/** Prefer `…/bin/<name>` shell wrappers over the Electron ELF. */
export function selectIndexedBinary(
	basename: string,
	hits: readonly string[],
	exists: (absolutePath: string) => boolean,
	isShellScript?: (absolutePath: string) => boolean,
): string | null {
	const usable = hits.filter(
		(filePath) => exists(filePath) && !isUnusableIndexedHit(filePath, basename),
	);
	if (usable.length === 0) return null;
	const rank = (filePath: string): number => {
		const inBinDir = path.basename(path.dirname(filePath)) === "bin" ? 2 : 0;
		const script = isShellScript?.(filePath) ? 1 : 0;
		return inBinDir + script;
	};
	return [...usable].sort((a, b) => {
		const rankDiff = rank(b) - rank(a);
		if (rankDiff !== 0) return rankDiff;
		return b.localeCompare(a);
	})[0];
}

function detectOne(
	candidate: LinuxAppCandidate,
	dirs: string[],
	homedir: string,
	exists: (absolutePath: string) => boolean,
	flatpakIds: ReadonlySet<string>,
	listDir: ((absolutePath: string) => string[]) | undefined,
	indexedFiles: ((basename: string) => string[]) | undefined,
	isShellScript: ((absolutePath: string) => boolean) | undefined,
): LinuxLaunchSpec | null {
	const argsFor = pathArgsFor(candidate);

	for (const cli of candidate.clis) {
		const resolved = resolveCli(cli, dirs, exists);
		if (resolved) {
			return { command: resolved, argsFor };
		}
	}

	for (const extra of candidate.extraBinaries ?? []) {
		const resolved = expandHome(extra, homedir);
		if (exists(resolved)) {
			return { command: resolved, argsFor };
		}
	}

	for (const layout of candidate.extractLayouts ?? []) {
		const extracted = resolveExtractLayout(layout, homedir, exists, listDir);
		if (extracted) {
			return { command: extracted, argsFor };
		}
	}

	if (candidate.filenameIndex) {
		for (const cli of candidate.clis) {
			const picked = selectIndexedBinary(
				cli,
				indexedFiles?.(cli) ?? [],
				exists,
				isShellScript,
			);
			if (picked) return { command: picked, argsFor };
		}
	}

	for (const id of candidate.flatpakIds ?? []) {
		if (flatpakIds.has(id)) {
			return {
				command: "flatpak",
				argsFor: (targetPath) => ["run", id, ...argsFor(targetPath)],
			};
		}
	}

	return null;
}

/**
 * Pure detector: given PATH, filesystem, and Flatpak ids, return the winning
 * launch spec per installed Linux-capable app. macOS-only apps are omitted.
 */
export function detectInstalledLinuxApps(
	deps: LinuxDetectorDeps,
): Map<ExternalApp, LinuxLaunchSpec> {
	const homedir = deps.homedir();
	const dirs = searchDirs(deps.pathEnv, homedir);
	const flatpakIds = new Set(deps.listFlatpakApps());
	const result = new Map<ExternalApp, LinuxLaunchSpec>();

	for (const [app, candidate] of Object.entries(LINUX_APP_CANDIDATES) as [
		ExternalApp,
		LinuxAppCandidate,
	][]) {
		if (MACOS_ONLY_EXTERNAL_APPS.has(app)) continue;
		const spec = detectOne(
			candidate,
			dirs,
			homedir,
			deps.exists,
			flatpakIds,
			deps.listDir,
			deps.indexedFiles,
			deps.isShellScript,
		);
		if (spec) result.set(app, spec);
	}

	return result;
}

export function peekLinuxLaunchCache(): Map<
	ExternalApp,
	LinuxLaunchSpec
> | null {
	return cache;
}

export function linuxLaunchCacheTime(): number {
	return cacheTime;
}

export function getCachedLinuxLaunchSpec(
	app: ExternalApp,
): LinuxLaunchSpec | undefined {
	return cache?.get(app);
}

export function clearLinuxLaunchCache(): void {
	cache = null;
	cacheTime = 0;
}

export function setLinuxLaunchCacheForTests(
	next: Map<ExternalApp, LinuxLaunchSpec> | null,
): void {
	replaceLinuxLaunchCache(next);
}

export function replaceLinuxLaunchCache(
	next: Map<ExternalApp, LinuxLaunchSpec> | null,
): void {
	cache = next;
	cacheTime = next ? Date.now() : 0;
}

export function installedLinuxAppIds(
	detected: Map<ExternalApp, LinuxLaunchSpec>,
): ExternalApp[] {
	return ["finder", ...detected.keys()];
}

/**
 * When the Linux scan cache is populated, return the cached launch command
 * (or null if that app is not installed). Returns undefined if unscanned so
 * callers can fall back to static CLI names.
 */
export function linuxLaunchCommandsFromCache(
	app: ExternalApp,
	targetPath: string,
): { command: string; args: string[] }[] | null | undefined {
	const cached = peekLinuxLaunchCache();
	if (!cached) return undefined;
	const spec = cached.get(app);
	if (!spec) return null;
	return [{ command: spec.command, args: spec.argsFor(targetPath) }];
}
