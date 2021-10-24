"use strict";
const Database = require("better-sqlite3");

module.exports = {
    _lib: null,
    _db: null,

    /* EXTERNAL FUNCTIONS */

    init: function(lib) {
        this._lib = lib;
        this._db = new Database(this._lib.getFilePath("./db/db.db"), {
            fileMustExist: true
        });
    },

    getServerConfig: async function(guildId) {
        var config = this._db.prepare("SELECT guild, prefix, allowedRole, firstMessage, inactive FROM guilds WHERE guild = ?").all([guildId]);

        if (!config[0]) {
            const prefix = "!spc";
            const transaction = this._db.transaction(() => this._db.prepare("INSERT INTO guilds values(?, ?, ?, ?, ?)").run([
                guildId, prefix, null, 0, 0
            ]));
            transaction();

            config = [{
                guildId,
                prefix
            }];
        }

        return config[0];
    },

    saveAllowedRole: async function(guildId, roleId) {
        const transaction = this._db.transaction(() => this._db.prepare("UPDATE guilds SET allowedRole = ? WHERE guild = ?").run([
            roleId, guildId
        ]));
        transaction();
    },

    saveFirstMessage: async function(guildId, boolean) {
        const transaction = this._db.transaction(() => this._db.prepare("UPDATE guilds SET firstMessage = ? WHERE guild = ?").run([
            Number(boolean), guildId
        ]));
        transaction();
    },

    saveInactive: async function(guildId, number) {
        const transaction = this._db.transaction(() => this._db.prepare("UPDATE guilds SET inactive = ? WHERE guild = ?").run([
            number, guildId
        ]));
        transaction();
    },

    savePrefix: async function(guildId, string) {
        const transaction = this._db.transaction(() => this._db.prepare("UPDATE guilds SET prefix = ? WHERE guild = ?").run([
            string, guildId
        ]));
        transaction();
    },
    
    getUserStars: async function(userId) {
        const stars = this._db.prepare("SELECT hash, name, url FROM starred WHERE user = ?").all([userId]);
        return stars;
    },

    searchUserStar: async function(userId, search) {
        const stars = this._db.prepare("SELECT hash, name, url FROM starred WHERE user = ?").all([userId]);
        const filter = stars.filter(star => star.name.toLowerCase().includes(search.toLowerCase()));
        return filter;
    },

    addUserStar: async function(userId, spcHash, spcFileName, spcUrl) {
        var starred = this._db.prepare("SELECT hash FROM starred WHERE user = ? AND hash = ?").get([userId, spcHash]);
        if (starred) {
            return false;
        }

        var transaction = this._db.transaction(() => this._db.prepare("INSERT INTO starred values(?, ?, ?, ?)").run([userId, spcHash, spcFileName, spcUrl]));
        transaction();
        return true;
    },

    removeUserStar: async function(userId, spcHash) {
        var transaction = this._db.transaction(() => this._db.prepare("DELETE FROM starred WHERE user = ? AND hash = ?").run([userId, spcHash]));
        transaction();
        return true;
    }
};