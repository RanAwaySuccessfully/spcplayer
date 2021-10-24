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
let scmr;

/* CLIENT */

module.exports = {

	_paused: false,

    init: function() {
		util.db.init(util);

		return new Promise((resolve, reject) => {

			try {
				client.on("ready", this.ready.bind(this));
				client.on("messageCreate", this.messageCreate.bind(this));
				client.on("voiceStateUpdate", this.voiceStateUpdate.bind(this));
			} catch (error) {
				util.handleError(error);
			}

			this.restart = resolve;

			this.login().catch(reject);

			if (process.env.NODE_ENV !== "development") {
				scmr = require("./client_scmr");
				scmr.init(this).then(resolve, reject);
			}
		});
    },

	initSB: function() {
		util.db.init(util);
	},

	restart: () => {},

    exit: function() {
        client.destroy();
		if (process.env.NODE_ENV !== "development") {
			scmr.exit();
		}
    },

    login: function() {
		let filename = "./login_key";
		if (process.env.NODE_ENV === "development") {
			filename = "./login_key_dev";
		}

        return fs.readFile(util.getFilePath(filename), "utf-8").then(key => {
            key = key.toString().replace(/\s/g, "");
            client.login(key);
        });
    },

    ready: function() {
        console.log(`Logged in as ${client.user.tag} at ${new Date().toISOString()}`);
    },

	voiceStateUpdate: function(oldState, newState) {
		var state = newState || oldState;

		var session = util.cache[state.guild.id];
		if (session && session.connection) {
			let channel = state.guild.me.voice.channel;

			if (!channel) {
				return;
			}

			if (oldState.member?.id ===	channel.client.user.id) {
				if (!newState.channelId) {
					util.runCommand("leave", [null, [null, 1], session._channel]);
					return;
				} else if (oldState.channelId && (newState.channelId !== oldState.channelId)) {
					util.runCommand("leave", [null, [null, 2], session._channel]);
					return;
				}
			}

			let memberCount = channel.members.size;
			let memberFirst = channel.members.first();
			if ((memberCount === 1) && (memberFirst.id === channel.client.user.id)) {
				session._empty = true;
				util.addInactiveTimeout(state.guild, session);
			} else if (session._empty) {
				delete session._empty;
				clearTimeout(session._inactive);
			}

			if ((memberCount > 2) && session.noQueueMode) {
				session.noQueueMode = false;
				session._channel.send("I've automatically re-enabled the queue since someone else joined the channel.");
			}
		}
	},

    messageCreate: async function(message) {
		if (message.author.bot || !message.content) {return;}

		var commands = message.content.split(" ");
		var msgPrefix = commands.shift();
		var mentionedMe = (msgPrefix === `<@!${message.client.user.id}>`);

		if (message.channel.type === "DM") {
			if (util.isSCMR(message.client.user.id) || util.isSnesBot(message.client.user.id)) {
				message.channel.send("No.");
				return;
			}

			if (message.content && (message.content.toLowerCase() === "invite")) {
				let url = await client.generateInvite({
					scopes: ["applications.commands", "bot"]
				});
				const supportServer = "https://discord.gg/"; // REDACTED
				message.reply({
					content: `Bot Invite Link: ${url}\nSupport Server: ${supportServer}`,
					allowedMentions: {
						repliedUser: false
					}
				});
			}
			return;
		}

		var myPermissions = message.channel.permissionsFor(message.guild.me);
		if (!myPermissions.has("SEND_MESSAGES")) {return;}
		if (!myPermissions.has("EMBED_LINKS")) {
			message.channel.send("I don't have the **Embed Links** permission, which is necessary for most commands to work.");
			return;
		}

		var config = await util.db.getServerConfig(message.guild.id);

		if (mentionedMe && !util.isSnesBot(message.client.user.id)) {
			message.channel.send(`My currrent prefix is \`${config.prefix}\`, for example:\n\`${config.prefix} help\``);
			return;
		} else {
			if (msgPrefix !== config.prefix) {
				if (msgPrefix.startsWith(config.prefix)) {
					let unshiftedCommand = msgPrefix.slice(config.prefix.length);
					commands.unshift(unshiftedCommand);
				} else {
					return;
				}
			}
		}

		if (message.author.id === "256504506433404930") {
			switch (commands[0]) {
				case "bridges¬":
					bridgeInfo(message);
					return;
				case "restart¬":
					message.channel.send("Restarting...").then(sent => this.restart());
					return;
				case "pause¬":
					this._paused = true;
					message.channel.send("Bot will temporarily not accept any commands.");
					message.client.user.setStatus("dnd");
					return;
				case "resume¬":
					if (this._paused) {
						this._paused = false;
						message.channel.send("Bot will now accept commands again.");
						message.client.user.setStatus("online");
					}
					return;
				default:
					break;
			}
		}

		if (this._paused) {
			return;
		}

		if (process.env.NODE_ENV === "development") {
			if (!message.guild) {
				return;
			}
		}

		if (config.allowedRole) {
			var isManager = message.member.permissions.has("MANAGE_GUILD");
			var hasRole = message.member.roles.cache.some(role => role.id === config.allowedRole);
			if (!hasRole && !isManager) {
				message.channel.send("This server has a role set up for interacting with me. You don't have that role.");
				return;
			}
		}

		mainCommands(message, commands, config);
    }
};

function mainCommands(message, commands, config) {
	var parameters = [message, commands];

	const joinCommand = { filename: "join" };
	const leaveCommand = { filename: "leave" };
	const nextCommand = { filename: "next" };
	const pauseCommand = { filename: "pause" };
	const playCommand = { filename: "play" };
	const downloadCommand = { filename: "download" };
	const queueCommand = { filename: "queue" };
	const helpCommand = { filename: "help" };

	const commandList = {
		"about": { filename: "about" },
		"clear": { filename: "clear" },
		"convert+time": {
			filename: "convert",
			parameters: [true]
		},
		"convert": { filename: "convert" },
		"current": { filename: "current" },
		"dl": downloadCommand,
		"download": downloadCommand,
		"first-message": { filename: "firstmessage" },
		"c": joinCommand,
		"connect": joinCommand,
		"j": joinCommand,
		"join": joinCommand,
		"jump": { filename: "jump" },
		"disconnect": leaveCommand,
		"leave": leaveCommand,
		"quit": leaveCommand,
		"ld": {
			filename: "loop",
			parameters: ["disable"]
		},
		"le": {
			filename: "loop",
			parameters: ["enable"]
		},
		"loop": { filename: "loop" },
		"move": { filename: "move" },
		"s": nextCommand,
		"skip": nextCommand,
		"next": nextCommand,
		"stop": pauseCommand,
		"pause": pauseCommand,
		"p": playCommand,
		"play": playCommand,
		"prefix": { filename: "prefix" },
		"resume": { filename: "resume" },
		"q": queueCommand,
		"queue": queueCommand,
		"queue-mode": { filename: "queue-mode" },
		"remove": { filename: "remove" },
		"role": { filename: "role" },
		"star": { filename: "star" },
		"shuffle": { filename: "shuffle" },
		"system": { filename: "system" },
		"h": helpCommand,
		"help": helpCommand
	};

	if (util.isSnesBot(message.client.user.id)) {
		commandList["seek"] = { filename: "seek" };
	}

	if (commands[0] === undefined) {
		commands[0] = util.cache[message.guild.id] ? "current" : "help";
	}

	const commandFound = commandList[commands[0]];

	if (commandFound.filename) {
		if (commandFound.parameters) {
			parameters = parameters.concat(commandFound.parameters);
		}

		util.runCommand(commandFound.filename, parameters).catch(util.handleError.bind(message));
	} else {
		message.channel.send("I don't recognize that command. Do `" + config.prefix + " help` to see which commands you can use.");
	}
}

function bridgeInfo(message) {
	const queue = util.bridge.queue;
	const text = queue.map(b => b.id + " - " + b.guildId).join("\n");

	message.channel.send({
		content: `Bridge count: ${queue.length}`,
        files: [{
            attachment: Buffer.from(text || ""),
            name: "bridges.txt"
        }]
    });
}
