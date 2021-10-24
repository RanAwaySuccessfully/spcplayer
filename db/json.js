"use strict";
const fs = require("fs").promises;
module.exports = {
    _lib: null,
    _config: null,

    _read: async function() {
        const file = await fs.readFile(this._util.getFilePath("./db/db.json"), "utf-8");
        this._config = JSON.parse(file);
    },

    _save: async function() {
        var config = this._config;
        var json = JSON.stringify(config, null, 2);
        await fs.writeFile(this._util.getFilePath("./db/db.json"), json, "utf-8");
    },
    
    _getUserConfig: function(userId) {
        var config = this._config._users[userId];
        if (!config) {
            this._config._users[userId] = config = [];
            this._save();
        }

        return config;
    },

    _getUserStar: async function(userId, spcHash) {
        const stars = this._getUserConfig(userId);
        return stars.find(star => star.hash === spcHash);
    },

    /* EXTERNAL FUNCTIONS */

    init: function(lib) {
        this._util = lib;
        return this._read();
    },

    getServerConfig: async function(guildId) {
        var config = this._config[guildId];
        if (!config) {
            this._config[guildId] = config = {
                "prefix": "!spc"
            };
            await this._save();
        }

        return config;
    },

    saveAllowedRole: async function(guildId, roleId) {
        const config = await this.getServerConfig(guildId);
        config.allowedRole = roleId;
        await this._save();
    },

    saveFirstMessage: async function(guildId, boolean) {
        var config = await this.getServerConfig(guildId);
        config.firstMessage = boolean;
        await this._save();
    },

    saveInactive: async function(guildId, number) {
        const config = await this.getServerConfig(guildId);
        config.inactive = number;
        await this._save();
    },

    savePrefix: async function(guildId, string) {
        const config = await this.getServerConfig(guildId);
        config.prefix = string;
        await this._save();
    },
    
    getUserStars: async function(userId) {
        const stars = this._getUserConfig(userId);
        return stars;
    },

    searchUserStar: async function(userId, search) {
        const stars = this._getUserConfig(userId);
        const filter = stars.filter(star => star.name.toLowerCase().includes(search.toLowerCase()));
        return filter;
    },

    addUserStar: async function(userId, spcHash, spcFileName, spcUrl) {
        const stars = this._getUserConfig(userId);

        const existing = await this._getUserStar(userId, spcHash);
        if (existing) {
            return false;
        }

        stars.push({
            hash: spcHash,
            name: spcFileName,
            url: spcUrl
        });

        await this._save();
        return true;
    },

    removeUserStar: async function(userId, spcHash) {
        const stars = this._getUserConfig(userId);
        const index = stars.findIndex(star => star.hash === spcHash);
        stars.splice(index, 1);

        await this._save();
        return true;
    }
};