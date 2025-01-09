import {Game} from "./game.js";

const Timer = {};
Timer.t = Date.now();
Timer.labels = [];
Timer.smoothed = [];
Timer.reset = function () {
    Timer.labels = [];
    Timer.t = Date.now();
}
Timer.track = function (label) {
    if (!Game.sesame) return;
    let now = Date.now();
    if (!Timer.smoothed[label]) Timer.smoothed[label] = 0;
    Timer.smoothed[label] += ((now - Timer.t) - Timer.smoothed[label]) * 0.1;
    Timer.labels[label] = '<div style="padding-left:8px;">' + label + ' : ' + Math.round(Timer.smoothed[label]) + 'ms</div>';
    Timer.t = now;
}
Timer.clean = function () {
    if (!Game.sesame) return;
    Timer.t = Date.now();
}
Timer.say = function (label) {
    if (!Game.sesame) return;
    Timer.labels[label] = '<div style="border-top:1px solid #ccc;">' + label + '</div>';
}

export {Timer}