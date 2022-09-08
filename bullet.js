const util = require('./util');

class Bullet {
	constructor(x, y, dir, owner, lifetime, speed, asset, effects, pierce) {
		this.x = x;
		this.y = y;
		this.dir = dir;
		this.owner = owner;
		this.speed = speed;
		this.lifetime = lifetime;
		this.asset = asset;
		this.effects = effects;
		this.pierce = pierce;
		this.enemiesHit = [];
	}

	update(game, delta) {
		this.x += Math.cos(this.dir) * this.speed * delta;
		this.y += Math.sin(this.dir) * this.speed * delta;
		this.lifetime -= delta;
		if (this.x < 0 || this.x > game.world.width * 50 || this.y < 0 || this.y > game.world.height * 50 || this.lifetime <= 0) {
			return true;
		}

		for (let player in game.players) {
			if (util.dist(this.x, this.y, game.players[player].x, game.players[player].y) < 30 && player !== this.owner && !this.enemiesHit.includes(player)) {
				game.players[player].damage(this.effects, this.owner, game);
				this.enemiesHit.push(player);
				return !this.pierce;
			}
		}

		for (let enemy of game.enemies) {
			if (util.dist(this.x, this.y, enemy.x, enemy.y) < enemy.radius && !this.enemiesHit.includes(enemy)) {
				enemy.damage(this.effects, this.owner, game);
				this.enemiesHit.push(enemy);
				return !this.pierce;
			}
		}

		return false;
	}
}

module.exports = Bullet;