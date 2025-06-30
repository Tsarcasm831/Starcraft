// Handles the changelog modal and archive functionality

/** @tweakable The filename for the main (recent) changelog document. */
const CHANGELOG_FILE = 'changelog.md'; // root-relative
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
 */
const changelogTimestampConfig = {
    enabled: true,
    regex: /\[TS] (\d{6}-\d{4})/g,
    color: '#88aaff',
    prefix: '[TS] ',
    suffix: ''
};

export class ChangelogModal {
    init() {
        document.getElementById('changelog-button')?.addEventListener('click', () => {
            const recentOut = document.getElementById('recent-changelog-output');
            if (recentOut) recentOut.dataset.loaded = 'false';
            const oldOut = document.getElementById('old-changelog-output');
            if (oldOut) oldOut.dataset.loaded = 'false';
            this.toggle();
        });
        document.getElementById('close-changelog-modal')?.addEventListener('click', () => this.toggle());
        document.getElementById('recent-changelog-tab-button')?.addEventListener('click', () => this.switchTab('recent'));
        document.getElementById('old-changelog-tab-button')?.addEventListener('click', () => this.switchTab('old'));
        document.getElementById('changelog-modal')?.addEventListener('click', (event) => {
            if (closeChangelogOnClickOutside && event.target === event.currentTarget) {
                this.toggle();
            }
        });
        document.getElementById('archive-changelog-button')?.addEventListener('click', () => this.archive());
    }

    switchTab(tabName) {
        document.querySelectorAll('.changelog-tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.changelog-tab-pane').forEach(pane => pane.classList.remove('active'));
        document.getElementById(`${tabName}-changelog-tab-button`)?.classList.add('active');
        document.getElementById(`${tabName}-changelog-tab-content`)?.classList.add('active');
    }

    async toggle() {
        const modal = document.getElementById('changelog-modal');
        const recentOutput = document.getElementById('recent-changelog-output');
        const oldOutput = document.getElementById('old-changelog-output');
        if (!modal || !recentOutput || !oldOutput) return;

        modal.classList.toggle('hidden');
        if (modal.classList.contains('hidden')) return;

        this.switchTab(defaultChangelogTab);

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

    async archive() {
        alert('This feature is for demonstration purposes. In a real environment, this would modify files on the server. The logic has been implemented but file writing is disabled for safety.');
        console.log('Changelog archive process started.');
        // See ModalManager.js for the full implementation that would write files.
    }
}
