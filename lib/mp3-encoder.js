"use strict";
const lamejs = require("lamejs");

module.exports = function(audioData, opts) {
    var kbps = 192;
    var sampleBlockSize = 576;

    var channels = opts.channels;
    var sampleRate = opts.sampleRate || 44100;
    var mp3encoder = new lamejs.Mp3Encoder(channels, sampleRate, kbps);
    var mp3data = [];

    var channelArray = audioData.channelData.map(channel => FloatArray2Int16(channel));

    for (var i = 0; i < audioData.channelData[0].length ; i += sampleBlockSize) {
        var chunksArray = channelArray.map(channel => channel.subarray(i, i + sampleBlockSize));
        var mp3buffer = mp3encoder.encodeBuffer(...chunksArray);

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
    
    var mp3buffer = mp3encoder.flush();

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

    var arrayBuffer = mergedArray.buffer;
    return Promise.resolve(arrayBuffer);
};

function FloatArray2Int16(floatbuffer) {
    var int16Buffer = new Int16Array(floatbuffer.length);
    var len = floatbuffer.length;
    for (var i = 0; i < len; i++) {
        if (floatbuffer[i] < 0) {
            int16Buffer[i] = 0x8000 * floatbuffer[i];
        } else {
            int16Buffer[i] = 0x7FFF * floatbuffer[i];
        }
    }

    return int16Buffer;
}