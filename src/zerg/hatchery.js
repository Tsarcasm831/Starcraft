import * as THREE from 'three';
import { assetManager } from '../utils/asset-manager.js';
import { spreadCreep } from '../utils/terrain.js';

/** Simple Hatchery building that spreads creep and trains Zerg units */
export class Hatchery {
    constructor(position, { isUnderConstruction = false, buildTime = 60, onStateChange = () => {} } = {}) {
        this.name = 'Hatchery';
        this.portraitUrl = 'assets/images/zerg/hatchery_portrait.png';
        this.maxHealth = 1250;
        this.currentHealth = isUnderConstruction ? 1 : this.maxHealth;
        this.selected = false;
        this.isUnderConstruction = isUnderConstruction;
        this.buildTime = buildTime;
        this.onStateChange = onStateChange;

        this._commands = [];
        this.buildQueue = [];
        this.rallyPoint = new THREE.Vector3(position.x + 4, 0, position.z);

        this.mesh = this.createMesh();
        this.mesh.position.copy(position);
        this.mesh.traverse(child => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                child.userData.owner = this;
            }
        });

        const selGeom = new THREE.RingGeometry(5, 5.5, 64);
        const selMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide });
        this.selectionIndicator = new THREE.Mesh(selGeom, selMat);
        this.selectionIndicator.rotation.x = -Math.PI / 2;
        this.selectionIndicator.position.y = 0.01;
        this.selectionIndicator.visible = false;
        this.mesh.add(this.selectionIndicator);

        spreadCreep(position, 8);
    }

    createMesh() {
        try {
            const asset = assetManager.get('zerg_hatchery');
            const model = asset.scene.clone();
            model.scale.set(0.5, 0.5, 0.5);
            return model;
        } catch (e) {
            const geo = new THREE.CylinderGeometry(4, 6, 3, 12);
            const mat = new THREE.MeshStandardMaterial({ color: 0x552266 });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.y = 1.5;
            return mesh;
        }
    }

    get commands() { return this._commands; }

    updateCommands(gameState) {
        const cmds = new Array(12).fill(null);
        cmds[0] = { command: 'train_zergling', hotkey: 'Z', icon: 'assets/images/zerg/train_zergling_icon.png', name: 'Train Zergling', cost: { minerals: 50 }, buildTime: 17 };
        cmds[1] = { command: 'train_hydralisk', hotkey: 'H', icon: 'assets/images/zerg/train_hydralisk_icon.png', name: 'Train Hydralisk', cost: { minerals: 100, vespene: 50 }, buildTime: 25 };
        if (!gameState.upgrades.metabolicBoost) {
            cmds[8] = { command: 'evolve_metabolic_boost', hotkey: 'M', icon: 'assets/images/zerg/metabolic_boost_icon.png', name: 'Evolve Metabolic Boost', cost: { minerals: 100, vespene: 100 }, researchTime: 60 };
        }
        if (!gameState.upgrades.muscularAugments) {
            cmds[9] = { command: 'evolve_muscular_augments', hotkey: 'U', icon: 'assets/images/zerg/muscular_augments_icon.png', name: 'Evolve Muscular Augments', cost: { minerals: 150, vespene: 150 }, researchTime: 90 };
        }
        this._commands = cmds;
    }

    onConstructionComplete(gameState) {
        this.isUnderConstruction = false;
        this.currentHealth = this.maxHealth;
        this.mesh.traverse(child => {
            if (child.material && child.material.transparent) {
                child.material.opacity = 1.0;
                child.material.transparent = false;
            }
        });
        this.updateCommands(gameState);
    }

    select() { this.selected = true; this.selectionIndicator.visible = true; }
    deselect() { this.selected = false; this.selectionIndicator.visible = false; }

    executeCommand(commandName, gameState, statusCallback) {
        const command = this._commands.find(c => c && c.command === commandName);
        if (!command) return;
        if (commandName.startsWith('train_')) {
            if (gameState.minerals < command.cost.minerals || (command.cost.vespene && gameState.vespene < command.cost.vespene)) {
                statusCallback('Not enough resources.');
                return;
            }
            gameState.minerals -= command.cost.minerals;
            if (command.cost.vespene) gameState.vespene -= command.cost.vespene;
            const unitType = commandName === 'train_zergling' ? 'Zergling' : 'Hydralisk';
            this.buildQueue.push({ type: unitType, progress: 0, buildTime: command.buildTime });
            statusCallback(`${unitType} spawning...`);
        } else if (commandName === 'evolve_metabolic_boost') {
            if (gameState.minerals < command.cost.minerals || gameState.vespene < command.cost.vespene) { statusCallback('Not enough resources.'); return; }
            gameState.minerals -= command.cost.minerals;
            gameState.vespene -= command.cost.vespene;
            this.buildQueue.push({ type: 'metabolicBoost', progress: 0, buildTime: command.researchTime });
            statusCallback('Researching Metabolic Boost...');
        } else if (commandName === 'evolve_muscular_augments') {
            if (gameState.minerals < command.cost.minerals || gameState.vespene < command.cost.vespene) { statusCallback('Not enough resources.'); return; }
            gameState.minerals -= command.cost.minerals;
            gameState.vespene -= command.cost.vespene;
            this.buildQueue.push({ type: 'muscularAugments', progress: 0, buildTime: command.researchTime });
            statusCallback('Researching Muscular Augments...');
        }
    }

    update(delta, gameState, spawnUnitCallback) {
        if (this.buildQueue.length === 0) return;
        const item = this.buildQueue[0];
        item.progress += delta;
        if (item.progress >= item.buildTime) {
            this.buildQueue.shift();
            if (item.type === 'metabolicBoost') {
                gameState.upgrades.metabolicBoost = true;
            } else if (item.type === 'muscularAugments') {
                gameState.upgrades.muscularAugments = true;
            } else {
                spawnUnitCallback(item.type, this.rallyPoint.clone());
            }
            this.updateCommands(gameState);
        }
    }
}
