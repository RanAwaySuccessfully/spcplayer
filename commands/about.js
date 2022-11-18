"use strict";
const child_process = require("child_process");
const util = require("../lib/util");
const os = require("os");

module.exports = {
    command: async function(message) {
        var json = await runCommand("npm list --json", {}).catch((obj) => obj.stdout || undefined);
        var libs = "**(unable to fetch library list)**";
        if (json) {
            libs = JSON.parse(json);
            libs = Object.entries(libs.dependencies).map(([key, value]) => `**${key}** (v${value.version})`);
            libs = libs.join("\n");
        }
    
        let realGuildCount = message.client.guilds.cache.size;
        let memberCount = message.client.users.cache.size;
    
        const memoryUsage = process.memoryUsage();
        const platform = os.platform();
    
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
            description: "[**RanAwaySuccessfully:** Bot developer](https://twitter.com/RanNowhere '@RanNowhere - Twitter')\n" + 
                "[**Mr Scotsman:** Artist](https://twitter.com/Mr__Scotsman '@Mr__Scotsman - Twitter')\n\n" + 
                "And the following libraries:\n" + 
                libs + "\n\n" + 
                `**Powered by:** node.js ${process.version} on ${platform}\n` + 
                `**Memory:** ${ bytesToMB(memoryUsage.rss) }MB [heap: ${ bytesToMB(memoryUsage.heapUsed) }MB / ${ bytesToMB(memoryUsage.heapTotal) }MB]` + 
                    ` [ext: ${ bytesToMB(memoryUsage.external) }MB]\n` + 
                `**Uptime:** ${ util.formatTime(message.client.uptime) } [pid: ${process.pid}]`,
            fields: [
                {
                    name: "Servers:",
                    value: realGuildCount.toString(),
                    inline: true
                },
                {
                    name: "Users (cached):",
                    value: memberCount.toString(),
                    inline: true
                },
                {
                    name: "Ping:",
                    value: message.client.ws.ping + "ms",
                    inline: true
                }
            ]
        };

        if (!util.isSCMR(message.client.user.id)) {
            embed.footer = {
                text: "If you want to be kept up to date to any changes or announcements about this bot, or if you need help with any feature or want to report a bug,"
                    + " feel free to join the support server by sending me a DM with the word 'invite'!"
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

function bytesToMB(value) {
    return Math.round(value / 1024 / 1024);
}

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