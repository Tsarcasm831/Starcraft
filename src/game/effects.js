import * as THREE from 'three';

let scene;
export const activeEffects = [];
const gatheringBeams = new Map();

export function initEffects(_scene) {
    scene = _scene;
}

export function createMoveIndicator(position) {
    const geometry = new THREE.RingGeometry(0.5, 0.6, 32);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide, transparent: true });
    const indicator = new THREE.Mesh(geometry, material);

    indicator.position.copy(position);
    indicator.position.y += 0.02;
    indicator.rotation.x = -Math.PI / 2;

    scene.add(indicator);

    activeEffects.push({ mesh: indicator, life: 0.75, initialLife: 0.75 });
}

export function createScannerSweep(position) {
    const geometry = new THREE.RingGeometry(4, 4.5, 64);
    const material = new THREE.MeshBasicMaterial({ color: 0xffff00, side: THREE.DoubleSide, transparent: true });
    const sweep = new THREE.Mesh(geometry, material);

    sweep.position.copy(position);
    sweep.position.y += 0.05;
    sweep.rotation.x = -Math.PI / 2;

    scene.add(sweep);

    activeEffects.push({ mesh: sweep, life: 1.5, initialLife: 1.5 });
}

export function createDefensiveMatrix(position) {
    const geometry = new THREE.RingGeometry(2, 2.4, 32);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ffff, side: THREE.DoubleSide, transparent: true });
    const matrix = new THREE.Mesh(geometry, material);
    matrix.position.copy(position);
    matrix.position.y += 0.1;
    matrix.rotation.x = -Math.PI / 2;
    scene.add(matrix);
    activeEffects.push({ mesh: matrix, life: 3, initialLife: 3 });
}

export function createEMPShockwave(position) {
    const geometry = new THREE.RingGeometry(3.5, 4, 64);
    const material = new THREE.MeshBasicMaterial({ color: 0x41aeff, side: THREE.DoubleSide, transparent: true });
    const emp = new THREE.Mesh(geometry, material);
    emp.position.copy(position);
    emp.position.y += 0.05;
    emp.rotation.x = -Math.PI / 2;
    scene.add(emp);
    activeEffects.push({ mesh: emp, life: 1.5, initialLife: 1.5 });
}

export function createIrradiate(position) {
    const geometry = new THREE.RingGeometry(1.5, 1.9, 32);
    const material = new THREE.MeshBasicMaterial({ color: 0xffa500, side: THREE.DoubleSide, transparent: true });
    const irradiate = new THREE.Mesh(geometry, material);
    irradiate.position.copy(position);
    irradiate.position.y += 0.05;
    irradiate.rotation.x = -Math.PI / 2;
    scene.add(irradiate);
    activeEffects.push({ mesh: irradiate, life: 3, initialLife: 3 });
}

export function createYamatoBlast(start, target) {
    const material = new THREE.LineBasicMaterial({
        color: 0xff4500,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
    });
    const points = [start.clone(), target.clone()];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const beam = new THREE.Line(geometry, material);
    scene.add(beam);
    activeEffects.push({ mesh: beam, life: 0.5, initialLife: 0.5 });
}

export function updateGatheringEffects(units) {
    const activeUnits = new Set(units);

    units.forEach(unit => {
        if (unit.state === 'gathering' && unit.targetResource) {
            let beam = gatheringBeams.get(unit);
            if (!beam) {
                const isVespene = unit.targetResource.name.includes('Vespene');
                const material = new THREE.LineBasicMaterial({
                    color: isVespene ? 0x00ff00 : 0x41aeff,
                    transparent: true,
                    opacity: 0.7,
                    blending: THREE.AdditiveBlending
                });
                const points = [new THREE.Vector3(), new THREE.Vector3()];
                const geometry = new THREE.BufferGeometry().setFromPoints(points);
                beam = new THREE.Line(geometry, material);
                scene.add(beam);
                gatheringBeams.set(unit, beam);
            }

            const p1 = unit.mesh.position;
            const p2 = unit.targetResource.mesh.position;
            const positions = beam.geometry.attributes.position.array;
            positions[0] = p1.x;
            positions[1] = p1.y + 0.5;
            positions[2] = p1.z;
            positions[3] = p2.x;
            positions[4] = p2.y + 1;
            positions[5] = p2.z;
            beam.geometry.attributes.position.needsUpdate = true;
            beam.visible = true;
        } else if (unit.state === 'building' && unit.buildingTarget) {
            let beam = gatheringBeams.get(unit);
            if (!beam) {
                const material = new THREE.LineBasicMaterial({
                    color: 0xffa500,
                    transparent: true,
                    opacity: 0.8,
                    blending: THREE.AdditiveBlending
                });
                const points = [new THREE.Vector3(), new THREE.Vector3()];
                const geometry = new THREE.BufferGeometry().setFromPoints(points);
                beam = new THREE.Line(geometry, material);
                scene.add(beam);
                gatheringBeams.set(unit, beam);
            }
            const p1 = unit.mesh.position;
            const p2 = unit.buildingTarget.mesh.position;
            const positions = beam.geometry.attributes.position.array;
            positions[0] = p1.x;
            positions[1] = p1.y + 0.5;
            positions[2] = p1.z;
            positions[3] = p2.x;
            positions[4] = p2.y + unit.buildingTarget.currentHealth / unit.buildingTarget.maxHealth * 2;
            positions[5] = p2.z;
            beam.geometry.attributes.position.needsUpdate = true;
            beam.visible = true;
        } else {
            if (gatheringBeams.has(unit)) {
                gatheringBeams.get(unit).visible = false;
            }
        }
    });

    for (const unit of gatheringBeams.keys()) {
        if (!activeUnits.has(unit)) {
            const beam = gatheringBeams.get(unit);
            scene.remove(beam);
            beam.geometry.dispose();
            beam.material.dispose();
            gatheringBeams.delete(unit);
        }
    }
}

export function updateActiveEffects(delta) {
    for (let i = activeEffects.length - 1; i >= 0; i--) {
        const effect = activeEffects[i];
        effect.life -= delta;
        if (effect.life <= 0) {
            scene.remove(effect.mesh);
            effect.mesh.geometry.dispose();
            effect.mesh.material.dispose();
            activeEffects.splice(i, 1);
        } else {
            const initial = effect.initialLife || 0.75;
            effect.mesh.material.opacity = effect.life / initial;
            const scale = 1.0 + (1.0 - (effect.life / initial)) * 1.5;
            effect.mesh.scale.set(scale, scale, scale);
        }
    }
}
