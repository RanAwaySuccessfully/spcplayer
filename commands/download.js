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

        message.channel.send({
            files: [
                {
                    attachment: session.current.buffer,
                    name: session.current.name
                }
            ]
        });

    }
};