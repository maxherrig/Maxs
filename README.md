# OACE — 20s motion reel

A 20-second, 120 BPM motion piece for [oace.de](https://oace.de), built from real captures of the site.

| | |
|---|---|
| `out/oace_reel_9x16.mp4` | 1080×1920 master |
| `out/oace_reel_1x1.mp4` | 1080×1080, same timeline |
| `out/oace_reel_16x9.mp4` | 1920×1080, same timeline |
| `out/oace_score_120bpm.wav` | original score + UI sound design (48 kHz) |
| `out/contact_sheet_9x16.png` | one frame per beat |
| `assets/` | everything captured from the site (see `assets/README.md`) |

## Story
| Beat | Time | What happens |
|---|---|---|
| Hook | 0–3s | YOUR / LEGGINGS / QUIT / BEFORE / YOU. — one word per beat, zoom through the O |
| Product | 3–6s | The real Scrunch Pro page assembles piece by piece |
| Feature 1 | 6–8.5s | Cursor clicks real swatches → photo + background change; **23 colorways** |
| Feature 2 | 8.5–11s | Cursor picks size S, "Genau passend" circled, Leggings Guide pops in |
| Feature 3 | 11–13.5s | "In den Warenkorb" → real cart drawer slides in |
| Proof | 13.5–16.5s | **1,515 reviews** (4.57★) with the real review widget |
| Lockup | 16.5–20s | Colorway strobe → logo slam, "Fashionable Sportswear", Shop now · oace.de |

## Re-render
```bash
python3 -m http.server 8123 --bind 127.0.0.1 &          # from the repo root
ln -s "$(npm root -g)" tools/node_modules                # playwright
python3 tools/audio.py out/oace_score_120bpm.wav         # numpy + scipy
node tools/render.mjs 1080 1920 out/v.mp4 30 10 3        # W H out fps subframes workers
```
`video/index.html?w=…&h=…&t=…` previews any frame in a browser. The composition is a pure function of time
(`window.renderFrame(t)`), so the three formats come from one timeline; each output frame averages 10
sub-frames across a 180° shutter for motion blur.

Captures: `tools/capture*.mjs` (Playwright). Crops: `tools/crop.py`.
