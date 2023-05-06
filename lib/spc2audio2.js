"use strict";
const { RenderingAudioContext } = require("@descript/web-audio-js");
const child_process = require("child_process");
const backend = require("@smwcentral/spc-player").SMWCentral.SPCPlayer.Backend;
const pathToFfmpeg = require("ffmpeg-static");

const data = [];

process.stdin.on("data", function (buffer) {
    data.push(buffer);
});

const processSpc = async () => {
    const format = process.argv[2];
    const time = process.argv[3];

    if (!format || !time) {
        return;
    }

    const buffer = Buffer.concat(data);

    if (backend.status === 0) {
        await waitForInitialize();
    }

    backend.loadSPC(buffer);
    backend.context.processTo(time);

    const audioData = backend.context.exportAsAudioData();

    backend.context.encodeAudioData(audioData, {type: "wav"}).then(audioBuffer => {
        backend.stopSPC(false);
        backend.gainNode.disconnect();
        backend.scriptProcessorNode.disconnect();
        backend.context.close();
        backend.context = null;
        backend.status = 0;

        const random = Date.now();

        let outputArguments;
        switch (format) {
            case "flac":
                outputArguments = ["-f", "flac", `temp/${random}.flac;`, "cat", `temp/${random}.flac;`, "rm", `temp/${random}.flac;`];
                break;
            case "mp3":
                outputArguments = ["-f", "mp3", "-b:a", "192k", `temp/${random}.mp3;`, "cat", `temp/${random}.mp3;`, "rm", `temp/${random}.mp3;`]; 
                //outputArguments = ["-f", "mp3", "-b:a", "192k", "pipe:"]; // , "-ar", "48000", "-ac", "2", "-vn"
                break;
            case "wav":
            default:
                process.stdout.write(Buffer.from(audioBuffer));
                return;
        }

        const child = child_process.spawn(pathToFfmpeg, ["-f", "wav", "-i", "pipe:", ...outputArguments], {
            shell: true
        });
        
        const stdout = promisify(child.stdout);
        const stderr = promisify(child.stderr);

        stdout.then(buffer => {
            process.stdout.write(buffer);
        });

        stderr.then(buffer => {
            process.stderr.write(buffer);
        });

        const done = child.stdin ? child.stdin.write(Buffer.from(audioBuffer)) : true;
        if (!done) {
            child.stdin.on("drain", () => {
                child.stdin.end();
            });
        } else {
            child.stdin.end();
        }
    });
};

process.stdin.on("end", () => {
    processSpc().catch(err => {
        let string = err.toString();
        if (err.stack) {
            string += `\n${ err.stack }`;
        }

        process.stderr.write(string);
    });
});

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

const promisify = pipe => {
    return new Promise((resolve, reject) => {
        if (!pipe) {
            reject();
            return;
        }
    
        const data = [];
        pipe.on("data", buffer => data.push(buffer));

        pipe.on("end", () => {
            const buffer = Buffer.concat(data);
            resolve(buffer);
        });
    });
};