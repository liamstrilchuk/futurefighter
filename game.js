const Player = require('./player');
const World = require('./world');
const enemy = require('./enemy');
const vehicle = require('./vehicle');
const util = require("./util");
const Account = require("./account");

class Game {
	constructor(io, db) {
		this.players = {};
		this.world = new World(32 * 8, 32 * 8);
		this.log = [];
		this.io = io;
		this.db = db;

		this.enemies = [];
		this.bullets = [];
		this.actionText = [];
		this.vehicles = [
			new vehicle.Helicopter(1000, 1000),
		];

		this.lastFrameTime = new Date().getTime();
	}

	async newConnection(socket) {
		let cookie = socket.handshake.session, account;

		if (typeof cookie !== "undefined" && typeof cookie.user !== "undefined") {
			const accountDetails = await util.getUserDetails(cookie.user, this.db);
			account = new Account(accountDetails.username, accountDetails.roles, accountDetails.level);
		}

		socket.on("join", (data) => {
			if (!util.validUsername(data) && !account) {
				return;
			}
			this.players[socket.id] = new Player(0, 0, socket, account ? account.username : data, 1000, account);
			socket.emit("world", this.world.toSend);
			this.addToLog(`${account ? account.username : data} joined the game`);
		});

		socket.on("disconnect", () => {
			try {
				this.addToLog(`${this.players[socket.id].username} left the game`);
				delete this.players[socket.id];
			} catch (err) {}
		});

		socket.on("keys", (keys) => {
			try {
				if (!this.players[socket.id].keys["tab"] && keys["tab"]) {
					this.players[socket.id].switchWeapon();
				}
				this.players[socket.id].keys = keys;
			} catch (err) {}
		});

		socket.on("mouse", (mouse) => {
			try {
				this.players[socket.id].mouse = mouse;
			} catch (err) {}
		});

		socket.on("mousedown", (mouseDown) => {
			try {
				this.players[socket.id].mouseDown = mouseDown;
			} catch (err) {}
		});

		socket.on("chat", (message) => {
			try {
				this.addToLog(`[${this.players[socket.id].username}]: ${message}`);
			} catch (err) {}
		});

		socket.on("skill", (skill) => {
			try {
				this.players[socket.id].upgradeSkill(skill);
			} catch (err) {}
		});

		socket.on("entervehicle", () => {
			try {
				if (this.players[socket.id].vehicle) {
					this.players[socket.id].vehicle.player = null;
					this.players[socket.id].vehicle = null;
					return;
				}
				for (let vehicle of this.vehicles) {
					if (util.dist(vehicle.x, vehicle.y, this.players[socket.id].x, this.players[socket.id].y) < 200 && !vehicle.player) {
						this.players[socket.id].enterVehicle(vehicle);
						break;
					}
				}
			} catch (err) {}
		});
	}

	addToLog(message) {
		console.log(message);
		this.log.push(message);
		if (this.log.length > 5) {
			this.log.shift();
		}
	}

	update() {
		const now = new Date().getTime();
		const delta = (now - this.lastFrameTime) / (1000 / 60);
		this.lastFrameTime = now;

		for (let id in this.players) {
			const player = this.players[id];
			player.update(this, delta);
		}

		for (let enemy of this.enemies) {
			enemy.update(this, delta);
		}

		for (let vehicle of this.vehicles) {
			vehicle.update(this, delta);
		}

		for (let i = this.bullets.length - 1; i > -1; i--) {
			const bullet = this.bullets[i];
			if (bullet.update(this, delta)) {
				this.bullets.splice(i, 1);
			}
		}

		for (let i = this.actionText.length - 1; i > -1; i--) {
			const actionText = this.actionText[i];
			actionText.y -= 1;
			if (--actionText.lifetime <= 0) {
				this.actionText.splice(i, 1);
			}
		}

		if (this.enemies.length < 100) {
			this.createEnemy();
		}

		this.sendData();

		setTimeout(this.update.bind(this), 1000 / 60);
	}

	createEnemy() {
		const enemyTypes = [enemy.Minion];

		this.enemies.push(new enemyTypes[Math.floor(Math.random() * enemyTypes.length)](this.world.randomX(), this.world.randomY()));
	}

	removeEnemy(enemy) {
		for (let i = this.enemies.length - 1; i > -1; i--) {
			if (this.enemies[i] === enemy) {
				this.enemies.splice(i, 1);
			}
		}
	}

	getLeaderboard() {
		const leaderboard = [];
		for (let id in this.players) {
			const player = this.players[id];
			leaderboard.push({
				username: player.username,
				score: player.score
			});
		}
		leaderboard.sort((a, b) => b.score - a.score);
		return leaderboard;
	}

	playerKilled(player, other) {
		const addedScore = Math.floor(player.score / 3) + 3;
		this.addToLog(`${player.username} was killed by ${this.players[other].username}`);
		this.addScore(this.players[other], addedScore);
		this.actionText.push({
			color: "red",
			text: "KILLED BY " + this.players[other].username + " (+" + addedScore + " score)",
			x: player.x,
			y: player.y - 20,
			lifetime: 90
		});
		delete this.players[player.socket.id];
	}

	addScore(player, score) {
		player.addScore(score);
		if (typeof player.account.level !== "undefined") {
			util.addScore(player.account.username, score, this.db);
		}
	}

	sendData() {
		const players = {};
		const bullets = [], enemies = [];

		for (const id in this.players) {
			players[id] = {
				x: this.players[id].x,
				y: this.players[id].y,
				username: this.players[id].username,
				health: this.players[id].health,
				maxHealth: this.players[id].maxHealth,
				weapons: this.players[id].weapons,
				activeWeapon: this.players[id].activeWeapon,
				traits: this.players[id].traits,
				points: this.players[id].points,
				percentToNext: this.players[id].percentToNext,
				account: this.players[id].account
			};
		}

		for (const bullet of this.bullets) {
			bullets.push({
				x: bullet.x,
				y: bullet.y,
				dir: bullet.dir,
				asset: bullet.asset
			});
		}

		for (const enemy of this.enemies) {
			enemies.push({
				x: enemy.x,
				y: enemy.y,
				rotation: enemy.rotation,
				health: enemy.health,
				maxHealth: enemy.maxHealth,
				asset: enemy.asset,
				radius: enemy.radius
			});
		}

		this.io.sockets.emit("update", {
			players,
			bullets,
			enemies,
			actionText: this.actionText,
			leaderboard: this.getLeaderboard(),
			vehicles: this.vehicles
		});
	}
}

module.exports = Game;