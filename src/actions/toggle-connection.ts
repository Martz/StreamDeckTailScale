import streamDeck, {
	action,
	SingletonAction,
	type KeyDownEvent,
	type WillAppearEvent,
	type WillDisappearEvent,
} from "@elgato/streamdeck";

import { poller } from "../services/poller";
import { down, up } from "../services/tailscale";
import type { StatusProjection, TailscaleStatus, ToggleSettings } from "../types";

const logger = streamDeck.logger.createScope("Toggle");

const STATE_DISCONNECTED = 0;
const STATE_CONNECTED = 1;
const STATE_NEEDS_LOGIN = 2;

@action({ UUID: "com.github.streamdecktailscale.toggle" })
export class ToggleConnection extends SingletonAction<ToggleSettings> {
	readonly #listener = (_status: TailscaleStatus, projection: StatusProjection): void => {
		void this.render(projection);
	};

	override onWillAppear(_ev: WillAppearEvent<ToggleSettings>): Promise<void> | void {
		poller.on("status", this.#listener);
		poller.register();
	}

	override onWillDisappear(_ev: WillDisappearEvent<ToggleSettings>): Promise<void> | void {
		poller.unregister();
		poller.off("status", this.#listener);
	}

	override async onKeyDown(ev: KeyDownEvent<ToggleSettings>): Promise<void> {
		const { projection } = poller.getLast();
		try {
			if (projection?.backendState === "NeedsLogin" || projection?.backendState === "NeedsMachineAuth") {
				await openTailscaleApp();
				return;
			}
			if (projection?.backendState === "Running") {
				await down();
			} else {
				await up();
			}
			await poller.refreshNow();
		} catch (err) {
			logger.error(`Toggle failed: ${(err as Error).message}`);
			await ev.action.showAlert();
		}
	}

	private async render(projection: StatusProjection): Promise<void> {
		const state = mapState(projection);
		const title = titleFor(projection);
		for (const action of this.actions) {
			if (!action.isKey()) continue;
			await action.setState(state);
			await action.setTitle(title);
		}
	}
}

function mapState(projection: StatusProjection): number {
	switch (projection.backendState) {
		case "Running":
			return STATE_CONNECTED;
		case "NeedsLogin":
		case "NeedsMachineAuth":
			return STATE_NEEDS_LOGIN;
		default:
			return STATE_DISCONNECTED;
	}
}

function titleFor(projection: StatusProjection): string {
	switch (projection.backendState) {
		case "Running":
			return projection.tailnet || "Connected";
		case "Starting":
			return "Connecting…";
		case "NeedsLogin":
		case "NeedsMachineAuth":
			return "Log In";
		case "Stopped":
			return "Disconnected";
		default:
			return "";
	}
}

async function openTailscaleApp(): Promise<void> {
	if (process.platform === "darwin") {
		await streamDeck.system.openUrl("tailscale://");
	} else if (process.platform === "win32") {
		await streamDeck.system.openUrl("tailscale:");
	}
}
