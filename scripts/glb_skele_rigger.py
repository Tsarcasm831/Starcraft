#!/usr/bin/env python3
"""Add a simple skeleton to a GLB file if missing.

Usage:
    python glb_skele_rigger.py <input.glb> <output.glb>
"""
from pygltflib import GLTF2, Node, Skin
import sys

BONES = [
    "Hips", "Spine", "Spine01", "Spine02", "Chest", "Neck", "Head",
    "head_end", "headfront", "LeftShoulder", "LeftArm", "LeftForeArm",
    "LeftHand", "RightShoulder", "RightArm", "RightForeArm", "RightHand",
    "LeftUpLeg", "LeftLeg", "LeftFoot", "LeftToeBase", "RightUpLeg",
    "RightLeg", "RightFoot", "RightToeBase",
]


def get_or_create_node(gltf: GLTF2, name: str) -> int:
    """Return the index of a node with the given name, creating it if missing."""
    if gltf.nodes is None:
        gltf.nodes = []
    for i, n in enumerate(gltf.nodes):
        if getattr(n, "name", None) == name:
            return i
    gltf.nodes.append(Node(name=name))
    return len(gltf.nodes) - 1


def build_skin(gltf: GLTF2) -> int:
    joints = [get_or_create_node(gltf, b) for b in BONES]
    skin = Skin(joints=joints, skeleton=joints[0])
    if gltf.skins is None:
        gltf.skins = []
    gltf.skins.append(skin)
    return len(gltf.skins) - 1


def assign_skin_to_mesh(gltf: GLTF2, skin_index: int) -> None:
    """Assign the skin to the first mesh node found."""
    for node in gltf.nodes or []:
        if node.mesh is not None:
            node.skin = skin_index
            break


def main():
    if len(sys.argv) < 3:
        print("Usage: python glb_skele_rigger.py <input.glb> <output.glb>")
        return

    input_path = sys.argv[1]
    output_path = sys.argv[2]

    gltf = GLTF2().load(input_path)
    skin_index = build_skin(gltf)
    assign_skin_to_mesh(gltf, skin_index)
    gltf.save(output_path)


if __name__ == "__main__":
    main()
