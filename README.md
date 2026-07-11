# Color-create-studio

Home of the **Yanna Mini Popup Pack** — a stylized 3D chibi "inner voice" pop-up
character for a TikTok series (Lizzie McGuire energy: the mini version pops in,
reacts, and pops back out).

## Two folders

| Folder | Role |
|---|---|
| **[`Yanna_Mini_Popup_Pack/`](./Yanna_Mini_Popup_Pack/)** | The original pack — **source of truth**. Character reference sheet, 150 transparent PNGs across 6 categories, the pack's own CapCut docs, prompt bank, contact sheets, and grid-slicer tool. Left unchanged. |
| **[`yanna-popup-pack/`](./yanna-popup-pack/)** | The **animation workspace**. Takes the pack's transparent PNGs and generates ready-to-use animated overlays (transparent WebM + GIF), a use-case manifest (CSV/JSON), a transparency audit, and cleaned CapCut-ready stills. |

## Start here

- New to the pack? Read **[`Yanna_Mini_Popup_Pack/README.md`](./Yanna_Mini_Popup_Pack/README.md)**.
- Want the animated overlays / manifest? Read **[`yanna-popup-pack/README.md`](./yanna-popup-pack/README.md)**:

```bash
cd yanna-popup-pack
pip install -r scripts/requirements.txt
python3 scripts/check_transparency.py   # transparency audit
python3 scripts/animate.py              # generate GIF + WebM overlays
```

## Transparency status

All 150 transparent PNGs were audited and are now **150/150 clean cut-outs**. Three
`signature_alt` files (`we_dont_judge_nod`, `sale_whisper`, `exit_slide`) shipped with
their background not removed; those were fixed during finishing with
`yanna-popup-pack/scripts/remove_flat_background.py` (connected-background flood-fill —
the character is untouched). The pack's original copies under
`Yanna_Mini_Popup_Pack/` are left as delivered. Details in
`yanna-popup-pack/manifest/transparency_report.csv`.
