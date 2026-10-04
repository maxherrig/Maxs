# OACE — asset inventory

Everything here was captured from https://oace.de on 2026-10-04 with Playwright
(Chromium, iPhone viewport 390×844 @3x, plus desktop 1440×900 @2x). Nothing is redrawn.

## Brand
| Thing | Value | Source |
|---|---|---|
| Logo (black / white) | `logo_black.png`, `logo_white.png` (400×120, official) | `cdn/shop/files/OACE_Logo_*_400x120px.png` |
| Logo vector | `logo_traced.svg` — potrace of `logo_black.png` at 8× (exact trace, used for big lockups) | derived |
| Display / heading font | **Helvetica LT Pro Roman** (400) — `HelveticaLTPro-Roman.woff2` | site `@font-face` |
| Body font | **Helvetica LT Pro Light** (300), letter-spacing .02em — `HelveticaLTPro-Light.woff2` | site `@font-face` |
| Bold | **Helvetica LT Pro Bold** (700) — `HelveticaLTPro-Bold.woff2` | site `@font-face` |
| Primary | `#000000` text / buttons, `#FFFFFF` background | `--text-primary`, `--background-primary` |
| Secondary button bg | `#FAFAFA` | `--button-background-secondary` |
| Sale / accent red | `#CE243B` | `--on-sale-text`, "Mit Code 10%" badge |
| Star yellow | `#F7DF7D` | `--star-color` |
| Success green | `#008A02` on `#E0F1E1` | `--success-*` (cart free-shipping bar) |
| Badge grey | `#767580` | `--primary-badge-background` |
| Button radius | `3.125rem` (full pill) | `--rounded-button` |

## Real copy used
- Announcement bar: "Kostenloser Versand ab 120€"
- Value props: "Fashionable Sportswear", "Community First", "Von Sportlern für Sportler entwickelt"
- Hero CTA: "Shop now"
- Product: **Scrunch Pro Leggings**, 54,90 €, tags *Scrunch / High Waist / Seamless*
- **23 colorways** (counted from the live swatch picker)
- **1,515 reviews, 4.57 ★** ("Basierend auf 1,515 Bewertungen") — used as the proof metric
- Review fit summary: "Wie fällt die Größe aus? → Genau passend"

## Screenshots (`m_` = mobile @3x, `d_` = desktop @2x)
- `m_home.png`, `m_home_full.png`, `m_menu.png` — homepage, nav drawer
- `m_collection.png`, `m_collection_full.png` — Bestseller Women grid (18 products)
- `m_product*.png`, `m_pdp_s0..s4*.png` — Scrunch Pro PDP; real state after each click:
  aura blue → raspberry → jelly mint → true black → size S
- `colorways/c00..c22.png` — PDP after clicking every one of the 23 swatches
- `m_pdp_atc_before.png` → `m_cart_drawer.png` — before/after a real "In den Warenkorb" click
  (drawer shows "true black / S", 54,90 €, free-shipping progress)
- `m_leggings_guide.png` — Leggings Guide (12 styles)
- `m_review_summary.png`, `m_reviews_view*.png` — review widget
- `d_home.png`, `d_collection.png`, `d_product.png` — desktop
- `hero_soft_spot.jpg` — current homepage hero banner (3000×1360)
- `capture_meta.json` — bounding boxes of every element the cursor touches (page CSS px)

## Pieces (`pieces/`)
Crops of the screenshots above (3× resolution), used to animate the UI assembling itself.
`pieces.json` lists each crop's page position; `colors.json` holds a color sampled from each colorway photo.
