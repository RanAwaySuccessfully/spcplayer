"use strict";
const util = require("../lib/util");
const stream = require("stream");
const JSZip = require("jszip");
const { createAudioResource, StreamType, AudioPlayerStatus } = require("@discordjs/voice");

module.exports = {
    command: async function(message, commands) {
        var session = util.cache[message.guild.id];
        if (!util.checkUserVoiceChannel(message, session)) {
            return;
        }

        var acceptedFormats = [".spc", ".zip"];

        var url;
        var name;
        var attachment = message.attachments.first();
        if (attachment && acceptedFormats.some(f => attachment.name.endsWith(f))) {
            url = attachment.url;
            name = attachment.name;
        } else if (util.isValidUrl(commands[1])) {
            url = commands[1];
            let match = commands[1].match(/\/([^/]+)$/);
            name = match ? match[1] : "(unknown)";
        } else {
            if (session && session.connection && (session.player.state.status === AudioPlayerStatus.Paused) && session.current) {
                util.runCommand("resume", [message, commands]);
            } else {
                message.channel.send("No SPC file attached.");
            }
            return;
        }

        var response = await util.makeRequest(url).catch(util.handleError.bind(message));
        if (!response || !response.body || (response.response.statusCode !== 200)) {
            message.channel.send("Could not fetch SPC file.");
            return;
        }

        if (session && session.connection) {
            if (!message.member.voice.channel || (message.guild.me.voice.channel.id !== message.member.voice.channel.id)) {
                message.channel.send("You'll need to switch channels before running this command.");
                return;
            }
        } else {
            session = await util.runCommand("join", [message, commands, true]);
            if (!session) {
                return;
            }
        }

        var file = response.body;
        var zipHeader = file.slice(0x00, 0x04).toString("hex");
        if (zipHeader !== "504b0304") {
            let error = await addSPC(message, file, session, name, url);
            if (error) {
                message.channel.send(error);
            }
            return;
        }

        var zip = new JSZip();
        await zip.loadAsync(file);
        var entries = zip.file(/\.spc$/);
        if (!entries[0]) {
            message.channel.send("ZIP file does not contain an SPC.");
            return;
        }

        var promises = entries.map(entry => entry.async("nodebuffer"));
        var files = await Promise.all(promises);
        var errorPromises = files.map((file, index) => {
            let name = entries[index].name.match(/\/?([^/]+)$/)[1];
            return addSPC(message, file, session, name, url);
        });
        var errors = await Promise.all(errorPromises);
        var string = errors.filter(a => a).join("\n");
        if (string) {
            if (string.length > 2000) {
                message.channel.send({
                    files: [
                        {
                            attachment: Buffer.from(string),
                            name: "error-log.txt"
                        }
                    ]
                });
            } else {
                message.channel.send("```\n" + string + "```");
            }
        }

    }
}

async function addSPC(message, file, session, name, url) {
    if (session.queue.length >= 50) {
        return "No more than 50 songs may be added to the queue.";
    }

    var spcFileObj = util.getSPCData(file, name);
    if (typeof spcFileObj === "string") {
        return spcFileObj;
    }

    spcFileObj.url = url;
    spcFileObj.requestedBy = message.author.id;

    if (session.current) {
        session.queue.push(spcFileObj);

        if (session.noQueueMode) {
            util.runCommand("next", [message, null, true]);
            return;
        }

        let embed = util.getSPCEmbed(message.client, spcFileObj);
        embed.title = "Queued up at position #" + session.queue.length;
        embed.thumbnail = {
            url: "https://file.randev.xyz/bots/spc/SPCTeleLoad.gif",
        };
        message.channel.send({embeds: [embed]});
    } else {
        session.pipe = new stream.PassThrough();

        session.backend.context.pipe(session.pipe);
        session.backend.setVolume(1);
        session.backend.loadSPC(file);
        
        session.current = spcFileObj;
        session.loop = session.loop || false;

        let embed = util.getSPCEmbed(message.client, session.current);
        embed.title = "Queue Started";
        message.channel.send({embeds: [embed]}).catch(util.handleError.bind(message));

        const resource = createAudioResource(session.pipe, {
            inputType: StreamType.Raw
        });

        session.player.play(resource);

        clearTimeout(session._inactive);
        util.fadeOutAndNext(message, session);
    }
}