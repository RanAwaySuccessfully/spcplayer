# SPC Player

This is a copy of (most of) the code of the SPC Player discord bot used in SnesLab. This is a frozen copy of the code, it is not kept up to date.

Some parts of the code may contain bugs, may be broken, or be out of date.

## Dependencies

This bot runs on Node.js. Install it, and run `npm install` to install all library dependencies.

SMWCentral's SPC Player must be installed manually by going to [this repository](https://github.com/RanAwaySuccessfully/smwcentral-spc-player) and cloning it while inside the `lib` folder. Note that the aforementioned link points to a fork of the original repository. Instructions for how to build the SMWCentral's SPC Player are located on its README.

## Login Key

Create a file named ``token.json`` and store your bot's login token there. For production use the property `token`, for local testing use `tokenDev`. Careful not to publicly disclose it. This token can be found on the [Discord Developer Portal](https://discord.com/developers/applications/) by clicking your application's name and then: Bot > Build-A-Bot > Token.

Optionally fill in your Discord ID as the property `uidBotOwner`.

## Database

The SPC Player currently does not ship with a database file. However, all database-related functions are separated into a special folder, allowing for easily swappable databases. In order to choose which one is active currently, simply edit this line at the beginning of `lib/util.js` to point to the appropriate file:

```js
const db = require("../db/sqlite");
```

### sqlite

**This is the recommended option**, and the default. To use SQLite 3, create a file on the `db` folder named `db.db`. Open the file on the SQLite 3 CLI (by typing in `sqlite3 db.db` on the command line) and type in the following queries:

```sql
CREATE TABLE guilds (
    guild varchar(20),
    prefix varchar(20),
    allowedRole varchar(20),
    firstMessage boolean,
    inactive tinyint
);

CREATE TABLE starred (
    user varchar(20),
    hash varchar(20),
    name text,
    url text
);
```

Type `.exit` to exit the CLI.

### json

A JSON database is good for testing new features locally and as a fallback when necessary.

Create a file on the `db` folder named `db.json` that contains the following:
```json
{
  "_users": {}
}
```

The file will be updated in-memory first (to avoid race conditions) and then on disk.

### Custom

Simply create a new file on the `db` folder and name it to your liking. Use `sqlite.js` as a reference point as to which functions the bot expects to see in such a file and which data it expects to be returned.

## Starting/Stopping

Before starting the bot, beware that some of the it's features use programs such as `screen` and `nice` which may not be available on non-Linux systems.

The bot can be started using `npm start` and stopped using `npm stop`. These commands will make the bot run in the background. For testing locally, use either `npm run dev` or the included VSCode run configuration.

Be sure to create the folders `logs` and `temp` before attempting to use the bot. They may be necessary for some features but the bot itself will make no attempt to create them.

## License

```
    SPC Player (Discord Bot)
    Copyright (C) 2023  RanAwaySuccessfully

    This library is free software; you can redistribute it and/or
    modify it under the terms of the GNU Lesser General Public
    License as published by the Free Software Foundation; either
    version 2.1 of the License, or (at your option) any later version.

    This library is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
    Lesser General Public License for more details.

    You should have received a copy of the GNU Lesser General Public
    License along with this library; if not, write to the Free Software
    Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301
    USA
```
