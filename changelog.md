# Changelog

This file contains recent changes. For older entries, see `changelog.old.md`.

[TS] 063025-1656 | [MOD] ui | [ACT] ^UX | [TGT] MessageDisplay.js, ui.js, manual.md | [VAL] Disabled automatic ads and added '/' hotkey to watch promo video. Manual updated. | [REF] src/game/ui/MessageDisplay.js, src/game/ui.js, manual.md

[TS] 063025-1642 | [MOD] ui | [ACT] ^ENH | [TGT] MessageDisplay.js, base.css | [VAL] Ad video now autoplays with loop and shows a close button after 30s instead of auto-closing. Video panel set to relative positioning for button. | [REF] src/game/ui/MessageDisplay.js, assets/css/base.css

[TS] 062925-1542 | [MOD] units | [ACT] ^VAR | [TGT] scv.js, scv-mark-2.js | [VAL] Changed `buildSupplyDepot` hotkey from 'S' to 'U' to resolve WASD conflict. Added @tweakable to hotkey configurations. | [REF] src/units/scv.js, src/units/scv-mark-2.js
[TS] 062925-1541 | [MOD] units | [ACT] ^FIX | [TGT] scv.js, scv-mark-2.js | [VAL] Remapped SCV and SCV Mark 2 hotkeys to resolve conflicts with WASD camera controls. Centralized keybinds into tweakable objects. | [REF] src/units/scv.js, src/units/scv-mark-2.js
[TS] 062925-1540 | [MOD] docs | [ACT] ^FIX | [TGT] changelog.md | [VAL] Corrected all timestamps to reflect user's current time (15:40 Mountain Time). Added tweakable config for timestamp parsing to prevent future errors. | [REF] changelog.md, src/game/ui/ModalManager.js
[TS] 062925-1539 | [MOD] docs | [ACT] ^FIX | [TGT] changelog.md | [VAL] Corrected timestamp on last entry to reflect user's current date. | [REF] changelog.md
[TS] 062925-1538 | [MOD] docs | [ACT] MIGR | [TGT] changelog.md | [VAL] Archived all entries to changelog.old.md to start a fresh log. | [REF] changelog.md, changelog.old.md