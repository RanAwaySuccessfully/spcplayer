"use strict";
const Flac = require("libflacjs/dist/libflac.js");

module.exports = function(audioData, opts) {
    var flac_encoder,
    CHANNELS = opts.channels,
    SAMPLERATE = opts.sampleRate || 44100,
    COMPRESSION = 8, // 0-8
    BPS = 16,
    VERIFY = false,
    BLOCK_SIZE = 0;
    
    flac_encoder = Flac.create_libflac_encoder(SAMPLERATE, CHANNELS, BPS, COMPRESSION, audioData.length, VERIFY, BLOCK_SIZE);
    if (flac_encoder == 0) {
        return;
    }

    var encBuffer = [];
    
    Flac.init_encoder_stream(flac_encoder, encodedData => {
        encBuffer.push(encodedData);
    });

    var channelArray = audioData.channelData.map(channel => FloatArray2Int32(channel));

    Flac.FLAC__stream_encoder_process(flac_encoder, channelArray, channelArray[0].length);

    /*var [left, right] = audioData.channelData;

    left = FloatArray2Int32(left);
    right = FloatArray2Int32(right);

    Flac.FLAC__stream_encoder_process(flac_encoder, [left, right], left.length);*/
    
    Flac.FLAC__stream_encoder_finish(flac_encoder);
    Flac.FLAC__stream_encoder_delete(flac_encoder);

    let length = 0;
    encBuffer.forEach(item => {
        length += item.length;
    });

    let mergedArray = new Uint8Array(length);
    let offset = 0;
    encBuffer.forEach(item => {
        mergedArray.set(item, offset);
        offset += item.length;
    });

    var arrayBuffer = mergedArray.buffer;
    return Promise.resolve(arrayBuffer);
};

function FloatArray2Int32(floatbuffer) {
    var int32Buffer = new Int32Array(floatbuffer.length);
    var len = floatbuffer.length;
    for (var i = 0; i < len; i++) {
        int32Buffer[i] = 0x7FFF * floatbuffer[i];
    }

    return int32Buffer;
}