"use strict";
const util = require("../lib/util");

module.exports = {
    command: async function(message, commands, override) {
        var channel = override || message.channel;

        var session = util.checkSession(channel);
        if (!session) {
            channel.send("I'm not in any voice channel at the moment.");
            return;
        }

        
        if (!override && !check) {
            var check = await util.checkUserVoiceChannel(message, session);
            if (!check) {
                return;
            }
        }

        if (commands && (commands[1] !== 3)) {
            session.player.stop();
            session.connection.destroy();
        }

        clearTimeout(session._timeout);
        clearTimeout(session._inactive);

        session.noQueueMode = false;
        delete session._channel;
        delete session.current;
        delete session.connection;
        delete session.player;
        delete session.backend;
        
        util.bridge.unassignBridge(channel.guild.id);

        var sent = await channel.send("Leaving channel...");
        var options = commands ? (typeof commands[1] === "number") ? commands[1] : commands.slice(1).join(" "): null;

        switch (options) {
            case 3:
                sent.edit("Cleaning complete. Session data should be synced now (hopefully).");
                break;
            case 2:
                sent.edit("Left the channel due to being moved. The track queue was saved for later.");
                break;
            case 1:
                session.queue.forEach((value, index) => delete session.queue[index]);
                sent.edit("I was forcefully disconnected.");
                break;
            case "and save":
                sent.edit("Left the channel and saved the track queue for later.");
                break;
            case "and destroy":
                session.queue.forEach((value, index) => delete session.queue[index]);
                sent.edit("Left the channel and cleared the track queue, and destroyed the session.");
                delete util.cache[message.guild.id];
                break;
            default:
                session.queue.forEach((value, index) => delete session.queue[index]);
                if (override) {
                    sent.edit("Left the channel and cleared the track queue due to inactivity.");
                } else {
                    sent.edit("Left the channel and cleared the track queue.");
                }
        }
        
    }
}