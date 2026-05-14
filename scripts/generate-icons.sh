#!/usr/bin/env bash
set -euo pipefail

# Generates all PNG icon assets from SVG sources via rsvg-convert.
# Run from the repo root: bash scripts/generate-icons.sh

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SVG_DIR="$ROOT/assets/svg"
PLUGIN_DIR="$ROOT/com.github.streamdecktailscale.sdPlugin/imgs"

mkdir -p "$SVG_DIR" \
	"$PLUGIN_DIR/plugin" \
	"$PLUGIN_DIR/category" \
	"$PLUGIN_DIR/actions/toggle" \
	"$PLUGIN_DIR/actions/exitnode" \
	"$PLUGIN_DIR/actions/shields" \
	"$PLUGIN_DIR/actions/switch" \
	"$PLUGIN_DIR/actions/status"

if ! command -v rsvg-convert >/dev/null 2>&1; then
	echo "rsvg-convert not found. Install with: brew install librsvg" >&2
	exit 1
fi

#
# SVG sources
#
# A simple dot-grid logo (3x3) inspired by mesh topology, used for the plugin
# and category icons. Keep it visually neutral so it works on light and dark
# Stream Deck themes.
#
dotgrid() {
	local fill="$1"
	cat <<-SVG
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72">
		  <g fill="$fill">
		    <circle cx="18" cy="18" r="6" opacity="0.35"/>
		    <circle cx="36" cy="18" r="6" opacity="0.65"/>
		    <circle cx="54" cy="18" r="6" opacity="0.35"/>
		    <circle cx="18" cy="36" r="6" opacity="0.65"/>
		    <circle cx="36" cy="36" r="9"/>
		    <circle cx="54" cy="36" r="6" opacity="0.65"/>
		    <circle cx="18" cy="54" r="6" opacity="0.35"/>
		    <circle cx="36" cy="54" r="6" opacity="0.65"/>
		    <circle cx="54" cy="54" r="6" opacity="0.35"/>
		  </g>
		</svg>
	SVG
}

# Plain power glyph used on the toggle action icon (Stream Deck sidebar).
power_icon() {
	local stroke="$1"
	cat <<-SVG
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72">
		  <g fill="none" stroke="$stroke" stroke-width="6" stroke-linecap="round">
		    <path d="M36 14 V36"/>
		    <path d="M22 24 A20 20 0 1 0 50 24"/>
		  </g>
		</svg>
	SVG
}

# Globe glyph for the exit-node action icon.
globe_icon() {
	local stroke="$1"
	cat <<-SVG
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72">
		  <g fill="none" stroke="$stroke" stroke-width="4">
		    <circle cx="36" cy="36" r="22"/>
		    <ellipse cx="36" cy="36" rx="22" ry="10"/>
		    <line x1="14" y1="36" x2="58" y2="36"/>
		    <path d="M36 14 C22 26 22 46 36 58 C50 46 50 26 36 14 Z" fill="none"/>
		  </g>
		</svg>
	SVG
}

shield_icon() {
	local stroke="$1"
	cat <<-SVG
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72">
		  <path fill="none" stroke="$stroke" stroke-width="5" stroke-linejoin="round"
		        d="M36 12 L56 20 V36 C56 48 46 56 36 60 C26 56 16 48 16 36 V20 Z"/>
		</svg>
	SVG
}

switch_icon() {
	local stroke="$1"
	cat <<-SVG
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72">
		  <g fill="none" stroke="$stroke" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
		    <path d="M16 26 H52 L44 18 M52 26 L44 34"/>
		    <path d="M56 46 H20 L28 38 M20 46 L28 54"/>
		  </g>
		</svg>
	SVG
}

status_dot() {
	local color="$1"
	cat <<-SVG
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72">
		  <circle cx="36" cy="36" r="22" fill="$color"/>
		</svg>
	SVG
}

# State images: dot-grid logo tinted with a status colour.
state_dotgrid_with_dot() {
	local color="$1"
	cat <<-SVG
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72">
		  <g fill="#ffffff">
		    <circle cx="18" cy="18" r="5" opacity="0.35"/>
		    <circle cx="36" cy="18" r="5" opacity="0.55"/>
		    <circle cx="54" cy="18" r="5" opacity="0.35"/>
		    <circle cx="18" cy="36" r="5" opacity="0.55"/>
		    <circle cx="54" cy="36" r="5" opacity="0.55"/>
		    <circle cx="18" cy="54" r="5" opacity="0.35"/>
		    <circle cx="36" cy="54" r="5" opacity="0.55"/>
		    <circle cx="54" cy="54" r="5" opacity="0.35"/>
		  </g>
		  <circle cx="36" cy="36" r="10" fill="$color"/>
		</svg>
	SVG
}

# Write SVG sources.
dotgrid "#ffffff" > "$SVG_DIR/plugin.svg"
dotgrid "#9aa5b1" > "$SVG_DIR/category.svg"

power_icon "#ffffff" > "$SVG_DIR/action-toggle.svg"
globe_icon  "#ffffff" > "$SVG_DIR/action-exitnode.svg"
shield_icon "#ffffff" > "$SVG_DIR/action-shields.svg"
switch_icon "#ffffff" > "$SVG_DIR/action-switch.svg"
status_dot  "#9aa5b1" > "$SVG_DIR/action-status.svg"

state_dotgrid_with_dot "#6b7280" > "$SVG_DIR/state-toggle-off.svg"
state_dotgrid_with_dot "#22c55e" > "$SVG_DIR/state-toggle-on.svg"
state_dotgrid_with_dot "#f59e0b" > "$SVG_DIR/state-toggle-login.svg"

state_dotgrid_with_dot "#6b7280" > "$SVG_DIR/state-exitnode-off.svg"
state_dotgrid_with_dot "#3b82f6" > "$SVG_DIR/state-exitnode-on.svg"

state_dotgrid_with_dot "#6b7280" > "$SVG_DIR/state-shields-off.svg"
state_dotgrid_with_dot "#ef4444" > "$SVG_DIR/state-shields-on.svg"

state_dotgrid_with_dot "#6b7280" > "$SVG_DIR/state-switch-off.svg"
state_dotgrid_with_dot "#a855f7" > "$SVG_DIR/state-switch-on.svg"

state_dotgrid_with_dot "#22c55e" > "$SVG_DIR/state-status-connected.svg"
state_dotgrid_with_dot "#ef4444" > "$SVG_DIR/state-status-disconnected.svg"
state_dotgrid_with_dot "#f59e0b" > "$SVG_DIR/state-status-connecting.svg"

#
# Conversion helpers.
#
convert_pair() {
	local svg="$1" dst="$2" base="$3"
	rsvg-convert -w "$base"             -h "$base"              "$svg" -o "$dst.png"
	rsvg-convert -w $((base * 2))       -h $((base * 2))        "$svg" -o "${dst}@2x.png"
}

# Plugin marketplace icon: 256 / 512.
convert_pair "$SVG_DIR/plugin.svg"   "$PLUGIN_DIR/plugin/marketplace"   256

# Category icon: 28 / 56.
convert_pair "$SVG_DIR/category.svg" "$PLUGIN_DIR/category/icon"        28

# Action icons (sidebar): 20 / 40.
convert_pair "$SVG_DIR/action-toggle.svg"   "$PLUGIN_DIR/actions/toggle/icon"   20
convert_pair "$SVG_DIR/action-exitnode.svg" "$PLUGIN_DIR/actions/exitnode/icon" 20
convert_pair "$SVG_DIR/action-shields.svg"  "$PLUGIN_DIR/actions/shields/icon"  20
convert_pair "$SVG_DIR/action-switch.svg"   "$PLUGIN_DIR/actions/switch/icon"   20
convert_pair "$SVG_DIR/action-status.svg"   "$PLUGIN_DIR/actions/status/icon"   20

# State images (key faces): 72 / 144.
convert_pair "$SVG_DIR/state-toggle-off.svg"     "$PLUGIN_DIR/actions/toggle/off"     72
convert_pair "$SVG_DIR/state-toggle-on.svg"      "$PLUGIN_DIR/actions/toggle/on"      72
convert_pair "$SVG_DIR/state-toggle-login.svg"   "$PLUGIN_DIR/actions/toggle/login"   72

convert_pair "$SVG_DIR/state-exitnode-off.svg"   "$PLUGIN_DIR/actions/exitnode/off"   72
convert_pair "$SVG_DIR/state-exitnode-on.svg"    "$PLUGIN_DIR/actions/exitnode/on"    72

convert_pair "$SVG_DIR/state-shields-off.svg"    "$PLUGIN_DIR/actions/shields/off"    72
convert_pair "$SVG_DIR/state-shields-on.svg"     "$PLUGIN_DIR/actions/shields/on"     72

convert_pair "$SVG_DIR/state-switch-off.svg"     "$PLUGIN_DIR/actions/switch/off"     72
convert_pair "$SVG_DIR/state-switch-on.svg"      "$PLUGIN_DIR/actions/switch/on"      72

convert_pair "$SVG_DIR/state-status-connected.svg"    "$PLUGIN_DIR/actions/status/connected"    72
convert_pair "$SVG_DIR/state-status-disconnected.svg" "$PLUGIN_DIR/actions/status/disconnected" 72
convert_pair "$SVG_DIR/state-status-connecting.svg"   "$PLUGIN_DIR/actions/status/connecting"   72

echo "Icons generated."
