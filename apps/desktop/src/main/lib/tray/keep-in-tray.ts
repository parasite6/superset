/** Null/unset follows the platform default: on for Linux, off elsewhere. */
export function resolveKeepInTray(
	stored: boolean | null | undefined,
	isLinux: boolean,
): boolean {
	return stored ?? isLinux;
}

export function canInitTray(
	platform: NodeJS.Platform,
	keepInTray: boolean,
): boolean {
	if (platform === "darwin") return true;
	if (platform === "linux") return keepInTray;
	return false;
}

/**
 * Linux StatusNotifierItem D-Bus exports survive `Tray.destroy()`, so a later
 * `new Tray()` registers as a dead placeholder. Tear the icon down only on
 * process exit; toggling keep-in-tray off still quits on last-window close.
 */
export function shouldDestroyTrayOnDisable(platform: NodeJS.Platform): boolean {
	return platform !== "linux";
}

/** Confirm-before-quit is suppressed while Linux keep-in-tray is on. */
export function shouldPromptQuitConfirmation(options: {
	skipQuitConfirmation: boolean;
	isDev: boolean;
	confirmOnQuit: boolean;
	keepInTray: boolean;
}): boolean {
	if (options.skipQuitConfirmation || options.isDev) return false;
	if (options.keepInTray) return false;
	return options.confirmOnQuit;
}

export function isGnomeDesktop(xdgCurrentDesktop: string | undefined): boolean {
	return (xdgCurrentDesktop ?? "").toUpperCase().split(":").includes("GNOME");
}
