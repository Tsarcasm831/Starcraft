import * as THREE from 'three';

class GridNode {
    constructor(x, y, walkable) {
        this.x = x; // grid x
        this.y = y; // grid y (maps to world z)
        this.walkable = walkable;

        // A* properties
        this.gCost = 0;
        this.hCost = 0;
        this.fCost = 0;
        this.parent = null;
    }

    reset() {
        this.gCost = 0;
        this.hCost = 0;
        this.fCost = 0;
        this.parent = null;
    }
}

export class Pathfinder {
    constructor(worldWidth, worldHeight, resolution = 1) {
        this.resolution = resolution;
        this.gridWidth = Math.floor(worldWidth / resolution);
        this.gridHeight = Math.floor(worldHeight / resolution);
        this.worldWidth = worldWidth;
        this.worldHeight = worldHeight;
        this.grid = [];

        // Create the grid
        for (let x = 0; x < this.gridWidth; x++) {
            this.grid[x] = [];
            for (let y = 0; y < this.gridHeight; y++) {
                this.grid[x][y] = new GridNode(x, y, true);
            }
        }
    }

    worldToGrid(worldPos) {
        const gridX = Math.floor((worldPos.x + this.worldWidth / 2) / this.resolution);
        const gridY = Math.floor((worldPos.z + this.worldHeight / 2) / this.resolution);
        return { x: gridX, y: gridY };
    }

    gridToWorld(gridX, gridY) {
        const worldX = (gridX * this.resolution) - this.worldWidth / 2 + this.resolution / 2;
        const worldZ = (gridY * this.resolution) - this.worldHeight / 2 + this.resolution / 2;
        return new THREE.Vector3(worldX, 0, worldZ);
    }

    getNode(x, y) {
        if (x >= 0 && x < this.gridWidth && y >= 0 && y < this.gridHeight) {
            return this.grid[x][y];
        }
        return null;
    }
    
    getNodeFromWorld(worldPos) {
        const gridCoords = this.worldToGrid(worldPos);
        return this.getNode(gridCoords.x, gridCoords.y);
    }

    updateObstacles(collidables) {
        // Reset grid
        for (let x = 0; x < this.gridWidth; x++) {
            for (let y = 0; y < this.gridHeight; y++) {
                this.grid[x][y].walkable = true;
            }
        }

        collidables.forEach(obstacle => {
            const box = obstacle.getCollider();
            const minGrid = this.worldToGrid(box.min);
            const maxGrid = this.worldToGrid(box.max);

            for (let x = minGrid.x; x <= maxGrid.x; x++) {
                for (let y = minGrid.y; y <= maxGrid.y; y++) {
                    const node = this.getNode(x, y);
                    if (node) {
                        node.walkable = false;
                    }
                }
            }
        });
    }

    findPath(startWorldPos, endWorldPos) {
        const startNode = this.getNodeFromWorld(startWorldPos);
        let endNode = this.getNodeFromWorld(endWorldPos);
        
        if (!startNode || !endNode) {
            return null; // Invalid start or end position
        }

        // If end node is not walkable, find the nearest walkable node
        if (!endNode.walkable) {
            let nearestNode = null;
            let minDistance = Infinity;
            for (let x = 0; x < this.gridWidth; x++) {
                for (let y = 0; y < this.gridHeight; y++) {
                    const node = this.grid[x][y];
                    if (node.walkable) {
                        const dist = endWorldPos.distanceToSquared(this.gridToWorld(node.x, node.y));
                        if (dist < minDistance) {
                            minDistance = dist;
                            nearestNode = node;
                        }
                    }
                }
            }
            endNode = nearestNode;
            if (!endNode) return null; // No walkable nodes on map
        }
        
        if (startNode === endNode) return [];

        for (let x = 0; x < this.gridWidth; x++) {
            for (let y = 0; y < this.gridHeight; y++) {
                this.grid[x][y].reset();
            }
        }

        const openSet = [startNode];
        const closedSet = new Set();

        startNode.gCost = 0;
        startNode.hCost = this.getDistance(startNode, endNode);
        startNode.fCost = startNode.gCost + startNode.hCost;

        while (openSet.length > 0) {
            let currentNode = openSet[0];
            let currentIndex = 0;
            for (let i = 1; i < openSet.length; i++) {
                if (openSet[i].fCost < currentNode.fCost || (openSet[i].fCost === currentNode.fCost && openSet[i].hCost < currentNode.hCost)) {
                    currentNode = openSet[i];
                    currentIndex = i;
                }
            }
            
            openSet.splice(currentIndex, 1);
            closedSet.add(currentNode);

            if (currentNode === endNode) {
                return this.retracePath(startNode, endNode);
            }

            this.getNeighbors(currentNode).forEach(neighbor => {
                if (!neighbor.walkable || closedSet.has(neighbor)) {
                    return;
                }

                const newMovementCostToNeighbor = currentNode.gCost + this.getDistance(currentNode, neighbor);
                if (newMovementCostToNeighbor < neighbor.gCost || !openSet.includes(neighbor)) {
                    neighbor.gCost = newMovementCostToNeighbor;
                    neighbor.hCost = this.getDistance(neighbor, endNode);
                    neighbor.fCost = neighbor.gCost + neighbor.hCost;
                    neighbor.parent = currentNode;

                    if (!openSet.includes(neighbor)) {
                        openSet.push(neighbor);
                    }
                }
            });
        }
        
        return null; // No path found
    }
    
    getDistance(nodeA, nodeB) {
        const dstX = Math.abs(nodeA.x - nodeB.x);
        const dstY = Math.abs(nodeA.y - nodeB.y);
        if (dstX > dstY) return 14 * dstY + 10 * (dstX - dstY);
        return 14 * dstX + 10 * (dstY - dstX);
    }

    getNeighbors(node) {
        const neighbors = [];
        for (let x = -1; x <= 1; x++) {
            for (let y = -1; y <= 1; y++) {
                if (x === 0 && y === 0) continue;
                const checkX = node.x + x;
                const checkY = node.y + y;
                const neighborNode = this.getNode(checkX, checkY);
                if (neighborNode) {
                    neighbors.push(neighborNode);
                }
            }
        }
        return neighbors;
    }
    
    retracePath(startNode, endNode) {
        const path = [];
        let currentNode = endNode;
        while (currentNode !== startNode) {
            path.push(this.gridToWorld(currentNode.x, currentNode.y));
            currentNode = currentNode.parent;
        }
        path.reverse();
        return path;
    }
}