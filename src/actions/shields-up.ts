import streamDeck, {
	action,
	SingletonAction,
	type KeyDownEvent,
	type WillAppearEvent,
	type WillDisappearEvent,
} from "@elgato/streamdeck";

import { poller } from "../services/poller";
import { setShieldsUp } from "../services/tailscale";
import type { ShieldsSettings, StatusProjection, TailscaleStatus } from "../types";

const logger = streamDeck.logger.createScope("Shields");

@action({ UUID: "com.github.streamdecktailscale.shields" })
export class ShieldsUp extends SingletonAction<ShieldsSettings> {
	readonly #listener = (_status: TailscaleStatus, projection: StatusProjection): void => {
		void this.render(projection);
	};

	override onWillAppear(_ev: WillAppearEvent<ShieldsSettings>): Promise<void> | void {
		poller.on("status", this.#listener);
		poller.register();
	}

	override onWillDisappear(_ev: WillDisappearEvent<ShieldsSettings>): Promise<void> | void {
		poller.unregister();
		poller.off("status", this.#listener);
	}

	override async onKeyDown(ev: KeyDownEvent<ShieldsSettings>): Promise<void> {
		const { projection } = poller.getLast();
		const current = projection?.shieldsUp ?? false;
		try {
			await setShieldsUp(!current);
			await poller.refreshNow();
		} catch (err) {
			logger.error(`Shields toggle failed: ${(err as Error).message}`);
			await ev.action.showAlert();
		}
	}

	private async render(projection: StatusProjection): Promise<void> {
		const state = projection.shieldsUp ? 1 : 0;
		for (const action of this.actions) {
			if (!action.isKey()) continue;
			await action.setState(state);
		}
	}
}
