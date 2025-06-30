# Changelog
[TS] 063025-1859 | [MOD] spawn | [ACT] ^FUNC ^VAR | [TGT] spawnUnit, devUnitSpawnLayout.startPosition | [VAL] ensure walkable spawn coords and move dev units onto land | [REF] src/game/spawn.js:127-134 src/game/initial-state.js:28-33

[TS] 063025-1855 | [MOD] units | [ACT] ^FUNC | [TGT] createMeshFromGLB/createProceduralMesh | [VAL] rotated child groups so lookAt controls heading | [REF] src/units/battlecruiser.js:63-120 src/units/dropship.js:87-142 src/units/wraith.js:74-120
This file contains recent changes. For older entries, see the `Archive` tab.

[TS] 063025-1838 | [MOD] ui | [ACT] +FN ^UX | [TGT] promo modal | [VAL] YouTube iframe triggered by '/' key | [REF] index.html:215-223, assets/css/modals.css:343-366, src/game/ui/ModalManager.js:98-104,253-267, src/game/ui.js:63-67
[TS] 063025-1834 | [MOD] archive | [ACT] ^FUNC -MOD ^DOC | [TGT] changelog-archive.js, package.json, AGENTS.md | [VAL] removed jsdom dependency and parse changelog lines directly | [REF] scripts/changelog-archive.js, package.json, AGENTS.md:59-66
[TS] 063025-1824 | [MOD] deps | [ACT] +FILE | [TGT] package.json | [VAL] added jsdom dependency | [REF] package.json
[TS] 063025-1824 | [MOD] docs | [ACT] ^DOC | [TGT] README.md, AGENTS.md | [VAL] include npm install instructions and note jsdom | [REF] README.md:6-14, AGENTS.md:33-67
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
