import { execFile } from "node:child_process";
import { promisify } from "node:util";
import streamDeck from "@elgato/streamdeck";

import type { TailscaleProfile, TailscaleStatus } from "../types";
import { resolveBinary } from "./binary";

const execFileAsync = promisify(execFile);
const logger = streamDeck.logger.createScope("Tailscale");

const TIMEOUT_MS = 5_000;

const mutex = new Map<string, Promise<unknown>>();

async function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
	const pending = mutex.get(key);
	if (pending) {
		await pending.catch(() => {});
	}
	const next = fn();
	mutex.set(
		key,
		next.finally(() => {
			if (mutex.get(key) === next) mutex.delete(key);
		}),
	);
	return next;
}

/**
 * On macOS, the Mac App Store Tailscale CLI reaches its daemon via an XPC
 * service. Node's posix_spawn does not propagate the Mach bootstrap port the
 * way fork+exec via a shell does, so a direct execFile fails with
 * `The Tailscale GUI failed to start ... (Tailscale.CLIError error 3.)`.
 * Wrapping the call in `/bin/sh -c` restores the bootstrap port. Windows is
 * unaffected and uses execFile directly.
 */
const NEEDS_SHELL_WRAPPER = process.platform === "darwin";

function shellQuote(arg: string): string {
	return `'${arg.replace(/'/g, "'\\''")}'`;
}

async function run(args: string[], opts: { timeout?: number } = {}): Promise<string> {
	const binary = await resolveBinary();
	const timeout = opts.timeout ?? TIMEOUT_MS;
	try {
		const { stdout, stderr } = NEEDS_SHELL_WRAPPER
			? await execFileAsync(
					"/bin/sh",
					["-c", [binary, ...args].map(shellQuote).join(" ")],
					{ timeout, maxBuffer: 8 * 1024 * 1024 },
				)
			: await execFileAsync(binary, args, {
					timeout,
					maxBuffer: 8 * 1024 * 1024,
				});
		if (stderr) {
			logger.debug(`tailscale ${args.join(" ")} stderr: ${stderr.trim()}`);
		}
		return stdout;
	} catch (err) {
		const e = err as NodeJS.ErrnoException & { stderr?: string; stdout?: string };
		const detail = e.stderr?.trim() || e.stdout?.trim() || e.message;
		logger.error(`tailscale ${args.join(" ")} failed (binary=${binary}): ${detail}`);
		throw new Error(detail);
	}
}

export async function status(): Promise<TailscaleStatus> {
	return withLock("status", async () => {
		const stdout = await run(["status", "--json"]);
		try {
			return JSON.parse(stdout) as TailscaleStatus;
		} catch (err) {
			logger.error(`status --json returned non-JSON output (first 400 chars): ${stdout.slice(0, 400)}`);
			throw err;
		}
	});
}

export async function up(): Promise<void> {
	await withLock("up", async () => {
		await run(["up"]);
	});
}

export async function down(): Promise<void> {
	await withLock("down", async () => {
		await run(["down"]);
	});
}

export async function setExitNode(hostnameOrIp: string | null): Promise<void> {
	await withLock("set-exit-node", async () => {
		const value = hostnameOrIp ?? "";
		await run(["set", `--exit-node=${value}`]);
	});
}

export async function setShieldsUp(enabled: boolean): Promise<void> {
	await withLock("set-shields", async () => {
		await run(["set", `--shields-up=${enabled ? "true" : "false"}`]);
	});
}

export async function switchProfile(idOrName: string): Promise<void> {
	await withLock("switch", async () => {
		await run(["switch", idOrName]);
	});
}

export async function listProfiles(): Promise<TailscaleProfile[]> {
	return withLock("switch-list", async () => {
		let stdout: string;
		try {
			stdout = await run(["switch", "--list"]);
		} catch {
			return [];
		}
		return parseProfileList(stdout);
	});
}

export function parseProfileList(stdout: string): TailscaleProfile[] {
	const lines = stdout.split(/\r?\n/);
	const profiles: TailscaleProfile[] = [];
	for (const raw of lines) {
		const line = raw.replace(/\s+\*\s*$/, "");
		const active = /\s\*\s*$/.test(raw) || /\*\s*$/.test(raw);
		const trimmed = line.trim();
		if (!trimmed) continue;
		if (/^id\b/i.test(trimmed)) continue;
		const cols = trimmed.split(/\s{2,}|\t+/).filter(Boolean);
		if (cols.length < 3) continue;
		const id = cols[0];
		const tailnet = cols[1];
		const account = cols.slice(2).join(" ");
		if (!id || !tailnet || !account) continue;
		profiles.push({ id, tailnet, account, active });
	}
	return profiles;
}
