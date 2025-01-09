import { bind } from "./bind.js";

export const Loader = function ()//asset-loading system
{
    this.loadingN = 0;
    this.assetsN = 0;
    this.assets = [];
    this.assetsLoading = [];
    this.assetsLoaded = [];
    this.domain = '';
    this.loaded = 0;//callback
    this.doneLoading = 0;

    this.blank = document.createElement('canvas');
    this.blank.width = 8;
    this.blank.height = 8;
    this.blank.alt = 'blank';

    this.Load = function (assets) {
        for (let i in assets) {
            this.loadingN++;
            this.assetsN++;
            if (!this.assetsLoading[assets[i]] && !this.assetsLoaded[assets[i]]) {
                let img = new Image();
                img.src = this.domain + assets[i];
                img.alt = assets[i];
                img.onload = bind(this, this.onLoad);
                this.assets[assets[i]] = img;
                this.assetsLoading.push(assets[i]);
            }
        }
    }
    this.Replace = function (old, newer) {
        if (this.assets[old]) {
            const img = new Image();
            if (newer.indexOf('http') !== -1) img.src = newer;
            else img.src = this.domain + newer;
            img.alt = newer;
            img.onload = bind(this, this.onLoad);
            this.assets[old] = img;
        }
    }
    this.onLoadReplace = function () {
    }
    this.onLoad = function (e) {
        this.assetsLoaded.push(e.target.alt);
        this.assetsLoading.splice(this.assetsLoading.indexOf(e.target.alt), 1);
        this.loadingN--;
        if (this.doneLoading === 0 && this.loadingN <= 0 && this.loaded !== 0) {
            this.doneLoading = 1;
            this.loaded();
        }
    }
    this.getProgress = function () {
        return (1 - this.loadingN / this.assetsN);
    }
};