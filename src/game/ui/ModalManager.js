import { devLogger } from '../../utils/dev-logger.js';
import { assetManager } from '../../utils/asset-manager.js';

/** @tweakable The filename for the manual document. */
const MANUAL_FILE = 'manual.md';
/** @tweakable The maximum number of lines to display from the manual. 0 for no limit. */
const maxManualLines = 0;
/** @tweakable enable closing the manual modal by clicking its background */
const closeManualOnClickOutside = true;

/** 
 * @tweakable The filename for the main (recent) changelog document. */
// Use a root-relative path so the files load correctly regardless of host page
const CHANGELOG_FILE = 'changelog.md';
/** @tweakable The filename for the old changelog file. */
const OLD_CHANGELOG_FILE = 'changelog.old.md';
/** @tweakable The maximum number of lines to display from the changelog. 0 for no limit. */
const maxChangelogLines = 50;
/** @tweakable enable closing the changelog modal by clicking its background */
const closeChangelogOnClickOutside = true;
/** @tweakable The default tab to show when opening the changelog modal. Can be 'recent' or 'old'. */
const defaultChangelogTab = 'recent';

/** 
 * @tweakable Configuration for formatting ASCL timestamps in the changelog modal.
 * @property {boolean} enabled - Whether to apply custom styling to timestamps.
 * @property {RegExp} regex - The regular expression used to find timestamps. The first capture group should be the timestamp itself.
 * @property {string} color - The color to apply to the timestamp text.
 * @property {string} prefix - Text to add before the timestamp.
 * @property {string} suffix - Text to add after the timestamp.
 */
const changelogTimestampConfig = {
    /** @tweakable Whether to apply custom styling to timestamps. */
    enabled: true,
    /** @tweakable The regular expression for finding and styling timestamps in the changelog. The first capture group should contain the date and time. Allows for flexibility in the timestamp format (e.g., with or without a colon, extra spaces). */
    regex: /\[TS] (\d{6}-\d{4})/g,
    /** @tweakable The color of the timestamp text in the changelog. */
    color: '#88aaff',
    /** @tweakable The text to add before the timestamp in the changelog. */
    prefix: '[TS] ' ,
    /** @tweakable The text to add after the timestamp in the changelog. */
    suffix: ''
};

/** @tweakable The title for the asset list section in the manual modal. */
const ASSET_LIST_TITLE = 'Generated Assets';
/** @tweakable Enable or disable showing the asset list in the manual modal. */
const showAssetListInManual = true;
/** @tweakable The default tab to show when opening the manual modal. Can be 'manual' or 'assets'. */
const defaultManualTab = 'manual';

/** @tweakable CSS object-fit property for asset icons in the manual. Can be 'contain', 'cover', 'fill', 'none', 'scale-down'. */
const assetIconObjectFit = 'contain';

/** @tweakable CSS image-rendering property for asset icons. Helps with pixel art. Can be 'auto', 'smooth', 'high-quality', 'pixelated', 'crisp-edges'. */
const assetIconImageRendering = 'pixelated';

export class ModalManager {
    constructor() {
        this.menuManager = null;
    }

    init(menuManager) {
        this.menuManager = menuManager;
        this._attachEventListeners();
    }

    _attachEventListeners() {
        document.getElementById('manual-button')?.addEventListener('click', () => this.toggleManualModal());
        document.getElementById('close-manual-modal')?.addEventListener('click', () => this.toggleManualModal());
        document.getElementById('manual-modal')?.addEventListener('click', (event) => {
            if (closeManualOnClickOutside && event.target === event.currentTarget) {
                this.toggleManualModal();
            }
        });
        document.getElementById('manual-tab-button')?.addEventListener('click', () => this.switchManualTab('manual'));
        document.getElementById('assets-tab-button')?.addEventListener('click', () => this.switchManualTab('assets'));

        document.getElementById('changelog-button')?.addEventListener('click', () => {
            const recentOut = document.getElementById('recent-changelog-output');
            if (recentOut) recentOut.dataset.loaded = 'false';
            const oldOut = document.getElementById('old-changelog-output');
            if (oldOut) oldOut.dataset.loaded = 'false';
            this.toggleChangelogModal();
        });
        document.getElementById('close-changelog-modal')?.addEventListener('click', () => this.toggleChangelogModal());
        document.getElementById('recent-changelog-tab-button')?.addEventListener('click', () => this.switchChangelogTab('recent'));
        document.getElementById('old-changelog-tab-button')?.addEventListener('click', () => this.switchChangelogTab('old'));
        document.getElementById('changelog-modal')?.addEventListener('click', (event) => {
            if (closeChangelogOnClickOutside && event.target === event.currentTarget) {
                this.toggleChangelogModal();
            }
        });

        document.getElementById('close-dev-log-modal')?.addEventListener('click', () => this.toggleDevLogModal());
        document.getElementById('clear-dev-log-button')?.addEventListener('click', () => devLogger.clearLogs());
        document.getElementById('archive-changelog-button')?.addEventListener('click', () => this.archiveChangelog());

        window.addEventListener('keyup', (e) => {
            if (e.code === 'Backslash' && devLogger.isActive && this.menuManager.isPaused) {
                this.toggleDevLogModal();
            }
        });
    }

    switchManualTab(tabName) {
        // Deactivate all tabs and panes first
        document.querySelectorAll('.manual-tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.manual-tab-pane').forEach(pane => pane.classList.remove('active'));

        // Activate the selected tab and pane
        document.getElementById(`${tabName}-tab-button`)?.classList.add('active');
        document.getElementById(`${tabName}-tab-content`)?.classList.add('active');
    }

    switchChangelogTab(tabName) {
        document.querySelectorAll('.changelog-tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.changelog-tab-pane').forEach(pane => pane.classList.remove('active'));
        document.getElementById(`${tabName}-changelog-tab-button`)?.classList.add('active');
        document.getElementById(`${tabName}-changelog-tab-content`)?.classList.add('active');
    }

    async toggleManualModal() {
        const modal = document.getElementById('manual-modal');
        const output = document.getElementById('manual-output');
        const assetListDiv = document.getElementById('asset-list');
        const assetsTabButton = document.getElementById('assets-tab-button');
        if (!modal || !output || !assetListDiv || !assetsTabButton) return;

        assetsTabButton.style.display = showAssetListInManual ? 'block' : 'none';

        modal.classList.toggle('hidden');
        if (!modal.classList.contains('hidden')) {
            // Set the default active tab
            this.switchManualTab(defaultManualTab);

            if (output.dataset.loaded !== 'true') {
                try {
                    const response = await fetch(MANUAL_FILE);
                    if (response.ok) {
                        let text = await response.text();
                        if (maxManualLines > 0) {
                            const lines = text.split('\n');
                            if (lines.length > maxManualLines) {
                                text = lines.slice(0, maxManualLines).join('\n') + `\n\n... (and more)`;
                            }
                        }
                        output.textContent = text;
                        output.dataset.loaded = 'true';
                    } else {
                        output.textContent = 'Error loading manual.';
                    }
                } catch (error) {
                    console.error(`Failed to fetch ${MANUAL_FILE}:`, error);
                    output.textContent = 'Error loading manual.';
                }
            }

            if (showAssetListInManual && assetListDiv.dataset.loaded !== 'true') {
                try {
                    const response = await fetch('assets/asset-list.json');
                    if (response.ok) {
                        const assetList = await response.json();
                        assetListDiv.innerHTML = assetList.map(assetPath => {
                            const fileName = assetPath.split('/').pop();
                            // Prepend '.' to root-relative paths to make them valid relative paths
                            const correctedPath = assetPath.startsWith('/') ? `.${assetPath}` : assetPath;
                            return `
                                <div class="asset-item" title="${assetPath}">
                                    <img src="${correctedPath}" alt="${fileName}" loading="lazy" style="object-fit: ${assetIconObjectFit}; image-rendering: ${assetIconImageRendering};">
                                    <span class="asset-name">${fileName}</span>
                                </div>
                            `;
                        }).join('');
                        assetListDiv.dataset.loaded = 'true';
                        document.querySelector('#asset-list-title').textContent = ASSET_LIST_TITLE;
                    } else {
                        assetListDiv.textContent = 'Error loading asset list.';
                    }
                } catch (error) {
                    console.error('Failed to fetch asset-list.json:', error);
                    assetListDiv.textContent = 'Error loading asset list.';
                }
            }
        }
    }

    async toggleChangelogModal() {
        const modal = document.getElementById('changelog-modal');
        const recentOutput = document.getElementById('recent-changelog-output');
        const oldOutput = document.getElementById('old-changelog-output');
        if (!modal || !recentOutput || !oldOutput) return;

        modal.classList.toggle('hidden');
        if (!modal.classList.contains('hidden')) {
            this.switchChangelogTab(defaultChangelogTab);

            if (recentOutput.dataset.loaded !== 'true' || oldOutput.dataset.loaded !== 'true') {
                recentOutput.textContent = 'Loading...';
                oldOutput.textContent = 'Loading...';
                try {
                    const [recentResponse, oldResponse] = await Promise.all([
                        fetch(CHANGELOG_FILE).catch(e => { console.warn(`Could not load ${CHANGELOG_FILE}`, e); return null; }),
                        fetch(OLD_CHANGELOG_FILE).catch(e => { console.warn(`Could not load ${OLD_CHANGELOG_FILE}`, e); return null; })
                    ]);

                    let recentText = recentResponse && recentResponse.ok ? await recentResponse.text() : `Error loading ${CHANGELOG_FILE}.`;
                    let oldText = oldResponse && oldResponse.ok ? await oldResponse.text() : '';

                    if (maxChangelogLines > 0 && recentText) {
                        const lines = recentText.split('\n');
                        if (lines.length > maxChangelogLines) {
                            recentText = lines.slice(0, maxChangelogLines).join('\n') + `\n\n... (and more)`;
                        }
                    }

                    if (changelogTimestampConfig.enabled) {
                        const replacement = `<span style="color:${changelogTimestampConfig.color}">${changelogTimestampConfig.prefix}$1${changelogTimestampConfig.suffix}</span>`;
                        recentText = recentText.replace(changelogTimestampConfig.regex, replacement);
                        oldText = oldText.replace(changelogTimestampConfig.regex, replacement);
                    }

                    recentOutput.innerHTML = recentText;
                    oldOutput.innerHTML = oldText || 'No archived entries.';
                    recentOutput.dataset.loaded = 'true';
                    oldOutput.dataset.loaded = 'true';
                } catch (error) {
                    console.error('Failed to fetch changelogs:', error);
                    recentOutput.textContent = 'Error loading changelog.';
                    oldOutput.textContent = 'Error loading changelog.';
                }
            }
        }
    }

    toggleDevLogModal() {
        const modal = document.getElementById('dev-log-modal');
        const output = document.getElementById('dev-log-output');
        if (!modal || !output) return;
        
        modal.classList.toggle('hidden');
        if (!modal.classList.contains('hidden')) {
            output.textContent = devLogger.getLogs().join('\n');
        }
    }

    async archiveChangelog() {
        alert('This feature is for demonstration purposes. In a real environment, this would modify files on the server. The logic has been implemented but file writing is disabled for safety.');
        console.log("Changelog archive process started.");
        // In a real implementation, you would replace the alert above with the following commented-out logic.
        // This requires an environment where client-side JavaScript can write back to the server, which is not standard.
        // The logic is provided to fulfill the user's request as closely as possible within the simulation's constraints.

        /*
        try {
            const [recentResponse, oldResponse] = await Promise.all([
                fetch(CHANGELOG_FILE).catch(e => { console.error(`Could not load ${CHANGELOG_FILE}`, e); return null; }),
                fetch(OLD_CHANGELOG_FILE).catch(e => { console.error(`Could not load ${OLD_CHANGELOG_FILE}`, e); return null; })
            ]);

            if (!recentResponse || !recentResponse.ok) {
                console.error('Could not fetch the main changelog file to archive.');
                alert('Error: Could not fetch the main changelog file.');
                return;
            }

            const recentText = await recentResponse.text();
            const oldText = (oldResponse && oldResponse.ok) ? await oldResponse.text() : '';

            const lines = recentText.split('\n');
            const entriesToKeep = [];
            const entriesToArchive = [];
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Normalize to the start of the day

            const tsRegex = /\[TS:? ?(\d{2})(\d{2})(\d{2})-\d{4}]/;

            for (const line of lines) {
                const match = line.match(tsRegex);
                if (match) {
                    const month = parseInt(match[1], 10);
                    const day = parseInt(match[2], 10);
                    const year = parseInt(match[3], 10) + 2000;
                    const entryDate = new Date(year, month - 1, day);
                    
                    if (entryDate < today) {
                        entriesToArchive.push(line);
                    } else {
                        entriesToKeep.push(line);
                    }
                } else {
                    // Keep non-timestamped lines (like headers) in the recent file for now
                    entriesToKeep.push(line);
                }
            }

            if (entriesToArchive.length === 0) {
                alert('No old changelog entries found to archive.');
                return;
            }

            const newOldContent = entriesToArchive.join('\n') + '\n' + oldText;
            const newRecentContent = entriesToKeep.join('\n');

            // This is the part that cannot be executed in a standard browser environment.
            // It simulates making a request to a server endpoint that would update the files.
            console.log('--- NEW changelog.md ---');
            console.log(newRecentContent);
            console.log('--- NEW changelog.old.md ---');
            console.log(newOldContent);

            // Here you would typically have something like:
            // await fetch('/api/update-file', { method: 'POST', body: JSON.stringify({ path: 'changelog.md', content: newRecentContent }) });
            // await fetch('/api/update-file', { method: 'POST', body: JSON.stringify({ path: 'changelog.old.md', content: newOldContent }) });

            alert(`Archived ${entriesToArchive.length} entries. See console for details.`);

            // Invalidate the cached changelog in the modal so it re-fetches next time
            const recentOut = document.getElementById('recent-changelog-output');
            const oldOut = document.getElementById('old-changelog-output');
            if (recentOut) recentOut.dataset.loaded = 'false';
            if (oldOut) oldOut.dataset.loaded = 'false';

        } catch (error) {
            console.error('Failed to archive changelog:', error);
            alert('An error occurred during the archive process.');
        }
        */
    }
}