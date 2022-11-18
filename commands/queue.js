"use strict";
const util = require("../lib/util");

module.exports = {
    command: async function(message, commands) {
        var session = util.checkSession(message);
        if (!session) {
            return;
        }

        var page = Number(commands[1]) || 1;
        var embed = getEmbed(page, message.client, session);
        if (embed) {
            message.channel.send({embeds: [embed]}).then(sent => {
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
            message.channel.send("No queue to display.");
        }
    },

    editEmbed: function(message, page) {
        var session = util.cache[message.guild.id];
        if (!session || !session.current) {
            message.edit("Nothing queued up.");
            return;
        }

        let embed = getEmbed(page, message.client, session);
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

function getEmbed(page, client, session) {

    var queue = session.queue.map((q, index) => {
        var formattedTime = util.formatTime(q.info.duration * 1000, true);
        return `${index+1}: \`${q.name}\` (${formattedTime})`;
    });

    if (!queue.length) {
        queue.push("(nothing)");
    }

    var totalPages = Math.ceil(queue.length / 10);

    var end = (page * 10);
    var start = end - 10;

    if ((start < 0) || (start >= queue.length)) {
        return null;
    }

    var usedTracks = queue.slice(start, end);

    var currentTime = session.backend ? util.formatTime(session.backend.getTime() * 1000, true) : util.formatTime(0, true);
    var totalTime = util.formatTime(session.current.info.duration * 1000, true);
    var currentlyPlaying = `**Currently Playing:**\n\`${session.current.name}\` **(${currentTime} / ${totalTime})**\n\n`;
    var nextUp = "**Next up**:\n" + usedTracks.join("\n");

    return {
        color: util.getEmbedColor(client.user.id),
        author: {
            name: client.user.username,
            icon_url: client.user.avatarURL()
        },
        thumbnail: {
            url: "https://file.randev.xyz/bots/spc/SPCTeleQueue.gif?v=4",
        },
        title: "Queue",
        description: currentlyPlaying + nextUp,
        footer: {
            text: "Page " + page + "/" + totalPages
        }
    };
}