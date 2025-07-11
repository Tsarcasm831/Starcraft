# Archived Changelog
[TS] 063025-2153 | [MOD] resources | [ACT] ^FIX | [TGT] MineralField model offset | [VAL] wrapper group preserves vertical offset | [REF] src/resources/mineral-field.js:17-24,112-120

[TS] 063025-2143 | [MOD] units | [ACT] ^FIX | [TGT] science_vessel orientation | [VAL] rotated model 180deg to face forward | [REF] src/units/science-vessel.js:86,124

[TS] 063025-2139 | [MOD] docs | [ACT] ^ENH | [TGT] agent-units.md | [VAL] expanded unit guide with detailed steps | [REF] agent-units.md:1-81
[TS] 063025-2135 | [MOD] units | [ACT] ^FIX | [TGT] battlecruiser,wraith,dropship orientation | [VAL] rotated models 180deg to face forward | [REF] src/units/battlecruiser.js:77,118 src/units/wraith.js:76,118 src/units/dropship.js:88,141

[TS] 063025-1903 | [MOD] docs | [ACT] ^DOC | [TGT] README.md | [VAL] note '/' key opens promo video | [REF] README.md:25-27
[TS] 063025-1859 | [MOD] spawn | [ACT] ^FUNC ^VAR | [TGT] spawnUnit, devUnitSpawnLayout.startPosition | [VAL] ensure walkable spawn coords and move dev units onto land | [REF] src/game/spawn.js:127-134 src/game/initial-state.js:28-33
[TS] 063025-1904 | [MOD] docs | [ACT] ^DOC | [TGT] agent-units.md | [VAL] replaced missing unit integration sections, referenced High Templar example | [REF] agent-units.md:1-51
[TS] 063025-1859 | [MOD] spawn | [ACT] ^FUNC ^VAR | [TGT] spawnUnit, devUnitSpawnLayout.startPosition | [VAL] ensure walkable spawn coords and move dev units onto land | [REF] src/game/spawn.js:127-134 src/game/initial-state.js:28-33
[TS] 063025-1855 | [MOD] units | [ACT] ^FUNC | [TGT] createMeshFromGLB/createProceduralMesh | [VAL] rotated child groups so lookAt controls heading | [REF] src/units/battlecruiser.js:63-120 src/units/dropship.js:87-142 src/units/wraith.js:74-120
[TS] 063025-1904 | [MOD] docs | [ACT] ^DOC | [TGT] README.md | [VAL] note changelog archiving script, jsdom install, and unit add instructions | [REF] README.md:11-31
[TS] 063025-1908 | [MOD] units | [ACT] +CLASS +FILE | [TGT] HighTemplar | [VAL] Added Protoss High Templar unit with data and game integration. | [REF] src/protoss/hightemplar.js, assets/data/protoss/hightemplar.json, src/game/spawn.js, src/game/preloader.js, src/game/initial-state.js, src/game/selection.js
[TS] 063025-1905 | [MOD] ui | [ACT] MIGR +CLASS -FN | [TGT] ModalManager split | [VAL] extracted ManualModal, ChangelogModal, DevLogModal and PromoModal classes | [REF] src/game/ui/modals
[TS] 063025-1859 | [MOD] spawn | [ACT] ^FUNC ^VAR | [TGT] spawnUnit, devUnitSpawnLayout.startPosition | [VAL] ensure walkable spawn coords and move dev units onto land | [REF] src/game/spawn.js:127-134 src/game/initial-state.js:28-33
[TS] 063025-1855 | [MOD] units | [ACT] ^FUNC | [TGT] createMeshFromGLB/createProceduralMesh | [VAL] rotated child groups so lookAt controls heading | [REF] src/units/battlecruiser.js:63-120 src/units/dropship.js:87-142 src/units/wraith.js:74-120
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

[TS] 062925-1542 | [MOD] units | [ACT] ^VAR | [TGT] scv.js, scv-mark-2.js | [VAL] Changed `buildSupplyDepot` hotkey from 'S' to 'U' to resolve WASD conflict. Added @tweakable to hotkey configurations. | [REF] src/units/scv.js, src/units/scv-mark-2.js
[TS] 062925-1541 | [MOD] units | [ACT] ^FIX | [TGT] scv.js, scv-mark-2.js | [VAL] Remapped SCV and SCV Mark 2 hotkeys to resolve conflicts with WASD camera controls. Centralized keybinds into tweakable objects. | [REF] src/units/scv.js, src/units/scv-mark-2.js
[TS] 062925-1540 | [MOD] docs | [ACT] ^FIX | [TGT] changelog.md | [VAL] Corrected all timestamps to reflect user's current time (15:40 Mountain Time). Added tweakable config for timestamp parsing to prevent future errors. | [REF] changelog.md, src/game/ui/ModalManager.js
[TS] 062925-1539 | [MOD] docs | [ACT] ^FIX | [TGT] changelog.md | [VAL] Corrected timestamp on last entry to reflect user's current date. | [REF] changelog.md
[TS] 062925-1538 | [MOD] docs | [ACT] MIGR | [TGT] changelog.md | [VAL] Archived all entries to changelog.old.md to start a fresh log. | [REF] changelog.md, changelog.old.md
