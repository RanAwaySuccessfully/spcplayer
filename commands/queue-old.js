"use strict";
const util = require("../lib/util");

module.exports = {
    command: async function(message, commands) {
        var session = util.cache[message.guild.id];
        if (!session || !session.current) {
            message.channel.send("Nothing queued up.");
            return;
        }

        var queue = session.queue.map((q, index) => {
            var formattedTime = util.formatTime(q.info.duration * 1000, true);
            return `${index+1}: \`${q.name}\` (${formattedTime})`;
        });
        if (!queue.length) {
            queue.push("(nothing)");
        }

        var currentTime = util.formatTime(session.backend.getTime() * 1000, true);
        var totalTime = util.formatTime(session.current.info.duration * 1000, true);

        message.channel.send({
            embeds: [{
                color: util.getEmbedColor(message.client.user.id),
                author: {
                    name: message.client.user.username,
                    icon_url: message.client.user.avatarURL()
                },
                title: "Queue",
                description: `**Currently Playing:**\n\`${session.current.name}\` **(${currentTime} / ${totalTime})**\n\n**Next up**:\n${queue.join("\n")}`,
                //timestamp: new Date(),
                footer: {
                    text: "Do `!spc queue 2` to view the next page."
                }
            }]
        });
    }
}