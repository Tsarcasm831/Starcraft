# Changelog

This file contains recent changes. For older entries, see `changelog.old.md`.

[TS] 063025-1820 | [MOD] docs | [ACT] +FILE ^DOC | [TGT] changelog archive | [VAL] added auto archive script, html loader and AGENTS note | [REF] scripts/changelog-archive.js, index.html:223, AGENTS.md:61

[TS] 063025-1809 | [MOD] ui | [ACT] ^FIX | [TGT] changelog paths | [VAL] set root-relative changelog file paths | [REF] src/game/ui/ModalManager.js:13-16

[TS] 063025-1803 | [MOD] ui | [ACT] ^FIX | [TGT] ModalManager dataset assignment | [VAL] replaced optional chaining with null checks | [REF] src/game/ui/ModalManager.js:80-83
[TS] 063025-1754 | [MOD] ui | [ACT] -FN -VAR | [TGT] unused modal handlers | [VAL] removed legacy toggle functions and constants | [REF] src/game/ui.js
[TS] 063025-1748 | [MOD] docs | [ACT] ^FIX | [TGT] README.md | [VAL] Clarified changelog button opens modal sourced from changelog files, not the manual. | [REF] README.md:22

[TS] 063025-1745 | [MOD] ui | [ACT] ^VAR ^FUNC | [TGT] ModalManager | [VAL] Updated changelog paths and reload logic | [REF] src/game/ui/ModalManager.js

[TS] 063025-1733 | [MOD] ui | [ACT] ^FIX | [TGT] ModalManager | [VAL] Use relative paths for changelog fetch to restore button | [REF] src/game/ui/ModalManager.js

[TS] 063025-1720 | [MOD] units | [ACT] +CLASS | [TGT] DarkTemplar | [VAL] Added Protoss Dark Templar unit with data file, game integration, selection handling and asset preloading. | [REF] src/protoss/darktemplar.js, assets/data/protoss/darktemplar.json, src/game/preloader.js, src/game/selection.js, src/game/spawn.js, src/game/initial-state.js, assets/asset-list.json

[TS] 063025-1659 | [MOD] docs | [ACT] ^ENH | [TGT] changelog system | [VAL] Split older entries into changelog.old.md and added changelog archive tab. | [REF] changelog.md, changelog.old.md, index.html, assets/css/modals.css, src/game/ui/ModalManager.js
[TS] 063025-1049 | [MOD] ui | [ACT] ^ENH | [TGT] MessageDisplay.js, base.css | [VAL] Ad video now autoplays with loop and shows a close button after 30s instead of auto-closing. Video panel set to relative positioning for button. | [REF] src/game/ui/MessageDisplay.js, assets/css/base.css

[TS] 063025-1656 | [MOD] ui | [ACT] ^UX | [TGT] MessageDisplay.js, ui.js, manual.md | [VAL] Disabled automatic ads and added '/' hotkey to watch promo video. Manual updated. | [REF] src/game/ui/MessageDisplay.js, src/game/ui.js, manual.md

[TS] 063025-1642 | [MOD] ui | [ACT] ^ENH | [TGT] MessageDisplay.js, base.css | [VAL] Ad video now autoplays with loop and shows a close button after 30s instead of auto-closing. Video panel set to relative positioning for button. | [REF] src/game/ui/MessageDisplay.js, assets/css/base.css


