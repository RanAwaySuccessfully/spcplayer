"use strict";
const util = require("../lib/util");

module.exports = {
    command: async function(message, commands) {
        // set up a role that is required to use the bot. if no role is specified, no role is required
        // verification will be set up on mainCommands() rather than inside each file individually
        
        if (!message.member.permissions.has("MANAGE_GUILD")) {
            message.channel.send("You need **Manage Server** permissions to run this command.");
            return;
        }

        var config = await util.db.getServerConfig(message.guild.id);
        var role;

        if (!commands[1]) {
            role = message.guild.roles.resolve(config.allowedRole);
            if (role) {
                message.channel.send(
                    "Users currently need the role <@&" + role.id + "> " + 
                    "to interact with me in this server. If you want me to use another role, just tell me its name or ID via: `" + config.prefix + " role <role>` or " + 
                    "you can type `disable` instead of the role name if you don't want any verification."
                );
            } else {
                message.channel.send("If you want me to require a user to have a role before they can interact with me, use the command `" + config.prefix + " role <role>`. You can specify a role's name or ID.");
            }
            return;
        }

        var roleId;
        if (commands[1] === "disable") {
            roleId = null;
        } else {
            var searchString = commands.slice(1).join(" ");
            role = message.guild.roles.resolve(searchString.replace(/\D/g, ""));
            
            if (!role) {
                role = await util.searchRole(message.guild, searchString);
                if (typeof role === "string") {
                    message.channel.send({
                        content: role,
                        allowedMentions: {
                            roles: [],
                            users: []
                        }
                    });
                    return;
                }
            }

            roleId = role.id;
        }

        await util.db.saveAllowedRole(message.guild.id, roleId);

        if (role) {
            message.channel.send(`Any user in this server will now need the \`${role.name}\` role to interact with me.`);
        } else {
            message.channel.send(`Got it. I'll no longer require a user to have any role.`);
        }
    }
}