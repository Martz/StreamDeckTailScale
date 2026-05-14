import { EventEmitter } from "node:events";
import streamDeck from "@elgato/streamdeck";

import type { StatusProjection, TailscaleStatus } from "../types";
import { status as fetchStatus } from "./tailscale";

const logger = streamDeck.logger.createScope("Poller");

const BASE_INTERVAL_MS = 3_000;
const JITTER_MS = 500;

export interface PollerEvents {
	status: (status: TailscaleStatus, projection: StatusProjection) => void;
	error: (err: Error) => void;
}

class Poller extends EventEmitter {
	private timer: NodeJS.Timeout | null = null;
	private running = false;
	private refCount = 0;
	private last: TailscaleStatus | null = null;
	private lastProjection: StatusProjection | null = null;

	override on<K extends keyof PollerEvents>(event: K, listener: PollerEvents[K]): this {
		return super.on(event, listener as (...args: unknown[]) => void);
	}

	override off<K extends keyof PollerEvents>(event: K, listener: PollerEvents[K]): this {
		return super.off(event, listener as (...args: unknown[]) => void);
	}

	override emit<K extends keyof PollerEvents>(event: K, ...args: Parameters<PollerEvents[K]>): boolean {
		return super.emit(event, ...args);
	}

	register(): void {
		this.refCount += 1;
		if (this.refCount === 1) this.start();
		else queueMicrotask(() => this.emitLastTo());
	}

	unregister(): void {
		if (this.refCount === 0) return;
		this.refCount -= 1;
		if (this.refCount === 0) this.stop();
	}

	getLast(): { status: TailscaleStatus | null; projection: StatusProjection | null } {
		return { status: this.last, projection: this.lastProjection };
	}

	async refreshNow(): Promise<void> {
		await this.tick();
	}

	private start(): void {
		if (this.timer) return;
		logger.debug("Starting poller");
		this.scheduleNext(0);
	}

	private stop(): void {
		if (this.timer) {
			clearTimeout(this.timer);
			this.timer = null;
		}
		this.running = false;
		logger.debug("Stopped poller");
	}

	private scheduleNext(delay: number): void {
		this.timer = setTimeout(() => {
			void this.tick();
		}, delay);
	}

	private async tick(): Promise<void> {
		if (this.running) return;
		this.running = true;
		try {
			const next = await fetchStatus();
			const projection = project(next);
			const changed = !this.lastProjection || !shallowEqual(projection, this.lastProjection);
			this.last = next;
			this.lastProjection = projection;
			if (changed) this.emit("status", next, projection);
		} catch (err) {
			this.emit("error", err as Error);
		} finally {
			this.running = false;
			if (this.refCount > 0) {
				const jitter = Math.floor(Math.random() * (JITTER_MS * 2)) - JITTER_MS;
				this.scheduleNext(BASE_INTERVAL_MS + jitter);
			}
		}
	}

	private emitLastTo(): void {
		if (this.last && this.lastProjection) {
			this.emit("status", this.last, this.lastProjection);
		}
	}
}

export const poller = new Poller();

streamDeck.system.onApplicationDidLaunch(() => void poller.refreshNow());
streamDeck.system.onApplicationDidTerminate(() => void poller.refreshNow());
streamDeck.system.onSystemDidWakeUp(() => void poller.refreshNow());

export function project(status: TailscaleStatus): StatusProjection {
	const self = status.Self;
	const activeExitNodeId = self?.ExitNodeStatus?.ID ?? status.Prefs?.ExitNodeID ?? "";
	let exitNodeHostname = "";
	if (activeExitNodeId && status.Peer) {
		const peer = status.Peer[activeExitNodeId];
		if (peer) exitNodeHostname = shortHost(peer.HostName);
	}
	return {
		backendState: status.BackendState,
		exitNodeHostname,
		shieldsUp: !!status.Prefs?.ShieldsUp,
		tailnet: status.CurrentTailnet?.Name ?? "",
		hostname: shortHost(self?.HostName),
		ipv4: self?.TailscaleIPs?.find((ip) => ip.includes(".")) ?? "",
	};
}

function shortHost(hostname: string | undefined): string {
	if (!hostname) return "";
	return hostname.split(".")[0] ?? hostname;
}

function shallowEqual(a: StatusProjection, b: StatusProjection): boolean {
	return (
		a.backendState === b.backendState &&
		a.exitNodeHostname === b.exitNodeHostname &&
		a.shieldsUp === b.shieldsUp &&
		a.tailnet === b.tailnet &&
		a.hostname === b.hostname &&
		a.ipv4 === b.ipv4
	);
}
