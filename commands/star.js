"use strict";
const util = require("../lib/util");
module.exports = {
    command: async function(message, commands) {
        const userId = message.author.id;

        switch (commands[1]) {
            case "list":
            case "l": {
                let page = Number(commands[2]) || 1;
                let stars = await util.db.getUserStars(userId);
                let embed = getEmbed(message.client, page, stars);
                if (embed) {
                    const sent = await message.channel.send({embeds: [embed]});
                    util.addPagination(message, sent);

                    var filter = (reaction, user) => user.id === message.author.id;
                    var collector = sent.createReactionCollector({
                        filter,
                        idle: 600000,
                        dispose: true
                    });
                    collector.on("collect", this.collector.bind(this, {
                        message,
                        list: stars,
                        page
                    }));
                    collector.on("end", () => { util.wipeReactions(sent); });
                } else {
                    message.channel.send("Nothing starred.");
                }
                break;
            }
            case "help":
            case undefined:
                message.channel.send({
                    embeds: [{
                        color: util.getEmbedColor(message.client.user.id),
                        author: {
                            name: message.client.user.username,
                            icon_url: message.client.user.avatarURL()
                        },
                        thumbnail: {
                            url: "https://file.randev.xyz/bots/spc/SPCTeleStar.gif",
                        },
                        title: "Star Commands",
                        description: "Note: the SPC Player will only save the URL of the track and will not save any of its contents locally.",
                        fields: [
                            {
                                name: "(shortcuts)",
                                value: "star a -> add\n" + 
                                    "star l -> list\n" + 
                                    "star p -> play\n" + 
                                    "star r -> remove\n"
                            },
                            {
                                name: "star add",
                                value: "Adds a track from the queue (or from an attachment or URL) to the starred tracks list."
                            },
                            {
                                name: "star list",
                                value: "List all starred tracks."
                            },
                            {
                                name: "star help",
                                value: "Not just any help, but star help!"
                            },
                            {
                                name: "star play",
                                value: "Adds a starred track to the queue."
                            },
                            {
                                name: "star remove",
                                value: "Removes a track from the starred list."
                            },
                            {
                                name: "star search",
                                value: "Search for a specific track."
                            }
                        ],
                        timestamp: new Date()
                    }]
                });
                break;
            case "add":
            case "a": {

                let success;
                let name;
                let url;
                let attachment = message.attachments.first();
                if (attachment && attachment.name.endsWith(".spc")) {
                    url = attachment.url;
                    name = attachment.name;
                } else if (util.isValidUrl(commands[2])) {
                    url = commands[2];
                    let match = commands[2].match(/\/([^/]+)$/);
                    name = match ? match[1] : "(unknown)";
                } else if (!commands[2]) {
                    let session = util.cache[message.guild.id];
                    if (!session || !session.current) {
                        message.channel.send("No track is currently being played.");
                        return;
                    }
                    
                    let spcHash = util.getFileHash(session.current.buffer);
                    success = await util.db.addUserStar(userId, spcHash, session.current.name.replace(/[_`\n]/g, " "), session.current.url);
                } else {
                    message.channel.send("No SPC file attached.");
                    return;
                }

                if (name && url) {
                    let response = await util.makeRequest(url).catch(util.handleError.bind(message));
                    if (!response || !response.body || (response.response.statusCode !== 200)) {
                        message.channel.send("Could not fetch SPC file.");
                        return;
                    }

                    let file = response.body;
                    let spc = util.getSPCData(file, name);
                    if (typeof spc === "string") {
                        message.channel.send(spc);
                        return;
                    }

                    let spcHash = util.getFileHash(file);
                    success = await util.db.addUserStar(userId, spcHash, name.replace(/[_`\n]/g, " "), url);
                }

                if (!success) {
                    message.channel.send("This track is already on your starred list.");
                } else {
                    message.channel.send("Added track to starred list.");
                }

                break;
            }
            case "remove":
            case "r": {
                const search = commands.slice(2).join(" ");
                const entry = await this.searchTrack(message, search).catch(util.handleError.bind(message));
                if (!entry) {
                    return;
                }
                
                const success = await util.db.removeUserStar(userId, entry.hash);
                if (!success) {
                    message.channel.send("This track is not on your starred list.");
                } else {
                    message.channel.send("Removed track `" + entry.name + "` from starred list.");
                }
                break;
            }
            case "play":
            case "p": {
                const search = commands.slice(2).join(" ");
                const entry = await this.searchTrack(message, search).catch(util.handleError.bind(message));
                if (!entry) {
                    return;
                }
                util.runCommand("play", [message, [null, entry.url]]).catch(util.handleError.bind(message));
                break;
            }
            case "search": {
                const search = commands.slice(2).join(" ");
                const entry = await this.searchTrack(message, search).catch(util.handleError.bind(message));
                if (!entry) {
                    return;
                }

                var response = await util.makeRequest(entry.url).catch(util.handleError.bind(message));
                if (!response || !response.body || (response.response.statusCode !== 200)) {
                    message.channel.send("Could not fetch SPC file.");
                    return;
                }

                var file = response.body;
                var match = entry.url.match(/\/([^/]+)$/);
                var name = match ? match[1] : "(unknown)";
                var spc = util.getSPCData(file, name);
                if (typeof spc === "string") {
                    message.channel.send(spc);
                    return;
                }

                var embed = util.getSPCEmbed(message.client, spc);
                embed.title = "Starred Track";
                message.channel.send({embeds: [embed]});
                break;
            }
            default:
                const config = await util.db.getServerConfig(message.guild.id);
                message.channel.send("I don't recognize that subcommand. Try typing in `" + config.prefix + " star help` instead.");
        }

    },

    searchTrack: async function(message, search) {
        const userId = message.author.id;
        const list = await util.db.searchUserStar(userId, search);
        if (list.length > 1) {
            let page = 1;
            const embed = getEmbed(message.client, page, list, true);
            if (embed) {
                const sent = await message.channel.send({embeds: [embed]});
                util.addPagination(message, sent);

                const filter = (reaction, user) => user.id === userId;
                const mfilter = m => m.author.id === userId;
                const collector = sent.createReactionCollector({filter, idle: 600000});
                const selector = message.channel.awaitMessages({filter: mfilter, maxProcessed: 1, idle: 5000});

                return new Promise(async resolve => {

                    collector.on("collect", this.collector.bind(this, {
                        message,
                        list,
                        page
                    }));
                    collector.on("end", () => { util.wipeReactions(sent); resolve(); });

                    const [reply] = await selector;
                    if (!reply) {
                        return;
                    }

                    const number = Number(reply[1].content);
                    if (isNaN(number)) {
                        message.channel.send("Not a valid number.");
                        resolve();
                    } else {
                        const entry = list[number - 1];
                        if (!entry) {
                            message.channel.send("There is no track with that number.");
                            resolve();
                        } else {
                            resolve(entry);
                        }
                    }

                });
            } else {
                message.channel.send("I found some tracks but I was unable to display them for some odd reason.");
            }
        } else if (list.length === 0) {
            message.channel.send("Couldn't find a track with that name.");
        } else {
            return Promise.resolve(list[0]);
        }
    },

    editEmbed: function(message, page, list, isSearch) {
        let embed = getEmbed(message.client, page, list, isSearch);
        if (embed) {
            message.edit({embeds: [embed]});
        }
        
        return Boolean(embed);
    },

    collector: async function(data, reaction, user) {
		var success;

        switch (reaction.emoji.id || reaction.emoji.name) {
            case "⬅":
				data.page--;
				util.wipeReactions(reaction.message);
				success = this.editEmbed(reaction.message, data.page, data.list, data.isSearch);
				if (!success) {data.page++;}
				break;
			case "➡":
				data.page++;
				util.wipeReactions(reaction.message);
				success = this.editEmbed(reaction.message, data.page, data.list, data.isSearch);
				if (!success) {data.page--;}
                break;
            case util.const.closeEmote:
				reaction.message.delete();
                break;
            default:
                return;
        }
    }
};

function getEmbed(client, page, list, isSearch) {

    var end = (page * 10);
    var start = end - 10;

    if ((start < 0) || (start >= list.length)) {
        return null;
    }

    var usedList = list.slice(start, end);
    var formattedList = usedList.map((entry, index) => `\`${index + 1}. ${entry.name.replace(/`/g, "\\`")}\``);
    var title = isSearch ? `Found ${list.length} tracks` : "Starred tracks";
    var descPre = isSearch ? "Type the desired track number below (just the number with no prefix):\n\n" : "";

    var totalPages = Math.ceil(list.length / 10);

    return {
        color: util.getEmbedColor(client.user.id),
        author: {
            name: client.user.username,
            icon_url: client.user.avatarURL()
        },
        thumbnail: {
            url: "https://file.randev.xyz/bots/spc/SPCTeleStar.gif",
        },
        title,
        description: descPre + formattedList.join("\n"),
        //fields: usedFields,
        timestamp: new Date(),
        footer: {
            text: "Page " + page + "/" + totalPages
        }
    };
}