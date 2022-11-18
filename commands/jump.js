"use strict";
const util = require("../lib/util");

module.exports = {
    command: async function(message, commands) {
        var session = util.checkSession(message);
        if (!session) {
            return;
        }

        if (!await util.checkUserVoiceChannel(message, session)) {
            return;
        }

        var index = commands[1];

        if (!index) {
            message.channel.send("You need to specifiy the position of the track you want to jump to.");
            return;
        }

        if (isNaN(index)) {
            message.channel.send("That's not a valid number.");
            return;
        }

        index = Number(index);
        index--;
        if (!session.queue[index]) {
            message.channel.send("There's no track at that position.");
            return;
        }

        session.queue.splice(0, index);
        message.channel.send("Jumped to track #" + (index + 1) + "!");

        util.runCommand("next", [message, commands]).catch(util.handleError.bind(message));
    }
}