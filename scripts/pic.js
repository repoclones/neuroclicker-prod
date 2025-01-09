import {Game} from "./game.js";

export function Pic(what) {
    if (Game.Loader.assetsLoaded.indexOf(what) !== -1) return Game.Loader.assets[what];
    else if (Game.Loader.assetsLoading.indexOf(what) === -1) Game.Loader.Load([what]);
    return Game.Loader.blank;
}