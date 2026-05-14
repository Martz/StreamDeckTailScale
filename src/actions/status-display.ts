import streamDeck, {
	action,
	SingletonAction,
	type KeyDownEvent,
	type WillAppearEvent,
	type WillDisappearEvent,
} from "@elgato/streamdeck";

import { poller } from "../services/poller";
import type { StatusProjection, StatusSettings, TailscaleStatus } from "../types";

const logger = streamDeck.logger.createScope("Status");

const IMAGE_CONNECTED = "imgs/actions/status/connected";
const IMAGE_DISCONNECTED = "imgs/actions/status/disconnected";
const IMAGE_CONNECTING = "imgs/actions/status/connecting";

@action({ UUID: "com.github.streamdecktailscale.status" })
export class StatusDisplay extends SingletonAction<StatusSettings> {
	readonly #listener = (_status: TailscaleStatus, projection: StatusProjection): void => {
		void this.render(projection);
	};

	readonly #errorListener = (err: Error): void => {
		logger.warn(`Poller error: ${err.message}`);
		void this.renderError(err.message);
	};

	override onWillAppear(_ev: WillAppearEvent<StatusSettings>): Promise<void> | void {
		poller.on("status", this.#listener);
		poller.on("error", this.#errorListener);
		poller.register();
	}

	override onWillDisappear(_ev: WillDisappearEvent<StatusSettings>): Promise<void> | void {
		poller.unregister();
		poller.off("status", this.#listener);
		poller.off("error", this.#errorListener);
	}

	override onKeyDown(_ev: KeyDownEvent<StatusSettings>): Promise<void> | void {
		void poller.refreshNow();
	}

	private async render(projection: StatusProjection): Promise<void> {
		const { title, image } = renderProjection(projection);
		for (const action of this.actions) {
			if (!action.isKey()) continue;
			await action.setImage(image);
			await action.setTitle(title);
		}
	}

	private async renderError(message: string): Promise<void> {
		const short = message.length > 30 ? `${message.slice(0, 27)}…` : message;
		for (const action of this.actions) {
			if (!action.isKey()) continue;
			await action.setImage(IMAGE_DISCONNECTED);
			await action.setTitle(short);
		}
	}
}

function renderProjection(p: StatusProjection): { title: string; image: string } {
	switch (p.backendState) {
		case "Running": {
			const lines = ["Online"];
			if (p.hostname) lines.push(p.hostname);
			if (p.ipv4) lines.push(p.ipv4);
			return { title: lines.join("\n"), image: IMAGE_CONNECTED };
		}
		case "Starting":
			return { title: "Connecting…", image: IMAGE_CONNECTING };
		case "NeedsLogin":
		case "NeedsMachineAuth":
			return { title: "Log in", image: IMAGE_DISCONNECTED };
		case "Stopped":
			return { title: "Offline", image: IMAGE_DISCONNECTED };
		default:
			return { title: "—", image: IMAGE_DISCONNECTED };
	}
}
