"use strict";
const util = require("../lib/util");

module.exports = {
    command: async function(message, commands, override) {
        var config = await util.db.getServerConfig(message.guild.id);
        var session = util.checkSession(message);
        if (!session) {
            return;
        }

        if (override) {
            commands[1] = override;
        }

        switch (commands[1]) {
            case !isNaN(commands[1]): {
                message.channel.send("Looping each song for a set amount of loops is currently not supported. 😔");
                break;
            }
            case "enable":
                session.loop = true;
                message.channel.send("Tracks will now loop indefinitely. Use `" + config.prefix + " next` to skip to the next one.");
                clearTimeout(session._timeout);
                util.fadeOutAndNext(message, session);
                break;
            case "disable":
                session.loop = false;
                message.channel.send("Tracks will now play until the end of their specified duration. Note that SPCs with malformatted headers may be skipped entirely.");
                clearTimeout(session._timeout);
                util.fadeOutAndNext(message, session);
                break;
            case undefined:
            default:
                var currentState = session.noLoop ? "not loop" : "loop";
                message.channel.send("Currently set to " + currentState + " tracks. You can change this by adding `enable` or `disable` at the end of this command.");
        }
        
    }
}