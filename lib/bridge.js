const { RenderingAudioContext, StreamAudioContext } = require("@descript/web-audio-js");
const crypto = require("crypto");

module.exports = {
    queue: [],

    assignBridge: async function(guildId) {
        let index = this.queue.findIndex(b => b.guildId === guildId);
        if (index !== -1) {
            return;
        }
        
        let bridge = this.queue.find(b => !b.guildId);
        if (!bridge) {
            bridge = await this.createBridge();
        } else {
            bridge.backend.status = 0;
            bridge.backend.contextOverride = new StreamAudioContext({
                sampleRate: 48000
            });
            bridge.backend.initialize();
        }

        bridge.guildId = guildId;
        return bridge.backend;
    },

    unassignBridge: function(guildId) {
        let index = this.queue.findIndex(b => b.guildId === guildId);
        if (index === -1) {
            return false;
        }

        const bridge = this.queue[index];
        delete bridge.guildId;

        this.queue.splice(index, 1);
        this.queue.unshift(bridge);
        bridge.backend.context.close();

        return true;
    },

    createBridge: async function(render) {
        var path = "@smwcentral/spc-player";
        var spc = require(path);
        var backend = spc.SMWCentral.SPCPlayer.Backend;

        if (render) {
            backend.contextOverride = new RenderingAudioContext({
                sampleRate: 48000
            });
        } else {
            backend.contextOverride = new StreamAudioContext({
                sampleRate: 48000
            });
        }

        delete require.cache[require.resolve(path)];
        await new Promise(resolve => {
            var notReady = () => {
                setTimeout(() => {
                    if (backend.status === 0) {
                        notReady();
                    } else {
                        resolve();
                    }
                }, 100);
            }
            notReady();
        });

        const hash = crypto.randomBytes(10).toString("hex");
        const bridge = {
            spc,
            id: hash,
            backend
        };

        if (!render) {
            this.queue.push(bridge);
        }
        
        return bridge;
    },

    destroyBridge: function(guildId) {
        let index = this.queue.findIndex(b => b.guildId === guildId);
        if (!index) {
            return false;
        }

        const bridge = this.queue[index];
        bridge.backend.stopSPC();
        bridge.backend.context.AudioContext.close();

        delete bridge.guildId;
        delete bridge.spc;
        delete bridge.backend;

        this.queue.splice(index, 1);

        return true;
    }
}