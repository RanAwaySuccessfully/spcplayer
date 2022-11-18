"use strict";
const { createAudioPlayer, joinVoiceChannel, NoSubscriberBehavior } = require("@discordjs/voice");
const util = require("../lib/util");

module.exports = {
    command: async function(message, commands, noFirstTimeHelp) {
        var session = util.cache[message.guild.id];
        var channel = await util.checkUserVoiceChannel(message, session);
        if (!channel) {
            return;
        }

        if (session && session.connection && (channel.id === message.guild.me.voice.channel.id)) {
            message.channel.send("I'm already here.");
            return;
        }

        var myPermissions = channel.permissionsFor(message.guild.me);
		if (!myPermissions.has("VIEW_CHANNEL") || !myPermissions.has("CONNECT")) {
            message.channel.send("I don't have permission to view and/or connect to that channel.");
            return;
        }

        if (!myPermissions.has("SPEAK")) {
            message.channel.send("I don't have permission to speak in that channel.");
            return;
        }
    
        var sent = await message.channel.send(`Joining <#${channel.id}>...`).catch(util.handleError.bind(message));

        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
            selfDeaf: true
        });

        const player = createAudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Pause,
            }
        });

        player.on("error", util.handleError.bind(this));
        connection.subscribe(player);

        if (!session) {
            util.cache[message.guild.id] = session = {};
        }
        
        if (!session.backend) {
            session.backend = await util.bridge.assignBridge(message.guild.id);
        }

        session.noQueueMode = false;
        session.player = player;
        session.connection = connection;
        session.queue = [];
    
        sent.edit(`Joined <#${channel.id}>!`);

        session._channel = message.channel;
        util.addInactiveTimeout(message.guild, session);

        util.db.getServerConfig(message.guild.id).then(config => {
            if (!noFirstTimeHelp && config.firstMessage) {
                util.runCommand("help", [message, []]).catch(util.handleError.bind(message));
            }
        });
    
        return session;
    }
}