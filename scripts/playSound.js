import {Game} from "./game.js";

const Sounds = [];
export var SoundInsts = [];
let SoundI = 0;
const pitchSupport = false;

export function PlaySound(url, vol, pitchVarParam) {
    //url : the url of the sound to play (will be cached so it only loads once)
    //vol : volume between 0 and 1 (multiplied by game volume setting); defaults to 1 (full volume)
    //(DISABLED) pitchVar : pitch variance in browsers that support it (Firefox only at the moment); defaults to 0.05 (which means pitch can be up to -5% or +5% anytime the sound plays)
    let volume = 1;
    const pitchVar = (typeof pitchVarParam === 'undefined') ? 0.05 : pitchVarParam;
    const rate = 1 + (Math.random() * 2 - 1) * pitchVar;
    if (typeof vol !== 'undefined') volume = vol;
    if (!Game.volume || volume === 0) return 0;
    if (!Sounds[url]) {
        //sound isn't loaded, cache it
        Sounds[url] = new Audio(url);
        Sounds[url].onloadeddata = function (e) {
            PlaySound(url, vol, pitchVar);
        }
    } else if (Sounds[url].readyState >= 2) {
        let sound = SoundInsts[SoundI];
        SoundI++;
        if (SoundI >= 12) SoundI = 0;
        sound.src = Sounds[url].src;
        //sound.currentTime=0;
        sound.volume = Math.pow(volume * Game.volume / 100, 2);
        if (pitchSupport && rate !== 0) {
            sound.preservesPitch = false;
            sound.mozPreservesPitch = false;
            sound.webkitPreservesPitch = false;
            sound.playbackRate = rate;
        }
        sound.play();
    }
}