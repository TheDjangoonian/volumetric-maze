class VolumetricMaze {
    constructor(width, height, depth) {
        this.width = width;
        this.height = height;
        this.depth = depth;
        this.maze = this.createEmptyMaze();
        this.generateMaze(0, 0, 0);
    }

    createEmptyMaze() {
        const maze = [];
        for (let x = 0; x < this.width; x++) {
            maze[x] = [];
            for (let y = 0; y < this.height; y++) {
                maze[x][y] = [];
                for (let z = 0; z < this.depth; z++) {
                    maze[x][y][z] = {
                        visited: false,
                        walls: { up: true, down: true, left: true, right: true, front: true, back: true }
                    };
                }
            }
        }
        return maze;
    }

    generateMaze(x, y, z) {
        const stack = [[x, y, z]];
        this.maze[x][y][z].visited = true;

        while (stack.length > 0) {
            const [cx, cy, cz] = stack[stack.length - 1];
            const neighbors = this.getUnvisitedNeighbors(cx, cy, cz);

            if (neighbors.length === 0) {
                stack.pop();
            } else {
                const [nx, ny, nz, direction] = neighbors[Math.floor(Math.random() * neighbors.length)];

                this.removeWall(cx, cy, cz, direction);
                this.removeWall(nx, ny, nz, this.oppositeDirection(direction));

                this.maze[nx][ny][nz].visited = true;
                stack.push([nx, ny, nz]);
            }
        }
    }

    getUnvisitedNeighbors(x, y, z) {
        const neighbors = [];
        const directions = [
            [x, y - 1, z, "up"], [x, y + 1, z, "down"],
            [x - 1, y, z, "left"], [x + 1, y, z, "right"],
            [x, y, z - 1, "back"], [x, y, z + 1, "front"]
        ];

        for (const [nx, ny, nz, dir] of directions) {
            if (this.isValid(nx, ny, nz) && !this.maze[nx][ny][nz].visited) {
                neighbors.push([nx, ny, nz, dir]);
            }
        }

        return neighbors;
    }

    removeWall(x, y, z, direction) {
        if (this.isValid(x, y, z)) {
            this.maze[x][y][z].walls[direction] = false;
        }
    }

    oppositeDirection(direction) {
        return {
            up: "down", down: "up",
            left: "right", right: "left",
            front: "back", back: "front"
        }[direction];
    }

    isValid(x, y, z) {
        return x >= 0 && x < this.width && y >= 0 && y < this.height && z >= 0 && z < this.depth;
    }

    printMaze() {
        console.log(JSON.stringify(this.maze, null, 2));
    }
}

// Example usage:
const maze = new VolumetricMaze(5, 5, 5);
maze.printMaze();
