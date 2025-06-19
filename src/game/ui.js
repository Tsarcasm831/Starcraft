// Element references
let unitPortraitPanel, portraitImg, unitCountOverlay, healthBarFill, unitHealthText, unitName, commandGrid, tooltip;
let mineralCountEl, vespeneCountEl, supplyCountEl, statusTextPanel, placementTextPanel;
let energyBarContainer, energyBarFill, unitEnergyText;
let buildQueueDisplay; // New element for the visual queue
let currentCommandObject = null;
let currentCommandSignature = '';
let executeCommandCallback = null;

import { CommandCenter } from '../buildings/command-center.js';
import { assetManager } from '../utils/asset-manager.js';

export function initUI(commandCallback) {
    // Get references to all the UI elements that will be updated
    unitPortraitPanel = document.getElementById('unit-portrait-panel');
    portraitImg = document.getElementById('portrait-img');
    unitCountOverlay = document.getElementById('unit-count-overlay');
    healthBarFill = document.getElementById('health-bar-fill');
    unitHealthText = document.getElementById('unit-health-text');
    unitName = document.getElementById('unit-name');
    commandGrid = document.querySelector('#command-card-panel .command-grid');
    tooltip = document.getElementById('tooltip');
    energyBarContainer = document.querySelector('.energy-bar-container');
    energyBarFill = document.getElementById('energy-bar-fill');
    unitEnergyText = document.getElementById('unit-energy-text');
    buildQueueDisplay = document.getElementById('build-queue-display');

    mineralCountEl = document.getElementById('mineral-count');
    vespeneCountEl = document.getElementById('vespene-count');
    supplyCountEl = document.getElementById('supply-count');
    statusTextPanel = document.getElementById('status-text-panel');
    placementTextPanel = document.getElementById('placement-text-panel');
    
    executeCommandCallback = commandCallback;
}

export function updatePlacementText(message) {
    if (placementTextPanel) {
        placementTextPanel.textContent = message;
    }
}

export function updateStatusText(message) {
    // Clear previous messages to avoid spam
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
    
    // Fade out message
    p.style.opacity = '0';
    // Remove from DOM after transition
    setTimeout(() => p.remove(), 4000);

    // Limit total messages
    while (statusTextPanel.children.length > 8) {
        statusTextPanel.removeChild(statusTextPanel.lastChild);
    }
}

function showTooltip(event) {
    const button = event.currentTarget;
    const tooltipText = button.dataset.tooltipText;
    const prereqText = button.dataset.prereqText;
    if (tooltipText) {
        let finalHtml = tooltipText.replace(/\n/g, '<br>');

        if (prereqText) {
            finalHtml += `<br><span style="color: #ff6666;">${prereqText}</span>`;
        }

        tooltip.innerHTML = finalHtml;
        tooltip.style.display = 'block'; // Make it visible to measure it
        
        const rect = button.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        const containerRect = document.body.getBoundingClientRect();
        
        // Position the tooltip above the button, centered
        let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
        let top = rect.top - tooltipRect.height - 5;
        
        // Clamp to screen edges
        if (left < 0) left = 0;
        if (left + tooltipRect.width > containerRect.width) {
            left = containerRect.width - tooltipRect.width;
        }
        if (top < 0) top = 0;

        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
    }
}

function hideTooltip() {
    tooltip.style.display = 'none';
}

export function updateUI(selectedObjects, gameState) {
    // Update resource displays
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

    if (selectedObjects.length > 0) {
        updateSelectionInfo(selectedObjects);
        const firstObject = selectedObjects[0];
        const newSignature = JSON.stringify(firstObject.commands);

        // Only update the command card if the selected object type changes or its commands have changed
        if (firstObject !== currentCommandObject || newSignature !== currentCommandSignature) {
            updateCommandCard(firstObject, gameState);
            currentCommandObject = firstObject;
            currentCommandSignature = newSignature;
        }
        // Update build progress if the selected object has a build queue
        updateBuildProgress(firstObject);
    } else {
        // If nothing is selected, clear the panel
        if (currentCommandObject !== null) {
            unitPortraitPanel.style.display = 'none';
            updateCommandCard(null, gameState); // Clear command card
            buildQueueDisplay.innerHTML = ''; // Clear build queue display
            buildQueueDisplay.style.display = 'none';
            currentCommandObject = null;
            currentCommandSignature = '';
        }
    }
}

function updateSelectionInfo(objects) {
    unitPortraitPanel.style.display = 'block';

    // Display info for the first object in the selection
    const firstObject = objects[0];

    portraitImg.src = firstObject.portraitUrl;
    
    // Default name display
    if (firstObject.name === 'Bunker') {
        unitName.innerHTML = `${firstObject.name} <span style="color: #fff; font-size: 11px; font-weight: normal;">(${firstObject.garrisonedUnits.length}/${firstObject.capacity})</span>`;
    } else if (firstObject.name === 'Medic') {
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
    if (objects.length > 1) {
        unitCountOverlay.style.display = 'block';
        unitCountOverlay.textContent = objects.length;
    } else {
        unitCountOverlay.style.display = 'none';
    }
}

function updateCommandCard(object, gameState) {
    commandGrid.innerHTML = ''; // Clear existing buttons
    hideTooltip(); // Hide any lingering tooltips

    const commands = object?.commands ?? [];
    const totalButtons = 12; // 4x3 grid
    const isMobile = document.getElementById('enable-mobile-controls-checkbox')?.checked;

    for (let i = 0; i < totalButtons; i++) {
        const command = commands[i];
        const button = document.createElement('div');
        button.classList.add('command-button');
        button.dataset.index = i; // For linking to build queue

        if (command) {
            button.dataset.command = command.command;

            if (command.name) {
                let tooltipText = command.name;
                if (command.cost) {
                    let costs = [];
                    if(command.cost.minerals) costs.push(`${command.cost.minerals} Minerals`);
                    if(command.cost.vespene) costs.push(`${command.cost.vespene} Vespene`);
                    if(command.cost.supply) costs.push(`${command.cost.supply} Supply`);
                    if(costs.length > 0) tooltipText += `\nCost: ${costs.join(', ')}`;
                }
                if(command.buildTime) {
                    tooltipText += `\nTime: ${command.buildTime}s`;
                }
                button.dataset.tooltipText = tooltipText;

                if (command.prereq && gameState && !gameState[command.prereq]) {
                    let prereqName = 'Requires: Unknown';
                    switch (command.prereq) {
                        case 'academyBuilt': prereqName = "Requires: Academy"; break;
                        case 'engineeringBayBuilt': prereqName = "Requires: Engineering Bay"; break;
                        case 'barracksBuilt': prereqName = "Requires: Barracks"; break;
                        case 'factoryBuilt': prereqName = "Requires: Factory"; break;
                        case 'starportBuilt': prereqName = "Requires: Starport"; break;
                        case 'scienceFacilityBuilt': prereqName = "Requires: Science Facility"; break;
                        case 'covertOpsBuilt': prereqName = "Requires: Covert Ops"; break;
                    }
                     button.dataset.prereqText = prereqName;
                }
            }
            if (command.hotkey) {
                button.dataset.hotkey = command.hotkey;
            }
            
            const commandAction = (e) => {
                if (e) {
                    e.preventDefault();
                    e.stopPropagation();
                }
                if (executeCommandCallback) {
                    executeCommandCallback(command.command);
                }
                hideTooltip(); // Ensure tooltip is hidden after action
            };
            
            if (isMobile) {
                 button.addEventListener('touchend', commandAction);
            } else {
                button.addEventListener('click', commandAction);
                button.addEventListener('mouseenter', showTooltip);
                button.addEventListener('mouseleave', hideTooltip);
            }
            
            const iconName = command.icon.split('/').pop().replace('.png', '');
            try {
                // Use the pre-loaded image from the asset manager
                const preloadedIcon = assetManager.get(iconName);
                const icon = preloadedIcon.cloneNode(true);
                icon.classList.add('icon');
                icon.alt = command.name;
                button.appendChild(icon);
            } catch (e) {
                // Fallback in case an icon is missing from the preloader
                console.warn(`Icon not preloaded, falling back to src: ${command.icon}`, e);
                const icon = document.createElement('img');
                icon.classList.add('icon');
                icon.src = command.icon;
                icon.loading = 'lazy';
                icon.alt = command.name;
                button.appendChild(icon);
            }
            
            if (command.hotkey) {
                const hotkey = document.createElement('span');
                hotkey.classList.add('hotkey');
                hotkey.textContent = command.hotkey;
                button.appendChild(hotkey);
            }

            // For build progress
            const progressContainer = document.createElement('div');
            progressContainer.className = 'build-progress-container';
            button.appendChild(progressContainer);
        }
        
        commandGrid.appendChild(button);
    }
}

function updateBuildProgress(object) {
    // Clear all previous queue counts
    document.querySelectorAll('.build-queue-count').forEach(el => el.remove());

    if (!object || !object.buildQueue || !object.commands) {
        buildQueueDisplay.innerHTML = '';
        buildQueueDisplay.style.display = 'none';
        document.querySelectorAll('.build-progress-bar').forEach(bar => bar.style.width = '0%');
        return;
    }

    if (object.buildQueue.length > 0) {
        buildQueueDisplay.style.display = 'flex';
    } else {
        buildQueueDisplay.innerHTML = '';
        buildQueueDisplay.style.display = 'none';
        // If queue is empty, ensure no progress bars are showing from a previous state
        document.querySelectorAll('.build-progress-bar').forEach(bar => bar.style.width = '0%');
        return; // Nothing more to do if the queue is empty
    }

    // --- Update Command Button Counters and Progress Bar ---
    const queueCounts = {};
    object.buildQueue.forEach(item => {
        queueCounts[item.originalCommand] = (queueCounts[item.originalCommand] || 0) + 1;
    });

    document.querySelectorAll('.command-button').forEach(button => {
        const commandName = button.dataset.command;
        if (queueCounts[commandName]) {
            const queueCountEl = document.createElement('div');
            queueCountEl.className = 'build-queue-count';
            queueCountEl.textContent = queueCounts[commandName];
            button.appendChild(queueCountEl);
        }
    });

    // Update progress bar for the item at the head of the queue
    const trainingUnit = object.buildQueue[0];
    const progressPercent = (trainingUnit.progress / trainingUnit.buildTime) * 100;
    
    // Clear all progress bars first, then set the active one
    document.querySelectorAll('.build-progress-bar').forEach(bar => bar.style.width = '0%');
    
    if (trainingUnit) {
        const button = commandGrid.querySelector(`.command-button[data-command='${trainingUnit.originalCommand}']`);
        if (button) {
            // Find the progress container and set its bar's width
            const progressContainer = button.querySelector('.build-progress-container');
            if (progressContainer) {
                // Check if a bar exists, if not, create one. This is defensive.
                let progressBar = progressContainer.querySelector('.build-progress-bar');
                if (!progressBar) {
                    progressBar = document.createElement('div');
                    progressBar.className = 'build-progress-bar';
                    progressContainer.appendChild(progressBar);
                }
                progressBar.style.width = `${progressPercent}%`;
            }
        }
    }

    // --- Update Visual Queue Display ---
    let queueHTML = '';
    object.buildQueue.slice(0, 5).forEach((item, index) => {
        const command = object.commands.find(c => c && c.command === item.originalCommand);
        if (command) {
            queueHTML += `<div class="build-queue-item">
                <img src="${command.icon}" alt="${command.name}" />
            </div>`;
        }
    });
    buildQueueDisplay.innerHTML = queueHTML;
}