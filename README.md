# Iron Petals — M1 Solo Slice

Browser 3D wuxia combat demo. You vs an AI bot in a courtyard.
No PC build, no install: plain web files. Open on a phone or PC browser.

## Run it locally

```sh
cd game
python3 -m http.server 8901
```

Then open http://localhost:8901/ (a static host works the same way;
do NOT open index.html via file:// — model files will not load that way).

## Controls

- Phone (touch): left virtual joystick to move; ATK / DASH / SP buttons.
- PC (keys): WASD move, J attack, Space dash, K special.
- Camera follows the midpoint of the two fighters automatically.

## M1 mechanics

- Health bars, KO, rematch.
- Special meter: taking damage builds the meter. At full meter the SP
  button glows — press it for Whirlwind Slash (spinning AoE, big
  knockback). Meter builds ONLY from damage taken, and empties when used.
- Bot AI: approaches, attacks in range, dashes away sometimes.

## Files

- `index.html` — title screen (locked ink-brush logo), HUD, touch controls.
- `main.js` — the whole game (Three.js, local vendor bundle, no CDN).
- `logo.webp` — the locked Iron Petals logo.
- `models/KnightCaptain.glb` — player fighter (Gobkit, CC0).
- `models/HeavyWarrior.glb` — bot fighter (Gobkit, CC0).
- `vendor/` — Three.js 0.160.0 + GLTFLoader, bundled locally so the
  game works with no runtime CDN dependency.

## Credits

- Fighters: Gobkit freebies (CC0) — KnightCaptain (player),
  HeavyWarrior (bot). Both are rigged glTF models with Idle / Walk /
  Run / Attack / Hit / Special / Death clips.
- Logo: locked Iron Petals ink-brush direction (Javin's pick, 2026-10-29).

## Scope notes (M1 only)

- Solo vs bot only. Multiplayer (online room-code) is M2.
- Whirlwind Slash only. Shadow Dash Strike and Iron Body are M3.
- Arena dressing (walls, lanterns, bamboo, dust) is simple geometry;
  the fighters are real imported models — that is the quality bar.
