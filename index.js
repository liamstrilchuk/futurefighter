const express = require("express");
const app = express();
const session = require("express-session");
const util = require("./util");
const sqlite3 = require("sqlite3");
const sha512 = require("js-sha512").sha512;

app.set("trust proxy", 1);
const server = app.listen(3000);

Error.stackTraceLimit = Infinity;

const socket = require("socket.io");
const io = socket(server, {
	cors: {
		origin: "http://192.168.1.136:3000",
		methods: ["GET", "POST"]
	}
});

const db = new sqlite3.Database("./users.db", (err) => {
	if (err) {
		console.log("Error in connecting to database: " + err);
	}
});

io.sockets.on("connection", newConnection);
require("dotenv").config();

const game = new (require("./game"))(io, db);
game.update();

const sessionMiddleware = session({
	secret: process.env.SECRET,
	resave: true,
	saveUninitialized: true
});

const sharedSession = require("express-socket.io-session");

app.use(sessionMiddleware);

io.use(sharedSession(sessionMiddleware, require("cookie-parser")()));

const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: true }));

function newConnection(socket) {
	game.newConnection(socket);
}

app.use(express.static("public"));

app.get("/login", (req, res) => {
	if (req.session.user) {
		return res.redirect("/");
	}
	res.sendFile(__dirname + "/public/login.html");
});

app.get("/register", (req, res) => {
	if (req.session.user) {
		return res.redirect("/");
	}
	res.sendFile(__dirname + "/public/register.html");
});

app.post("/login", (req, res) => {
	if (req.session.user) {
		return res.redirect("/");
	}

	if (!req.body.username || !req.body.password) {
		return res.redirect("/login");
	}

	let { username, password } = req.body;
	username = username.toLowerCase();

	if (!util.validUsername(username)) {
		return res.redirect("/login");
	}

	const hash = sha512(password);

	db.all("SELECT * FROM users WHERE username = ? AND password = ?", [username, hash], (err, rows) => {
		if (err) {
			return res.redirect("/login");
		}
		if (rows.length > 0) {
			req.session.user = username;
			console.log("User logged in: " + username);
			return res.redirect("/");
		}
		return res.redirect("/login");
	});
});

app.post("/register", (req, res) => {
	if (req.session.user) {
		return res.redirect("/");
	}
	if (!req.body.username || !req.body.password) {
		return res.redirect("/register");
	}
	let { username, password } = req.body;
	username = username.toLowerCase();
	
	if (!util.validUsername(username)) {
		return res.redirect("/register");
	}

	const hash = sha512(password);
	const registration = new Date().getTime().toString();

	db.all("SELECT * FROM users WHERE username = ?", [username], (err, rows) => {
		if (err) {
			return res.redirect("/register");
		}
		if (rows.length > 0) {
			return res.redirect("/register");
		}

		db.exec(`INSERT INTO users (username, password, registration_date) VALUES ("${username}", "${hash}", "${registration}")`, (err) => {
			if (err) {
				return res.redirect("/register");
			}
			console.log("User registered: " + username);
			return res.redirect("/login");
		});
	});
});

app.get("/logout", (req, res) => {
	if (!req.session.user) {
		return res.redirect("/");
	}
	console.log("User logged out: " + req.session.user);
	req.session.destroy();
	res.redirect("/");
});

app.get("/userdata", async (req, res) => {
	if (!req.session.user) {
		return res.json({});
	}
	return res.json(await util.getUserDetails(req.session.user, db));
});

app.post("/command", (req, res) => {
	if (!req.session.user) {
		return res.json({ error: "Not logged in" });
	}
	if (!req.body.command) {
		return res.json({ error: "No command" });
	}
	const { command } = req.body;
	game.parseCommand(req.session.user, command);
	return res.json({});
});