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
import { SiegeTank } from '../units/siege-tank.js';
import { Goliath } from '../units/goliath.js';
import { Wraith } from '../units/wraith.js';
import { Dropship } from '../units/dropship.js';
import { ScienceVessel } from '../units/science-vessel.js';
import { Armory } from '../buildings/armory.js';
import { ScienceFacility } from '../buildings/science-facility.js';
import { ControlTower } from '../buildings/control-tower.js';
import { getTerrainHeight } from '../utils/terrain.js';
import { Valkyrie } from '../units/valkyrie.js';
import { Battlecruiser } from '../units/battlecruiser.js';
import { PhysicsLab } from '../buildings/physics-lab.js';
import { Zealot } from '../protoss/zealot.js';
import { Probe } from '../protoss/probe.js';
import { Adept } from '../protoss/adept.js';
import { Stalker } from '../protoss/stalker.js';
import { Dragoon } from '../protoss/dragoon.js';
import { DarkTemplar } from '../protoss/darktemplar.js';
import { HighTemplar } from '../protoss/hightemplar.js';

let deps;

function findNearestWalkablePos(pos, pathfinder) {
    const node = pathfinder.getNodeFromWorld(pos);
    if (node && node.walkable) {
        return pathfinder.gridToWorld(node.x, node.y);
    }
    let nearest = null;
    let minDist = Infinity;
    for (let x = 0; x < pathfinder.gridWidth; x++) {
        for (let y = 0; y < pathfinder.gridHeight; y++) {
            const n = pathfinder.grid[x][y];
            if (!n.walkable) continue;
            const world = pathfinder.gridToWorld(n.x, n.y);
            const dist = world.distanceToSquared(pos);
            if (dist < minDist) {
                minDist = dist;
                nearest = world;
            }
        }
    }
    return nearest || pos;
}

export function setPathfinder(newPathfinder) {
    if (deps) {
        deps.pathfinder = newPathfinder;
    }
}

export function initSpawner(_deps) {
    deps = _deps;
}

export function spawnBuilding(type, position, buildTime, extraData = {}) {
    const { scene, buildings, selectables, collidableObjects, pathfinder } = deps;
    let building;
    const options = (typeof buildTime === 'object') ? buildTime : { isUnderConstruction: true, buildTime: buildTime };
    const pathfinderUpdateCallback = () => pathfinder.updateObstacles(collidableObjects);

    // Add onStateChange callback to all building options
    options.onStateChange = pathfinderUpdateCallback;

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
    } else if (type === 'build_armory') {
        building = new Armory(position, options);
    } else if (type === 'build_science_facility') {
        building = new ScienceFacility(position, options);
    } else if (type === 'Comsat Station') {
        building = new ComsatStation(position, { ...options, parent: extraData.parent });
    } else if (type === 'Nuclear Silo') {
        building = new NuclearSilo(position, { ...options, parent: extraData.parent });
    } else if (type === 'Control Tower') {
        building = new ControlTower(position, { ...options, parent: extraData.parent });
    } else if (type === 'Physics Lab') {
        building = new PhysicsLab(position, { ...options, parent: extraData.parent });
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

export function spawnUnit(unitType, position) {
    const { scene, units, selectables, gameState, audioManager, pathfinder } = deps;
    let spawnPos = new THREE.Vector3(position.x, position.y || 0, position.z);
    if (pathfinder) {
        spawnPos = findNearestWalkablePos(spawnPos, pathfinder).clone();
    }
    const terrainY = getTerrainHeight(scene, spawnPos.x, spawnPos.z);
    spawnPos.y = terrainY;
    let unit;
    switch (unitType) {
        case 'SCV':
            unit = new SCV(spawnPos);
            gameState.supplyUsed += 1;
            if (audioManager && audioManager.scvConstructedSoundNames.length) {
                audioManager.playRandomSound(audioManager.scvConstructedSoundNames);
            }
            break;
        case 'Marine':
            unit = new Unit(spawnPos);
            gameState.supplyUsed += 1;
            break;
        case 'Firebat':
            unit = new Firebat(spawnPos);
            gameState.supplyUsed += 1;
            break;
        case 'Medic':
            unit = new Medic(spawnPos);
            gameState.supplyUsed += 1;
            break;
        case 'Ghost':
            unit = new Ghost(spawnPos);
            gameState.supplyUsed += 1;
            break;
        case 'Zealot':
            unit = new Zealot(spawnPos);
            gameState.supplyUsed += 2;
            break;
        case 'Probe':
            unit = new Probe(spawnPos);
            gameState.supplyUsed += 1;
            break;
        case 'Adept':
            unit = new Adept(spawnPos);
            gameState.supplyUsed += 2;
            break;
        case 'Dark Templar':
            unit = new DarkTemplar(spawnPos);
            gameState.supplyUsed += 2;
            break;
        case 'High Templar':
            unit = new HighTemplar(spawnPos);
            gameState.supplyUsed += 2;
            break;
        case 'Stalker':
            unit = new Stalker(spawnPos);
            gameState.supplyUsed += 2;
            break;
        case 'Dragoon':
            unit = new Dragoon(spawnPos);
            gameState.supplyUsed += 2;
            break;
        case 'Wraith':
            unit = new Wraith(spawnPos);
            gameState.supplyUsed += 2;
            break;
        case 'Dropship':
            unit = new Dropship(spawnPos);
            gameState.supplyUsed += 2;
            break;
        case 'Science Vessel':
            unit = new ScienceVessel(spawnPos);
            gameState.supplyUsed += 2;
            break;
        case 'Valkyrie':
            unit = new Valkyrie(spawnPos);
            gameState.supplyUsed += 3;
            break;
        case 'Battlecruiser':
            unit = new Battlecruiser(spawnPos);
            gameState.supplyUsed += 6;
            break;
        case 'Vulture':
            unit = new Vulture(spawnPos);
            gameState.supplyUsed += 2;
            break;
        case 'Siege Tank':
            unit = new SiegeTank(spawnPos);
            gameState.supplyUsed += 2;
            break;
        case 'Goliath':
            unit = new Goliath(spawnPos);
            gameState.supplyUsed += 2;
            break;
        case 'SCV Mark 2':
            unit = new SCVMark2(spawnPos);
            gameState.supplyUsed += 1;
            if (audioManager && audioManager.scvMark2ConstructedSoundNames.length) {
                audioManager.playRandomSound(audioManager.scvMark2ConstructedSoundNames);
            }
            break;
    }

    if (unit) {
        scene.add(unit.mesh);
        units.push(unit);
        selectables.push(unit);
    }
    return unit;
}