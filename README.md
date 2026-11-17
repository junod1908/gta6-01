# Solmar Bay — make.fun gta6-01 entry

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/junod1908/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/junod1908/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

An original open-world crime game that plays offline in a desktop browser.
You are **Rico Vega**, a driver for hire in the fictional coastal city of
**Solmar Bay**. Work four jobs for Mara Solis — a fare, a stolen coupe, a heat
wave, a harbor run — while the bay PD answers with cruisers and officers.

## What is in the game

- A 3D city to explore on foot and by car: traffic, pedestrians, a beach and
  the sea, all built with three.js (vendored under `game/vendor/`)
- Steal cars and drive them; a wanted level (0–5 stars) with police cars that
  chase and ram, and officers on foot who run you down
- Four missions with a story, objectives, a beacon and a minimap
- Combat: punch up close, pistol from a distance
- HUD with health, cash, wanted stars, speed and a live minimap
- Start screen, pause, busted/respawn, and save/load via localStorage
- Sound synthesized live with WebAudio — engine, sirens, gunfire, jingles

## How to play

You are Rico Vega, working four jobs for Mara Solis. Follow the gold beacon
and the minimap marker to each objective:

1. **First Fare** — pick up the client at the marina district and drop them
   at the Solmar Hotel.
2. **The Pickup** — steal the mint coupe parked by the marina and deliver
   it to the garage.
3. **Heat Wave** — lose the heat until your wanted stars fade, then reach
   the safehouse on the north side unseen.
4. **Harbor Run** — deliver the package to the harbor freighter, with the
   bay PD on your tail.

Controls: **WASD / arrow keys** walk and drive · **E** enter or steal a
car · **F** melee punch · **mouse click** fire the pistol · **P** pause ·
**Shift** run · **Space** jump / handbrake · **mouse drag** camera ·
**M** mute. Crimes raise your wanted stars — the more stars, the harder
Solmar Bay PD comes after you.

## Run it

```sh
node serve.ts        # game/ on http://localhost:8080
```

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Screenshots live in `screenshots/` (the first by name is the cover); they are
real renders of the game, staged with `?shot=chase|street|drive|mission&seed=N`.

---

Come play Solmar Bay and follow the standings on the
[gta6-01 bounty page](https://make.fun/bounty/gta6-01) — new players can
join through our referral link: https://make.fun/r/pex4n748
