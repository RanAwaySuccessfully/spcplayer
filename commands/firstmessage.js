"use strict";
const util = require("../lib/util");
module.exports = {
    command: async function(message, commands) {
        var config = await util.db.getServerConfig(message.guild.id);
        if (!message.member.permissions.has("MANAGE_GUILD")) {
            message.channel.send("You need **Manage Server** permissions to change this.");
            return;
        }

        var text = config.firstMessage ? "enabled" : "disabled";
        if (!commands[1]) {
            message.channel.send("If enabled, once I join a voice channel I'll imediatelly post a help message there. It's currently set to `" + text + "`.\n" + 
                "You can type in either `" + config.prefix + " first-message enable` or `" + config.prefix + " first-message disable` at the end of the previous command to change it.");
            return;
        }

        var boolean = null;
        if (commands[1] === "enable") {
            boolean = true;
        } else if (commands[1] === "disable") {
            boolean = false;
        }

        if (boolean === null) {
            return;
        }

        await util.db.saveFirstMessage(message.guild.id, boolean);
        var msgReply = boolean ? "I'll now send a help message whenever I first join a voice channel!" : 
            "I'll no longer send a help message whenever I first join a voice channel.";
        message.channel.send(msgReply);

    }
};