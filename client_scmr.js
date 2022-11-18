"use strict";
const { Client, Intents } = require("discord.js");
const client = new Client({
	partials: ["CHANNEL"],
	intents: [
		Intents.FLAGS.GUILDS,
		Intents.FLAGS.GUILD_VOICE_STATES,
		Intents.FLAGS.GUILD_MESSAGES,
		Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
		Intents.FLAGS.DIRECT_MESSAGES
	]
});

const fs = require("fs").promises;
const util = require("./lib/util");

module.exports = {

    init: function(spcplayer) {
		return new Promise((resolve, reject) => {

			try {
				client.on("voiceStateUpdate", spcplayer.voiceStateUpdate);
				client.on("ready", () => console.log(`Logged in as ${client.user.tag} at ${new Date().toISOString()}`));
				client.on("messageCreate", (message) => {
					if (!message.guild || (message.channel.id === "578355359933005825")) {return;}
					spcplayer.messageCreate(message);
				});
			} catch (error) {
				util.handleError(error);
			}

			this.restart = resolve;

			this.login().catch(reject);
		});
    },

	restart: () => {},

    exit: function() {
        client.destroy();
    },

    login: function() {
		return fs.readFile(util.getFilePath("./token.json"), "utf-8").then(file => {
			const json = JSON.parse(file);
			const key = json.tokenSCMR;

			if (key) {
				client.login(key);
			}
        });
    }
};