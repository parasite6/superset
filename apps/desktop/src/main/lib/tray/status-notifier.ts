import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type RunCommand = (
	command: string,
	args: string[],
) => Promise<{ stdout: string; stderr: string }>;

async function defaultRun(
	command: string,
	args: string[],
): Promise<{ stdout: string; stderr: string }> {
	const { stdout, stderr } = await execFileAsync(command, args, {
		timeout: 2000,
	});
	return { stdout: String(stdout), stderr: String(stderr) };
}

/** True when a StatusNotifierItem host (AppIndicator, Plasma, etc.) is on the bus. */
export async function isStatusNotifierHostRegistered(
	run: RunCommand = defaultRun,
): Promise<boolean> {
	try {
		const { stdout } = await run("busctl", [
			"--user",
			"get-property",
			"org.kde.StatusNotifierWatcher",
			"/StatusNotifierWatcher",
			"org.kde.StatusNotifierWatcher",
			"IsStatusNotifierHostRegistered",
		]);
		return /\btrue\b/i.test(stdout);
	} catch {
		return false;
	}
}
