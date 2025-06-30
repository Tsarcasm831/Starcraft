import { devLogger } from '../../../utils/dev-logger.js';

export class DevLogModal {
    constructor() {
        this.menuManager = null;
    }

    init(menuManager) {
        this.menuManager = menuManager;
        document.getElementById('close-dev-log-modal')?.addEventListener('click', () => this.toggle());
        document.getElementById('clear-dev-log-button')?.addEventListener('click', () => devLogger.clearLogs());
        window.addEventListener('keyup', (e) => {
            if (e.code === 'Backslash' && devLogger.isActive && this.menuManager?.isPaused) {
                this.toggle();
            }
        });
    }

    toggle() {
        const modal = document.getElementById('dev-log-modal');
        const output = document.getElementById('dev-log-output');
        if (!modal || !output) return;

        modal.classList.toggle('hidden');
        if (!modal.classList.contains('hidden')) {
            output.textContent = devLogger.getLogs().join('\n');
        }
    }
}
