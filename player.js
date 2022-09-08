const weapons = require("./weapon");

class Player {
	constructor(x, y, socket, username, health, account) {
		this.x = x;
		this.y = y;
		this.socket = socket;
		this.username = account ? account.username : username;
		this.keys = { "w": false, "a": false, "s": false, "d": false };
		this.mouse = 0;
		this.mouseDown = false;
		this.speed = 5;
		this.weapons = [
			new weapons.Rifle(this.socket.id),
			new weapons.FireWand(this.socket.id),
			new weapons.PlasmaRifle(this.socket.id)
		];
		this.activeWeapon = 0;
		this.health = health;
		this.maxHealth = health;
		this.points = 0;
		this.traits = {
			"speed": {
				level: 0,
				color: "0, 0, 255",
				displayName: "Speed"
			},
			"damage": {
				level: 0,
				color: "255, 0, 0",
				displayName: "Damage"
			},
			"health": {
				level: 0,
				color: "0, 255, 0",
				displayName: "Health"
			},
			"sight": {
				level: 0,
				color: "255, 255, 0",
				displayName: "Sight"
			}
		};
		this.stun = 0;
		this.score = 0;
		this.pointLevels = [{ needed: 5, redeemed: false }];
		for (let i = 1; i < 20; i++) {
			this.pointLevels.push({ needed: this.pointLevels[i - 1].needed + Math.floor(Math.pow(i, 1.2)) + 10, redeemed: false });
		}
		this.percentToNext = 0;
		this.vehicle = null;
		this.account = account || { username, roles: [{ name: "anon", color: "grey" }] };
	}

	update(game, delta) {
		if (this.vehicle !== null) {
			this.vehicle.move(this, game, delta);
			this.x = this.vehicle.x;
			this.y = this.vehicle.y;

			if (this.mouseDown) {
				this.vehicle.shoot(this.mouse, game);
			}
			return;
		}
		let dir;
		if (this.keys["w"]) {
			dir = Math.PI * 1.5;
		}
		if (this.keys["s"]) {
			dir = Math.PI * 0.5;
		}
		if (this.keys["a"]) {
			dir = Math.PI;
		}
		if (this.keys["d"]) {
			dir = 0;
		}
		if (this.keys["w"] && this.keys["a"]) {
			dir = Math.PI * 1.25;
		}
		if (this.keys["w"] && this.keys["d"]) {
			dir = Math.PI * 1.75;
		}
		if (this.keys["s"] && this.keys["a"]) {
			dir = Math.PI * 0.75;
		}
		if (this.keys["s"] && this.keys["d"]) {
			dir = Math.PI * 0.25;
		}

		const tileSpeedMultiplier = game.world.getTileAtPos(this.x, this.y) === 0 ? 0.5 : 1;
		const speedUpgradeMultiplier = 1 + this.traits["speed"].level * 0.1;

		if (typeof dir !== "undefined" && this.stun <= 0) {
			this.x += Math.cos(dir) * this.speed * delta * tileSpeedMultiplier * speedUpgradeMultiplier;
			this.y += Math.sin(dir) * this.speed * delta * tileSpeedMultiplier * speedUpgradeMultiplier;
			this.x = Math.max(0, Math.min(this.x, game.world.width * 48));
			this.y = Math.max(0, Math.min(this.y, game.world.height * 48));
		}

		this.stun -= delta;

		if (this.weapons[this.activeWeapon] !== null) {
			this.weapons[this.activeWeapon].update(delta);

			if (this.mouseDown) {
				this.weapons[this.activeWeapon].shoot(this.x, this.y, this.mouse, game);
			}
		}
	}

	switchWeapon() {
		if (this.vehicle) {
			this.vehicle.switchWeapon();
			return;
		}
		this.activeWeapon = (this.activeWeapon + 1) % this.weapons.length;
	}

	upgradeSkill(skill) {
		if (this.points <= 0 || this.traits[skill].level >= 5) {
			return;
		}

		this.points--;
		this.traits[skill].level++;
	}

	damage(effects, other, game) {
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
			game.playerKilled(this, other);
		}
	}

	addScore(score) {
		this.score += score;
		for (let i = 0; i < this.pointLevels.length; i++) {
			if (this.score >= this.pointLevels[i].needed && !this.pointLevels[i].redeemed) {
				this.pointLevels[i].redeemed = true;
				this.points += 1;
			}
			if ((i === 0 && !this.pointLevels[0].redeemed)) {
				this.percentToNext = this.score / this.pointLevels[0].needed;
				break;
			}
			if (!this.pointLevels[i].redeemed && this.pointLevels[i - 1].redeemed) {
				this.percentToNext = (this.score - this.pointLevels[i - 1].needed) / (this.pointLevels[i].needed - this.pointLevels[i - 1].needed);
			}
		}
	}

	enterVehicle(vehicle) {
		this.vehicle = vehicle;
		this.x = vehicle.x;
		this.y = vehicle.y;
		vehicle.player = this.socket.id;

		for (let weapon of vehicle.weapons) {
			weapon.owner = this.socket.id;
		}
	}
}

module.exports = Player;