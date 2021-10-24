"use strict";
const child_process = require("child_process");
const util = require("../lib/util");

module.exports = {
    command: async function(message) {
        var json = await runCommand("npm list --json").catch(() => {});
        var libs = "**(unable to fetch library list)**";
        if (json) {
            libs = JSON.parse(json);
            libs = Object.entries(libs.dependencies).map(([key, value]) => `**${key}** (v${value.version})`);
            libs = libs.join("\n");
        }

        var embed = {
            color: util.getEmbedColor(message.client.user.id),
            author: {
                name: message.client.user.username,
                icon_url: message.client.user.avatarURL()
            },
            thumbnail: {
                url: "https://file.randev.xyz/bots/spc/SPCTeleKiosk.gif?v=3",
            },
            title: "Brought to you by:",
            description: "**RanAS:** Bot developer\n" + 
                "**Mr Scotsman:** Artist\n\n" + 
                "And the following libraries:\n" + 
                libs
        };

        if (!util.isSCMR(message.client.user.id)) {
            embed.footer = {
                text: "Want to invite me to your server, or want to join the support server for this bot?\nSend me a DM with the word 'invite'!"
            };
        }

        if (util.isSnesBot(message.client.user.id)) {
            embed.footer = {
                text: "This bot is exclusive to SnesLab, but the SPC Player's features are available as a separate bot. Contact RanAS for more info."
            };

            embed.author.name += " (SPC Player module)";
        }

        message.channel.send({
            embeds: [embed]
        });

    }
};

function runCommand(command) {
    return new Promise((resolve, reject) => {
        child_process.exec(command, (error, stdout, stderr) => {
            if (error) {
                reject({error, stderr});
            }

            resolve(stdout);
        });
    })
}