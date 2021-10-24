"use strict";
const util = require("../lib/util");

module.exports = {
    command: async function(message, commands) {
        var session = util.checkSession(message);
        if (!session) {
            return;
        }

        if (!session.current) {
            message.channel.send("I'm not playing anything at the moment.");
            return;
        }

        var currentTime = util.formatTime(session.backend.getTime() * 1000, true);
        var totalTime = util.formatTime(session.current.info.duration * 1000, true);

        var embed = util.getSPCEmbed(message.client, session.current);
        embed.description = embed.description.replace("\n", ` (**${currentTime} / ${totalTime}**)\n`);
        embed.title = "Currently Playing";

        if (session.queue.length) {
            embed.footer.text += "\nNext Up: " + session.queue[0].name
        } else {
            embed.footer.text += "\nNext Up: Nothing"
        }

        message.channel.send({embeds: [embed]}).catch(util.handleError.bind(message));
    }
}