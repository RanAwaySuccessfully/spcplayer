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

        var string = commands[1];

        if (!string) {
            message.channel.send("You need to specifiy the position of the track you want to remove.");
            return;
        }

        var match = string.match(/(\d+)(<-|->|<->)(\d+)/);

        if (!match || isNaN(match[1]) || isNaN(match[3])) {
            message.channel.send("To move a track, type in either: `1<-5` (move track #5 to position 1), `10->45` (move track #10 to position 45), `12<->7` (swap tracks #12 and #7).");
            return;
        }

        var index1 = Number(match[1]);
        var index2 = Number(match[3]);
        index1--;
        index2--;
        if (!session.queue[index1] || !session.queue[index2]) {
            message.channel.send("Invalid positions. Make sure there's a track in both those spots.");
            return;
        }

        switch (match[2]) {
            case "<-": {
                let track = session.queue[index2];
                session.queue.splice(index2, 1);
                session.queue.splice(index1, 0, track);
                message.channel.send("Moved track #" + (index2 + 1) + " to #" + (index1 + 1) + "!");
                break;
            }
            case "->": {
                let track = session.queue[index1];
                session.queue.splice(index1, 1);
                session.queue.splice(index2, 0, track);
                message.channel.send("Moved track #" + (index1 + 1) + " to #" + (index2 + 1) + "!");
                break;
            }
            case "<->": {
                let track = session.queue[index1];
                session.queue[index1] = session.queue[index2];
                session.queue[index2] = track;
                message.channel.send("Swapped tracks #" + (index1 + 1) + " and #" + (index2 + 1) + "!");
                break;
            }
            default:
                message.channel.send("Unknown action `" + match[2] + "`. This message should never appear.");
        }
    }
}