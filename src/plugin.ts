import streamDeck from "@elgato/streamdeck";

import { ExitNode } from "./actions/exit-node";
import { ShieldsUp } from "./actions/shields-up";
import { StatusDisplay } from "./actions/status-display";
import { SwitchAccount } from "./actions/switch-account";
import { ToggleConnection } from "./actions/toggle-connection";

streamDeck.logger.setLevel("trace");

streamDeck.actions.registerAction(new ToggleConnection());
streamDeck.actions.registerAction(new ExitNode());
streamDeck.actions.registerAction(new ShieldsUp());
streamDeck.actions.registerAction(new SwitchAccount());
streamDeck.actions.registerAction(new StatusDisplay());

await streamDeck.connect();
