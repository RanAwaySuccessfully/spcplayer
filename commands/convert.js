"use strict";
const util = require("../lib/util");
const child_process = require("child_process");
const fs = require("fs").promises;

module.exports = {
    command: async function(message, commands, showTime) {
        if (!util.cache._convert) {
            util.cache._convert = [];
        }

        if (util.cache._convert.includes(message.guild.id)) {
            message.channel.send("I'm already processing a request. Please wait a bit and try again.");
            return;
        }

        let spcBuffer;
        let spcName;
        let spcDuration;

        if (commands[1] === "this") {
            var session = util.cache[message.guild.id];
            if (!session) {
                message.channel.send("I'm not in any voice channel at the moment.");
                return;
            }
    
            if (!session.current) {
                message.channel.send("I'm not playing anything at the moment.");
                return;
            }

            spcBuffer = session.current.buffer;
            spcName = session.current.name;
            spcDuration = session.current.info.duration;
        } else {
            let name;
            let url;
            let attachment = message.attachments.first();
            if (attachment && attachment.name.endsWith(".spc")) {
                url = attachment.url;
                name = attachment.name;

                if (!commands[2]) {
                    commands[2] = commands[1];
                }

            } else if (util.isValidUrl(commands[1])) {
                url = commands[1];
                let match = commands[1].match(/\/([^/]+)$/);
                name = match ? match[1] : "(unknown)";
            } else {
                const config = await util.db.getServerConfig(message.guild.id);
                message.channel.send("No SPC file attached. Use this command like so: `" + config.prefix + " convert <url> <format>`. You can type the word `this` instead of the URL to grab the song that's currently being played, or also add an SPC as an attachment, in which case you don't need to specify a URL at all.");
                return;
            }

            let response = await util.makeRequest(url).catch(util.handleError.bind(message));
            if (!response || !response.body || (response.response.statusCode !== 200)) {
                message.channel.send("Could not fetch SPC file.");
                return;
            }

            let file = response.body;
            let spc = util.getSPCData(file, name);
            if (typeof spc === "string") {
                message.channel.send(spc);
                return;
            }

            spcBuffer = file;
            spcName = name;
            spcDuration = spc.info.duration;
        }

        let option = commands[2] ? commands[2].toLowerCase() : "flac";
        const fileTypes = {
            "wav": "00:00:40.000",
            "mp3": "00:05:00.000",
            "flac": "00:01:15.000",
            "funny": "00:02:00.000"
        };

        if (spcDuration && (spcDuration < 300)) {
            fileTypes["mp3"] = "00:" + util.formatTime(spcDuration * 1000, true) + ".000";
        }

        const length = fileTypes[option];
        if (!length) {
            message.channel.send("Unsupported format. Supported formats are: `wav` (default), `flac` and `mp3`.");
            return;
        }

        util.cache._convert.push(message.guild.id);

        const time = Date.now();
        const temp = message.channel.send("Converting SPC to " + option.toUpperCase() + "...");

        let prefix = "./";
        if (util.isSnesBot(message.client.user.id)) {
            prefix = "./spc/";
        }

        const child = child_process.spawn("nice", ["-n", "19", "node", prefix + "lib/spc2audio.js", option, length]);
        const data = [];

        if (option === "funny") {
            option = "flac";
        }

        spcName = spcName.replace(/\.spc$/, "." + option);
        
        child.stdout.on("data", function (buffer) {
            data.push(buffer);
        });

        child.stdout.on("end", function () {
            const index = util.cache._convert.indexOf(message.guild.id);
            if (index !== -1) {
                util.cache._convert.splice(index, 1);
            }

            const buffer = Buffer.concat(data);
            const total = Date.now() - time;
            const string = util.formatTime(total, true, true);

            if (!buffer.length) {
                temp.then(temp => temp.edit("Error while processing SPC file."));
                return;
            }

            temp.then(temp => temp.edit("File conversion complete!"));

            if (buffer.length > 8388608) {
                message.channel.send("I generated an audio file larger than 8MB, and I can't upload it.");

                if (process.env.NODE_ENV === "development") {
                    fs.writeFile("./" + spcName, buffer);
                    message.channel.send("File stored in `/" + spcName + "`.");
                }
                return;
            }

            const msgObj = {
                files: [
                    {
                        attachment: buffer,
                        name: spcName
                    }
                ]
            };

            if (showTime) {
                msgObj.content = "Time spent converting the SPC: " + string;
            }

            message.channel.send(msgObj);
        });

        child.on("error", function (error) {
            const index = util.cache._convert.indexOf(message.guild.id);
            if (index !== -1) {
                util.cache._convert.splice(index, 1);
            }
            util.handleError.call(message, error);
        });

        const done = child.stdin.write(Buffer.from(spcBuffer));
        if (!done) {
            child.stdin.on("drain", () => {
                child.stdin.end();
            });
        } else {
            child.stdin.end();
        }
    }
}