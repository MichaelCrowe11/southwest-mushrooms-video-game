# southwest-mushrooms-video-game

A small browser game, Southwest Mushrooms: Desert Harvest, where you move Mushroom Mike across a desert canvas and harvest mushrooms before a timer runs out.

## Status

experimental

Built in one sitting on 2026-02-11 and 2026-02-12 (5 commits, per `git log`; the last is "Sync Mushroom Mike sprite from storefront", 2026-02-11 23:44 -0700). `progress.md` records it as a prototype with open TODO items. No work since.

## Install and first run

No build step. Serve the folder and open it in a browser. Run on 2026-09-10:

```
python3 -m http.server 8931 --bind 127.0.0.1
curl -s -o /dev/null -w '%{http_code} %{size_download}\n' http://127.0.0.1:8931/index.html
# 200 485
curl -s -o /dev/null -w '%{http_code} %{size_download}\n' http://127.0.0.1:8931/game.js
# 200 27617
curl -s http://127.0.0.1:8931/index.html | grep -o '<title>[^<]*</title>'
# <title>Southwest Mushrooms: Desert Harvest</title>
```

Then open `http://127.0.0.1:8931/` in a browser. Controls, from `game.js`: arrow keys or WASD to move, E or B to harvest, Shift to sprint, Enter or Space to start and restart, F for fullscreen, Escape to leave fullscreen. Touch controls are wired for phones.

The only npm dependency is Playwright, used by the test client, not by the game:

```
npm ci --ignore-scripts
# added 3 packages in 1s
```

## What runs today

- `index.html`, `styles.css`, `game.js` (922 lines): the whole game. One 960 x 540 canvas, a `requestAnimationFrame` loop, start, play, win and lose screens, a 135 second timer, a harvest goal of 6, stamina and sprint, hazards, and a combo bonus. No external assets are loaded; everything is drawn in code.
- `web_game_playwright_client.js` (356 lines): drives the game headlessly, feeds it button presses from a JSON file, and saves screenshots plus a text dump of game state. The game exposes `window.render_game_to_text` and `window.advanceTime(ms)` for it.
- `action_payloads.json`, `actions_move_only.json`, `actions_win.json`, `actions_win_restart.json`: scripted button sequences for that client.
- `progress.md`: the build log.

Playwright 1.58.2 (pinned in `package-lock.json`) needs its own headless Chromium build, fetched once with `npx playwright install chromium-headless-shell`, before the client will launch. On 2026-09-10 the client was started but the browser download was not completed, so the headless run is unverified today. The static serve above was verified.

## Roadmap

From the TODO list in `progress.md`, still open:

- Run the Playwright client and check screenshots and text output on each change.
- Verify every core interaction chain and fix defects found.
- Tune balance and visuals after a full test pass.

## Limits

- A game. The mushrooms in it are drawings. Nothing here identifies real fungi or says what is safe to pick or eat.
- Not tied to any store, account or product. The "storefront" in the last commit message refers to where the sprite art came from, not to a live shop.
- Southwest Mushrooms was a mushroom farm in Phoenix. The farm closed in February 2025. The name is used here as a theme.

## License and contact

No license file. `package.json` says ISC but no LICENSE file is present.

Contact: michael@crowelogic.com
