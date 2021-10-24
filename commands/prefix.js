"use strict";
const util = require("../lib/util");
module.exports = {
    command: async function(message, commands) {
        var config = await util.db.getServerConfig(message.guild.id);
        if (!message.member.permissions.has("MANAGE_GUILD")) {
            message.channel.send("You need **Manage Server** permissions to change the prefix. The current prefix is `" + config.prefix + "`.");
            return;
        }

        if (!commands[1]) {
            message.channel.send("In order to change the current prefix, type in `" + config.prefix + " prefix <newprefix>`.");
            return;
        }

        var prefix = commands.slice(1).join(" ");
        if (prefix.length > 20) {
            message.channel.send("Prefix is too long.");
            return;
        }

        if (!prefix.match(/^[^*_~`/|\s<@;>\\]+$/)) {
            message.channel.send(
                "Prefixes must **not** contain any of the following:\n" +
                "- At signs, double colons, lesser than or greater than signs.\n" + 
                "- Markdown formatting charaters, including backslash.\n" + 
                "- Spaces of any kind."
            );
            return;
        }

        await util.db.savePrefix(message.guild.id, prefix.toLowerCase());
        message.channel.send("Prefix changed to `" + prefix + "`");

    }
};