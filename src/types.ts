export type BackendState =
	| "NoState"
	| "NeedsLogin"
	| "NeedsMachineAuth"
	| "Stopped"
	| "Starting"
	| "Running";

export interface TailscalePeer {
	ID: string;
	HostName: string;
	DNSName: string;
	OS: string;
	TailscaleIPs: string[];
	Online: boolean;
	ExitNode: boolean;
	ExitNodeOption: boolean;
}

export interface TailscaleExitNodeStatus {
	ID: string;
	Online: boolean;
	TailscaleIPs: string[];
}

export interface TailscaleSelf extends TailscalePeer {
	ExitNodeStatus?: TailscaleExitNodeStatus;
}

export interface TailscalePrefs {
	ShieldsUp?: boolean;
	ExitNodeID?: string;
	ExitNodeIP?: string;
	AdvertiseExitNode?: boolean;
	RouteAll?: boolean;
	CorpDNS?: boolean;
}

export interface TailscaleStatus {
	Version: string;
	BackendState: BackendState;
	TailscaleIPs?: string[];
	AuthURL?: string;
	Self?: TailscaleSelf;
	Peer?: Record<string, TailscalePeer>;
	CurrentTailnet?: { Name?: string; MagicDNSEnabled?: boolean };
	Prefs?: TailscalePrefs;
}

export interface TailscaleProfile {
	id: string;
	tailnet: string;
	account: string;
	active: boolean;
}

export interface StatusProjection {
	backendState: BackendState;
	exitNodeHostname: string;
	shieldsUp: boolean;
	tailnet: string;
	hostname: string;
	ipv4: string;
}

export type ToggleSettings = {
	_unused?: never;
};

export type ExitNodeSettings = {
	exitNodeHostname?: string;
};

export type ShieldsSettings = {
	_unused?: never;
};

export type SwitchSettings = {
	profileId?: string;
	profileLabel?: string;
};

export type StatusSettings = {
	_unused?: never;
};

import type { JsonValue } from "@elgato/utils";

export type DataSourceItem = {
	value: string;
	label?: string;
	disabled?: boolean;
	[key: string]: JsonValue;
};

export type DataSourcePayload = {
	event: string;
	items: DataSourceItem[];
	[key: string]: JsonValue;
};
