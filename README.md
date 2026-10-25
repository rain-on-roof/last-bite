# Last Bite

**Eat your sandwich. Don't get honked.**

A tiny browser game by [Rain on Roof](https://github.com/rain-on-roof). You're on a park bench with a sandwich, and a goose has noticed.

▶ **Play:** https://rain-on-roof.github.io/last-bite/

![Last Bite](assets/og.png)

## How to play

- **Hold** (finger, mouse button or <kbd>Space</kbd>) to chew. Every bite scores.
- Chewing is loud. The goose creeps closer and gets angrier.
- When it stares, ruffles up and shows its teeth, **let go**. It will pretend nothing happened.
- Still chewing when it strikes? **HONK.** Lunch is gone.
- Some stares are bluffs. Sometimes the goose is golden and every bite counts double.
- Hit **Dare a friend** to send a link with your score baked in.

## Under the hood

Plain HTML, ES modules and Canvas 2D: no build step, no dependencies, no server. Everything is drawn in code, sound included.

| File | What it does |
| --- | --- |
| `src/game.js` | The whole game minus pixels: a seeded state machine for the goose (creep, tell, bluff, strike) and scoring |
| `src/render/scene.js` | The park, painted once into offscreen layers, plus clouds, water, the duck and grass animated per frame |
| `src/render/goose.js` | A rig of parts driven by a few pose numbers that spring between moods |
| `src/render/sandwich.js` | The sandwich (bitten with a scalloped cut) and the hands holding it |
| `src/render/fx.js` | Crumbs, feathers, sparkles, pop-up text, shake and flash |
| `src/audio.js` | WebAudio synthesis: crunch, hiss, whistle and an honest attempt at a honk |
| `src/share.js` | Challenge links in the URL hash (`#beat=47`), Web Share or clipboard |
| `src/i18n.js` | English, Russian and Ukrainian, picked from the browser |

## Run it locally

```sh
node tools/serve.mjs     # http://localhost:4517
npm test                 # game logic and share links
```

`tools/og.html` renders the link preview image from the game's own renderer.

## License

MIT © Rain on Roof
