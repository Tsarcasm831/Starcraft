let mineralCountEl, vespeneCountEl, supplyCountEl;

export class ResourceDisplay {
    init() {
        mineralCountEl = document.getElementById('mineral-count');
        vespeneCountEl = document.getElementById('vespene-count');
        supplyCountEl = document.getElementById('supply-count');
    }

    update(gameState) {
        if (gameState) {
            mineralCountEl.textContent = Math.floor(gameState.minerals);
            vespeneCountEl.textContent = Math.floor(gameState.vespene);
            supplyCountEl.textContent = `${gameState.supplyUsed}/${gameState.supplyCap}`;

            const supplyRatio = gameState.supplyUsed / gameState.supplyCap;
            if (supplyRatio >= 1) {
                supplyCountEl.style.color = '#ff4444'; // Red when capped
            } else if (supplyRatio > 0.85) {
                supplyCountEl.style.color = '#ffff00'; // Yellow when close
            } else {
                supplyCountEl.style.color = '#ffffff'; // White otherwise
            }
        }
    }
}

