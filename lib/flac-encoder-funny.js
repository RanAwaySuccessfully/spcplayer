"use strict";
const Flac = require("libflacjs/dist/libflac.js");
const crypto = require("crypto");
const choices = [48000, 44100, 38000, 32000, 30000, 24000, 22050, 18000, 16000];

function chooseRandom(array) {
    var index = crypto.randomInt(array.length);
    return array[index];
}

module.exports = function(audioData, opts) {
    var flac_encoder,
    CHANNELS = opts.channels,
    //SAMPLERATE = opts.sampleRate || 44100,
    SAMPLERATE = chooseRandom(choices),
    COMPRESSION = 8, // 0-8
    BPS = 16,
    VERIFY = false,
    BLOCK_SIZE = 0;
    
    flac_encoder = Flac.create_libflac_encoder(SAMPLERATE, CHANNELS, BPS, COMPRESSION, Math.floor(audioData.length / 2), VERIFY, BLOCK_SIZE);
    if (flac_encoder == 0) {
        return;
    }

    var encBuffer = [];
    
    Flac.init_encoder_stream(flac_encoder, encodedData => {
        encBuffer.push(encodedData);
    });

    var [left, right] = audioData.channelData;

    var buf_length = left.length;
    var buffer_i32 = new Int32Array(buf_length);
    var view = new DataView(buffer_i32.buffer);
    var volume = 1;
    var index = 0;
    for (var i = 0; i < buf_length; i++) {
        view.setInt32(index, (left[i] * (0x7FFF * volume) ), true);
        view.setInt32(index, (right[i] * (0x7FFF * volume) ), true);
        index += 4;
    }

    Flac.FLAC__stream_encoder_process_interleaved(flac_encoder, buffer_i32, (buf_length / CHANNELS));
    
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