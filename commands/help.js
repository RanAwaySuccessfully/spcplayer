"use strict";
const util = require("../lib/util");

module.exports = {
    command: async function(message, commands) {

        var page = Number(commands[1]) || 1;
        var embed = getEmbed(page, message.client);
        if (embed) {
            return message.channel.send({embeds: [embed]}).then(sent => {
                util.addPagination(message, sent);

                var filter = (reaction, user) => user.id === message.author.id;
                var collector = sent.createReactionCollector({filter, idle: 600000});
                collector.on("collect", this.collector.bind(this, {
                    message,
                    page
                }));
                collector.on("end", () => { util.wipeReactions(sent); });
            });
        } else {
            return message.channel.send("No help message to display.");
        }
        
    },

    editEmbed: function(message, page) {
        let embed = getEmbed(page, message.client);
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
				success = this.editEmbed(reaction.message, data.page);
				if (!success) {data.page++;}
				break;
			case "➡":
				data.page++;
				util.wipeReactions(reaction.message);
				success = this.editEmbed(reaction.message, data.page);
				if (!success) {data.page--;}
                break;
            case util.const.closeEmote:
				reaction.message.delete();
                break;
            default:
                return;
        }
    }
}

function getEmbed(page, client) {

    var fields = [
        {
            name: "(shortcuts)",
            value: "c / j -> connect / join\n" + 
                "dl -> download\n" + 
                "h -> help\n" + 
                "le -> loop enable\n" + 
                "ld -> loop disable\n" + 
                "p -> play\n" + 
                "q -> queue\n" + 
                "s -> skip"
        },
        {
            name: "about",
            value: "Information about the bot, and where to go for support regarding bug reports, ideas, etc."
        },
        {
            name: "clear",
            value: "Clear all tracks in the queue."
        },
        {
            name: "convert",
            value: "Convert an SPC file to a standard audio file."
        },
        {
            name: "current",
            value: "Show which track is currently playing."
        },
        {
            name: "download",
            value: "Generate a download link for the current track."
        },
        {
            name: "*first-message",
            value: "Toggle a help message every time the bot joins a channel."
        },
        {
            name: "help",
            value: "Hello! How are you?"
        },
        {
            name: "*inactive",
            value: "Change how many minutes of inactivity I should wait before leaving."
        },
        {
            name: "join / connect",
            value: "Join the voice channel you're in."
        },
        {
            name: "jump",
            value: "Jump to a specific position in the track queue. **This will remove all previous tracks.**"
        },
        {
            name: "leave / disconnect / quit",
            value: "Leave the voice channel."
        },
        {
            name: "loop",
            value: "Set up how many times a track should loop before skipping to the next one. By default, tracks loop endlessly until skipped."
        },
        {
            name: "next / skip",
            value: "Skip to the next track."
        },
        {
            name: "move",
            value: "Move a track between positions in the queue."
        },
        {
            name: "pause / stop",
            value: "Pause the current track."
        },
        {
            name: "play",
            value: "Resume playing the current track, or:\nPlay an SPC file (you must send it as an attachment or a URL)."
        },
        {
            name: "*prefix",
            value: "Change the bot's prefix."
        },
        {
            name: "queue",
            value: "Display the list of tracks that are queued up to play next."
        },
        {
            name: "remove",
            value: "Remove a track from the queue."
        },
        {
            name: "*role",
            value: "Set up a role for bot usage."
        },
        {
            name: "star",
            value: "Add, remove, search, play, or list favorite songs."
        },
        {
            name: "shuffle",
            value: "Randomly shuffle the queue."
        },
        {
            name: "system",
            value: "Runtime info, uptime and ping."
        }
    ];

    var end = (page * 5);
    var start = end - 5;

    if ((start < 0) || (start >= fields.length)) {
        return null;
    }

    var usedFields = fields.slice(start, end);

    return {
        color: util.getEmbedColor(client.user.id),
        author: {
            name: client.user.username,
            icon_url: client.user.avatarURL()
        },
        thumbnail: {
            url: "https://file.randev.xyz/bots/spc/SPCTeleKiosk.gif?v=3",
        },
        title: "SPC Commands",
        description: "* mod only command",
        fields: usedFields,
        timestamp: new Date(),
        footer: {
            text: `Page ${page}/${Math.ceil(fields.length / 5)}`
        }
    };
}