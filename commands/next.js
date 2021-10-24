"use strict";
const util = require("../lib/util");

module.exports = {
    command: async function(message, commands, override) {
        var session = util.checkSession(message);
        if (!session) {
            return;
        }

        if (!override && !util.checkUserVoiceChannel(message, session)) {
            return;
        }

        if (session._next) {
            if (override) {
                message.channel.send("Hey! I was just about to switch to the next track... 🙁");
            } else {
                message.channel.send("I'm still processing a request. Please wait a bit.");
            }
            return;
        }

        var next = session.queue[0];
        if (!next) {
            if (!session.current) {
                message.channel.send("I don't have anything to play next.");
                return;
            }

            message.channel.send("End of queue.");

            session.backend.stopSPC();
            session.player.pause();
            delete session.current;

            util.resetAudioPipe(session);
            util.addInactiveTimeout(message.guild, session);

            return;
        }

        clearTimeout(session._timeout);
        session._next = true;
        session.current = session.queue.shift();

        session.player.pause();
        
        await util.resetAudioPipe(session);
        delete session._next;
        var embed = util.getSPCEmbed(message.client, session.current);

        if (session.queue.length) {
            embed.footer.text += "\nNext Up: " + session.queue[0].name
        } else {
            embed.footer.text += "\nNext Up: Nothing"
        }

        message.channel.send({embeds: [embed]}).catch(util.handleError.bind(message));

        util.fadeOutAndNext(message, session);
    }
}