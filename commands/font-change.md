---
description: Switch Windows Terminal default font face (with Segoe UI Emoji fallback)
---

Switch the Windows Terminal default font face to: $ARGUMENTS

## Behavior

**If `$ARGUMENTS` is empty:**

1. Query both font registries for installed monospace-friendly faces:
   - `HKLM:\Software\Microsoft\Windows NT\CurrentVersion\Fonts`
   - `HKCU:\Software\Microsoft\Windows NT\CurrentVersion\Fonts`
2. Filter to plausible terminal fonts (names matching `Cascadia`, `JetBrainsMono`, `Fira`, `Consolas`, `DejaVu Sans Mono`, `Source Code`, `Iosevka`, `Hack`, `Berkeley Mono`, `Monaspace`, `IBM Plex Mono`, etc.).
3. Read the current `defaults.font.face` from settings.json so the user knows what's set now.
4. List the options and ask which to switch to.

**If `$ARGUMENTS` is a font name:**

1. Read the Windows Terminal settings.json at:
   `$env:LOCALAPPDATA\Packages\Microsoft.WindowsTerminal_8wekyb3d8bbwe\LocalState\settings.json`
2. Locate the `defaults.font.face` value (it lives under `profiles.defaults.font.face`).
3. Replace it with `"<argument>, Segoe UI Emoji"` using the Edit tool — surgical replacement, do NOT rewrite the whole file (it has comments and other settings).
4. The `", Segoe UI Emoji"` suffix is **required** — it forces DirectWrite to fall back to the emoji font for codepoints like U+2B1C `⬜` that the primary face would otherwise render as monochrome BMP glyphs.

## After updating

Remind the user to **close ALL Windows Terminal windows and reopen** (the font cache loads at WT startup; reloading settings via Ctrl+Shift+, doesn't pick up new font face).

## Sanity checks

- If the named font isn't in either font registry, warn before editing — the cascade will land on Segoe UI Emoji (proportional, NOT monospace), and the terminal will look misaligned.
- If the user passes the existing face (already set), say so and skip the edit.
- If settings.json has no `defaults.font` block (i.e. `"defaults": {}`), create it. If it has `defaults.font` but no `face`, add `face`. If it has `face`, replace.

## Reference

For the broader rationale (why the comma-fallback chain, how the fonts on this machine got installed, etc.), see `docs/font-change-guide.md` in `C:\Users\Admin\Documents\Study\Fulcro\fulcro-solo-learn` (gitignored; not in the repo).
