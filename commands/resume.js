"use strict";
const { AudioPlayerStatus } = require("@discordjs/voice");
const util = require("../lib/util");

module.exports = {
    command: async function(message, commands) {
        var session = util.cache[message.guild.id];
        if (session && session.connection && (session.player.state.status === AudioPlayerStatus.Paused) && session.current) {
            session.backend.resume();
            session.player.unpause();
            message.channel.send("Resuming playthrough...");

            util.fadeOutAndNext(message, session);
        } else {
            message.channel.send("Nothing to resume.");
        }
    }
}