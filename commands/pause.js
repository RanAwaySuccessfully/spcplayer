"use strict";
const { AudioPlayerStatus } = require("@discordjs/voice");
const util = require("../lib/util");

module.exports = {
    command: async function(message, commands) {
        var session = util.checkSession(message);
        if (!session) {
            return;
        }

        if (!util.checkUserVoiceChannel(message, session)) {
            return;
        }

        if (session.player.state.status === AudioPlayerStatus.Paused) {
            message.channel.send("I'm not playing anything at the moment.");
            return;
        }

        clearTimeout(session._timeout);

        session.player.pause();
        session.backend.pause();
        message.channel.send("Paused!");
    }
}