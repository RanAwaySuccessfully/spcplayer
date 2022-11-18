"use strict";
const util = require("../lib/util");
const crypto = require("crypto");

module.exports = {
    command: async function(message, commands) {
        var session = util.checkSession(message);
        if (!session) {
            return;
        }

        if (!session.queue.length) {
            message.channel.send("Nothing queued up.");
            return;
        }

        if (!await util.checkUserVoiceChannel(message, session)) {
            return;
        }

        session.queue = shuffler(session.queue);
        message.channel.send("Shuffled the queue!");
    }
}

function shuffler(oldArray, newArray) {
    if (!newArray) {
        newArray = [];
    }

    var index = crypto.randomInt(oldArray.length);
    newArray.push(oldArray[index]);
    oldArray.splice(index, 1);

    if (oldArray.length) {
        return shuffler(oldArray, newArray);
    } else {
        return newArray;
    }
}