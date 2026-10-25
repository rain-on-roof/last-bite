# Last Bite — design

A browser game by Rain on Roof. Portfolio piece built to spread on TikTok and X.

## Goal

Someone sees a 5-second clip, taps the link, and is playing within two seconds on
their phone. Every run ends in a funny, screenshot-worthy moment and a link that
dares a friend to beat the score. It must look like a studio made it: cartoon,
very funny, and visibly crafted — the park, the bench, the light and the goose
all have to hold up to a full-screen screenshot.

## Core loop (greed)

- Portrait scene: you sit on a park bench finishing a sandwich; a goose is
  nearby.
- **Hold** (mouse button, touch, or Space) = chew. Each bite adds to the score
  and shrinks the sandwich. Finishing a sandwich serves a bigger one (combo).
- Chewing is noise. While you chew, the goose **creeps closer** and its
  **suspicion** rises; while you hold still it settles.
- Before striking the goose **telegraphs**: stops, lowers its head, stretches
  its neck, ruffles feathers, hisses. The window is short but readable.
- Release in time → the goose freezes and comically pretends to look away.
- Still chewing when it strikes → full-screen **HONK**, the goose snatches the
  sandwich, freeze frame, game over.
- Each run randomises the goose's temperament (patience, creep speed,
  tell length) and it has occasional **fake-outs** (tells that stop short), so
  the rhythm cannot be memorised.
- Rare **Golden Goose** run (~1 in 25): gold plumage, faster, double points.
- Typical run 20–60 s.

## Sharing (no server)

- Game-over card: frozen attack frame, score, a rank title
  (e.g. *Bread Crumb* → *Goose Snack* → *Bench Legend* → *Goose Whisperer*),
  best score (localStorage), Retry.
- **Challenge a friend**: Web Share API where available, else copy link. The
  link carries the score in the hash: `…/#beat=47`. Opening such a link shows
  "Beat 47" on the title screen and a win/lose line on the game-over card.
- Small Rain on Roof mark on the title and game-over screens, linking to
  `https://github.com/rain-on-roof`.
- Open Graph/Twitter meta tags + a 1200×630 preview image so the link unfurls
  well on X/Telegram.

## Look

- Hand-drawn cartoon rendered in code on Canvas 2D: bold dark outlines,
  cel shading with a soft shadow band, rim light, warm late-afternoon palette.
- Landscape in depth layers: gradient sky with drifting clouds, distant city /
  tree line with atmospheric haze, mid trees, a pond, path, grass with swaying
  blades, lamppost, bench in foreground; subtle parallax on device tilt /
  pointer.
- Goose: built from rigged parts (body, neck segments, head, beak, eye, wings,
  feet) so it can squash-stretch, crane, waddle, ruffle, blink, and lunge.
  Expressive eye (pupil, brow) carries the comedy.
- Player shown as hands holding the sandwich at the bottom; sandwich layers
  (bread, lettuce, tomato, cheese) with bite marks and crumbs.
- Juice: screen shake, crumb particles, impact frames, HONK text with
  squash, feather burst, vignette pulse while the goose is tense.
- Renders at devicePixelRatio, letterboxed 9:16 on desktop, full screen on
  phones. 60 fps target on a mid-range phone.

## Sound

Synthesised with WebAudio (no downloaded assets): crunch per bite, chewing
loop, goose footsteps, hiss, HONK, wing flap, soft park ambience. Mute toggle.
Audio starts on first user gesture.

## Language

English by default; Russian and Ukrainian picked from `navigator.language`.
On-screen text is minimal (title, hold hint, game-over card, share text).

## Structure

Plain static site, no build step, no runtime dependencies. ES modules.

```
index.html          page, meta tags
src/main.js         boot, loop, input, screens
src/game.js         pure game state machine (goose AI, score, combo) — no DOM
src/rng.js          seeded RNG
src/render/*.js     scene, goose, sandwich, effects, ui
src/audio.js        WebAudio synth
src/i18n.js         strings en/ru/uk
src/share.js        challenge link encode/decode, Web Share / clipboard
assets/og.png       link preview image
tests/*.test.js     node:test unit tests for game.js, share.js, rng.js
```

`game.js` is deterministic given a seed and a time step, so goose behaviour and
scoring are unit-tested without a browser.

## Verification

- `node --test` green.
- Played in the browser at 390×844 and desktop: title → run → strike → card →
  retry → challenge link round-trip; no console errors.
- Screenshots of title, tense goose, HONK, and game-over card reviewed for
  visual quality.

## Publishing

Repository `rain-on-roof/last-bite`, GitHub Pages from `main`. Publishing is a
separate step that needs the owner's explicit go-ahead.

## Out of scope

Leaderboards or any server, accounts, ads, analytics, multiple levels.
