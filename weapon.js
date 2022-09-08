const Bullet = require('./bullet');

class Weapon {
	constructor(type, asset, owner) {
		this.type = type;
		this.asset = asset;
		this.owner = owner;
	}
}

class RangedWeapon extends Weapon {
	constructor(options) {
		super("ranged", options.asset || null, options.owner);
		this.name = options.name;
		this.range = options.range;
		this.speed = options.speed;
		this.ammunition = options.ammunition;
		this.cooldown = options.cooldown;
		this.maxCooldown = options.cooldown;
		this.bulletName = options.bulletName || null;
		this.bulletEffects = options.bulletEffects || {};
		this.pierce = options.pierce || false;
	}

	update(delta) {
		this.cooldown -= delta;
	}

	shoot(x, y, dir, game) {
		if (this.ammunition <= 0 || this.cooldown > 0) {
			return;
		}
		this.ammunition--;
		const bullet = new Bullet(x, y, dir, this.owner, this.range / this.speed, this.speed, this.bulletName, this.bulletEffects, this.pierce);
		game.bullets.push(bullet);
		this.cooldown = this.maxCooldown;
	}
}

class BatteryWeapon extends Weapon {
	constructor(options) {
		super("battery", options.asset || null, options.owner);
		this.name = options.name;
		this.range = options.range;
		this.speed = options.speed;
		this.batteryCost = options.batteryCost;
		this.battery = options.battery;
		this.maxBattery = options.battery;
		this.cooldown = options.cooldown;
		this.maxCooldown = options.cooldown;
		this.bulletName = options.bulletName || null;
		this.bulletEffects = options.bulletEffects || {};
		this.pierce = options.pierce || false;
	}

	update(delta) {
		this.cooldown -= delta;
	}

	shoot(x, y, dir, game) {
		if (this.battery < this.batteryCost || this.cooldown > 0) {
			return;
		}
		this.battery -= this.batteryCost;
		const bullet = new Bullet(x, y, dir, this.owner, this.range / this.speed, this.speed, this.bulletName, this.bulletEffects, this.pierce);
		game.bullets.push(bullet);
		this.cooldown = this.maxCooldown;
	}
}

class MagicWeapon extends Weapon {
	constructor(options) {
		super("magic", options.asset || null, options.owner);
		this.name = options.name;
		this.damage = options.damage;
		this.cooldown = options.cooldown;
		this.speed = options.speed;
		this.maxCooldown = options.cooldown;
		this.mana = options.mana;
		this.maxMana = options.mana;
		this.manaCost = options.manaCost;
		this.bulletName = options.bulletName;
		this.bulletEffects = options.bulletEffects || {};
		this.range = options.range;
		this.pierce = options.pierce || false;
	}

	update(delta) {
		this.cooldown -= delta;
		this.mana = Math.min(this.maxMana, this.mana + delta);
	}

	shoot(x, y, dir, game) {
		if (this.mana < this.manaCost || this.cooldown > 0) {
			return;
		}
		this.mana -= this.manaCost;
		const bullet = new Bullet(x, y, dir, this.owner, this.range / this.speed, this.speed, this.bulletName, this.bulletEffects, this.pierce);
		game.bullets.push(bullet);
		this.cooldown = this.maxCooldown;
	}
}

class PlasmaRifle extends BatteryWeapon {
	constructor(owner) {
		super({
			name: "Plasma Rifle",
			asset: "plasmarifle",
			bulletName: "plasmabullet",
			owner: owner,
			range: 1500,
			speed: 15,
			battery: 100,
			batteryCost: 4,
			cooldown: 20,
			bulletEffects: {
				stun: 20,
				damage: 100
			},
			pierce: true
		});
	}
}

class FireWand extends MagicWeapon {
	constructor(owner) {
		super({
			name: "Fire Wand",
			asset: "firewand",
			owner: owner,
			range: 2000,
			speed: 15,
			mana: 1000,
			manaCost: 100,
			cooldown: 10,
			bulletName: "firebullet",
			bulletEffects: {
				damage: 100
			},
			pierce: true
		});
	}
}

class Pistol extends RangedWeapon {
	constructor(owner) {
		super({
			name: "Pistol",
			owner: owner,
			range: 1500,
			speed: 20,
			ammunition: 30,
			cooldown: 20,
			bulletEffects: {
				damage: 75
			},
			pierce: false
		});
	}
}

class Rifle extends RangedWeapon {
	constructor(owner) {
		super({
			name: "Rifle",
			asset: "rifle",
			owner: owner,
			range: 2000,
			speed: 25,
			ammunition: 60,
			cooldown: 10,
			bulletEffects: {
				damage: 85
			},
			pierce: false
		});
	}
}

class HelicopterMachineGun extends RangedWeapon {
	constructor(owner) {
		super({
			name: "Helicopter Machine Gun",
			owner: owner,
			range: 2000,
			speed: 20,
			ammunition: Infinity,
			cooldown: 0,
			bulletEffects: {
				damage: 50
			},
			pierce: false
		});
	}
}

module.exports = { Pistol, Rifle, FireWand, PlasmaRifle, HelicopterMachineGun };