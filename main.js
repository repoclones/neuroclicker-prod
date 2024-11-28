//wow, imports
//such fancy
import {chooseRandomElement} from "./scripts/helpers.js";
import {Game} from "./scripts/game.js";
import {SoundInsts, PlaySound} from "./scripts/playSound.js";

// For HTML access
window.Game = Game;
window.PlaySound = PlaySound;

/*
All this code is copyright Orteil, 2013-2019.
*Actually, the amount that's *not* Orteils is growing with every Neuro Clicker update.
	-with some help, advice and fixes by Nicholas Laux, Debugbro, Opti, and lots of people on reddit, Discord, and the DashNet forums
	-also includes a bunch of snippets found on stackoverflow.com and others
	*Helpers with NC code: 
		- Xodabeef: Most code and art
		- Sandro: The initial modifications
		- Promote: Server hosting
		- Superbox: Code help
		- Others: Read credits.txt for more
Hello, and welcome to the joyous mess that is main.js (Update: go to game.js instead). Code contained herein is not guaranteed to be good, consistent, or sane. Most of this is years old at this point and harkens back to simpler, cruder times. Have a nice trip.
*Tbh, this code is dogshit (but nobody wants to re-write, this was supposed to be a simple skin, aaaaa the feature creep)
 ** Oh hi, I'm going to refactor this because I feel like it
Spoilers ahead.
https://www.twitch.tv/vedal987 because this is Orteils no more.
*/

/*
Stuff that is important to the NC team:
	-Mod Tags: above custom fuctions is a little thingy ( //modTags ), this is just to quickly find our custom code.
	-The word "Ladle" is funny, may be my fav english word now

	-Most of the code is in scripts/game.js, because the Game class is absolutely enormous
	-Don't touch seededRandom, it breaks easily
*/

//disable sounds coming from soundjay.com (sorry)
const realAudio = Audio;//backup real audio
Audio = function (src) {
    if (src && src.indexOf('soundjay') > -1) {
        Game.Popup('Sorry, no sounds hotlinked from soundjay.com.');
        this.play = function () {
        };
    } else return new realAudio(src);
};

if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function (needle) {
        for (let i = 0; i < this.length; i++) {
            if (this[i] === needle) {
                return i;
            }
        }
        return -1;
    };
}

//	if (kotlin == true){

//		display.image('img/SuperboxKotlinMeme.png');

//	}


let sinArray = [];
let i;
for (i = 0; i < 360; i++) {
    //let's make a lookup table
    sinArray[i] = Math.sin(i / 360 * Math.PI * 2);
}

(typeof self !== "undefined" && self || typeof window !== "undefined" && window || this.content);

//seeded random function, courtesy of http://davidbau.com/archives/2010/01/30/random_seeds_coded_hints_and_quintillions.html
//Don't touch, I have no clue how this works but messing with it too much breaks Math.random
//I honestly have no idea why it even broke like that
(/**
 * @param {number|PluginArray|Screen|*} a
 * @param {[]} b
 * @param c
 * @param {number} d
 * @param {number} e
 * @param {number} f
 */
function(a,b,c,d,e,f){
    function k(a){
        var b,c=a.length,e=this,f=0,g=e.i=e.j=0,h=e.S=[];
        for (c||(a=[c++]);d>f;)
            h[f]=f++;
        for (f=0;d>f;f++)
            h[f]=h[g=j&g+a[f%c]+(b=h[f])],h[g]=b;
        (e.g=function(a) {
            for (var b,c=0,f=e.i,g=e.j,h=e.S;a--;)
                b=h[f=j&f+1],c=c*d+h[j&(h[f]=h[g=j&g+b])+(h[g]=b)];
            return e.i=f,e.j=g,c})(d)
    }
    function l(a,b){
        var e,c=[],d=(typeof a)[0];
        if (b&&"o" === d)
            for (e in a)
                try {
                c.push(l(a[e],b-1))
            } catch(f) {}
        return c.length?c:"s" === d?a:a+"\0"
    }
    function m(a, b)
    {
        for (var d,c=a+"",e=0; c.length>e;)
            b[j&e]=j&(d^=19*b[j&e])+c.charCodeAt(e++);
        return o(b)
    }
    function n(c) {
        try {
            return a.crypto.getRandomValues(c=new Uint8Array(d)),o(c)
        } catch(e) {
            return[+new Date,a,a.navigator.plugins,a.screen,o(b)]
        }
    }function o(a) {
        return String.fromCharCode.apply(0,a)
    }
    var g=c.pow(d,e),h=c.pow(2,f),i=2*h,j=d-1;c.seededRandom = function(a, f) {
        var j=[],p=m(l(f?[a,o(b)]:0 in arguments?a:n(),3),j),q=new k(j);
        return m(o(q.S),b),c.random=function() {
            for (var a=q.g(e),b=g,c=0; h>a;)
                a=(a+c)*d,b*=d,c=q.g(1);
            for(; a>=i;)a/=2,b/=2,c>>>=1;
            return(a+c)/b
        },p
    },m(c.random(),b)
})(window,[],Math,256,6,52);

CanvasRenderingContext2D.prototype.fillPattern = function (img, X, Y, W, H, iW, iH, offX, offY) {
    //for when built-in patterns aren't enough
    if (img.alt !== 'blank') {
        offX = offX || 0;
        offY = offY || 0;
        if (offX < 0) {
            offX = offX - Math.floor(offX / iW) * iW;
        }
        if (offX > 0) {
            offX = (offX % iW) - iW;
        }
        if (offY < 0) {
            offY = offY - Math.floor(offY / iH) * iH;
        }
        if (offY > 0) {
            offY = (offY % iH) - iH;
        }
        for (let y = offY; y < H; y += iH) {
            for (let x = offX; x < W; x += iW) {
                this.drawImage(img, X + x, Y + y, iW, iH);
            }
        }
    }
}

const OldCanvasDrawImage = CanvasRenderingContext2D.prototype.drawImage;
CanvasRenderingContext2D.prototype.drawImage = function () {
    //only draw the image if it's loaded
    if (arguments[0].alt !== 'blank') OldCanvasDrawImage.apply(this, arguments);
}


if (!document.hasFocus) document.hasFocus = function () {
    return document.hidden;
};//for Opera

for (i = 0; i < 12; i++) {
    SoundInsts[i] = new Audio();
}
//note : Chrome turns out to not support webkitPreservesPitch despite the specifications claiming otherwise, and Firefox clips some short sounds when changing playbackRate, so i'm turning the feature off completely until browsers get it together
//if (SoundInsts[0].preservesPitch || SoundInsts[0].mozPreservesPitch || SoundInsts[0].webkitPreservesPitch) pitchSupport=true;

if (!Date.now) {
    Date.now = function now() {
        return new Date().getTime();
    };
}

let triggerAnim = function (element, anim) {
    if (!element) return;
    element.classList.remove(anim);
    void element.offsetWidth;
    element.classList.add(anim);
};

//What is even the point of this thing?
/*
let debugStr = '';
const Debug = function (what) {
    if (!debugStr) debugStr = what;
    else debugStr += '; ' + what;
};

 */

if (Game.bakeryName === 'Baa') {

    close(); //Baa is banned (this is a joke and shouldn't work)
}




/*=====================================================================================
LAUNCH THIS THING
=======================================================================================*/
Game.Launch();

window.onload = function () {

    if (!Game.ready) {
        if (top !== self) Game.ErrorFrame();
        else {
            console.log('[=== ' + chooseRandomElement([
                'Oh hi, Superbox here just doing my thing refactoring a ton of the game\'s really quite terrible code',
                'Hiya, Xoda here, This has taken ( [current year] - [2023] ) years to make.'
            ]) + ' ===]');
            Game.Load();
        }
    }
};