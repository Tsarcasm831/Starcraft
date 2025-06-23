import { CommandCenter } from '../buildings/command-center.js';
import { Barracks } from '../buildings/barracks.js';
import { Factory } from '../buildings/factory.js';
import { Starport } from '../buildings/starport.js';
import { EngineeringBay } from '../buildings/engineering-bay.js';
import { devLogger } from '../utils/dev-logger.js';

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
    
    devLogger.log('CommandExecutor', `Executing command: '${commandName}' for ${selected.length} object(s).`);

    // Use a representative object for command validation (important for mixed selections)
    const representativeObject = selected[0];
    const command = representativeObject.commands.find(c => c && c.command === commandName);

    if (!command) return;

    if (commandName.startsWith('land_')) {
        let flyingBuilding;
        if (commandName === 'land_command_center') {
            flyingBuilding = selected.find(obj => obj instanceof CommandCenter && obj.state === 'flying');
        } else if (commandName === 'land_barracks') {
            flyingBuilding = selected.find(obj => obj instanceof Barracks && obj.state === 'flying');
        } else if (commandName === 'land_factory') {
            flyingBuilding = selected.find(obj => obj instanceof Factory && obj.state === 'flying');
        } else if (commandName === 'land_starport') {
            flyingBuilding = selected.find(obj => obj instanceof Starport && obj.state === 'flying');
        } else if (commandName === 'land_engineering_bay') {
            flyingBuilding = selected.find(obj => obj instanceof EngineeringBay && obj.state === 'flying');
        }
        
        if (flyingBuilding) {
            setPlacementMode({ type: 'land', building: flyingBuilding, command });
        }
        return;
    }

    if (commandName.startsWith('build_')) {
        if (command.isAddon) {
            // This is an addon build, not a placement build.
            // Let the building handle it directly.
            const commandGameState = { ...gameState, units };
            selected.forEach(s => s.executeCommand(commandName, commandGameState, updateStatusText));
            return;
        }

        if (command.prereq && !gameState[command.prereq]) {
            let prereqName = 'prerequisites';
            if (command.prereq === 'academyBuilt') prereqName = 'Academy';
            else if (command.prereq === 'engineeringBayBuilt') prereqName = 'Engineering Bay';
            else if (command.prereq === 'barracksBuilt') prereqName = 'Barracks';
            else if (command.prereq === 'factoryBuilt') prereqName = 'Factory';
            else if (command.prereq === 'starportBuilt') prereqName = 'Starport';
            else if (command.prereq === 'scienceFacilityBuilt') prereqName = 'Science Facility';
            else if (command.prereq === 'physicsLabBuilt') prereqName = 'Physics Lab';
            else if (command.prereq === 'covertOpsBuilt') prereqName = 'Covert Ops';
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
        return; // Explicitly return to avoid falling through
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

    if (typeof representativeObject.executeCommand === 'function') {
        // Pass the list of all units to the command executor for potential interaction checks
        const commandGameState = { ...gameState, units };
        selected.forEach(s => s.executeCommand(commandName, commandGameState, updateStatusText));
    }
}