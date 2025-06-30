import * as THREE from 'three';
import { CommandCenter } from '../buildings/command-center.js';
import { SupplyDepot } from '../buildings/supply-depot.js';
import { MineralField } from '../resources/mineral-field.js';
import { VespeneGeyser } from '../resources/vespene-geyser.js';
import { SCV } from '../units/scv.js';
import { SCVMark2 } from '../units/scv-mark-2.js';
import { Zealot } from '../protoss/zealot.js';
import { Probe } from '../protoss/probe.js';
import { Stalker } from '../protoss/stalker.js';
import { Unit } from '../units/unit.js';
import { Firebat } from '../units/firebat.js';
import { Medic } from '../units/medic.js';
import { Ghost } from '../units/ghost.js';
import { Vulture } from '../units/vulture.js';
import { SiegeTank } from '../units/siege-tank.js';
import { Goliath } from '../units/goliath.js';
import { Wraith } from '../units/wraith.js';
import { Dropship } from '../units/dropship.js';
import { ScienceVessel } from '../units/science-vessel.js';
import { Valkyrie } from '../units/valkyrie.js';
import { Battlecruiser } from '../units/battlecruiser.js';
import { Adept } from '../protoss/adept.js';
import { Dragoon } from '../protoss/dragoon.js';

/** @tweakable The layout for spawning all dev units on the map. */
const devUnitSpawnLayout = {
    startPosition: new THREE.Vector3(-25, 0, 0),
    spacing: 3,
    unitsPerRow: 5,
};

export function setupInitialState({
    scene,
    units,
    buildings,
    selectables,
    collidableObjects,
    mineralFields,
    vespeneGeysers,
    gameState,
    pathfinder,
    spawnBuilding,
    devModeActive
}) {
    const pathfinderUpdateCallback = () => pathfinder.updateObstacles(collidableObjects);

    const commandCenter = new CommandCenter(new THREE.Vector3(15, 0, 15), { onStateChange: pathfinderUpdateCallback });
    scene.add(commandCenter.mesh);
    buildings.push(commandCenter);
    collidableObjects.push(commandCenter);
    selectables.push(commandCenter);
    commandCenter.addonBehavior.updateCommands(gameState);

    const supplyDepot = new SupplyDepot(new THREE.Vector3(20, 0, 2), pathfinderUpdateCallback);
    scene.add(supplyDepot.mesh);
    buildings.push(supplyDepot);
    collidableObjects.push(supplyDepot);
    selectables.push(supplyDepot);

    const mineralPositions = [
        new THREE.Vector3(20, 0, 8),
        new THREE.Vector3(23, 0, 9),
        new THREE.Vector3(26, 0, 10),
        new THREE.Vector3(28, 0, 13),
        new THREE.Vector3(28, 0, 17),
        new THREE.Vector3(26, 0, 20),
        new THREE.Vector3(23, 0, 21),
        new THREE.Vector3(20, 0, 22),
    ];

    mineralPositions.forEach(pos => {
        const mineralField = new MineralField(pos);
        scene.add(mineralField.mesh);
        mineralFields.push(mineralField);
        selectables.push(mineralField);
        collidableObjects.push(mineralField);
    });

    const geyser = new VespeneGeyser(new THREE.Vector3(15, 0, -15));
    scene.add(geyser.mesh);
    vespeneGeysers.push(geyser);
    selectables.push(geyser);
    collidableObjects.push(geyser);

    gameState.supplyCap += 12;

    if (devModeActive) {
        const barracks = spawnBuilding('build_barracks', new THREE.Vector3(0, 0, 5), { isUnderConstruction: false });
        barracks.onConstructionComplete(gameState);

        const academy = spawnBuilding('build_academy', new THREE.Vector3(0, 0, -5), { isUnderConstruction: false });
        academy.onConstructionComplete(gameState);
        
        const factory = spawnBuilding('build_factory', new THREE.Vector3(-10, 0, 5), { isUnderConstruction: false });
        factory.onConstructionComplete(gameState);

        const starport = spawnBuilding('build_starport', new THREE.Vector3(-10, 0, -5), { isUnderConstruction: false });
        starport.onConstructionComplete(gameState);

        const devSupplyDepot = spawnBuilding('build_supply_depot', new THREE.Vector3(0, 0, 15), { isUnderConstruction: false });
        devSupplyDepot.onConstructionComplete(gameState);

        const scienceFacility = spawnBuilding('build_science_facility', new THREE.Vector3(10, 0, -5), { isUnderConstruction: false });
        scienceFacility.onConstructionComplete(gameState);

        const armory = spawnBuilding('build_armory', new THREE.Vector3(10, 0, 5), { isUnderConstruction: false });
        armory.onConstructionComplete(gameState);

        const zealot = new Zealot(new THREE.Vector3(-15, 0, -15));
        scene.add(zealot.mesh);
        units.push(zealot);
        selectables.push(zealot);

        const probe = new Probe(new THREE.Vector3(-15, 0, -18));
        scene.add(probe.mesh);
        scene.add(probe.selectionIndicator); // Probes hover, so indicator is separate
        units.push(probe);
        selectables.push(probe);

        const stalker = new Stalker(new THREE.Vector3(-18, 0, -15));
        scene.add(stalker.mesh);
        units.push(stalker);
        selectables.push(stalker);

        const dragoon = new Dragoon(new THREE.Vector3(-21, 0, -15));
        scene.add(dragoon.mesh);
        units.push(dragoon);
        selectables.push(dragoon);

        const devUnitsToSpawn = [
            Unit, Firebat, Medic, Ghost, Adept,
            Goliath, SiegeTank, Vulture,
            Wraith, Dropship, ScienceVessel, Valkyrie, Battlecruiser
        ];

        let unitIndex = 0;
        devUnitsToSpawn.forEach((UnitClass) => {
            const row = Math.floor(unitIndex / devUnitSpawnLayout.unitsPerRow);
            const col = unitIndex % devUnitSpawnLayout.unitsPerRow;

            const pos = new THREE.Vector3(
                devUnitSpawnLayout.startPosition.x + col * devUnitSpawnLayout.spacing,
                devUnitSpawnLayout.startPosition.y,
                devUnitSpawnLayout.startPosition.z + row * devUnitSpawnLayout.spacing
            );

            const unit = new UnitClass(pos);
            scene.add(unit.mesh);
            units.push(unit);
            selectables.push(unit);

            // For units with separate ground indicators (flying, hovering)
            if ((unit.isFlying || unit.name === 'Vulture') && unit.selectionIndicator) {
                scene.add(unit.selectionIndicator);
            }

            unitIndex++;
        });

        gameState.minerals += 1000;
        gameState.vespene += 500;
        
        pathfinder.updateObstacles(collidableObjects);
    }
    
    pathfinder.updateObstacles(collidableObjects);

    const scvPositions = [
        new THREE.Vector3(7, 0, 14),
        new THREE.Vector3(7, 0, 16),
        new THREE.Vector3(5.5, 0, 14),
        new THREE.Vector3(5.5, 0, 16)
    ];

    scvPositions.forEach(pos => {
        const scv = new SCV(pos);
        scene.add(scv.mesh);
        units.push(scv);
        selectables.push(scv);
    });

    const scvM2 = new SCVMark2(new THREE.Vector3(5.5, 0, 18));
    scene.add(scvM2.mesh);
    units.push(scvM2);
    selectables.push(scvM2);

    gameState.supplyUsed = units.length;
}