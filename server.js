"use strict";
const clients = {};

/* ON INIT */

startClient("client");
console.log("Started at " + new Date().toISOString());

/* ON EXIT */

function onGracefulExit() {
	var date = new Date();
	console.log("Closed at " + date.toISOString());

	var clientArray = Object.values(clients);
	clientArray.forEach(client => client.exit());

	process.exit();
}

process.on("SIGINT", onGracefulExit);
process.on("SIGTERM", onGracefulExit);

/* MAIN FUNCTION */

function startClient(name, cache) {
	clients[name] = require("./" + name);
	if (cache === true) {
		cache = require("./" + name + "/lib/cache");
	}

	return clients[name].init(cache).then(data => {
		Object.keys(require.cache).forEach(file => delete require.cache[file]);

		var date = new Date();
		console.log("Restarting " + name + " at " + date.toISOString());
		clients[name].exit();
		startClient(name, cache);
	}, error => {
		if (error) {
			console.error(error);
		}
		
		clients[name].exit();
	});
}