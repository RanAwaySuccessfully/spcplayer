"use strict";
const util = require("../lib/util");
module.exports = {
    command: async function(message, commands) {
        if (!message.member.permissions.has("MANAGE_GUILD")) {
            message.channel.send("You need **Manage Server** permissions to run this command.");
            return;
        }

        var config = await util.db.getServerConfig(message.guild.id);
        var inactivity = config.inactive || 10;

        if (!commands[1]) {
            message.channel.send(`I'll currently leave after ${inactivity} minutes of inactivity. If you want to change that, type in \`${config.prefix} inactive <minutes>\`.`);
            return;
        }

        var number = Math.round(Number(commands[1]));
        if ((number < 0) || isNaN(number) || (number > 60)) {
            message.channel.send("Invalid number. Must be a number between 0 and 60.");
            return;
        }

        await util.db.saveInactive(message.guild.id, number);
        if (!number) {
            number = 10;
        }

        message.channel.send("Inactivity period changed to " + number + " minutes!");

    }
};