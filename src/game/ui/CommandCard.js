import { assetManager } from '../../utils/asset-manager.js';

let commandGrid, tooltip, buildQueueDisplay, commandCardPanel;
let executeCommandCallback = null;

export class CommandCard {
    constructor() {
        this.currentCommandObject = null;
        this.currentCommandSignature = '';
    }

    init(callback) {
        commandCardPanel = document.getElementById('command-card-panel');
        commandGrid = document.querySelector('#command-card-panel .command-grid');
        tooltip = document.getElementById('tooltip');
        buildQueueDisplay = document.getElementById('build-queue-display');
        executeCommandCallback = callback;
        commandCardPanel.style.display = 'none'; // Initially hidden
    }

    update(object, gameState) {
        if (!object) {
            if (commandCardPanel.style.display !== 'none') {
                commandCardPanel.style.display = 'none';
                this.hideTooltip(); // Hide tooltip when selection is cleared
            }
            return;
        }

        if (commandCardPanel.style.display !== 'flex') {
            commandCardPanel.style.display = 'flex';
        }

        const newSignature = JSON.stringify(object?.commands); // Use optional chaining for safety

        if (object !== this.currentCommandObject || newSignature !== this.currentCommandSignature) {
            this.updateCommandButtons(object, gameState);
            this.currentCommandObject = object;
            this.currentCommandSignature = newSignature;
        }
        this.updateBuildProgressDisplay(object);
    }

    updateCommandButtons(object, gameState) {
        commandGrid.innerHTML = ''; // Clear existing buttons
        this.hideTooltip(); // Hide any lingering tooltips

        const commands = object?.commands ?? [];
        const totalButtons = 12; // 4x3 grid
        const isMobile = document.getElementById('enable-mobile-controls-checkbox')?.checked;
        const isBuildingAddon = object.buildQueue?.some(item => item.isAddon);

        for (let i = 0; i < totalButtons; i++) {
            const command = commands[i];
            const button = document.createElement('div');
            button.classList.add('command-button');
            button.dataset.index = i; // For linking to build queue

            if (command) {
                // This check is now simplified because the command list from the object is authoritative.
                if (isBuildingAddon && command.command !== object.buildQueue[0].originalCommand) {
                    commandGrid.appendChild(button); // Append empty button for spacing
                    continue;
                }

                button.dataset.command = command.command;

                if (command.name) {
                    let tooltipText = command.name;
                    if (command.cost) {
                        let costs = [];
                        if (command.cost.minerals) costs.push(`${command.cost.minerals} Minerals`);
                        if (command.cost.vespene) costs.push(`${command.cost.vespene} Vespene`);
                        if (command.cost.supply) costs.push(`${command.cost.supply} Supply`);
                        if (costs.length > 0) tooltipText += `\nCost: ${costs.join(', ')}`;
                    }
                    if (command.buildTime) {
                        tooltipText += `\nTime: ${command.buildTime}s`;
                    }
                    if (command.researchTime) { // For research commands in Engineering Bay, Academy, Armory
                        tooltipText += `\nTime: ${command.researchTime}s`;
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
                            case 'scienceFacilityBuilt': prereqName = "Requires: Science Facility";
                            case 'physicsLabBuilt': prereqName = "Requires: Physics Lab"; break;
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
                    this.hideTooltip(); // Ensure tooltip is hidden after action
                };

                // Disable button if an addon is currently being built
                if (isBuildingAddon) {
                    button.style.pointerEvents = 'none';
                    // Apply a grayscale filter to all buttons except the one being built
                    if (command.command === object.buildQueue[0].originalCommand) {
                         button.style.filter = 'none';
                    } else {
                         button.style.filter = 'grayscale(80%)';
                    }
                } else {
                    if (isMobile) {
                        button.addEventListener('touchend', commandAction);
                    } else {
                        button.addEventListener('click', commandAction);
                        button.addEventListener('mouseenter', this.showTooltip.bind(this));
                        button.addEventListener('mouseleave', this.hideTooltip.bind(this));
                    }
                }

                if (command.icon) {
                    const iconName = command.icon.split('/').pop().replace('.png', '');
                    try {
                        const preloadedIcon = assetManager.get(iconName);
                        const icon = preloadedIcon.cloneNode(true);
                        icon.classList.add('icon');
                        icon.alt = command.name;
                        button.appendChild(icon);
                    } catch (e) {
                        console.warn(`Icon not preloaded, falling back to src: ${command.icon}`, e);
                        const icon = document.createElement('img');
                        icon.classList.add('icon');
                        icon.src = command.icon;
                        icon.loading = 'lazy';
                        icon.alt = command.name;
                        button.appendChild(icon);
                    }
                }

                if (command.hotkey) {
                    const hotkey = document.createElement('span');
                    hotkey.classList.add('hotkey');
                    hotkey.textContent = command.hotkey;
                    button.appendChild(hotkey);
                }

                const progressContainer = document.createElement('div');
                progressContainer.className = 'build-progress-container';
                button.appendChild(progressContainer);
            }

            commandGrid.appendChild(button);
        }
    }

    updateBuildProgressDisplay(object) {
        // Clear all previous queue counts
        document.querySelectorAll('.build-queue-count').forEach(el => el.remove());

        if (!object || !object.buildQueue || object.buildQueue.length === 0) {
            buildQueueDisplay.innerHTML = '';
            document.querySelectorAll('.build-progress-bar').forEach(bar => bar.style.width = '0%');
            return;
        }
        
        let availableCommands = object.commands;
        // If an addon is being built, the `commands` getter might only return that single command.
        // We need the full list of potential commands to find icons for everything in the queue.
        // The addonBehavior caches the list of possible addon builds.
        if (object.addonBehavior && object.addonBehavior.cachedCommands.length > 0) {
            // This is a bit of a hack; we merge the current commands with the cached addon commands
            // to ensure we can find the icon for an addon being built.
            const commandMap = new Map();
            object.commands.forEach(c => c && commandMap.set(c.command, c));
            object.addonBehavior.cachedCommands.forEach(c => c && !commandMap.has(c.command) && commandMap.set(c.command, c));
            availableCommands = Array.from(commandMap.values());
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
        const trainingOrResearchingItem = object.buildQueue[0];
        const progressPercent = (trainingOrResearchingItem.progress / trainingOrResearchingItem.buildTime) * 100;

        // Clear all progress bars first, then set the active one
        document.querySelectorAll('.build-progress-bar').forEach(bar => bar.style.width = '0%');

        if (trainingOrResearchingItem) {
            const button = commandGrid.querySelector(`.command-button[data-command='${trainingOrResearchingItem.originalCommand}']`);
            if (button) {
                const progressContainer = button.querySelector('.build-progress-container');
                if (progressContainer) {
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
        object.buildQueue.slice(0, 5).forEach((item) => {
            const command = availableCommands.find(c => c && c.command === item.originalCommand);
            if (command) {
                queueHTML += `<div class="build-queue-item">
                    <img src="${command.icon}" alt="${command.name}" />
                </div>`;
            }
        });
        buildQueueDisplay.innerHTML = queueHTML;
    }

    showTooltip(event) {
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

    hideTooltip() {
        tooltip.style.display = 'none';
    }
}