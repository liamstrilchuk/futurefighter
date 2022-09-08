const weapon = require("./weapon");

class Vehicle {
	constructor(x, y, type) {
		this.x = x;
		this.y = y;
		this.type = type;
		this.player = null;
	}

	update(game, delta) {}
	move(player, game, delta) {}
}

class Helicopter extends Vehicle {
	constructor(x, y) {
		super(x, y, "helicopter");
		this.bladeRotation = 0;
		this.rotation = 0;
		this.velocity = 0;
		this.maxVelocity = 15;
		this.weapons = [
			new weapon.HelicopterMachineGun(null)
		];
		this.activeWeapon = 0;
	}

	update(game, delta) {
		this.bladeRotation += delta * 0.2;
		this.weapons[this.activeWeapon].update(delta);
	}

	move(player, game, delta) {
		if (player.keys["a"]) {
			this.rotation -= delta * 0.02;
		}
		if (player.keys["d"]) {
			this.rotation += delta * 0.02;
		}
		if (player.keys["w"]) {
			this.velocity = Math.min(this.velocity + delta * 0.1, this.maxVelocity);
		}
		if (player.keys["s"]) {
			this.velocity = Math.max(this.velocity - delta * 0.1, 0);
		}

		this.x += Math.cos(this.rotation) * this.velocity * delta;
		this.y += Math.sin(this.rotation) * this.velocity * delta;
	}

	switchWeapon() {
	
	}

	shoot(dir, game) {
		this.weapons[this.activeWeapon].shoot(this.x, this.y, dir, game);
	}
}

class Tank extends Vehicle {
	constructor(x, y) {
		super(x, y, "tank");
	}
}

class Bomber extends Vehicle {
	constructor(x, y) {
		super(x, y, "bomber");
	}
}

module.exports = { Helicopter, Tank, Bomber };