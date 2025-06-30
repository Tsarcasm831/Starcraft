// Handles the manual and asset list modal

/** @tweakable The filename for the manual document. */
const MANUAL_FILE = 'manual.md';
/** @tweakable The maximum number of lines to display from the manual. 0 for no limit. */
const maxManualLines = 0;
/** @tweakable enable closing the manual modal by clicking its background */
const closeManualOnClickOutside = true;

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

export class ManualModal {
    init() {
        document.getElementById('manual-button')?.addEventListener('click', () => this.toggle());
        document.getElementById('close-manual-modal')?.addEventListener('click', () => this.toggle());
        document.getElementById('manual-modal')?.addEventListener('click', (event) => {
            if (closeManualOnClickOutside && event.target === event.currentTarget) {
                this.toggle();
            }
        });
        document.getElementById('manual-tab-button')?.addEventListener('click', () => this.switchTab('manual'));
        document.getElementById('assets-tab-button')?.addEventListener('click', () => this.switchTab('assets'));
    }

    switchTab(tabName) {
        document.querySelectorAll('.manual-tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.manual-tab-pane').forEach(pane => pane.classList.remove('active'));
        document.getElementById(`${tabName}-tab-button`)?.classList.add('active');
        document.getElementById(`${tabName}-tab-content`)?.classList.add('active');
    }

    async toggle() {
        const modal = document.getElementById('manual-modal');
        const output = document.getElementById('manual-output');
        const assetListDiv = document.getElementById('asset-list');
        const assetsTabButton = document.getElementById('assets-tab-button');
        if (!modal || !output || !assetListDiv || !assetsTabButton) return;

        assetsTabButton.style.display = showAssetListInManual ? 'block' : 'none';
        modal.classList.toggle('hidden');
        if (modal.classList.contains('hidden')) return;

        this.switchTab(defaultManualTab);

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
