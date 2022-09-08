let socket = null;

const inputElem = document.querySelector("input");
const canvas = document.getElementById("gameCanvas");
const minimap = document.getElementById("minimapCanvas");
const ctx = canvas.getContext("2d");
const userdata = document.querySelector("#userdata");
let isLoggedIn = false;
getUserData();

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let world = [];
let gameData = [];
let player = null;
let zoomLevel = 1;
let doneRender = true;
let skillButtons = {
	"speed": [0, 0, 0, 0],
	"sight": [0, 0, 0, 0],
	"damage": [0, 0, 0, 0],
	"health": [0, 0, 0, 0]
};

const keys = { "w": false, "a": false, "s": false, "d": false };
const tiles = [];

const assets = {
	"firebullet": {
		image: getImage("assets/firebullet.png"),
		width: 24,
		height: 15
	},
	"bullet": {
		image: getImage("assets/bullet.png"),
		width: 38,
		height: 16
	},
	"firewand": {
		image: getImage("assets/firewand.png"),
		width: 400,
		height: 128,
		rotate: -Math.PI / 4
	},
	"rifle": {
		image: getImage("assets/rifle.png"),
		width: 105,
		height: 64,
		rotate: -Math.PI / 4
	},
	"plasmarifle": {
		image: getImage("assets/plasmarifle.png"),
		width: 58,
		height: 20,
		rotate: -Math.PI / 4
	},
	"plasmabullet": {
		image: getImage("assets/plasmabullet.png"),
		width: 25,
		height: 25
	},
	"derpyminion": {
		image: getImage("assets/derpyminion.png"),
		width: 93,
		height: 93
	},
	"boss": {
		image: getImage("assets/boss.png"),
		width: 300,
		height: 300
	},
	"helicopter": {
		image: getImage("assets/helicopter.png"),
		width: 80,
		height: 200
	},
	"helicopterblade": {
		image: getImage("assets/helicopterblade.png"),
		width: 230,
		height: 248
	}
};

function getImage(url) {
	const img = new Image();
	img.src = url;
	return img;
}

for (let i = 0; i < 15; i++) {
	tiles.push(getImage("assets/sprite" + i + ".png"));
}

function onSubmit() {
	const username = inputElem.value;

	if (!/^[a-z A-z0-9_-]{1,50}$/.test(username) && !isLoggedIn) {
		alert("Invalid username");
		return;
	}

	socket = io.connect("//192.168.1.136:3000");
	socket.emit("join", username);
	document.querySelector(".overlay").style.display = "none";

	socket.on("world", (data) => {
		world = data;
		generateMinimap();
	});

	socket.on("update", (data) => {
		update(data);
	});

	window.addEventListener("keydown", (event) => {
		if (event.key.toLowerCase() === "t") {
			socket.emit("chat", "test");
		}
		if (event.key.toLowerCase() === "tab") {
			event.preventDefault();
		}
		if (event.key.toLowerCase() === "enter") {
			socket.emit("entervehicle");
		}
		keys[event.key.toLowerCase()] = true;
		socket.emit("keys", keys);
	});
	
	window.addEventListener("keyup", (event) => {
		keys[event.key.toLowerCase()] = false;
		socket.emit("keys", keys);
	});
	
	window.addEventListener("mousemove", (event) => {
		const angle = Math.atan2(event.clientY - canvas.height / 2, event.clientX - canvas.width / 2);
		socket.emit("mouse", angle);
	});
	
	window.addEventListener("mousedown", (event) => {
		for (let button in skillButtons) {
			const b = skillButtons[button];
			if (event.clientX > b[0] && event.clientX < b[0] + b[2] && event.clientY > b[1] && event.clientY < b[1] + b[3]) {
				socket.emit("skill", button);
				return;
			}
		}
		socket.emit("mousedown", true);
	});
	
	window.addEventListener("mouseup", () => {
		socket.emit("mousedown", false);
	});
}

function update(data) {
	gameData = data;
	if (!data.players[socket.id]) {
		return;
	}
	player = data.players[socket.id];
	zoomLevel = 1 - 0.05 * player.traits.sight.level;
	if (doneRender) {
		render();
	}
}

function cWidth() {
	return canvas.width / zoomLevel;
}

function cHeight() {
	return canvas.height / zoomLevel;
}

function render() {
	doneRender = false;
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	ctx.save();
	ctx.scale(zoomLevel, zoomLevel);

	const startX = Math.min(Math.max(Math.floor((player.x - cWidth() / 2) / 48) - 1, 0), world.length - 1);
	const startY = Math.min(Math.max(Math.floor((player.y - cHeight() / 2) / 48) - 1, 0), world[0].length - 1);
	const endX = Math.min(Math.max(Math.floor((player.x + cWidth() / 2) / 48) + 2, 0), world.length - 1);
	const endY = Math.min(Math.max(Math.floor((player.y + cHeight() / 2) / 48) + 2, 0), world[0].length - 1);

	for (let x = startX; x <= endX; x++) {
		for (let y = startY; y <= endY; y++) {
			const rx = rpx(x * 48);
			const ry = rpy(y * 48);
			if (world[x][y] === -1) {
				ctx.fillStyle = "black";

				ctx.fillRect(rx, ry, 48, 48);
			} else {
				if (world[x][y] === 0) {
					ctx.fillStyle = "rgb(113, 192, 59)";
					ctx.fillRect(rx - 1, ry - 1, 50, 50);
					continue;
				} else if (world[x][y] === 1) {
					ctx.fillStyle = "rgb(81, 186, 145)";
					ctx.fillRect(rx - 1, ry - 1, 50, 50);
					continue;
				}
				ctx.drawImage(tiles[world[x][y]], rx, ry, 48, 48);
			}
		}
	}

	for (let id in gameData.players) {
		const p = gameData.players[id];
		const rx = rpx(p.x);
		const ry = rpy(p.y);
		ctx.fillStyle = "black";
		ctx.beginPath();
		ctx.arc(rx, ry, 30, 0, 2 * Math.PI);
		ctx.fill();
		drawHealthBar(rx - 30, ry - 55, 60, 10, p.health, p.maxHealth);

		ctx.fillStyle = "black";
		ctx.textAlign = "center";
		ctx.font = "15px Arial";
		const levelText = p.account.level ? `(${p.account.level}★) ` : "";
		ctx.fillText(levelText + p.account.username, rx, ry - 65);

		for (let i in p.account.roles) {
			ctx.font = "bold 15px Arial";
			const role = p.account.roles[i];
			ctx.fillStyle = role.color;
			ctx.fillText(`[${role.name.toUpperCase()}]`, rx, ry - 65 - 18 * (Number(i) + 1));
		}
	}

	for (const bullet of gameData.bullets) {
		const rx = rpx(bullet.x);
		const ry = rpy(bullet.y);
		if (!bullet.asset) {
			ctx.fillStyle = "black";
			ctx.beginPath();
			ctx.arc(rx, ry, 5, 0, 2 * Math.PI);
			ctx.fill();
		} else {
			ctx.save();
			ctx.translate(rx, ry);
			ctx.rotate(bullet.dir);
			ctx.drawImage(assets[bullet.asset].image, -12, -7, 24, 15);
			ctx.restore();
		}
	}

	for (const enemy of gameData.enemies) {
		const rx = rpx(enemy.x);
		const ry = rpy(enemy.y);

		if (rx < -enemy.radius || rx > cWidth() + enemy.radius || ry < -enemy.radius || ry > cHeight() + enemy.radius) {
			continue;
		}

		ctx.save();
		ctx.translate(rx, ry);
		ctx.rotate(enemy.rotation + Math.PI / 2);
		const asset = assets[enemy.asset];
		ctx.drawImage(asset.image, -asset.width / 2, -asset.height / 2);
		ctx.restore();
		drawHealthBar(rx - 30, ry - 65, 60, 10, enemy.health, enemy.maxHealth);
	}

	for (let vehicle of gameData.vehicles) {
		if (vehicle.type === "helicopter") {
			const rx = rpx(vehicle.x);
			const ry = rpy(vehicle.y);

			ctx.save();
			ctx.translate(rx, ry);
			ctx.rotate(vehicle.rotation + Math.PI / 2);
			let asset = assets["helicopter"];
			ctx.drawImage(asset.image, -asset.width / 2, -asset.height / 2, asset.width, asset.height);
			ctx.restore();

			ctx.save();
			ctx.translate(rx, ry);
			ctx.rotate(vehicle.bladeRotation + Math.PI / 2);
			asset = assets["helicopterblade"];
			ctx.drawImage(asset.image, -asset.width / 2, -asset.height / 2, asset.width, asset.height);
			ctx.restore();
		}
	}

	for (const item of gameData.actionText) {
		ctx.fillStyle = item.color;
		ctx.textAlign = "center";
		ctx.font = "20px Arial";
		ctx.fillText(item.text, rpx(item.x), rpy(item.y));
	}

	ctx.fillStyle = "black";
	ctx.fillRect(rpx(-20), rpy(-20), world.length * 48 + 40, 20);
	ctx.fillRect(rpx(-20), rpy(-20), 20, world[0].length * 48 + 40);
	ctx.fillRect(rpx(world.length * 48), rpy(-20), 20, world[0].length * 48 + 40);
	ctx.fillRect(rpx(-20), rpy(world[0].length * 48), world.length * 48 + 40, 20);

	ctx.restore();

	renderGUI();

	doneRender = true;
}

function renderGUI() {
	ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
	ctx.fillRect(0, canvas.height - 85, player.weapons.length * 60 + 10, 130);

	for (let i = 0; i < player.weapons.length; i++) {
		const weapon = player.weapons[i];
		ctx.fillStyle = "white";
		if (player.activeWeapon === i) {
			ctx.fillStyle = "grey";
		}
		ctx.fillRect(10 + 60 * i, canvas.height - 75, 48, 48);

		if (weapon === null) {
			continue;
		}

		if (weapon.asset !== null) {
			ctx.save();
			ctx.translate(34 + 60 * i, canvas.height - 75 + 24);
			ctx.rotate(assets[weapon.asset].rotate);
			const ratio = assets[weapon.asset].height / assets[weapon.asset].width;
			ctx.drawImage(assets[weapon.asset].image, -24, -ratio * 24, 48, ratio * 48);
			ctx.restore();
		}

		if (weapon.type === "ranged") {
			ctx.drawImage(assets["bullet"].image, 10 + 60 * i, canvas.height - 18, 19, 8);
			ctx.fillStyle = "white";
			ctx.textAlign = "left";
			ctx.font = "13px Arial";
			ctx.fillText(weapon.ammunition, 30 + 60 * i, canvas.height - 10);
		} else if (weapon.type === "magic") {
			ctx.fillStyle = "blue";
			ctx.fillRect(10 + 60 * i, canvas.height - 22, weapon.mana / weapon.maxMana * 48, 17);
		} else if (weapon.type === "battery") {
			ctx.fillStyle = "green";
			ctx.fillRect(10 + 60 * i, canvas.height - 22, weapon.battery / weapon.maxBattery * 48, 17);
		}
	}

	let yOffset = canvas.height - 185;
	ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
	ctx.fillRect(0, yOffset - 45, player.weapons.length * 60 + 10, 138);

	ctx.fillStyle = "white";
	ctx.textAlign = "left";
	ctx.font = "15px Arial";
	ctx.fillText(`Skills (${player.points})`, 10, yOffset - 25);

	for (let skill in player.traits) {
		ctx.fillStyle = "white";
		ctx.fillText(player.traits[skill].displayName, 10, yOffset);
		if (player.points) {
			ctx.fillRect(163, yOffset - 15, 20, 20);
			skillButtons[skill] = [163, yOffset - 15, 20, 20];
		}
		yOffset += 25;

		for (let i = 0; i < 5; i++) {
			const alpha = player.traits[skill].level > i ? 1 : 0.2;
			ctx.fillStyle = `rgba(${player.traits[skill].color}, ${alpha})`;
			ctx.fillRect(75 + i * 17, yOffset - 40, 12, 20);
		}

		if (player.points && player.traits[skill].level < 5) {
			ctx.fillStyle = `rgb(${player.traits[skill].color})`;
			ctx.fillRect(170, yOffset - 38, 6, 16);
			ctx.fillRect(165, yOffset - 33, 16, 6);
		}
	}

	ctx.fillStyle = "aqua";
	ctx.fillRect(0, yOffset - 10, 190 * player.percentToNext, 3);

	ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
	ctx.fillRect(canvas.width - minimap.width - 20, 0, minimap.width + 20, minimap.height + 45);
	ctx.drawImage(minimap, canvas.width - minimap.width - 10, 35, minimap.width, minimap.height);

	ctx.fillRect(canvas.width - minimap.width - 20, minimap.height + 50, minimap.width + 20, gameData.leaderboard.length * 20 + 35);

	ctx.fillStyle = "white";
	ctx.textAlign = "left";
	ctx.font = "15px Arial";
	ctx.fillText(`Minimap (${Math.floor(player.x / 48)}, ${Math.floor(player.y / 48)})`, canvas.width - minimap.width - 10, 23);

	ctx.fillText(`Leaderboard (${Object.keys(gameData.players).length} players)`, canvas.width - minimap.width - 10, minimap.height + 70);

	for (let i = 0; i < gameData.leaderboard.length; i++) {
		const player = gameData.leaderboard[i];
		ctx.fillStyle = "white";
		ctx.textAlign = "left";
		ctx.font = "15px Arial";
		ctx.fillText(`${i + 1}. ${player.username} (${player.score})`, canvas.width - minimap.width - 10, minimap.height + 95 + i * 20);
	}
}

function drawHealthBar(x, y, width, height, health, maxHealth) {
	ctx.fillStyle = "black";
	ctx.fillRect(x - 2, y - 2, width + 4, height + 4);
	ctx.fillStyle = "red";
	ctx.fillRect(x, y, width, height);
	ctx.fillStyle = "green";
	ctx.fillRect(x, y, width * (health / maxHealth), height);
}

function rpx(x) {
	return x - player.x + cWidth() / 2;
}

function rpy(y) {
	return y - player.y + cHeight() / 2;
}

function generateMinimap() {
	minimap.width = world.length;
	minimap.height = world[0].length;

	const mctx = minimap.getContext("2d");

	for (let x = 0; x < world.length; x += 1) {
		for (let y = 0; y < world[0].length; y += 1) {
			mctx.fillStyle = "green";
			if (world[x][y] === 1) {
				mctx.fillStyle = "rgb(81, 186, 145)";
			}

			mctx.fillRect(x, y, 1, 1);
		}
	}
}

window.addEventListener("resize", () => {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
});

async function getUserData() {
	const data = await (await fetch("/userdata")).json();
	
	if (!data.username) {
		userdata.innerHTML = "Currently not logged in. Click <a href='/login'>here</a> to log in, or <a href='/register'>register an account</a>.";
		document.querySelector("#upgrades").style.display = "none";
		return;
	}

	let rolesHTML = "";
	isLoggedIn = true;

	for (let role of data.roles) {
		rolesHTML += `<span class='user-role' style='color:${role.color}'>[${role.name.toUpperCase()}]</span>`;
	}

	userdata.innerHTML = `Currently signed in as ${rolesHTML} (${data.level}&#9733;) ${data.username}. <a href='/logout'>Log out</a>`;
	document.querySelector("#username").style.display = "none";

	document.querySelector("#experience-bar-value").style.width = Math.floor(data.experienceGained / data.experienceNeeded * 100) + "%";
	document.querySelector("#experience-bar-text").innerHTML = `${data.experienceGained} / ${data.experienceNeeded} XP`;

	let tableHTML = "";

	const upgradeColors = {
		"speed": "0, 0, 255",
		"damage": "255, 0, 0",
		"health": "0, 255, 0",
		"sight": "255, 255, 0"
	};

	for (let upgrade in data.upgrades) {
		tableHTML += `<tr><td style='font-family:Arial,sans-serif'>${upgrade}</td>`;
		for (let i = 1; i < 6; i++) {
			if (i <= data.upgrades[upgrade]) {
				tableHTML += `<td class='upgrade' style='background-color:rgba(${upgradeColors[upgrade]}, 1)'></td>`;
			} else {
				tableHTML += `<td class='upgrade' style='background-color:rgba(${upgradeColors[upgrade]}, 0.3)'></td>`;
			}
		}
		tableHTML += "<td><button class='upgrade-button'>+</button></td></tr>";
	}

	document.querySelector("#upgrade-box").innerHTML = `<table style="margin:auto;margin-top:15px;">${tableHTML}</table>`;
}