import { CommandCenter } from '../../buildings/command-center.js'; // Needed for instanceof checks
import { Bunker } from '../../buildings/bunker.js';
import { Dropship } from '../../units/dropship.js';
import { ScienceVessel } from '../../units/science-vessel.js';

let unitPortraitPanel, portraitImg, unitCountOverlay, healthBarFill, unitHealthText, unitName;
let energyBarContainer, energyBarFill, unitEnergyText;
let shieldBarContainer, shieldBarFill, unitShieldText;

export class SelectionInfoDisplay {
    init() {
        unitPortraitPanel = document.getElementById('unit-portrait-panel');
        portraitImg = document.getElementById('portrait-img');
        unitCountOverlay = document.getElementById('unit-count-overlay');
        healthBarFill = document.getElementById('health-bar-fill');
        unitHealthText = document.getElementById('unit-health-text');
        unitName = document.getElementById('unit-name');
        energyBarContainer = document.querySelector('.energy-bar-container');
        energyBarFill = document.getElementById('energy-bar-fill');
        unitEnergyText = document.getElementById('unit-energy-text');
        shieldBarContainer = document.querySelector('.shield-bar-container');
        shieldBarFill = document.getElementById('shield-bar-fill');
        unitShieldText = document.getElementById('unit-shield-text');
    }

    update(selectedObjects) {
        if (selectedObjects.length === 0) {
            unitPortraitPanel.style.display = 'none';
            return;
        }

        unitPortraitPanel.style.display = 'block';

        const firstObject = selectedObjects[0];
        portraitImg.src = firstObject.portraitUrl;

        // Default name display
        if (firstObject instanceof Bunker || firstObject instanceof Dropship) {
            unitName.innerHTML = `${firstObject.name} <span style="color: #fff; font-size: 11px; font-weight: normal;">(${firstObject.garrisonedUnits.length}/${firstObject.capacity})</span>`;
        } else if (firstObject.name === 'Medic' || firstObject instanceof ScienceVessel) {
            unitName.innerHTML = `${firstObject.name}<br/><span style="color: #a7d1ff; font-size: 11px;">Energy: ${Math.floor(firstObject.energy ?? 0)}</span>`;
        } else {
            unitName.innerHTML = firstObject.name;
        }

        if (firstObject instanceof CommandCenter && firstObject.addon && firstObject.addon.name === 'Comsat Station') {
            unitName.innerHTML += `<br/><span style="color: #a7d1ff; font-size: 11px;">Energy: ${Math.floor(firstObject.addon.energy)}</span>`;
        }

        const statusBarContainer = healthBarFill.closest('.status-bar-container');

        if (firstObject.maxHealth > 0) {
            const healthPercent = (firstObject.currentHealth / firstObject.maxHealth) * 100;
            statusBarContainer.style.display = 'block';
            healthBarFill.style.width = `${healthPercent}%`;
            // Dynamically set status bar color
            if (firstObject.statusBarColor) {
                healthBarFill.style.backgroundColor = firstObject.statusBarColor;
            } else if (firstObject.name === 'Refinery') {
                healthBarFill.style.backgroundColor = '#00ff00'; // Show health as green
            } else {
                healthBarFill.style.backgroundColor = '#00ff00'; // Default green for health
            }

            // Show health/resource text
            if (firstObject.name === 'Refinery' && firstObject.geyser) {
                unitName.innerHTML = `${firstObject.name}<br/><span style="color: #00ff00; font-size: 11px;">Vespene: ${Math.floor(firstObject.geyser.currentVespene)}</span>`;
                unitHealthText.textContent = `${Math.ceil(firstObject.currentHealth)} / ${firstObject.maxHealth}`;
            } else if (firstObject.name.includes('Mineral Field') || firstObject.name.includes('Vespene Geyser')) {
                unitHealthText.textContent = `${Math.floor(firstObject.currentHealth)}`;
            } else {
                unitHealthText.textContent = `${Math.ceil(firstObject.currentHealth)} / ${firstObject.maxHealth}`;
            }
        } else {
            statusBarContainer.style.display = 'none';
            unitHealthText.textContent = '';
        }

        // Shield Bar for units that have shields (e.g. Protoss)
        if (firstObject.maxShields > 0) {
            const shieldPercent = (firstObject.currentShields / firstObject.maxShields) * 100;
            shieldBarContainer.style.display = 'block';
            shieldBarFill.style.width = `${shieldPercent}%`;
            unitShieldText.textContent = `${Math.floor(firstObject.currentShields)} / ${firstObject.maxShields}`;
        } else {
            shieldBarContainer.style.display = 'none';
        }

        // Energy Bar display for units that have it (e.g. Comsat, Medic)
        if (firstObject.maxEnergy > 0) {
            const energyPercent = (firstObject.energy / firstObject.maxEnergy) * 100;
            energyBarContainer.style.display = 'block';
            energyBarFill.style.width = `${energyPercent}%`;
            unitEnergyText.textContent = `${Math.floor(firstObject.energy)} / ${firstObject.maxEnergy}`;
        } else {
            energyBarContainer.style.display = 'none';
        }

        // Show selection count if more than one object is selected
        if (selectedObjects.length > 1) {
            unitCountOverlay.style.display = 'block';
            unitCountOverlay.textContent = selectedObjects.length;
        } else {
            unitCountOverlay.style.display = 'none';
        }
    }
}