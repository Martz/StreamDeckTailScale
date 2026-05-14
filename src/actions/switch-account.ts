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
import { listProfiles, switchProfile } from "../services/tailscale";
import type {
	DataSourceItem,
	DataSourcePayload,
	StatusProjection,
	SwitchSettings,
	TailscaleStatus,
} from "../types";

const logger = streamDeck.logger.createScope("Switch");

@action({ UUID: "com.github.streamdecktailscale.switch" })
export class SwitchAccount extends SingletonAction<SwitchSettings> {
	readonly #listener = (_status: TailscaleStatus, projection: StatusProjection): void => {
		void this.renderAll(projection);
	};

	override onWillAppear(_ev: WillAppearEvent<SwitchSettings>): Promise<void> | void {
		poller.on("status", this.#listener);
		poller.register();
	}

	override onWillDisappear(_ev: WillDisappearEvent<SwitchSettings>): Promise<void> | void {
		poller.unregister();
		poller.off("status", this.#listener);
	}

	override async onKeyDown(ev: KeyDownEvent<SwitchSettings>): Promise<void> {
		const target = ev.payload.settings.profileId;
		if (!target) {
			await ev.action.showAlert();
			return;
		}
		try {
			await switchProfile(target);
			await poller.refreshNow();
		} catch (err) {
			logger.error(`Switch failed: ${(err as Error).message}`);
			await ev.action.showAlert();
		}
	}

	override async onSendToPlugin(ev: SendToPluginEvent<JsonValue, SwitchSettings>): Promise<void> {
		if (
			typeof ev.payload === "object" &&
			ev.payload !== null &&
			!Array.isArray(ev.payload) &&
			"event" in ev.payload &&
			ev.payload.event === "getProfiles"
		) {
			const profiles = await listProfiles();
			const items: DataSourceItem[] = profiles.map((p) => ({
				value: p.id,
				label: `${p.tailnet} — ${p.account}${p.active ? "  ★" : ""}`,
			}));
			void streamDeck.ui.sendToPropertyInspector({
				event: "getProfiles",
				items,
			} satisfies DataSourcePayload);
		}
	}

	private async renderAll(projection: StatusProjection): Promise<void> {
		const profiles = await listProfiles().catch(() => []);
		const activeId = profiles.find((p) => p.active)?.id ?? "";
		for (const action of this.actions) {
			if (!action.isKey()) continue;
			const settings = await action.getSettings();
			const isActive = !!settings.profileId && settings.profileId === activeId && projection.backendState === "Running";
			await action.setState(isActive ? 1 : 0);
			if (settings.profileLabel) await action.setTitle(settings.profileLabel);
		}
	}
}
