# Stream Deck Tailscale Plugin

Free Stream Deck plugin for controlling Tailscale. Five actions in v1:

- **Toggle Connection** — connect / disconnect, with a third state for "log in required" that opens the Tailscale GUI.
- **Exit Node** — bind a key to a specific peer; press to route through it, press again to clear.
- **Shields Up** — toggle Tailscale's incoming-connection block.
- **Switch Account** — bind a key to a Tailscale profile; press to switch.
- **Status** — live read-only display of the current state, hostname and IP.

Supports macOS and Windows. Shells out to the Tailscale CLI; no daemon access required.

## Prerequisites

- Node.js 24 or higher
- Tailscale installed (the official desktop app on macOS or Windows)
- Stream Deck 6.5 or higher

## Development

```bash
npm install
npm run build
npm run link        # one-time symlink into Stream Deck plugins folder
npm run watch       # rebuild on file change and restart the plugin
```

To regenerate icons after editing `scripts/generate-icons.sh`:

```bash
bash scripts/generate-icons.sh
```

Requires `rsvg-convert` (`brew install librsvg`).

## Troubleshooting

The plugin probes the Tailscale CLI in this order:

1. The `TAILSCALE_CLI` environment variable.
2. `/usr/local/bin/tailscale`, then `/opt/homebrew/bin/tailscale`, then `/Applications/Tailscale.app/Contents/MacOS/Tailscale` on macOS.
3. `where tailscale`, then the `HKLM\SOFTWARE\Tailscale IPN` `InstallDir` registry value, then `%ProgramFiles%\Tailscale\tailscale.exe` on Windows.

The resolved path is cached in Stream Deck's plugin global settings.

Plugin logs live at `com.github.streamdecktailscale.sdPlugin/logs/`.

## Layout

```
com.github.streamdecktailscale.sdPlugin/   plugin bundle Stream Deck loads
  manifest.json
  bin/plugin.js                            rolldown output
  imgs/                                    PNG assets (generated)
  ui/                                      property inspector HTML
src/
  plugin.ts                                entry point
  services/                                CLI wrapper, binary resolver, status poller
  actions/                                 one file per action
assets/svg/                                SVG sources for icons
scripts/generate-icons.sh                  SVG → PNG generator
```
