import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { promisify } from "node:util";
import streamDeck from "@elgato/streamdeck";
import type { JsonValue } from "@elgato/utils";

const execFileAsync = promisify(execFile);
const logger = streamDeck.logger.createScope("Binary");

const MAC_CANDIDATES = [
	"/usr/local/bin/tailscale",
	"/opt/homebrew/bin/tailscale",
	"/Applications/Tailscale.app/Contents/MacOS/Tailscale",
];

type GlobalSettings = {
	cachedBinaryPath?: string;
	[key: string]: JsonValue;
};

let cached: string | null = null;
let inflight: Promise<string> | null = null;

export async function resolveBinary(): Promise<string> {
	if (cached) return cached;
	if (inflight) return inflight;

	inflight = (async () => {
		const envOverride = process.env["TAILSCALE_CLI"];
		if (envOverride && existsSync(envOverride)) {
			logger.debug(`Using TAILSCALE_CLI env var: ${envOverride}`);
			return cache(envOverride);
		}

		const settings = (await streamDeck.settings.getGlobalSettings<GlobalSettings>()) ?? {};
		if (settings.cachedBinaryPath && existsSync(settings.cachedBinaryPath)) {
			logger.debug(`Using cached binary: ${settings.cachedBinaryPath}`);
			cached = settings.cachedBinaryPath;
			return settings.cachedBinaryPath;
		}

		const found =
			process.platform === "win32" ? await findOnWindows() : findOnMac();
		if (!found) {
			throw new Error(
				"Tailscale CLI not found. Set TAILSCALE_CLI to the path of the tailscale binary, or install the Tailscale app.",
			);
		}
		logger.info(`Resolved Tailscale CLI: ${found}`);
		await streamDeck.settings.setGlobalSettings<GlobalSettings>({
			...settings,
			cachedBinaryPath: found,
		});
		return cache(found);
	})();

	try {
		return await inflight;
	} finally {
		inflight = null;
	}
}

export function clearBinaryCache(): void {
	cached = null;
}

function cache(path: string): string {
	cached = path;
	return path;
}

function findOnMac(): string | null {
	for (const candidate of MAC_CANDIDATES) {
		if (existsSync(candidate)) return candidate;
	}
	return null;
}

async function findOnWindows(): Promise<string | null> {
	try {
		const { stdout } = await execFileAsync("where", ["tailscale"], {
			timeout: 5000,
		});
		const line = stdout
			.split(/\r?\n/)
			.map((s) => s.trim())
			.find((s) => s.length > 0);
		if (line && existsSync(line)) return line;
	} catch {
		// fall through
	}

	try {
		const { stdout } = await execFileAsync(
			"reg",
			["query", "HKLM\\SOFTWARE\\Tailscale IPN", "/v", "InstallDir"],
			{ timeout: 5000 },
		);
		const match = stdout.match(/InstallDir\s+REG_SZ\s+(.+)/);
		if (match?.[1]) {
			const exe = `${match[1].trim()}\\tailscale.exe`;
			if (existsSync(exe)) return exe;
		}
	} catch {
		// fall through
	}

	const programFiles = [
		process.env["ProgramFiles"],
		process.env["ProgramFiles(x86)"],
	].filter(Boolean) as string[];
	for (const root of programFiles) {
		const exe = `${root}\\Tailscale\\tailscale.exe`;
		if (existsSync(exe)) return exe;
	}
	return null;
}
