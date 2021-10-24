"use strict";
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

        session.queue = [];
        message.channel.send("Queue cleared!");
    }
}