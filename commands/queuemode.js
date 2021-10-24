"use strict";
const util = require("../lib/util");

module.exports = {
    command: async function(message, commands) {
        var config = await util.db.getServerConfig(message.guild.id);
        var session = util.checkSession(message);
        if (!session) {
            return;
        }

        if (!util.checkUserVoiceChannel(message, session)) {
            return;
        }

        var voiceChannel = message.member.voice.channel;
        if (voiceChannel.members.size > 2) {
            message.channel.send("You can only disable the queue if you're the only one listening to the bot.");
            return;
        }

        switch (commands[1]) {
            case "enable":
                session.noQueueMode = false;
                message.channel.send("The queue is now enabled. Any new track added will only play after the current one is over, or when `" + config.prefix + " next` is used.");
                break;
            case "disable":
                session.noQueueMode = true;
                message.channel.send("The queue is now disabled. Any new track added will play imediatelly. The queue will automatically be enabled in case anyone else joins this channel, or when I leave this channel.");
                break;
            case undefined:
            default:
                var currentState = session.noQueueMode ? "disabled" : "enabled";
                message.channel.send("The queue is currently " + currentState + ". You can change this by adding `enable` or `disable` at the end of this command.");
        }
        
    }
}