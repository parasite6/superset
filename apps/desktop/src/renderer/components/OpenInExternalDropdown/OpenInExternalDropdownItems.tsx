import { Trans } from "@lingui/react/macro";
import type { ExternalApp } from "@superset/local-db";
import {
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
} from "@superset/ui/dropdown-menu";
import { cn } from "@superset/ui/utils";
import type { ReactNode } from "react";
import { LuCopy } from "react-icons/lu";
import jetbrainsIcon from "renderer/assets/app-icons/jetbrains.svg";
import terminalIcon from "renderer/assets/app-icons/terminal.png";
import vscodeIcon from "renderer/assets/app-icons/vscode.svg";
import {
	FINDER_OPTIONS,
	IDE_OPTIONS,
	JETBRAINS_OPTIONS,
	type OpenInExternalAppOption,
	TERMINAL_OPTIONS,
	VSCODE_OPTIONS,
} from "./constants";
import { FileManagerAppLabel } from "./FileManagerLabels";
import { filterByInstalled } from "./filterByInstalled";
import { useInstalledExternalApps } from "./useInstalledExternalApps";

export type OpenInExternalAppGroup =
	| "finder"
	| "ide"
	| "terminal"
	| "vscode"
	| "jetbrains";

interface OpenInExternalDropdownItemsProps {
	isDark: boolean;
	activeApp?: ExternalApp;
	onOpenIn: (app: ExternalApp) => void;
	onCopyPath: () => void;
	renderAppTrailing?: (
		appId: ExternalApp,
		group: OpenInExternalAppGroup,
	) => ReactNode;
	copyPathTrailing?: ReactNode;
	appItemClassName?: string;
	appContentClassName?: string;
	appIconClassName?: string;
	appLabelClassName?: string;
	subTriggerClassName?: string;
	subTriggerContentClassName?: string;
	subTriggerIconClassName?: string;
	subContentClassName?: string;
	copyPathItemClassName?: string;
	copyPathContentClassName?: string;
	copyPathIconClassName?: string;
	copyPathLabelClassName?: string;
}

export function OpenInExternalDropdownItems({
	isDark,
	activeApp,
	onOpenIn,
	onCopyPath,
	renderAppTrailing,
	copyPathTrailing,
	appItemClassName,
	appContentClassName,
	appIconClassName,
	appLabelClassName,
	subTriggerClassName,
	subTriggerContentClassName,
	subTriggerIconClassName,
	subContentClassName,
	copyPathItemClassName,
	copyPathContentClassName,
	copyPathIconClassName,
	copyPathLabelClassName,
}: OpenInExternalDropdownItemsProps) {
	const installed = useInstalledExternalApps();
	const finderApps = filterByInstalled(FINDER_OPTIONS, installed);
	const ideApps = filterByInstalled(IDE_OPTIONS, installed);
	const vscodeApps = filterByInstalled(VSCODE_OPTIONS, installed);
	const jetbrainsApps = filterByInstalled(JETBRAINS_OPTIONS, installed);
	const terminalApps = filterByInstalled(TERMINAL_OPTIONS, installed);
	const showIdeMenu =
		ideApps.length > 0 || vscodeApps.length > 0 || jetbrainsApps.length > 0;
	const showTerminalMenu = terminalApps.length > 0;

	const renderAppOptions = (
		apps: OpenInExternalAppOption[],
		group: OpenInExternalAppGroup,
	) =>
		apps.map((app) => (
			<DropdownMenuItem
				key={app.id}
				onClick={() => onOpenIn(app.id)}
				className={appItemClassName}
			>
				<div className={cn("flex items-center gap-2", appContentClassName)}>
					<img
						src={isDark ? app.darkIcon : app.lightIcon}
						alt=""
						className={cn("size-4 object-contain", appIconClassName)}
					/>
					<span className={appLabelClassName}>
						{app.id === "finder" ? <FileManagerAppLabel /> : app.label}
					</span>
				</div>
				{renderAppTrailing?.(app.id, group)}
			</DropdownMenuItem>
		));

	const activeIdeOption = activeApp
		? [...IDE_OPTIONS, ...VSCODE_OPTIONS, ...JETBRAINS_OPTIONS].find(
				(app) => app.id === activeApp,
			)
		: undefined;
	const activeTerminalOption = activeApp
		? TERMINAL_OPTIONS.find((app) => app.id === activeApp)
		: undefined;

	return (
		<>
			{renderAppOptions(finderApps, "finder")}
			{showIdeMenu ? (
				<DropdownMenuSub>
					<DropdownMenuSubTrigger className={subTriggerClassName}>
						<div
							className={cn(
								"flex items-center gap-2",
								subTriggerContentClassName,
							)}
						>
							<img
								src={
									activeIdeOption
										? isDark
											? activeIdeOption.darkIcon
											: activeIdeOption.lightIcon
										: vscodeIcon
								}
								alt=""
								className={cn("size-4 object-contain", subTriggerIconClassName)}
							/>
							<span>
								<Trans>IDE</Trans>
							</span>
						</div>
					</DropdownMenuSubTrigger>
					<DropdownMenuSubContent
						sideOffset={8}
						className={subContentClassName}
					>
						{renderAppOptions(ideApps, "ide")}
						{vscodeApps.length > 0 ? (
							<DropdownMenuSub>
								<DropdownMenuSubTrigger className={subTriggerClassName}>
									<div
										className={cn(
											"flex items-center gap-2",
											subTriggerContentClassName,
										)}
									>
										<img
											src={vscodeIcon}
											alt=""
											className={cn(
												"size-4 object-contain",
												subTriggerIconClassName,
											)}
										/>
										<span>
											<Trans>VS Code</Trans>
										</span>
									</div>
								</DropdownMenuSubTrigger>
								<DropdownMenuSubContent className={subContentClassName}>
									{renderAppOptions(vscodeApps, "vscode")}
								</DropdownMenuSubContent>
							</DropdownMenuSub>
						) : null}
						{jetbrainsApps.length > 0 ? (
							<DropdownMenuSub>
								<DropdownMenuSubTrigger className={subTriggerClassName}>
									<div
										className={cn(
											"flex items-center gap-2",
											subTriggerContentClassName,
										)}
									>
										<img
											src={jetbrainsIcon}
											alt=""
											className={cn(
												"size-4 object-contain",
												subTriggerIconClassName,
											)}
										/>
										<span>
											<Trans>JetBrains</Trans>
										</span>
									</div>
								</DropdownMenuSubTrigger>
								<DropdownMenuSubContent className={subContentClassName}>
									{renderAppOptions(jetbrainsApps, "jetbrains")}
								</DropdownMenuSubContent>
							</DropdownMenuSub>
						) : null}
					</DropdownMenuSubContent>
				</DropdownMenuSub>
			) : null}
			{showTerminalMenu ? (
				<DropdownMenuSub>
					<DropdownMenuSubTrigger className={subTriggerClassName}>
						<div
							className={cn(
								"flex items-center gap-2",
								subTriggerContentClassName,
							)}
						>
							<img
								src={
									activeTerminalOption
										? isDark
											? activeTerminalOption.darkIcon
											: activeTerminalOption.lightIcon
										: terminalIcon
								}
								alt=""
								className={cn("size-4 object-contain", subTriggerIconClassName)}
							/>
							<span>
								<Trans>Terminal</Trans>
							</span>
						</div>
					</DropdownMenuSubTrigger>
					<DropdownMenuSubContent
						sideOffset={8}
						className={subContentClassName}
					>
						{renderAppOptions(terminalApps, "terminal")}
					</DropdownMenuSubContent>
				</DropdownMenuSub>
			) : null}
			<DropdownMenuSeparator />
			<DropdownMenuItem onClick={onCopyPath} className={copyPathItemClassName}>
				<div
					className={cn("flex items-center gap-2", copyPathContentClassName)}
				>
					<LuCopy className={cn("size-4", copyPathIconClassName)} />
					<span className={copyPathLabelClassName}>
						<Trans>Copy path</Trans>
					</span>
				</div>
				{copyPathTrailing}
			</DropdownMenuItem>
		</>
	);
}
