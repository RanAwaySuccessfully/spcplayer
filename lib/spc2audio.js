"use strict";
const wae = require("@descript/web-audio-js");

const mp3encoder = require("./mp3-encoder.js");
wae.encoder.set("mp3", mp3encoder);

const flacEncoder = require("./flac-encoder.js");
wae.encoder.set("flac", flacEncoder);

const funnyEncoder = require("./flac-encoder-funny.js");
wae.encoder.set("funny", funnyEncoder);

const bridge = require("./bridge");
const data = [];

process.stdin.on("data", function (buffer) {
    data.push(buffer);
});

process.stdin.on("end", async () => {
    const format = process.argv[2];
    const time = process.argv[3];

    if (!format || !time) {
        return;
    }

    const buffer = Buffer.concat(data);
    const {backend} = await bridge.createBridge(true);

    backend.loadSPC(buffer);
    backend.context.processTo(time);

    const audioData = backend.context.exportAsAudioData();

    backend.context.encodeAudioData(audioData, {type: format}).then(audioBuffer => {
        process.stdout.write(Buffer.from(audioBuffer));
    });
});