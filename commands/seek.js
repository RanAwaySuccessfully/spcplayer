"use strict";
const util = require("../lib/util");

module.exports = {
    command: async function(message, commands) {
        var session = util.cache[message.guild.id];
        if (!session || !session.connection) {
            message.channel.send("I'm not in any voice channel at the moment.");
            return;
        }

        if (!util.checkUserVoiceChannel(message, session)) {
            return;
        }

        if (!session.current) {
            message.channel.send("I'm not playing anything at the moment.");
            return;
        }

        if (session._next) {
            message.channel.send("I'm still processing a request. Please wait a bit.");
            return;
        }

        if (!commands[1]) {
            message.channel.send("You need to tell me which time do you want me to skip to.");
            return;
        }

        var match = commands[1].match(/(?:(\d+):)?(\d+)/);
        if (!match) {
            message.channel.send("That doesn't look like a valid time format. Write it as `1:30` (1 minute 30 seconds) or just `23` (23 seconds) for example.");
            return;
        }

        var m = Number(match[1]) || 0;
        var s = Number(match[2]) || 0;
        var total = Number(Math.round(util.unformatTime(0, 0, m, s) / 1000));
        if (total > session.current.info.duration) {
            message.channel.send("For performance reasons, I will not skip to a time that is larger than the track length.");
            return;
        }

        clearTimeout(session._timeout);
        session._next = true;

        session.player.pause();
        session.backend.pause();

        await util.resetAudioPipe(session, total);
        delete session._next;

        var totalTime = util.formatTime(total * 1000, true);
        message.channel.send("Seeked to " + totalTime + "!");
        
        util.fadeOutAndNext(message, session);
    }
}