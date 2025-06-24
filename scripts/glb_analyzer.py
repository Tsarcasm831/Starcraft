#!/usr/bin/env python3
"""Analyze a GLB file and print component counts.

Usage:
    python glb_analyzer.py <path_to_glb>
"""
from pygltflib import GLTF2
import sys


def main():
    if len(sys.argv) < 2:
        print("Usage: python glb_analyzer.py <path_to_glb>")
        return

    path = sys.argv[1]
    gltf = GLTF2().load(path)
    print("Scenes:", len(gltf.scenes or []))
    print("Nodes:", len(gltf.nodes or []))
    print("Meshes:", len(gltf.meshes or []))
    print("Skins:", len(gltf.skins or []))
    print("Animations:", len(gltf.animations or []))


if __name__ == "__main__":
    main()
