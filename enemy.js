const util = require('./util');

class Enemy {
	constructor(x, y, health, speed, asset, radius, score) {
		this.x = x;
		this.y = y;
		this.health = health;
		this.maxHealth = health;
		this.rotation = 0;
		this.speed = speed;
		this.asset = asset;
		this.radius = radius;
		this.stun = 0;
		this.score = score;
	}

	update(game, delta) {
		let minDist = Infinity, minId;
		for (let player in game.players) {
			const p = game.players[player];
			const dist = util.dist(this.x, this.y, p.x, p.y);
			if (dist < minDist) {
				minDist = dist;
				minId = player;
			}
		}

		if (minDist < 2000) {
			this.rotation = Math.atan2(game.players[minId].y - this.y, game.players[minId].x - this.x);
			const tileSpeedMultiplier = game.world.getTileAtPos(this.x, this.y) === 0 ? 0.5 : 1;

			const newX = this.x + Math.cos(this.rotation) * this.speed * delta * tileSpeedMultiplier;
			const newY = this.y + Math.sin(this.rotation) * this.speed * delta * tileSpeedMultiplier;
			let canMove = true;

			for (let enemy of game.enemies) {
				if (enemy !== this) {
					const dist = util.dist(newX, newY, enemy.x, enemy.y);
					if (dist < 90) {
						canMove = false;
					}
				}
			}

			if (canMove && this.stun <= 0) {
				this.x += Math.cos(this.rotation) * this.speed * delta * tileSpeedMultiplier;
				this.y += Math.sin(this.rotation) * this.speed * delta * tileSpeedMultiplier;
			}
		}

		this.stun -= delta;

		return false;
	}

	damage(effects, player, game) {
		this.health -= effects.damage;
		if (effects.stun) {
			this.stun = effects.stun;
			game.actionText.push({
				color: "aqua",
				text: "STUN",
				x: this.x,
				y: this.y - 20,
				lifetime: 30
			});
		}
		if (this.health <= 0) {
			game.removeEnemy(this);
			game.addScore(game.players[player], this.score);
			game.actionText.push({
				color: "black",
				text: "+" + this.score + " score",
				x: this.x,
				y: this.y - 20,
				lifetime: 90
			});
		}
	}
}

class Boss extends Enemy {
	constructor(x, y) {
		super(x, y, 15000, 3, "boss", 150, 1000);
		this.rotation = 0;
	}
}

class Minion extends Enemy {
	constructor(x, y) {
		super(x, y, 500, 4.5, "derpyminion", 47, 1);
	}
}

module.exports = { Enemy, Boss, Minion };