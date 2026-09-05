import type { ExternalApp } from "@superset/local-db";

export type LinuxPathArgs = (targetPath: string) => string[];

export type LinuxExtractLayout = {
	/** Directories to scan for a versioned extract folder. `{home}` is expanded. */
	parentDirs: string[];
	/** Prefix of extract folder names, e.g. `Devin-linux-`. */
	dirPrefix: string;
	/** Path inside the extract folder to the launcher. */
	binaryRel: string;
};

export type LinuxAppCandidate = {
	clis: string[];
	extraBinaries?: string[];
	/** Portable tar.gz / unpacked app layouts (Documents, Downloads, …). */
	extractLayouts?: LinuxExtractLayout[];
	flatpakIds?: string[];
	pathArgs?: LinuxPathArgs;
	/**
	 * Query GNOME LocalSearch and plocate for files named like `clis`.
	 * Used for portable tar.gz apps that are not on PATH and have no .desktop file.
	 */
	filenameIndex?: boolean;
};

/** CLI basenames that should be looked up in LocalSearch / plocate. */
export function filenameIndexCliNames(): string[] {
	const names = new Set<string>();
	for (const candidate of Object.values(LINUX_APP_CANDIDATES)) {
		if (!candidate?.filenameIndex) continue;
		for (const cli of candidate.clis) names.add(cli);
	}
	return [...names];
}

/** Apps that exist only on macOS and must never appear in the Linux Open-in menu. */
export const MACOS_ONLY_EXTERNAL_APPS = new Set<ExternalApp>([
	"xcode",
	"appcode",
	"iterm",
	"terminal",
]);

/**
 * How to find each Linux-capable ExternalApp.
 * `{home}` in extraBinaries is replaced with the user's home directory.
 */
export const LINUX_APP_CANDIDATES: Partial<
	Record<ExternalApp, LinuxAppCandidate>
> = {
	vscode: {
		clis: ["code"],
		extraBinaries: ["/usr/share/code/bin/code", "/usr/lib/code/bin/code"],
		flatpakIds: ["com.visualstudio.code"],
	},
	"vscode-insiders": {
		clis: ["code-insiders"],
		extraBinaries: ["/usr/share/code-insiders/bin/code-insiders"],
		flatpakIds: ["com.visualstudio.code.insiders"],
	},
	cursor: {
		clis: ["cursor"],
		extraBinaries: [
			"{home}/.local/bin/cursor",
			"{home}/.cursor/bin/cursor",
			"/usr/share/cursor/bin/cursor",
			"/opt/cursor/cursor",
			"/opt/Cursor/cursor",
		],
		flatpakIds: ["app.cursor.Cursor", "com.cursor.Cursor"],
	},
	antigravity: {
		clis: ["antigravity"],
		flatpakIds: ["com.antigravity.Antigravity"],
	},
	devin: {
		// `devin` on PATH is the agent CLI, not the IDE. Opening a folder with it
		// either errors or looks for a separate `devin-desktop` launcher.
		clis: ["devin-desktop"],
		extraBinaries: [
			"{home}/.codeium/windsurf/bin/devin-desktop",
			"{home}/.codeium/windsurf/bin/windsurf",
			"{home}/.local/bin/devin-desktop",
			"/opt/devin-desktop/devin-desktop",
			"/opt/Devin/devin-desktop",
			"/usr/share/devin-desktop/devin-desktop",
		],
		extractLayouts: [
			{
				parentDirs: ["{home}/Documents", "{home}/Downloads"],
				dirPrefix: "Devin-linux-",
				binaryRel: "Devin/bin/devin-desktop",
			},
		],
		filenameIndex: true,
	},
	zed: {
		clis: ["zed", "zeditor"],
		extraBinaries: ["/usr/lib/zed/zed"],
		flatpakIds: ["dev.zed.Zed"],
	},
	sublime: {
		clis: ["subl", "sublime_text"],
		extraBinaries: ["/opt/sublime_text/sublime_text"],
		flatpakIds: ["com.sublimetext.three"],
	},
	warp: {
		clis: ["warp-terminal", "warp"],
		flatpakIds: ["dev.warp.Warp"],
	},
	ghostty: {
		clis: ["ghostty"],
		flatpakIds: ["com.mitchellh.ghostty", "org.ghostty.Ghostty"],
		pathArgs: (targetPath) => [`--working-directory=${targetPath}`],
	},
	ptyxis: {
		clis: ["ptyxis"],
		flatpakIds: ["org.gnome.Ptyxis", "app.devsuite.Ptyxis"],
		pathArgs: (targetPath) => [
			"--new-window",
			`--working-directory=${targetPath}`,
		],
	},
	kitty: {
		clis: ["kitty"],
		flatpakIds: ["net.kovidgoyal.kitty"],
		pathArgs: (targetPath) => ["--directory", targetPath],
	},
	alacritty: {
		clis: ["alacritty"],
		flatpakIds: ["io.alacritty.Alacritty"],
		pathArgs: (targetPath) => ["--working-directory", targetPath],
	},
	wezterm: {
		clis: ["wezterm"],
		flatpakIds: ["org.wezfurlong.wezterm"],
		pathArgs: (targetPath) => ["start", "--cwd", targetPath],
	},
	intellij: {
		clis: ["idea", "intellij-idea-ultimate", "intellij-idea-community"],
		flatpakIds: [
			"com.jetbrains.IntelliJ-IDEA-Ultimate",
			"com.jetbrains.IntelliJ-IDEA-Community",
		],
	},
	webstorm: {
		clis: ["webstorm"],
		flatpakIds: ["com.jetbrains.WebStorm"],
	},
	pycharm: {
		clis: ["pycharm", "pycharm-professional", "pycharm-community"],
		flatpakIds: [
			"com.jetbrains.PyCharm-Professional",
			"com.jetbrains.PyCharm-Community",
		],
	},
	phpstorm: {
		clis: ["phpstorm"],
		flatpakIds: ["com.jetbrains.PhpStorm"],
	},
	rubymine: {
		clis: ["rubymine"],
		flatpakIds: ["com.jetbrains.RubyMine"],
	},
	goland: {
		clis: ["goland"],
		flatpakIds: ["com.jetbrains.GoLand"],
	},
	clion: {
		clis: ["clion"],
		flatpakIds: ["com.jetbrains.CLion"],
	},
	rider: {
		clis: ["rider"],
		flatpakIds: ["com.jetbrains.Rider"],
	},
	datagrip: {
		clis: ["datagrip"],
		flatpakIds: ["com.jetbrains.DataGrip"],
	},
	fleet: {
		clis: ["fleet"],
	},
	rustrover: {
		clis: ["rustrover"],
		flatpakIds: ["com.jetbrains.RustRover"],
	},
	"android-studio": {
		clis: ["studio", "android-studio"],
		extraBinaries: [
			"{home}/.local/share/JetBrains/Toolbox/apps/android-studio/bin/studio",
			"/opt/android-studio/bin/studio",
		],
		flatpakIds: ["com.google.AndroidStudio"],
	},
};
