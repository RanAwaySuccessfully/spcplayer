"use strict";
const util = require("../lib/util");
const child_process = require("child_process");
const fs = require("fs").promises;

module.exports = {
    command: async function(message, commands, showTime, deleteMessage) {
        if (!util.cache._convert) {
            util.cache._convert = false;
        }

        if (util.cache._convert) {
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
        let fileTypes;
        let maxSize;

        switch (message.guild.premiumTier) {
            case "NONE":
            case "TIER_1":
                maxSize = 8388608;
                fileTypes = {
                    "wav": 40,
                    "mp3": 330,
                    "flac": 70,
                    "funny": 70
                };
                break;
            case "TIER_2":
                maxSize = 52428800;
                fileTypes = {
                    "wav": 250,
                    "mp3": 900,
                    "flac": 400,
                    "funny": 400
                };
                break;
            case "TIER_3":
                maxSize = 104857600;
                fileTypes = {
                    "wav": 500,
                    "mp3": 900,
                    "flac": 850,
                    "funny": 850
                };
                break;
        }

        let length = fileTypes[option];
        if (!length) {
            message.channel.send("Unsupported format. Supported formats are: `wav`, `flac` (default) and `mp3`.");
            return;
        }

        if (spcDuration && (spcDuration < length)) {
            length = spcDuration;
        }

        const lengthDate = new Date(length * 1000);
        const lengthString = lengthDate.toISOString().match(/T(.+)Z$/)[1];

        util.cache._convert = true;

        const time = Date.now();
        const temp = message.channel.send("Converting SPC to " + option.toUpperCase() + "...");

        let prefix = "./";
        if (util.isSnesBot(message.client.user.id)) {
            prefix = "./spc/";
        }

        //const memoryLimit = 100;
        const child = child_process.spawn("nice", ["-n", "19", "node", prefix + "lib/spc2audio2.js", option, lengthString]);
        const stdout = promisify(child.stdout);
        const stderr = promisify(child.stderr);

        if (option === "funny") {
            option = "flac";
        }

        spcName = spcName.replace(/\.spc$/, "." + option);

        stdout.then(buffer => {
            util.cache._convert = false;

            const total = Date.now() - time;
            const string = util.formatTime(total, true, true);

            if (!buffer.length) {
                stderr.then(buffer => {
        
                    if (buffer.length) {
                        temp.then(temp => temp.delete());
                        const errorString = buffer.toString();
                        util.handleError.call(message, "Error while processing SPC file:\n" + errorString);
                        return;
                    } else {
                        temp.then(temp => temp.edit("I didn't run into an error, but I also don't have a converted file to show you. This is extremely odd."));
                    }
                });

                return;
            }

            if (deleteMessage) {
                temp.then(temp => temp.delete());
            } else {
                temp.then(temp => temp.edit("File conversion complete!"));
            }

            if (buffer.length > maxSize) {
                if (showTime) {
                    message.channel.send("Time spent converting the SPC: " + string);
                }

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
            util.cache._convert = false;
            util.handleError.call(message, error);
        });

        const done = child.stdin ? child.stdin.write(Buffer.from(spcBuffer)) : true;
        if (!done) {
            child.stdin.on("drain", () => {
                child.stdin.end();
            });
        } else {
            child.stdin.end();
        }
    }
}

const promisify = pipe => {
    return new Promise((resolve, reject) => {
        if (!pipe) {
            reject();
            return;
        }
    
        const data = [];
        pipe.on("data", buffer => data.push(buffer));

        pipe.on("end", () => {
            const buffer = Buffer.concat(data);
            resolve(buffer);
        });
    });
};