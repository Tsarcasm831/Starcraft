let statusTextPanel, placementTextPanel, globalMessageContainer;

export class MessageDisplay {
    init() {
        statusTextPanel = document.getElementById('status-text-panel');
        placementTextPanel = document.getElementById('placement-text-panel');
        globalMessageContainer = document.getElementById('global-message-container');
    }

    updatePlacementText(message) {
        if (placementTextPanel) {
            placementTextPanel.textContent = message;
        }
    }

    showGlobalMessage(message) {
        if (!globalMessageContainer) return;

        const p = document.createElement('p');
        p.textContent = message;
        p.className = 'global-message';

        globalMessageContainer.appendChild(p);

        setTimeout(() => {
            p.style.opacity = '0';
        }, 1000);

        setTimeout(() => {
            if (p.parentElement) {
                p.parentElement.removeChild(p);
            }
        }, 2000);
    }

    updateStatusText(message) {
        const lowerCaseMessage = message.toLowerCase();
        if (lowerCaseMessage.includes('not enough minerals') ||
            lowerCaseMessage.includes('not enough vespene') ||
            lowerCaseMessage.includes('additional supply required')) {
            this.showGlobalMessage(message);
            return;
        }

        Array.from(statusTextPanel.children).forEach(child => {
            if (child.textContent === message) {
                child.remove();
            }
        });

        const p = document.createElement('p');
        p.textContent = message;
        p.style.margin = '0 0 4px 0';
        p.style.transition = 'opacity 1s ease-out 3s';
        p.style.opacity = '1';
        statusTextPanel.prepend(p);

        p.style.opacity = '0';
        setTimeout(() => p.remove(), 4000);

        while (statusTextPanel.children.length > 8) {
            statusTextPanel.removeChild(statusTextPanel.lastChild);
        }
    }
}

