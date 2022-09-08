const noise = require('noisejs');

const tiles = [
	[
		[1, 1, 1],
		[1, 1, 1],
		[1, 1, 1]
	],
	[
		[-1, -1, -1],
		[-1, 0, -1],
		[-1, -1, -1]
	],
	[
		[1, 1, 1],
		[1, 1, 1],
		[1, 1, 0]
	],
	[
		[0, 1, 1],
		[1, 1, 1],
		[1, 1, 1]
	],
	[
		[1, 1, 0],
		[1, 1, 1],
		[1, 1, 1]
	],
	[
		[1, 1, 1],
		[1, 1, 1],
		[0, 1, 1]
	],
	[
		[-1, -1, -1],
		[1, 1, 1],
		[1, 1, 1]
	],
	[
		[-1, 1, 1],
		[-1, 1, 1],
		[-1, 1, 1]
	],
	[
		[1, 1, -1],
		[1, 1, -1],
		[1, 1, -1]
	],
	[
		[1, 1, 1],
		[1, 1, 1],
		[-1, -1, -1]
	],
	[
		[-1, 1, 1],
		[0, 1, 1],
		[0, 0, -1]
	],
	[
		[1, 1, -1],
		[1, 1, 0],
		[-1, 0, 0]
	],
	[
		[0, 0, -1],
		[0, 1, 1],
		[-1, 1, 1]
	],
	[
		[-1, 0, 0],
		[1, 1, 0],
		[1, 1, -1]
	],
	[
		[2, 2, 2],
		[2, 2, 2],
		[2, 2, 2]
	],
	[
		[0, 0, 0],
		[0, 1, 0],
		[-1, 1, -1]
	],
	[
		[-1, 0, 0],
		[1, 1, 0],
		[-1, 0, 0]
	],
	[
		[0, 0, 0],
		[0, 1, 0],
		[-1, 1, -1]
	],
	[
		[0, 0, -1],
		[0, 1, 1],
		[0, 0, -1]
	]
];

class World {
	constructor(width, height) {
		this.width = width;
		this.height = height;

		this.chunkSize = 32;
		
		this.noise = new noise.Noise(Math.random());
		this.noise1 = new noise.Noise(Math.random());
		this.noise2 = new noise.Noise(Math.random());
		this.chunks = [];
		this.toSend = [];

		console.log('Generating world...');
		this.generateWorld();
		console.log('World generated!');
	}

	generateWorld() {
		for (let x = 0; x < this.width / this.chunkSize; x++) {
			this.chunks.push([]);
			for (let y = 0; y < this.height / this.chunkSize; y++) {
				const chunk = new Chunk(x, y, this.chunkSize, this);
				this.chunks[this.chunks.length - 1].push(chunk);
				chunk.generateChunk();
			}
		}

		for (let x = 0; x < this.width; x++) {
			this.toSend.push([]);
			for (let y = 0; y < this.height; y++) {
				this.toSend[this.toSend.length - 1].push(this.getTile(x, y));
			}
		}
	}

	getTile(x, y) {
		const middle = this.getValue(x, y, 0);
		const grid = [
			[this.getTileValue(x - 1, y - 1, middle), this.getTileValue(x, y - 1, middle), this.getTileValue(x + 1, y - 1, middle)],
			[this.getTileValue(x - 1, y, middle), middle, this.getTileValue(x + 1, y, middle)],
			[this.getTileValue(x - 1, y + 1, middle), this.getTileValue(x, y + 1, middle), this.getTileValue(x + 1, y + 1, middle)]
		];

		for (let a = 0; a < tiles.length; a++) {
			if (this.tilesMatch(tiles[a], grid)) {
				if (a === 0 && Math.random() < 0.05) {
					return 14;
				}
				if (a >= 15 && a <= 18) {
					return 1;
				}
				return a;
			}
		}

		return 1;
	}

	tilesMatch(first, second) {
		for (let i = 0; i < 3; i++) {
			for (let j = 0; j < 3; j++) {
				if (first[i][j] !== second[i][j] && first[i][j] !== -1) {
					return false;
				}
			}
		}

		return true;
	}

	getTileValue(x, y, alt) {
		if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
			return alt;
		}
		const chunk = this.chunks[Math.floor(x / this.chunkSize)][Math.floor(y / this.chunkSize)];
		return chunk.grid[x % this.chunkSize * this.chunkSize + y % this.chunkSize];
	}

	getValue(x, y) {
		const val1 = this.noise.perlin2(x / 100, y / 100);
		const val2 = this.noise1.perlin2((x - 100.5) / 150, (y - 100.5) / 150);
		const val3 = this.noise2.perlin2((x - 200.5) / 25, (y - 200.5) / 25);

		if (val3 < -0.1) {
			return 0;
		} else if (val3 > 0.1) {
			return 1;
		}

		return Math.floor(Math.abs((val1 + val2) / 2 * 100)) < 8 ? 0 : 1;
	}

	getTileAtPos(x, y) {
		if (x < 0 || x >= this.width * 48 || y < 0 || y >= this.height * 48) {
			return -1;
		}
		const tileX = Math.floor(x / 48);
		const tileY = Math.floor(y / 48);
		const chunk = this.chunks[Math.floor(tileX / this.chunkSize)][Math.floor(tileY / this.chunkSize)];
		return chunk.grid[tileX % this.chunkSize * this.chunkSize + tileY % this.chunkSize];
	}

	randomX() {
		return Math.floor(Math.random() * this.width * 48);
	}

	randomY() {
		return Math.floor(Math.random() * this.height * 48);
	}
}

class Chunk {
	constructor(x, y, size, world) {
		this.x = x;
		this.y = y;
		this.size = size;
		this.grid = [];
		this.world = world;
	}

	generateChunk() {
		for (let x = 0; x < this.size; x++) {
			for (let y = 0; y < this.size; y++) {
				const tileX = this.x * this.size + x;
				const tileY = this.y * this.size + y;
				this.grid.push(this.world.getValue(tileX, tileY));
			}
		}
	}
}

module.exports = World;