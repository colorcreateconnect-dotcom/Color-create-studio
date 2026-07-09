# Color-create-studio

Home of the **[Yanna Mini Popup Pack](./yanna-popup-pack/)** — a reusable
animation asset system for the Yanna TikTok series (a stylized 3D chibi
"inner voice" pop-up character).

## What's here

- **[`yanna-popup-pack/`](./yanna-popup-pack/)** — the full asset system:
  - `manifest/` — CSV + JSON manifest of all 25 reactions (use case, CapCut
    animation, on-screen phrase, preset)
  - `source/` — where the original transparent PNG stickers go
  - `exports/` — generated CapCut-ready overlays (WebM · GIF · PNG sequence · stills)
  - `scripts/` — the manifest builder, transparency checker, and 7-preset
    animation engine
  - `docs/` — CapCut workflow guide + naming convention

## Start here

Read **[`yanna-popup-pack/README.md`](./yanna-popup-pack/README.md)**, then:

```bash
cd yanna-popup-pack
pip install -r scripts/requirements.txt
# drop your PNGs into source/reactions/ then:
python3 scripts/check_transparency.py
python3 scripts/animate.py
```
