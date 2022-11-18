"use strict";
const lamejs = require("lamejs");

module.exports = function(audioData, opts) {
    let kbps = 192;
    let sampleBlockSize = 576;

    let channels = opts.channels;
    let sampleRate = opts.sampleRate || 44100;
    let mp3encoder = new lamejs.Mp3Encoder(channels, sampleRate, kbps);
    let mp3data = [];

    const lengthTotal = audioData.channelData[0].length;
    const channelArray = audioData.channelData.map(channel => FloatArray2Int16(channel));
    delete audioData.channelData;

    for (let i = 0; i < lengthTotal; i += sampleBlockSize) {
        let chunksArray = channelArray.map(channel => channel.subarray(i, i + sampleBlockSize));
        let mp3buffer = mp3encoder.encodeBuffer(...chunksArray);

        if (mp3buffer.length > 0) {
            mp3data.push(mp3buffer);
        }
    }

    /*
    var left = FloatArray2Int16(audioData.channelData[0]);
    var right = FloatArray2Int16(audioData.channelData[1]);

    for (var i = 0; i < audioData.channelData[0].length ; i += sampleBlockSize) {
        var leftChunk = left.subarray(i, i + sampleBlockSize);
        var rightChunk = right.subarray(i, i + sampleBlockSize);
        var mp3buffer = mp3encoder.encodeBuffer(leftChunk, rightChunk);

        if (mp3buffer.length > 0) {
            mp3data.push(mp3buffer);
        }
    }
    */
    
    let mp3buffer = mp3encoder.flush();

    if (mp3buffer.length > 0) {
        mp3data.push(mp3buffer);
        //mp3data.push(new Int8Array(mp3buffer));
    }

    let length = 0;
    mp3data.forEach(item => {
        length += item.length;
    });

    let mergedArray = new Int8Array(length);
    let offset = 0;
    mp3data.forEach(item => {
        mergedArray.set(item, offset);
        offset += item.length;
    });

    let arrayBuffer = mergedArray.buffer;
    return Promise.resolve(arrayBuffer);
};

function FloatArray2Int16(floatbuffer) {
    let int16Buffer = new Int16Array(floatbuffer.length);
    let len = floatbuffer.length;
    for (let i = 0; i < len; i++) {
        if (floatbuffer[i] < 0) {
            int16Buffer[i] = 0x8000 * floatbuffer[i];
        } else {
            int16Buffer[i] = 0x7FFF * floatbuffer[i];
        }
    }

    return int16Buffer;
}