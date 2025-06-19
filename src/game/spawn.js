import * as THREE from 'three';
import { SCV } from '../units/scv.js';
import { SCVMark2 } from '../units/scv-mark-2.js';
import { Unit } from '../units/unit.js';
import { Firebat } from '../units/firebat.js';
import { Medic } from '../units/medic.js';
import { Ghost } from '../units/ghost.js';
import { CommandCenter } from '../buildings/command-center.js';
import { SupplyDepot } from '../buildings/supply-depot.js';
import { Refinery } from '../buildings/refinery.js';
import { Barracks } from '../buildings/barracks.js';
import { EngineeringBay } from '../buildings/engineering-bay.js';
import { Bunker } from '../buildings/bunker.js';
import { Academy } from '../buildings/academy.js';
import { MissileTurret } from '../buildings/missile-turret.js';
import { ComsatStation } from '../buildings/comsat-station.js';
import { NuclearSilo } from '../buildings/nuclear-silo.js';
import { Factory } from '../buildings/factory.js';
import { Starport } from '../buildings/starport.js';
import { Vulture } from '../units/vulture.js';
import { getTerrainHeight } from '../utils/terrain.js';

let deps;

export function initSpawner(_deps) {
    deps = _deps;
}

export function spawnBuilding(type, position, buildTime, extraData = {}) {
    const { scene, buildings, selectables, collidableObjects, pathfinder } = deps;
    let building;
    const options = (typeof buildTime === 'object') ? buildTime : { isUnderConstruction: true, buildTime: buildTime };
    const pathfinderUpdateCallback = () => pathfinder.updateObstacles(collidableObjects);

    if (type === 'build_command_center') {
        building = new CommandCenter(position, options);
    } else if (type === 'build_supply_depot') {
        building = new SupplyDepot(position, pathfinderUpdateCallback, options);
    } else if (type === 'build_refinery') {
        building = new Refinery(position, extraData.geyser, options);
    } else if (type === 'build_barracks') {
        building = new Barracks(position, options);
    } else if (type === 'build_engineering_bay') {
        building = new EngineeringBay(position, options);
    } else if (type === 'build_bunker') {
        building = new Bunker(position, options);
    } else if (type === 'build_academy') {
        building = new Academy(position, options);
    } else if (type === 'build_missile_turret') {
        building = new MissileTurret(position, options);
    } else if (type === 'build_factory') {
        building = new Factory(position, options);
    } else if (type === 'build_starport') {
        building = new Starport(position, options);
    } else if (type === 'Comsat Station') {
        building = new ComsatStation(position, { ...options, parent: extraData.parent });
    } else if (type === 'Nuclear Silo') {
        building = new NuclearSilo(position, { ...options, parent: extraData.parent });
    }

    if (building) {
        scene.add(building.mesh);
        buildings.push(building);
        selectables.push(building);
        collidableObjects.push(building);
        pathfinder.updateObstacles(collidableObjects);
    }
    return building;
}

export function spawnUnit(unitType, position, extraData = {}) {
    const { scene, units, selectables, gameState, audioManager } = deps;
    const terrainY = getTerrainHeight(scene, position.x, position.z);
    const spawnPos = new THREE.Vector3(position.x, terrainY, position.z);
    let unit;
    let cost = extraData.cost || {}; // Get cost from training command

    switch (unitType) {
        case 'SCV':
            unit = new SCV(spawnPos);
            gameState.supplyUsed += cost.supply || 1;
            if (audioManager && audioManager.scvConstructedSoundNames.length) {
                audioManager.playRandomSound(audioManager.scvConstructedSoundNames);
            }
            break;
        case 'Marine':
            unit = new Unit(spawnPos);
            gameState.supplyUsed += cost.supply || 1;
            break;
        case 'Firebat':
            unit = new Firebat(spawnPos);
            gameState.supplyUsed += cost.supply || 1;
            break;
        case 'Medic':
            unit = new Medic(spawnPos);
            gameState.supplyUsed += cost.supply || 1;
            break;
        case 'Ghost':
            unit = new Ghost(spawnPos);
            gameState.supplyUsed += cost.supply || 1;
            break;
        case 'Vulture':
            unit = new Vulture(spawnPos);
            gameState.supplyUsed += cost.supply || 2;
            break;
        case 'SCV Mark 2':
            unit = new SCVMark2(spawnPos);
            gameState.supplyUsed += cost.supply || 1;
            break;
    }

    if (unit) {
        scene.add(unit.mesh);
        units.push(unit);
        selectables.push(unit);
    }
    return unit;
}