const experienceLevels = [10];

for (let i = 1; i < 25; i++) {
	experienceLevels.push(experienceLevels[i - 1] + Math.ceil(Math.pow(experienceLevels[i - 1], 1.01)));
}

console.log(experienceLevels)

function dist(x1, y1, x2, y2) {
	return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
}

function validUsername(username) {
	if (/^[a-z A-z0-9_-]{1,50}$/.test(username)) {
		return true;
	}

	return false;
}

function getUserDetails(username, db) {
	return new Promise((resolve, reject) => {
		db.all("SELECT username, name, color, speed, damage, health, sight, experience FROM users JOIN user_rights ON users.id=user_rights.user_id JOIN rights ON rights.id=user_rights.right_id WHERE username = ?", [username], (err, rows) => {
			if (err) {
				reject(null);
			}
			if (rows.length > 0) {
				const roles = [];
				for (let row of rows) {
					roles.push({ name: row.name, color: row.color });
				}
				let experienceNeeded, experienceGained;
				for (let i = 0; i < experienceLevels.length; i++) {
					if (rows[0].experience <= experienceLevels[i]) {
						const prevLevel = i === 0 ? 0 : experienceLevels[i - 1];
						experienceNeeded = experienceLevels[i] - prevLevel;
						experienceGained = rows[0].experience - prevLevel;
						break;
					}
				}
				resolve({
					username: rows[0].username,
					roles: roles,
					upgrades: {
						speed: rows[0].speed,
						damage: rows[0].damage,
						health: rows[0].health,
						sight: rows[0].sight
					},
					experience: rows[0].experience,
					experienceNeeded: experienceNeeded,
					experienceGained: experienceGained,
					level: getPlayerLevel(rows[0].experience)
				});
			} else {
				db.all(`SELECT username, speed, damage, health, sight, experience FROM users WHERE username = ?`, [username], (err, rows) => {
					if (rows.length > 0) {
						let experienceNeeded, experienceGained;
						for (let i = 0; i < experienceLevels.length; i++) {
							if (rows[0].experience <= experienceLevels[i]) {
								const prevLevel = i === 0 ? 0 : experienceLevels[i - 1];
								experienceNeeded = experienceLevels[i] - prevLevel;
								experienceGained = rows[0].experience - prevLevel;
								break;
							}
						}
						resolve({
							username: rows[0].username,
							roles: [],
							upgrades: {
								speed: rows[0].speed,
								damage: rows[0].damage,
								health: rows[0].health,
								sight: rows[0].sight
							},
							experience: rows[0].experience,
							experienceNeeded: experienceNeeded,
							experienceGained: experienceGained,
							level: getPlayerLevel(rows[0].experience)
						});
					} else {
						resolve({
							username: username,
							roles: [],
							upgrades: {}
						});
					}
				});
			}
		});
	});
}

function addScore(username, amount, db) {
	db.exec(`UPDATE users SET experience = experience + ${amount} WHERE username = "${username}";`, (err) => {
		if (err) {
			console.log("Failed to add score: " + err);
		}
	});
}

function getPlayerLevel(experience) {
	for (let i = 0; i < experienceLevels.length; i++) {
		if (experience < experienceLevels[i]) {
			return i;
		}
	}
}

module.exports = { dist, validUsername, getUserDetails, addScore };