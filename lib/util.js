"use strict";
const fs = require("fs").promises;
const path = require("path");
const crypto = require("crypto");
const https = require("https");
const stream = require("stream");
const db = require("../db/sqlite");
const bridge = require("./bridge");

const { createAudioResource, StreamType, AudioPlayerStatus } = require("@discordjs/voice");

module.exports = {

    bridge,
    db,
    cache: {},
    const: {
        closeEmote: "897127384531214356",
        embedColor: 0x9B59B6,
        embedColorSB: 0xD2BB38,
        uidSCMR: null,
        uidSnesBot: null
    },

    /* FORMATTERS */
    
    formatTime: function(t, isShort, hasMs) {
        var ms = t % 1000;
        ms = parseInt(ms);
        t = Math.floor(t / 1000);
        var s = t % 60;
        t = Math.floor(t / 60);
        var m = t % 60;
        t = Math.floor(t / 60);
        var h = t % 24;
        var d = Math.floor(t / 24);

        if (isShort) {
            h += d * 24;
            m += h * 60;
            return `${this.padNumber(m)}:${this.padNumber(s)}` + (hasMs ? `.${ms}` : "");
        } else {
            return `${this.padNumber(d)}d ${this.padNumber(h)}:${this.padNumber(m)}:${this.padNumber(s)}`;
        }
        
    },
    
    padNumber: function(num, amount) {
        amount = amount || 2;
        num = num.toString();
        while (num.length < amount) {num = "0" + num;}
        return num;
    },

    unformatTime: function(d, h, m, s) {
        d *= 24;
        h += d;
        h *= 60;
        m += h;
        m *= 60;
        s += m;
        s *= 1000;
        return s; // milliseconds
    },

    /* REACTIONS */

    addPagination: function(message, sent) {
        if (this.canIreact(message.channel)) {
            sent.react("⬅");
            sent.react("➡");
        }
    },

    canIreact: function(channel) {
        return channel.permissionsFor(channel.guild.me).has(["ADD_REACTIONS", "READ_MESSAGE_HISTORY"]);
    },

    wipeReactions: function(message, emoji) {
        var myPermissions = message.channel.permissionsFor(message.guild.me);
        if (myPermissions.has("MANAGE_MESSAGES")) {
            message.reactions.cache.forEach(r => {
                if (emoji === r.emoji.name) {
                    r.remove();
                }

                r.users.cache.forEach(user => {
                    if (user.id !== message.client.user.id) {
                        r.users.remove(user);
                    }
                });
            });
        }
    },

    /* UTILITY FUNCTIONS */
    
    addInactiveTimeout: async function(guild, session) {
        var config = await this.db.getServerConfig(guild.id);
        var timeout = config.inactive || 10;
        timeout *= 60000;

        session._inactive = setTimeout(() => {
            if (session && session.connection) {
                let channel = guild.me.voice.channel;
                if (!channel) {
                    delete session.connection;
                    return;
                }

                let memberCount = channel.members.size;
                let memberFirst = channel.members.first();
                if (!session.current || (session._empty && (memberCount === 1) && (memberFirst.id === channel.client.user.id))) {
                    this.runCommand("leave", [null, null, session._channel]).catch(this.handleError);
                } else {
                    console.log(Date.now());
                    console.log("Tried to leave due to inactivity, while not being inactive. This is an error!");
                    console.trace();
                    console.log(session);
                }
            }
        }, timeout);
    },

    checkSession: function(message) {
        var session = this.cache[message.guild.id];
        if (!session || !session.connection) {
            if (message.channel) {
                message.channel.send("I'm not in any voice channel at the moment.");
            }
            return;
        }

        return session;
    },

    checkUserVoiceChannel: async function(message, session) {
        var channel = message.member.voice.channel;
        if (!channel) {
            message.channel.send("It doesn't look like you're in a voice channel.");
            return;
        }

        if (session && session.connection) {
            const voiceChannel = message.guild.me.voice.channel;
            if (!voiceChannel) {
                await message.channel.send("Just a sec! I wasn't aware that I got disconnected from the voice channel. I need to do a bit of cleaning first.");
                await this.runCommand("leave", [null, [null, 3], session._channel]).catch(this.handleError);
                return channel;
            }

            if (!channel || (voiceChannel.id !== channel.id)) {
                message.channel.send("You'll need to switch channels before running this command.");
                return;
            }
        }

        return channel;
    },

    fadeOutAndNext: function(message, session) {
        if (session.loop || !session.current) {
            return;
        }
        
        var time = session.current.info.duration - session.backend.getTime();
        time *= 1000;

        session._timeout = setTimeout(() => {
            if (!session.current) {
                return;
            }

            var fadeout = session.current.info.fadeout;

            session.backend.setVolume(session.backend.getVolume());
            session.backend.setVolume(0, fadeout / 1000);

            session._next = true;

            setTimeout(() => {
                if (!session) {
                    return;
                }

                delete session._next;

                if (!session.connection || (session.player.state.status === AudioPlayerStatus.Paused)) {
                    return;
                }

                this.runCommand("next", [message, null, true]).catch(this.handleError.bind(message));

            }, fadeout + 500);
        }, time);
    },

    getEmbedColor: function(id) {
        const array = [0x2F62B3, 0xD2BB38, 0x1FB27A, 0xD92626];
        const index = crypto.randomInt(array.length);
        return this.isSCMR(id) ? array[index] : this.isSnesBot(id) ? this.const.embedColorSB : this.const.embedColor;
    },

    getFileHash: function(file) {
        const hash = crypto.createHash("sha256");
        hash.update(file);
        return hash.digest("hex");
    },

    getFilePath: function(filepath) {
        return path.join(__dirname, "../", filepath);
    },

    getSPCData: function(file, name) {
        var spcHeader = file.slice(0x00, 0x21).toString();
        if (spcHeader !== "SNES-SPC700 Sound File Data v0.30") {
            return "File does not appear to be a valid SPC (missing header).";
        }

        var info = {
            title: file.slice(0x2E, 0x4E).toString().replace(/\0/g, ""),
            game: file.slice(0x4E, 0x6E).toString().replace(/\0/g, ""),
            exportedBy: file.slice(0x6E, 0x7E).toString().replace(/\0/g, ""),
            comments: file.slice(0x7E, 0x9E).toString().replace(/\0/g, ""),
            exportedAt: file.slice(0x9E, 0xA9).toString().replace(/\0/g, ""),
            duration: Number(file.slice(0xA9, 0xAC).toString().replace(/\0/g, "")),
            fadeout: Number(file.slice(0xAC, 0xB1).toString().replace(/\0/g, "")),
            artist: file.slice(0xB1, 0xD1).toString().replace(/\0/g, "")
        };

        if (isNaN(info.duration) || isNaN(info.fadeout)) {
            let temp = {
                duration: file.slice(0xA9, 0xAC).readUInt16LE(),
                fadeout: file.slice(0xAC, 0xB0).readUInt16LE(),
                artist: file.slice(0xB0, 0xD1).toString().replace(/\0/g, "")
            };

            if (!isNaN(temp.duration) && !isNaN(temp.fadeout)) {
                info = Object.assign(info, temp);
            }
        }

        if (isNaN(info.duration)) {
            info.duration = 0;
        }

        if (isNaN(info.fadeout)) {
            info.fadeout = 0;
        }

        return {
            buffer: file,
            name,
            info
        };
    },

    getSPCEmbed: function(client, spc) {
        var totalTime = this.formatTime(spc.info.duration * 1000, true);
        var embed = {
            color: this.getEmbedColor(client.user.id),
            author: {
                name: client.user.username,
                icon_url: client.user.avatarURL()
            },
            thumbnail: {
                url: "https://file.randev.xyz/bots/spc/SPCTelePlay.gif"
            },
            title: "Now Playing",
            description: "`" + spc.name + "`",
            fields: [
                {
                    name: "Title",
                    value: spc.info.title.trim() || "(unknown)",
                    inline: true
                },
                {
                    name: "Game",
                    value: spc.info.game.trim() || "(unknown)",
                    inline: true
                },
                {
                    name: "Exported by",
                    value: spc.info.exportedBy.trim() || "(unknown)",
                    inline: true
                },
                {
                    name: "Comments",
                    value: spc.info.comments.trim() || "(unknown)",
                    inline: true
                },
                {
                    name: "Exported at",
                    value: spc.info.exportedAt.trim() || "(unknown)",
                    inline: true
                },
                {
                    name: "Artist",
                    value: spc.info.artist.trim() || "(unknown)",
                    inline: true
                }
            ],
            footer: {
                text: `Track length: ${totalTime} / Fadeout: ${spc.info.fadeout}ms`
            }
        };
        
        if (spc.requestedBy) {
            embed.description += "\n**Requested by:** <@" + spc.requestedBy + ">";
        }

        return embed;
    },

    isSCMR: function(id) {
        return (id === this.const.uidSCMR);
    },

    isSnesBot: function(id) {
        return (id === this.const.uidSnesBot);
    },

    isValidUrl: function(string) {
        try {
            new URL(string);
        } catch (error) {
            return false;
        }
      
        return true;
    },

    makeRequest: function(options, noBody) {
        var body = [];
        return new Promise((resolve, reject) => {
            var request = https.request(options, response => {
                if (noBody) {
                    resolve(response);
                } else {
                    response.on("data", (chunk) => body.push(chunk));
                    response.on("end", () => {
                        resolve({
                            response,
                            body: Buffer.concat(body)
                        });
                    });
                }
            });
            
            request.on("error", reject);
            request.end();
        });
    },

    resetAudioPipe: async function(session, time) {
        //delete session.pipe;

        session.backend.pause();
        session.player.pause();
        session.backend.setVolume(1);

        if (!session.current) {
            return;
        }

        //session.pipe = new stream.PassThrough();
        //session.backend.context.pipe(session.pipe);

        try {
            if (time) {
                session.backend.loadSPC(session.current.buffer, time);
            } else {
                session.backend.loadSPC(session.current.buffer);
            }
        } catch (error) {
            if (error.message === "Cannot play SPC right now") {
                session._channel.send("Reinitializing internal SPC engine...");
                bridge.unassignBridge(session._channel.guildId);
                bridge.assignBridge(session._channel.guildId);
                this.resetAudioPipe(session, time);
                return;
            } else {
                this.handleError(error);
            }
        }

        /*const resource = createAudioResource(session.pipe, {
            inputType: StreamType.Raw
        });*/

        //session.player.play(resource);
        delete session._next;

        /*
        session.player.once(AudioPlayerStatus.Playing, () => {
            session.backend.setVolume(1);
        });
        */

        session.player.unpause();
    },

    runCommand: function(name, args) {
        return require("../commands/" + name).command(...args);
    },

    searchRole: async function(guild, name) {
        var roles = await guild.roles.fetch();
        var results = roles.cache.filter(role => {
            var rolename = role.name.toLowerCase();
            var lowercaseName = name.toLowerCase();
            return rolename.includes(lowercaseName);
        });

        if (results.size === 1) {
            return results.first();
        } else if (results.size === 0) {
            return "couldn't find any roles with that name.";
        } else {
            results = results.sort((a, b) => b.members.size - a.members.size);
            results = results.map(role => `\n<@&${role.id}> (${role.id}) - ${role.members.size} member${ (role.members.size === 1) ? '' : 's' }`);
            var msgReply = "there's " + results.length + " roles with that name.\n" + results.join("") + "\n\nNote: member count may be inaccurate";
            if (msgReply.length > 2000) {
                msgReply = "too many roles to list: " + results.length;
            }
            return msgReply;
        }
    },
    
    handleError: function(error) {
        var hash = crypto.randomBytes(5).toString("hex");
        var errorTxt = "\n\n-- ERROR [ID: " + hash + "] [g: " + this?.guildId + "] [w: " + new Date().toISOString() + "]:\n" + (error.stack || error);
        //var errorTxt = "Error (ID: " + hash + ") at " + new Date().toISOString() + "\n" + error;
        
        console.error(errorTxt);
        console.trace();

        /*
        if (process.env.NODE_ENV !== "development") {
            fs.appendFile("./logs/error.log", errorTxt + "\n\n");
        } else {
            console.log(errorTxt);
            //console.log("ID: " + hash);
            //console.error(error);
        }
        */
    
        if (this && this.reply) {
            this.reply({
                content: "An unexpected error occurred. This will be saved on error log with the following ID: `" + hash + "`.\n" + 
                    "If this error was caused by a bug in the bot's code, the error log will make fixing it easier.\n" + 
                    "You can also contact the bot developer directly about this (more info available using the `about` command).",
                allowedMentions: {
                    repliedUser: false
                }
            });
        }
    }
}
