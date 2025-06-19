import { CommandCenter } from '../buildings/command-center.js';

let getSelectedObjects, gameState, units, setPlacementMode, updateStatusText;

export function initCommandExecutor(deps) {
    getSelectedObjects = deps.getSelectedObjects;
    gameState = deps.gameState;
    units = deps.units;
    setPlacementMode = deps.setPlacementMode;
    updateStatusText = deps.updateStatusText;
    
    return executeCommand;
}

function executeCommand(commandName) {
    const selected = getSelectedObjects();
    if (selected.length === 0) return;

    // Use a representative object for command validation (important for mixed selections)
    const representativeObject = selected[0];
    const command = representativeObject.commands.find(c => c && c.command === commandName);

    if (!command) return;

    if (commandName === 'land') {
        // Special handling for landing
        const flyingCC = selected.find(obj => obj instanceof CommandCenter && obj.state === 'flying');
        if (flyingCC) {
            setPlacementMode({ type: 'land', building: flyingCC, command });
        }
        return;
    }

    if (commandName === 'open_build_menu') {
        selected.forEach(u => { if (u.commandMode !== undefined) { u.commandMode = 'build'; } });
        return;
    }

    if (commandName === 'open_advanced_build_menu') {
        selected.forEach(u => { if (u.commandMode !== undefined) { u.commandMode = 'build_advanced'; } });
        return;
    }

    if (commandName === 'cancel_build_menu') {
        selected.forEach(u => { if (u.commandMode !== undefined) { u.commandMode = 'basic'; } });
        return;
    }

    if (commandName.startsWith('build_')) {
        if (command.prereq && !gameState[command.prereq]) {
            let prereqName = 'prerequisites';
            if (command.prereq === 'academyBuilt') prereqName = 'Academy';
            else if (command.prereq === 'engineeringBayBuilt') prereqName = 'Engineering Bay';
            else if (command.prereq === 'barracksBuilt') prereqName = 'Barracks';
            updateStatusText(`Requires ${prereqName}.`);
            return;
        }
        if (gameState.minerals < command.cost.minerals) {
            updateStatusText('Not enough minerals.');
            return;
        }
        if (command.cost.vespene && gameState.vespene < command.cost.vespene) {
            updateStatusText('Not enough vespene.');
            return;
        }
        setPlacementMode({ type: 'build', builder: representativeObject, command });
    } else if (typeof representativeObject.executeCommand === 'function') {
        // Pass the list of all units to the command executor for potential interaction checks
        const commandGameState = { ...gameState, units };
        selected.forEach(s => s.executeCommand(commandName, commandGameState, updateStatusText));
    }
}