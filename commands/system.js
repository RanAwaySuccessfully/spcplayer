"use strict";
const util = require("../lib/util");
const os = require("os");

module.exports = {
    command: async function(message, commands) {
        let memoryUsage = process.memoryUsage();
        let platform = os.platform();
        message.channel.send(
            `<@${message.client.user.id}> [uptime: ${util.formatTime(message.client.uptime)}] [ping: ${message.client.ws.ping}ms]\n` + 
            `**Powered by:** node.js ${process.version} [os: ${platform}] [pid: ${process.pid}]\n` + 
            `**Memory:** ${ bytesToMB(memoryUsage.rss) }MB [heap: ${ bytesToMB(memoryUsage.heapUsed) }MB / ${ bytesToMB(memoryUsage.heapTotal) }MB]` + 
                ` [ext: ${ bytesToMB(memoryUsage.external) }MB]`
        );
    }
}

function bytesToMB(bytes) {
    return Math.round(bytes / 1024 / 1024);
}