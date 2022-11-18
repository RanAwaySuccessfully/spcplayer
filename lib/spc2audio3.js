"use strict";
const { workerData, parentPort } = require("worker_threads");
const { RenderingAudioContext } = require("@descript/web-audio-js");
const wae = require("@descript/web-audio-js");
const mp3encoder = require("./mp3-encoder.js");
const flacEncoder = require("./flac-encoder.js");
const funnyEncoder = require("./flac-encoder-funny.js");
const backend = require("@smwcentral/spc-player").SMWCentral.SPCPlayer.Backend;

wae.encoder.set("mp3", mp3encoder);
wae.encoder.set("flac", flacEncoder);
wae.encoder.set("funny", funnyEncoder);

async function waitForInitialize() {
    backend.contextOverride = new RenderingAudioContext({
        sampleRate: 48000
    });

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
    
    return;
}

async function convert() {
    const format = workerData.option;
    const time = workerData.time;

    if (!format || !time) {
        return;
    }

    const buffer = Buffer.from(workerData.file);

    if (backend.status === 0) {
        await waitForInitialize();
    }

    backend.loadSPC(buffer);
    backend.context.processTo(time);

    const audioData = backend.context.exportAsAudioData();

    backend.context.encodeAudioData(audioData, {type: format}).then(audioBuffer => {
        backend.stopSPC(false);
        backend.gainNode.disconnect();
        backend.scriptProcessorNode.disconnect();
        backend.context.close();
        backend.context = null;
        backend.status = 0;
        parentPort.postMessage({ audioBuffer });
    });
}

convert();