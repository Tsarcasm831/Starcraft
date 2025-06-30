import { ManualModal } from './modals/ManualModal.js';
import { ChangelogModal } from './modals/ChangelogModal.js';
import { DevLogModal } from './modals/DevLogModal.js';
import { PromoModal } from './modals/PromoModal.js';

export class ModalManager {
    constructor() {
        this.menuManager = null;
        this.manualModal = new ManualModal();
        this.changelogModal = new ChangelogModal();
        this.devLogModal = new DevLogModal();
        this.promoModal = new PromoModal();
    }

    init(menuManager) {
        this.menuManager = menuManager;
        this.manualModal.init();
        this.changelogModal.init();
        this.devLogModal.init(menuManager);
        this.promoModal.init();
    }

    switchManualTab(tabName) {
        this.manualModal.switchTab(tabName);
    }

    switchChangelogTab(tabName) {
        this.changelogModal.switchTab(tabName);
    }

    toggleManualModal() {
        return this.manualModal.toggle();
    }

    toggleChangelogModal() {
        return this.changelogModal.toggle();
    }

    toggleDevLogModal() {
        this.devLogModal.toggle();
    }

    togglePromoModal() {
        this.promoModal.toggle();
    }

    archiveChangelog() {
        return this.changelogModal.archive();
    }
}
