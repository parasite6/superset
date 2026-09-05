import { msg } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import type { ReactNode } from "react";

function isLinux(): boolean {
	return process.platform === "linux";
}

export function FileManagerAppLabel(): ReactNode {
	return isLinux() ? <Trans>Files</Trans> : <Trans>Finder</Trans>;
}

export function RevealInFileManagerText(): ReactNode {
	return isLinux() ? (
		<Trans>Reveal in Files</Trans>
	) : (
		<Trans>Reveal in Finder</Trans>
	);
}

export function OpenInFileManagerText(): ReactNode {
	return isLinux() ? (
		<Trans>Open in Files</Trans>
	) : (
		<Trans>Open in Finder</Trans>
	);
}

export const OPEN_IN_FILE_MANAGER_MSG = msg({
	message: "Open in Files",
});
export const OPEN_IN_FINDER_MSG = msg({ message: "Open in Finder" });
export const REVEAL_IN_FILE_MANAGER_MSG = msg({
	message: "Reveal in Files",
});
export const REVEAL_IN_FINDER_MSG = msg({ message: "Reveal in Finder" });

export function openInFileManagerMsg() {
	return isLinux() ? OPEN_IN_FILE_MANAGER_MSG : OPEN_IN_FINDER_MSG;
}

export function revealInFileManagerMsg() {
	return isLinux() ? REVEAL_IN_FILE_MANAGER_MSG : REVEAL_IN_FINDER_MSG;
}
