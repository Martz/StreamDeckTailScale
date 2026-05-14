import streamDeck, {
	action,
	SingletonAction,
	type KeyDownEvent,
	type SendToPluginEvent,
	type WillAppearEvent,
	type WillDisappearEvent,
} from "@elgato/streamdeck";
import type { JsonValue } from "@elgato/utils";

import { poller } from "../services/poller";
import { setExitNode } from "../services/tailscale";
import type {
	DataSourceItem,
	DataSourcePayload,
	ExitNodeSettings,
	StatusProjection,
	TailscaleStatus,
} from "../types";

const logger = streamDeck.logger.createScope("ExitNode");

@action({ UUID: "com.github.streamdecktailscale.exitnode" })
export class ExitNode extends SingletonAction<ExitNodeSettings> {
	readonly #listener = (status: TailscaleStatus, projection: StatusProjection): void => {
		void this.renderAll(status, projection);
	};

	override onWillAppear(_ev: WillAppearEvent<ExitNodeSettings>): Promise<void> | void {
		poller.on("status", this.#listener);
		poller.register();
	}

	override onWillDisappear(_ev: WillDisappearEvent<ExitNodeSettings>): Promise<void> | void {
		poller.unregister();
		poller.off("status", this.#listener);
	}

	override async onKeyDown(ev: KeyDownEvent<ExitNodeSettings>): Promise<void> {
		const target = ev.payload.settings.exitNodeHostname;
		if (!target) {
			await ev.action.showAlert();
			return;
		}
		const { projection } = poller.getLast();
		const isActive = projection?.exitNodeHostname === target;
		try {
			await setExitNode(isActive ? null : target);
			await poller.refreshNow();
		} catch (err) {
			logger.error(`Exit node press failed: ${(err as Error).message}`);
			await ev.action.showAlert();
		}
	}

	override onSendToPlugin(ev: SendToPluginEvent<JsonValue, ExitNodeSettings>): Promise<void> | void {
		if (
			typeof ev.payload === "object" &&
			ev.payload !== null &&
			!Array.isArray(ev.payload) &&
			"event" in ev.payload &&
			ev.payload.event === "getExitNodes"
		) {
			const items = exitNodeItems(poller.getLast().status);
			void streamDeck.ui.sendToPropertyInspector({
				event: "getExitNodes",
				items,
			} satisfies DataSourcePayload);
		}
	}

	private async renderAll(_status: TailscaleStatus, projection: StatusProjection): Promise<void> {
		for (const action of this.actions) {
			if (!action.isKey()) continue;
			const settings = await action.getSettings();
			const target = settings.exitNodeHostname ?? "";
			const isActive = !!target && projection.exitNodeHostname === target;
			await action.setState(isActive ? 1 : 0);
			await action.setTitle(target);
		}
	}
}

function exitNodeItems(status: TailscaleStatus | null): DataSourceItem[] {
	if (!status?.Peer) return [];
	const items: DataSourceItem[] = [];
	for (const peer of Object.values(status.Peer)) {
		if (!peer.ExitNodeOption) continue;
		const short = shortHostname(peer.HostName);
		items.push({
			value: short,
			label: `${short}${peer.Online ? "" : " (offline)"}`,
			disabled: !peer.Online,
		});
	}
	items.sort((a, b) => (a.label ?? a.value).localeCompare(b.label ?? b.value));
	return items;
}

function shortHostname(hostname: string): string {
	return hostname.split(".")[0] ?? hostname;
}
