/*=====================================================================================
GAME INITIALIZATION
=======================================================================================*/
import {BETA, VERSION} from "./constants.js";
import {chooseRandomElement, elementByID, replaceAll} from "./helpers.js";
import {Loader} from "./loader.js";
import {AddEvent} from "./addEvent.js";
import {saveAs} from "./saveAs.js";
import {b64_to_utf8, utf8_to_b64} from "./stringConverters.js";
import {Timer} from "./timer.js";
import {Pic} from "./pic.js";
import {PlaySound} from "./playSound.js";
import {pack3, unpack, unpack2} from "./packing.js";
import { UncompressLargeBin } from "./BinCompression.js";

export const Game = {};

//Object.defineProperty(Math, 'random', { writable: false });
//Object.defineProperty(Math, 'floor', { writable: false });

const beautifyInTextFilter = /((\d+,*)+)/g;//new regex
//const a = /\d\d?\d?(?:,\d\d\d)*/g;//old regex

const formatLong = [' thousand', ' million', ' billion', ' trillion', ' quadrillion', ' quintillion', ' sextillion', ' septillion', ' octillion', ' nonillion'];
let prefixes = ['', 'un', 'duo', 'tre', 'quattuor', 'quin', 'sex', 'septen', 'octo', 'novem'];
let suffixes = ['decillion', 'vigintillion', 'trigintillion', 'quadragintillion', 'quinquagintillion', 'sexagintillion', 'septuagintillion', 'octogintillion', 'nonagintillion'];
let i;
let ii;
for (i in suffixes) {
    for (ii in prefixes) {
        formatLong.push(' ' + prefixes[ii] + suffixes[i]);
    }
}

const formatShort = ['k', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No'];
prefixes = ['', 'Un', 'Do', 'Tr', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No'];
suffixes = ['D', 'V', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'O', 'N'];
for (i in suffixes) {
    for (ii in prefixes) {
        formatShort.push(' ' + prefixes[ii] + suffixes[i]);
    }
}
formatShort[10] = 'Dc';

const numberFormatters =
    [
        formatEveryThirdPower(formatShort),
        formatEveryThirdPower(formatLong),
        rawFormatter
    ];
//Beautify and number-formatting adapted from the Frozen Cookies add-on (http://cookieclicker.wikia.com/wiki/Frozen_Cookies_%28JavaScript_Add-on%29)
function formatEveryThirdPower(notations) {
    return function (value) {
        let base = 0,
            notationValue = '';
        if (!isFinite(value)) return 'Infinity';
        if (value >= 1000000) {
            value /= 1000;
            while (Math.round(value) >= 1000) {
                value /= 1000;
                base++;
            }
            if (base >= notations.length) {
                return 'Infinity';
            } else {
                notationValue = notations[base];
            }
        }
        return (Math.round(value * 1000) / 1000) + notationValue;
    };
}

function rawFormatter(value) {
    return Math.round(value * 1000) / 1000;
}

export function Beautify(value, floats) {
    let negative = (value < 0);
    let decimal = '';
    const fixed = value.toFixed(floats);
    if (Math.abs(value) < 1000 && floats > 0 && Math.floor(fixed) !== fixed) decimal = '.' + (fixed.toString()).split('.')[1];
    value = Math.floor(Math.abs(value));
    if (floats > 0 && fixed === value + 1) value++;
    const formatter = numberFormatters[Game.prefs.format ? 2 : 1];
    let output = formatter(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    if (output === '0') negative = false;
    return negative ? '-' + output : output + decimal;
}

function BeautifyInTextFunction(str) {
    return Beautify(parseInt(str.replace(/,/g, ''), 10));
}

function BeautifyInText(str) {
    return str.replace(beautifyInTextFilter, BeautifyInTextFunction);
}//reformat every number inside a string

function BeautifyAll()//run through upgrades and achievements to reformat the numbers
{
    const func = function (what) {
        what.desc = BeautifyInText(what.baseDesc);
    };
    Game.UpgradesById.forEach(func);
    Game.AchievementsById.forEach(func);
}

Game.Launch = function () {
    Game.version = VERSION;
    Game.beta = BETA;
    if (window.location.href.indexOf('/beta') > -1) Game.beta = 1;
    Game.mobile = 0;
    Game.touchEvents = 0;
    //if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) Game.mobile=1;
    //if (Game.mobile) Game.touchEvents=1;
    //if ('ontouchstart' in document.documentElement) Game.touchEvents=1;

    const css = document.createElement('style');
    css.type = 'text/css';
    css.innerHTML = 'body .icon,body .crate,body .usesIcon{background-image:url(img/icons.png?v=' + Game.version + ');}';
    document.head.appendChild(css);

    Game.baseSeason = '';//halloween, christmas, valentines, fools, easter
    //automatic season detection (might not be 100% accurate)
    let day = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));

    if (day >= 44 && day <= 47) Game.baseSeason = 'valentines';


    else if (day >= 92 && day <= 92) Game.baseSeason = 'fools';
    else if (day >= 304 - 7 && day <= 304) Game.baseSeason = 'halloween';
    else if (day >= 351 && day <= 359) Game.baseSeason = 'christmas';
    else {
        //easter is a pain goddamn
        let easterDay = (Y => {
            let C = Math.floor(Y / 100);
            let N = Y - 19 * Math.floor(Y / 19);
            let K = Math.floor((C - 17) / 25);
            let I = C - Math.floor(C / 4) - Math.floor((C - K) / 3) + 19 * N + 15;
            I = I - 30 * Math.floor((I / 30));
            I = I - Math.floor(I / 28) * (1 - Math.floor(I / 28) * Math.floor(29 / (I + 1)) * Math.floor((21 - N) / 11));
            let J = Y + Math.floor(Y / 4) + I + 2 - C + Math.floor(C / 4);
            J = J - 7 * Math.floor(J / 7);
            let L = I - J;
            let M = 3 + Math.floor((L + 40) / 44);
            let D = L + 28 - 31 * Math.floor(M / 4);
            return new Date(Y, M - 1, D);
        })(new Date().getFullYear());
        easterDay = Math.floor((easterDay - new Date(easterDay.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
        if (day >= easterDay - 7 && day <= easterDay) Game.baseSeason = 'easter';
    }

    Game.updateLog =


        '<div class="selectable">' +
        '<div class="section">Info</div>' +
        '<div class="subsection">' +
        '<div class="title">About</div>' +
        '<div class="listing">Cookie Clicker is a javascript game by <a href="https://orteil.dashnet.org" target="_blank">Orteil</a> and <a href=https:///dashnet.org" target="_blank">Opti</a>.</div>' +
        //'<div class="listing">We have an <a href="https://discordapp.com/invite/cookie" target="_blank">official Discord</a>, as well as a <a href="http://forum.dashnet.org" target="_blank">forum</a>; '+
        '<div class="listing">We have an <a href="https://discordapp.com/invite/cookie" target="_blank">official Discord</a>; ' +
        'if you\'re looking for help, you may also want to visit the <a href="https://www.reddit.com/r/CookieClicker" target="_blank">subreddit</a> ' +
        'or the <a href="https://cookieclicker.wikia.com/wiki/Cookie_Clicker_Wiki" target="_blank">wiki</a>.</div>' +
        '<div class="listing">News and teasers are usually posted on my <a href="https://orteil42.tumblr.com/" target="_blank">tumblr</a> and <a href=https:///twitter.com/orteil42" target="_blank">twitter</a>.</div>' +
        '<div class="listing" id="supportSection"><b style="color:#fff;opacity:1;">Cookie Clicker is 100% free, forever.</b> Want to support us so we can keep developing games? Here\'s some ways you can help :<div style="margin:4px 12px;line-height:150%;">' +
        '<br>&bull; support us on <a href="https://www.patreon.com/dashnet" target="_blank" class="highlightHover" style="background:#f86754;box-shadow:0 0 0 1px #c52921 inset,0 2px 0 #ff966d inset;text-shadow:0 -1px 0 #ff966d,0 1px 0 #c52921;text-decoration:none;color:#fff;font-weight:bold;padding:1px 4px;">Patreon</a> <span style="opacity:0.5;">(there\'s perks!)</span>' +
        '<br>&bull; <form target="_blank" action="https://www.paypal.com/cgi-bin/webscr" method="post" id="donate"><input type="hidden" name="cmd" value="_s-xclick"><input type="hidden" name="hosted_button_id" value="BBN2WL3TC6QH4"><input type="submit" id="donateButton" value="donate" name="submit" alt="PayPal — The safer, easier way to pay online."><img alt="" src="https://www.paypalobjects.com/nl_NL/i/scr/pixel.gif" width="1" height="1"></form> to our PayPal' +
        '<br>&bull; disable your adblocker<br>&bull; check out our <a href="https://www.redbubble.com/people/dashnet" target="_blank">rad cookie shirts, hoodies and stickers</a>!<br>&bull; (if you want!)</div></div>' +
        '<div class="listing warning">Note : if you find a new bug after an update and you\'re using a 3rd-party add-on, make sure it\'s not just your add-on causing it!</div>' +
        '<div class="listing warning">Warning : clearing your browser cache or cookies <small>(what else?)</small> will result in your save being wiped. Export your save and back it up first!</div>' +

        '<div class="listing">Extra Credits (who worked on this mod):</div>' +
        '<div class="listing">&bull; Superbox- Putting things together, technical management.</div>' +
        '<div class="listing">&bull; Sandro- Some art (mainly borders and the big coin) and original idea.</div>' +
        '<div class="listing">&bull; Velineste- Code.</div>' +
        '<div class="listing">&bull; Xodabeef- Art, some code, release packaging, change logging (-> these things here).</div>' +
        '<div class="listing">&bull; Zekava -Some additional art.</div>' +
        '<div class="listing">&bull; Promote -Web version and domain hosting.</div>' +
        '<div class="listing">&bull; Orteil is referenced enough here, so have Neuro instead: <a href="https://www.twitch.tv/vedal987" target="https://www.twitch.tv/vedal987"> https://www.twitch.tv/vedal987</a> .</div>' +

        '<div class="listing">&bull; All dates in the new (modded) update log are to be in DD.MM.YYYY format.</div>' +

        '</div><div class="subsection">' +
        '<div class="title">Version history</div>' +

        '</div><div class="subsection update">' +
        '<div class="title">07.01.2025  - Nwero Clicker: v8</div>' +
        '<div class="listing">&bull; Refactor all the code from main.js and index.html. (rare Superbox appearance here)</div>' +
        '<div class="listing">&bull; Fixed a bug causing random garbage characters at the ends of upgrade quote strings in the process.</div>' +
        '<div class="listing">&bull; Changed Temples to Harrisson temples.</div>' +
        '<div class="listing">&bull; Made Mato happy.</div>' +
        '<div class="listing">&bull; Changed more icons, as always.</div>' +
        '<div class="listing">&bull; Added the (unimplemented) Kitchen Utensils\' Heavenly. What may those be?</div>' +
        '<div class="listing">&bull; Local running is now done by a local server, due to refracture changes. This should affect only the small amount of people who run this locally.</div>' +

        '</div><div class="subsection update">' +
        '<div class="title">28.11.2024  - Nwero Clicker: v7_18_experimental</div>' +
        '<div class="listing">&bull; Refactor all the code from main.js and index.html. (rare Superbox appearance here)</div>' +
        '<div class="listing">&bull; Fixed a bug causing random garbage characters at the ends of upgrade quote strings in the process</div>' +

        '</div><div class="subsection update">' +
        '<div class="title">29.03.2024  - Nwero Clicker: v7_17</div>' +
        '<div class="listing">&bull; Did a lot of code changes.</div>' +
        '<div class="listing">&bull; NEURO CLICKER IS NOW WEB BASED AS WELL (thanks to Propmote) LET\'S FUCKING GOOO!!!</div>' +
        '<div class="listing">&bull; Changed credits.</div>' +

        '</div><div class="subsection update">' +
        '<div class="title">29.03.2024  - Nwero Clicker: v7_16</div>' +
        '<div class="listing">&bull; This update is a little smaller, redid name, descr. etc for banks, which are now gyms. The full redo is not finished yet, but most of the stuff you see when booting up the game is.</div>' +
        '<div class="listing">&bull; Made a few more instances of cookie into neuro.</div>' +
        '<div class="listing">&bull; Xoda also got herself banned from Neurocord AGAIN, this time perma, for posting a screenshot of :NeuroBwaa:. Make of that what you will.</div>' +

        '</div><div class="subsection update">' +
        '<div class="title">15.03.2024  - Nwero Clicker: v7_15</div>' +
        '<div class="listing">&bull; Remade all easter egg sprites.</div>' +
        '<div class="listing">&bull; Did all geometry triangles.</div>' +
        '<div class="listing">&bull; Remade the wrath cookie.</div>' +
        '<div class="listing">&bull; Remade the spell backgrounds.</div>' +
        '<div class="listing">&bull; Changed some of the Mining Rig\'s building data.</div>' +
        '<div class="listing">&bull; Xoda also got herself unbanned from Neurocord :NeuroHypers:</div>' +

        '</div><div class="subsection update">' +
        '<div class="title">06.03.2024  - Nwero Clicker: v7_14</div>' +
        '<div class="listing">&bull; Added all missing milk.</div>' +
        '<div class="listing">&bull; Fixed a lot of code issues left by Orteil.</div>' +
        '<div class="listing">&bull; Changed model, building name and description for the Wheel Of Fortune (former Chancemaker).</div>' +
        '<div class="listing">&bull; Made some more icons.</div>' +

        '</div><div class="subsection update">' +
        '<div class="title">26.02.2024  - Nwero Clicker: v7_13_Hotfix</div>' +
        '<div class="listing">&bull; Fixed some accidentally made potentially offensive imagery.</div>' +

        '</div><div class="subsection update">' +
        '<div class="title">26.02.2024  - Nwero Clicker: v7_13</div>' +
        '<div class="listing">&bull; The Bakery Is Now A Corpa!.</div>' +
        '<div class="listing">&bull; Chnaged a bunch of icons, mainly Halloween related ones</div>' +
        '<div class="listing">&bull; Fixed some more things.</div>' +
        '<div class="listing">&bull; Changed some spell names.</div>' +
        '<div class="listing">&bull; Got another team member (Zekava).</div>' +
        '<div class="listing">&bull; Xoda (me) got herself banned from the Discord.</div>' +

        '</div><div class="subsection">' +
        '</div><div class="subsection update">' +
        '<div class="title">24.02.2024  - Nwero Clicker: v7_12</div>' +
        '<div class="listing">&bull; Made Valentines Milk be selected automatically on Valentines Day (or if you activate the respective season switch)</div>' +
        '<div class="listing">&bull; Fixed some things.</div>' +
        '<div class="listing">&bull; Edited an achievement.</div>' +

        '</div><div class="subsection update">' +
        '<div class="title">13.02.2024  - Nwero Clicker: v7_11 - The Valentines Update</div>' +
        '<div class="listing">&bull; Changed Season Timing again.</div>' +
        '<div class="listing">&bull; Added Valentines Milk, because i can.</div>' +
        '<div class="listing">&bull; Finished changing all things related to Valentines, at least as far as i can see.</div>' +
        '<div class="listing">&bull; Happy Valentines!</div>' +

        '</div><div class="subsection update">' +
        '<div class="title">12.02.2024  - Nwero Clicker: v7_10</div>' +
        '<div class="listing">&bull; Fixed Neuro Storms.</div>' +
        '<div class="listing">&bull; Changed the Version Display.</div>' +
        '<div class="listing">&bull; Fucked up Save Files with that lmao.</div>' +
        '<div class="listing">&bull; Changed Season timing.</div>' +
        '<div class="listing">&bull; Remade the Ascention Number Panel graphic so it looks good.</div>' +
        '<div class="listing">&bull; Uhh some other stuff i forgor :skull: .</div>' +

        '</div><div class="subsection update">' +
        '<div class="title">12.02.2024  - Nwero Clicker: v7_9</div>' +
        '<div class="listing">&bull; I have now decided to make my own Update Log Entries with every Version i make. There is no real schedule or anything, i just zip up new versions whenever someone asks for a download after i change something.</div>' +
        '<div class="listing">&bull; By now I have changed a few graphics, done what is written in the older Update Log, and added this. I have also edited the previous entry, putting the credits of who helped with this mod above the Update Log and into the About Header.</div>' +
        '<div class="listing">&bull; I will not list what i have done up until now in detail as it is just unnescessary. I spelt that wrong.</div>' +
        '<div class="listing">&bull; Also, thanks to SuperBox, the Twitch Link is now an actual link. Thank you for reading!</div>' +

        '</div><div class="subsection update">' +
        '<div class="title">08.02.2024  - Nwero Clicker: An Update Log Entry</div>' +
        '<div class="listing">&bull; Hello, I am Xodabeef; a part of the Team behind this Cookie Clicker Mod.</div>' +
        '<div class="listing">&bull; I am the main Artist, but i am here in the code now too. The reason is simple: we wanted to cut back on unnecessary files (Orteil left a LOT of shit in here). That made me look for references to the Dungeon Minigame in the code. It is not referenced anywhere, meaning i can (and likely have when you read this) delete all files related to the Dungeon Minigame, to both make this smaller and have a more clear estimate on how much is still to be done.</div>' +
        '<div class="listing">&bull; While looking for these references, i found out about the way these comments work. And because of how easy it is (and out of boredom), i decided to put our names in here.</div>' +
        '<div class="listing">&bull; I have also removed some of the older changelogs, since they are not necesary.</div>' +

        '</div><div class="subsection update small">' +
        '<div class="title">01/04/2019 - 2.019 (the "this year" update)</div>' +
        '<div class="listing">&bull; game has been renamed to "Cookie Clicker" to avoid confusion</div>' +
        '<div class="listing">&bull; can now click the big cookie to generate cookies for free</div>' +
        '<div class="listing">&bull; removed fall damage</div>' +
        '<div class="listing">&bull; fixed various typos : player\'s name is now correctly spelled as "[bakeryName]"</div>' +
        '<div class="listing">&bull; removed all references to computer-animated movie <i style="font-style:italic;">Hoodwinked!</i> (2005)</div>' +
        '<div class="listing">&bull; went back in time and invented cookies and computer mice, ensuring Cookie Clicker would one day come to exist</div>' +
        '<div class="listing">&bull; game now fully compliant with Geneva Conventions</div>' +
        '<div class="listing">&bull; dropped support for TI-84 version</div>' +
        '<div class="listing">&bull; released a low-res retro version of the game, playable here : <a href="https://orteil.dashnet.org/experiments/cookie/" target="_blank">orteil.dashnet.org/experiments/cookie</a></div>' +
        '<div class="listing">&bull; updated version number</div>' +

        '</div><div class="subsection update small">' +
        '<div class="title">05/03/2019 - cookies for days</div>' +
        '<div class="listing">&bull; added over 20 new cookies, all previously suggested by our supporters on <a href="https://www.patreon.com/dashnet" target="_blank">Patreon</a></div>' +
        '<div class="listing">&bull; added 2 heavenly upgrades</div>' +
        '<div class="listing">&bull; the Golden goose egg now counts as a golden cookie upgrade for Residual luck purposes</div>' +
        '<div class="listing">&bull; golden sugar lumps now either double your cookies, or give you 24 hours of your CpS, whichever is lowest (previously was doubling cookies with no cap)</div>' +
        '<div class="listing">&bull; the amount of heralds is now saved with your game, and is used to compute offline CpS the next time the game is loaded; previously, on page load, the offline calculation assumed heralds to be 0</div>' +
        '<div class="listing">&bull; added a system to counteract the game freezing up (and not baking cookies) after being inactive for a long while on slower computers; instead, this will now trigger sleep mode, during which you still produce cookies as if the game was closed; to enable this feature, use the "Sleep mode timeout" option in the settings</div>' +
        '<div class="listing">&bull; vaulting upgrades is now done with shift-click, as ctrl-click was posing issues for Mac browsers</div>' +
        '<div class="listing">&bull; made tooltips for building CpS boosts from synergies hopefully clearer</div>' +
        '<div class="listing">&bull; fixed an exploit with gambler\'s fever dream working across exports and ascensions</div>' +
        '<div class="listing">&bull; can now hide tooltips in the garden by keeping the shift key pressed to make it easier to see where you\'re planting</div>' +
        '<div class="listing">&bull; fixed a bug with golden cookies/reindeer not disappearing properly in some circumstances</div>' +
        '<div class="listing">&bull; the Dragon\'s Curve aura should now properly make sugar lumps twice as weird</div>' +
        '<div class="listing">&bull; the ctrl key should less often register incorrectly as pressed</div>' +
        '<div class="listing">&bull; added a new ad slot in the top-right, as while our playerbase is strong and supportive as ever, our ad revenue sometimes fluctuates badly; we may remove the ad again should our income stabilize</div>' +
        '<div class="listing">&bull; made a few adjustments to make the game somewhat playable in mobile browsers; it\'s not perfect and can get buggy, but it\'s functional! (you may need to zoom out or scroll around to view the game properly)</div>' +
        '<div class="listing">&bull; speaking of which, we also got some good progress on the mobile app version (built from scratch for mobile), so stay tuned!</div>' +

        '</div><div class="subsection update">' +
        '<div class="title">25/10/2018 - feedback loop</div>' +
        '<div class="listing">&bull; added a new building</div>' +
        '<div class="listing">&bull; launched our <a href="https://www.patreon.com/dashnet" class="orangeLink" target="_blank">Patreon</a> <span style="font-size:80%;">(the link is orange so you\'ll notice it!)</span></div>' +
        '<div class="listing">&bull; added a bunch of new heavenly upgrades, one of which ties into our Patreon but benefits everyone (this is still experimental!)</div>' +
        '<div class="listing">&bull; when hovering over grandmas, you can now see their names and ages</div>' +
        '<div class="listing">&bull; "make X cookies just from Y" requirements are now higher</div>' +
        '<div class="listing">&bull; tweaked the prices of some heavenly upgrades to better fit the current cookie economy (it turns out billions of heavenly chips is now very achievable)</div>' +
        '<div class="listing">&bull; building tooltips now display what % of CpS they contribute through synergy upgrades</div>' +
        '<div class="listing">&bull; queenbeets now give up to 4% of gym, down from 6%</div>' +
        '<div class="listing">&bull; among other things, season switches now display how many seasonal upgrades you\'re missing, and permanent upgrade slots now display the name of the slotted upgrade</div>' +
        '<div class="listing">&bull; season switches have reworked prices</div>' +
        '<div class="listing">&bull; season switches can now be cancelled by clicking them again</div>' +
        '<div class="listing">&bull; can no longer accidentally click wrinklers through other elements</div>' +
        '<div class="listing">&bull; sugar frenzy now triples your CpS for an hour instead of doubling it</div>' +
        '<div class="listing">&bull; this text is now selectable</div>' +
        '<div class="listing">&bull; progress on dungeons minigame is still very much ongoing</div>' +

        '</div><div class="subsection update small">' +
        '<div class="title">08/08/2018 - hey now</div>' +
        '<div class="listing">&bull; Cookie Clicker somehow turns 5, going against doctors\' most optimistic estimates</div>' +
        '<div class="listing">&bull; added a new tier of building achievements, all named after Smash Mouth\'s classic 1999 hit "All Star"</div>' +
        '<div class="listing">&bull; added a new tier of building upgrades, all named after nothing in particular</div>' +
        '<div class="listing">&bull; <b>to our players :</b> thank you so much for sticking with us all those years and allowing us to keep making the dumbest game known to mankind</div>' +
        '<div class="listing">&bull; resumed work on the dungeons minigame</div>' +

        '</div><div class="subsection update">' +
        '<div class="title">08/08/2013 - game launch</div>' +
        '<div class="listing">&bull; made the game in a couple hours, for laughs</div>' +
        '<div class="listing">&bull; kinda starting to regret it</div>' +
        '<div class="listing">&bull; ah well</div>' +
        '</div>' +
        '</div>'
    ;

    Game.ready = 0;

    Game.Load = () => {
        //l('javascriptError').innerHTML='<div style="padding:64px 128px;"><div class="title">Loading...</div></div>';
        Game.Loader = new Loader();
        Game.Loader.domain = 'img/';
        Game.Loader.loaded = Game.Init;
        Game.Loader.Load(['filler.png']);
    }
    Game.ErrorFrame = () => {
        elementByID('javascriptError').innerHTML =
            '<div class="title">Oops. Wrong address!</div>' +
            '<div>It looks like you\'re accessing Cookie Clicker from another URL than the official one.<br>' +
            'You can <a href="https://orteil.dashnet.org/cookieclicker/" target="_blank">play Cookie Clicker over here</a>!<br>' +
            '<small>(If for any reason, you are unable to access the game on the official URL, we are currently working on a second domain.)</small></div>';
    }
    Game.timedout = false;
    Game.Timeout = () => {
        Game.WriteSave();
        Game.killShimmers();
        elementByID('javascriptError').innerHTML = 'Cookie Clicker is in sleep mode' + (Game.Has('Twin Gates of Transcendence') ? ' and generating offline cookies' : '') + '.<br><a ' + Game.clickStr + '="Game.Resume();">Click here</a> to resume from your save file.<br><div style="font-style:italic;font-size:65%;line-height:110%;opacity:0.75;">(this happens when too many frames are skipped at once,<br>usually when the game has been running in the background for a while)<br>(you can turn this feature off in the settings menu)</div>';
        elementByID('javascriptError').style.display = 'block';
        Game.timedout = true;
        console.log('[=== Game timed out and has been put in sleep mode. Data was saved. ===]');
    }
    Game.Resume = () => {
        elementByID('javascriptError').innerHTML = '';
        elementByID('javascriptError').style.display = 'none';
        Game.timedout = false;
        Game.time = Date.now();
        Game.accumulatedDelay = 0;
        Game.delayTimeouts = 0;
        Game.lastActivity = Date.now();
        Game.Loop();
        Game.LoadSave();
        console.log('[=== Game resumed! Data was loaded. ===]');
    }


    Game.Init = () => {
        let pool = '';
        let power = 0;
        let order;
        let i;
        let me;
        Game.ready = 1;

        /*=====================================================================================
		VARIABLES AND PRESETS
		=======================================================================================*/
        Game.T = 0;
        Game.drawT = 0;
        Game.loopT = 0;
        Game.fps = 30;

        Game.season = Game.baseSeason;

        Game.l = elementByID('game');
        Game.bounds = 0;//rectangle defining screen limits (right,left,bottom,top) updated every logic frame

        if (Game.mobile === 1) {
            elementByID('wrapper').className = 'mobile';
        }
        Game.clickStr = Game.touchEvents ? 'ontouchend' : 'onclick';

        Game.SaveTo = 'CookieClickerGame';
        if (Game.beta) Game.SaveTo = 'CookieClickerGameBeta';
        elementByID('versionNumber').innerHTML = 'v. ' + Game.version + (Game.beta ? ' <span style="color:#ff0;">Modified (Nwero Clicker v8)</span>' : '');

        if (Game.version === 1.0466) {
            me = elementByID('linkVersionOld');
            me.parentNode.removeChild(me);
        } else {
            me = elementByID('linkVersionLive');
            me.parentNode.removeChild(me);
        }

        //l('links').innerHTML=(Game.beta?'<a href="../" target="blank">Live version</a> | ':'<a href="beta" target="blank">Try the beta!</a> | ')+'<a href="http://orteil.dashnet.org/experiments/cookie/" target="blank">Classic</a>';
        //l('links').innerHTML='<a href="http://orteil.dashnet.org/experiments/cookie/" target="blank">Cookie Clicker Classic</a>';

        Game.lastActivity = Date.now();//reset on mouse move, key press or click

        //latency compensator stuff
        Game.time = Date.now();
        Game.accumulatedDelay = 0;
        Game.delayTimeouts = 0;//how many times we've gone over the timeout delay
        Game.catchupLogic = 0;
        Game.fpsStartTime = 0;
        Game.frameNumber = 0;
        Game.currentFps = Game.fps;
        Game.previousFps = Game.currentFps;
        Game.getFps = () => {
            Game.frameNumber++;
            let currentTime = (Date.now() - Game.fpsStartTime) / 1000;
            let result = Math.floor((Game.frameNumber / currentTime));
            if (currentTime > 1) {
                Game.fpsStartTime = Date.now();
                Game.frameNumber = 0;
            }
            return result;
        }

        Game.cookiesEarned = 0;//all cookies earned during gameplay
        Game.cookies = 0;//cookies
        Game.cookiesd = 0;//cookies display
        Game.cookiesPs = 1;//cookies per second (to recalculate with every new purchase)
        Game.cookiesReset = 0;//cookies lost to resetting (used to determine prestige and heavenly chips)
        Game.cookieClicks = 0;//+1 for each click on the cookie
        Game.goldenClicks = 0;//+1 for each golden cookie clicked (all time)
        Game.goldenClicksLocal = 0;//+1 for each golden cookie clicked (this game only)
        Game.missedGoldenClicks = 0;//+1 for each golden cookie missed
        Game.handmadeCookies = 0;//all the cookies made from clicking the cookie
        Game.milkProgress = 0;//you gain a little bit for each achievement. Each increment of 1 is a different milk displayed.
        Game.milkH = Game.milkProgress / 2;//milk height, between 0 and 1 (although should never go above 0.5)
        Game.milkHd = 0;//milk height display
        Game.milkType = 0;//custom milk
        Game.bgType = 0;//custom background
        Game.chimeType = 0;//golden cookie chime
        Game.prestige = 0;//prestige level (recalculated depending on Game.cookiesReset)
        Game.heavenlyChips = 0;//heavenly chips the player currently has
        Game.heavenlyChipsDisplayed = 0;//ticks up or down to match Game.heavenlyChips
        Game.heavenlyChipsSpent = 0;//heavenly chips spent on cookies, upgrades and such
        Game.heavenlyCookies = 0;//how many cookies have we baked from chips (unused)
        Game.permanentUpgrades = [-1, -1, -1, -1, -1];
        Game.ascensionMode = 0;//type of challenge run if any
        Game.resets = 0;//reset counter
        Game.lumps = -1;//sugar lumps
        Game.lumpsTotal = -1;//sugar lumps earned across all playthroughs (-1 means they haven't even started yet)
        Game.lumpT = Date.now();//time when the current lump started forming
        Game.lumpRefill = 0;//time when we last used a sugar lump (on minigame refills etc)

        Game.makeSeed = () => {
            const chars = 'abcdefghijklmnopqrstuvwxyz'.split('');
            let str = '';
            for (let i = 0; i < 5; i++) {
                str += chooseRandomElement(chars);
            }
            return str;
        }
        Game.seed = Game.makeSeed();//each run has its own seed, used for deterministic random stuff

        Game.volume = 50;//sound volume

        Game.elderWrath = 0;
        Game.elderWrathOld = 0;
        Game.elderWrathD = 0;
        Game.pledges = 0;
        Game.pledgeT = 0;
        Game.researchT = 0;
        Game.nextResearch = 0;
        Game.cookiesSucked = 0;//cookies sucked by wrinklers
        Game.cpsSucked = 0;//percent of CpS being sucked by wrinklers
        Game.wrinklersPopped = 0;
        Game.santaLevel = 0;
        Game.reindeerClicked = 0;
        Game.seasonT = 0;
        Game.seasonUses = 0;
        Game.dragonLevel = 0;
        Game.dragonAura = 0;
        Game.dragonAura2 = 0;

        Game.blendModesOn = (document.createElement('detect').style.mixBlendMode === '');

        Game.bg = '';//background (grandmas and such)
        Game.bgFade = '';//fading to background
        Game.bgR = 0;//ratio (0 - not faded, 1 - fully faded)
        Game.bgRd = 0;//ratio displayed

        Game.windowW = window.innerWidth;
        Game.windowH = window.innerHeight;

        window.addEventListener('resize', () => {
            Game.windowW = window.innerWidth;
            Game.windowH = window.innerHeight;

            for (let i in Game.Objects) {
                let me = Game.Objects[i];
                me.toResize = true;
                if (me.minigame && me.minigame.onResize) me.minigame.onResize();
            }
        });

        Game.startDate = parseInt(Date.now());//when we started playing
        Game.fullDate = parseInt(Date.now());//when we started playing (carries over with resets)
        Game.lastDate = parseInt(Date.now());//when we last saved the game (used to compute "cookies made since we closed the game" etc)

        Game.prefs = [];
        Game.DefaultPrefs = () => {
            Game.prefs.particles = 1;//particle effects : falling cookies etc
            Game.prefs.numbers = 1;//numbers that pop up when clicking the cookie
            Game.prefs.autosave = 1;//save the game every minute or so
            Game.prefs.autoupdate = 0;//send an AJAX request to the server every 30 minutes (note : ignored)
            Game.prefs.milk = 1;//display milk
            Game.prefs.fancy = 1;//CSS shadow effects (might be heavy on some browsers)
            Game.prefs.warn = 0;//warn before closing the window
            Game.prefs.cursors = 1;//display cursors
            Game.prefs.focus = 1;//make the game refresh less frequently when off-focus
            Game.prefs.popups = 0;//use old-style popups
            Game.prefs.format = 0;//shorten numbers
            Game.prefs.notifs = 0;//notifications fade faster
            Game.prefs.animate = 1;//animate buildings
            Game.prefs.wobbly = 1;//wobbly cookie
            Game.prefs.monospace = 0;//alt monospace font for cookies
            Game.prefs.filters = 0;//CSS filter effects (might be heavy on some browsers)
            Game.prefs.cookiesound = 1;//use new cookie click sound
            Game.prefs.crates = 0;//show crates around icons in stats
            Game.prefs.altDraw = 0;//use requestAnimationFrame to update drawing instead of fixed 30 fps setTimeout
            Game.prefs.showBackupWarning = 1;//if true, show a "Have you backed up your save?" message on save load; set to false when save is exported
            Game.prefs.extraButtons = 1;//if true, show Mute buttons and the building master bar
            Game.prefs.askLumps = 0;//if true, show a prompt before spending lumps
            Game.prefs.customGrandmas = 1;//if true, show patreon names for grandmas
            Game.prefs.timeout = 0;//if true, game may show pause screen when timed out
        }
        Game.DefaultPrefs();

        window.onbeforeunload = event => {
            if (Game.prefs && Game.prefs.warn) {
                if (typeof event == 'undefined') event = window.event;
                if (event) event.returnValue = 'Are you sure you want to close Cookie Clicker?';
            }
        }

        Game.Mobile = () => {
            if (!Game.mobile) {
                elementByID('wrapper').className = 'mobile';
                Game.mobile = 1;
            } else {
                elementByID('wrapper').className = '';
                Game.mobile = 0;
            }
        }

        Game.showBackupWarning = () => {
            Game.Notify('Back up your save!', 'Hello again! Just a reminder that you may want to back up your Cookie Clicker save every once in a while, just in case.<br>To do so, go to Options and hit "Export save" or "Save to file"!<div class="line"></div><a style="float:right;" onclick="Game.prefs.showBackupWarning=0;==CLOSETHIS()===">Don\'t show this again</a>', [25, 7]);
        }

        /*=====================================================================================
		MOD HOOKS (will be subject to change, probably shouldn't be used yet)
		=======================================================================================*/
        //really primitive custom mods support - might not be of any use at all (could theoretically be used for custom upgrades and achievements I guess?)
        Game.customChecks = [];//push functions into this to add them to the "check for upgrade/achievement conditions" that happens every few seconds
        Game.customInit = [];//add to the initialization call
        Game.customLogic = [];//add to the logic calls
        Game.customDraw = [];//add to the draw calls
        Game.customSave = [];//add to the save write calls (save to your own localstorage key)
        Game.customLoad = [];//add to the save load calls
        Game.customReset = [];//add to the reset calls
        Game.customTickers = [];//add to the random tickers (functions should return arrays of text)
        Game.customCps = [];//add to the CpS computation (functions should return something to add to the multiplier ie. 0.1 for an addition of 10 to the CpS multiplier)
        Game.customCpsMult = [];//add to the CpS multiplicative computation (functions should return something to multiply by the multiplier ie. 1.05 for a 5% increase of the multiplier)
        Game.customMouseCps = [];//add to the cookies earned per click computation (functions should return something to add to the multiplier ie. 0.1 for an addition of 10 to the CpS multiplier)
        Game.customMouseCpsMult = [];//add to the cookies earned per click multiplicative computation (functions should return something to multiply by the multiplier ie. 1.05 for a 5% increase of the multiplier)
        Game.customCookieClicks = [];//add to the cookie click calls
        Game.customCreate = [];//create your new upgrades and achievements in there

        Game.LoadMod = url => {
            const js = document.createElement('script');
            let id = url.split('/');
            id = id[id.length - 1].split('.')[0];
            js.setAttribute('type', 'text/javascript');
            js.setAttribute('id', 'modscript_' + id);
            js.setAttribute('src', url);
            document.head.appendChild(js);
            console.log('Loaded the mod ' + url + ', ' + id + '.');
        }

        //replacing an existing canvas picture with a new one at runtime : Game.Loader.Replace('perfectCookie.png','imperfectCookie.png');
        //upgrades and achievements can use other pictures than icons.png; declare their icon with [posX,posY,'http://example.com/myIcons.png']
        //check out the "UNLOCKING STUFF" section to see how unlocking achievs and upgrades is done (queue yours in Game.customChecks)
        //if you're making a mod, don't forget to add a Game.Win('Third-party') somewhere in there!

        //Okay Mister Orteil, here it is:
        //Game.Win('Third-party')
        //Okay do not add this anywhere, it breaks everything lmao

        //IMPORTANT : all of the above is susceptible to heavy change, proper modding API in the works


        /*=====================================================================================
		BAKERY NAME
		=======================================================================================*/
        Game.RandomBakeryName = () => (Math.random() > 0.05 ? (chooseRandomElement(['Magic', 'Fantastic', 'Fancy', 'Sassy', 'Snazzy', 'Pretty', 'Cute', 'Pirate', 'Ninja', 'Zombie', 'Robot', 'Radical', 'Urban', 'Cool', 'Hella', 'Sweet', 'Awful', 'Double', 'Triple', 'Turbo', 'Techno', 'Disco', 'Electro', 'Dancing', 'Wonder', 'Mutant', 'Space', 'Science', 'Medieval', 'Future', 'Captain', 'Bearded', 'Lovely', 'Tiny', 'Big', 'Fire', 'Water', 'Frozen', 'Metal', 'Plastic', 'Solid', 'Liquid', 'Moldy', 'Shiny', 'Happy', 'Happy Little', 'Slimy', 'Tasty', 'Delicious', 'Hungry', 'Greedy', 'Lethal', 'Professor', 'Doctor', 'Power', 'Chocolate', 'Crumbly', 'Choklit', 'Righteous', 'Glorious', 'Mnemonic', 'Psychic', 'Frenetic', 'Hectic', 'Crazy', 'Royal', 'El', 'Von']) + ' ') : 'Mc') + chooseRandomElement(['Cookie', 'Biscuit', 'Muffin', 'Scone', 'Cupcake', 'Pancake', 'Chip', 'Sprocket', 'Gizmo', 'Puppet', 'Mitten', 'Sock', 'Teapot', 'Mystery', 'Baker', 'Cook', 'Grandma', 'Click', 'Clicker', 'Spaceship', 'Factory', 'Portal', 'Machine', 'Experiment', 'Monster', 'Panic', 'Burglar', 'Bandit', 'Booty', 'Potato', 'Pizza', 'Burger', 'Sausage', 'Meatball', 'Spaghetti', 'Macaroni', 'Kitten', 'Puppy', 'Giraffe', 'Zebra', 'Parrot', 'Dolphin', 'Duckling', 'Sloth', 'Turtle', 'Goblin', 'Pixie', 'Gnome', 'Computer', 'Pirate', 'Ninja', 'Zombie', 'Robot'])

        Game.GetBakeryName = () => Game.RandomBakeryName()

        Game.bakeryName = Game.GetBakeryName();
        Game.bakeryNameL = elementByID('bakeryName');
        Game.bakeryNameL.innerHTML = Game.bakeryName + '\'s corpa';
        Game.bakeryNameSet = what => {
            Game.bakeryName = what.replace(/\W+/g, ' ');
            Game.bakeryName = Game.bakeryName.substring(0, 28);
            Game.bakeryNameRefresh();
        }
        Game.bakeryNameRefresh = () => {
            let name = Game.bakeryName;
            if (name.slice(-1).toLowerCase() === 's') name += '\' corpa'; else name += '\'s corpa';
            Game.bakeryNameL.innerHTML = name;
            name = Game.bakeryName.toLowerCase();
            if (name === 'orteil') Game.Win('God complex');
            if (name.indexOf('saysopensesame', name.length - ('saysopensesame').length) > 0 && !Game.sesame) Game.OpenSesame();
            Game.recalculateGains = 1;
        }
        Game.bakeryNamePrompt = () => {
            Game.Prompt('<h3>Name your corpa</h3><div class="block" style="text-align:center;">What should your corpa\'s name be?</div><div class="block"><input type="text" style="text-align:center;width:100%;" id="bakeryNameInput" value="' + Game.bakeryName + '"/></div>', [['Confirm', 'if (elementByID(\'bakeryNameInput\').value.length>0) {Game.bakeryNameSet(elementByID(\'bakeryNameInput\').value);Game.Win(\'What\\\'s in a name\');Game.ClosePrompt();}'], ['Random', 'Game.bakeryNamePromptRandom();'], 'Cancel']);
            elementByID('bakeryNameInput').focus();
            elementByID('bakeryNameInput').select();
        }
        Game.bakeryNamePromptRandom = () => {
            elementByID('bakeryNameInput').value = Game.RandomBakeryName();
        }
        AddEvent(Game.bakeryNameL, 'click', Game.bakeryNamePrompt);


        /*=====================================================================================
		TOOLTIP
		=======================================================================================*/
        Game.tooltip = {
            text: '',
            x: 0,
            y: 0,
            origin: '',
            on: 0,
            tt: elementByID('tooltip'),
            tta: elementByID('tooltipAnchor'),
            shouldHide: 1,
            dynamic: 0,
            from: 0
        };
        Game.tooltip.draw = function (from, text, origin) {
            this.shouldHide = 0;
            this.text = text;
            this.from = from;
            //this.x=x;
            //this.y=y;
            this.origin = origin;
            let tt = this.tt;
            let tta = this.tta;
            tt.style.left = 'auto';
            tt.style.top = 'auto';
            tt.style.right = 'auto';
            tt.style.bottom = 'auto';
            if (typeof this.text === 'function') {
                text = this.text();
                if (text === '') tta.style.opacity = '0';
                else {
                    tt.innerHTML = unescape(text);
                    tta.style.opacity = '1';
                }
            } else tt.innerHTML = unescape(this.text);
            //tt.innerHTML=(typeof this.text==='function')?unescape(this.text()):unescape(this.text);
            tta.style.display = 'block';
            tta.style.visibility = 'hidden';
            Game.tooltip.update();
            tta.style.visibility = 'visible';
            this.on = 1;
        }
        Game.tooltip.update = function () {
            let rect;
            let X = 0;
            let Y = 0;
            let width = this.tt.offsetWidth;
            let height = this.tt.offsetHeight;
            if (this.origin === 'store') {
                X = Game.windowW - 332 - width;
                Y = Game.mouseY - 32;
                if (Game.onCrate) Y = Game.onCrate.getBoundingClientRect().top - 42;
                Y = Math.max(0, Math.min(Game.windowH - height - 44, Y));
                /*this.tta.style.right='308px';//'468px';
				this.tta.style.left='auto';
				if (Game.onCrate) Y=Game.onCrate.getBoundingClientRect().top-2;
				this.tta.style.top=Math.max(0,Math.min(Game.windowH-this.tt.clientHeight-64,Y-48))+'px';*/
            } else {
                if (Game.onCrate) {
                    rect = Game.onCrate.getBoundingClientRect();
                    rect = {left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom};
                    if (rect.left === 0 && rect.top === 0)//if we get that bug where we get stuck in the top-left, move to the mouse (REVISION : just do nothing)
                    {
                        return false;/*rect.left=Game.mouseX-24;rect.right=Game.mouseX+24;rect.top=Game.mouseY-24;rect.bottom=Game.mouseY+24;*/
                    }
                    if (this.origin === 'left') {
                        X = rect.left - width - 16;
                        Y = rect.top + (rect.bottom - rect.top) / 2 - height / 2 - 38;
                        Y = Math.max(0, Math.min(Game.windowH - height - 19, Y));
                        if (X < 0) X = rect.right;
                    } else {
                        X = rect.left + (rect.right - rect.left) / 2 - width / 2 - 8;
                        Y = rect.top - height - 48;
                        X = Math.max(0, Math.min(Game.windowW - width - 16, X));
                        if (Y < 0) Y = rect.bottom - 32;
                    }
                } else if (this.origin === 'bottom-right') {
                    X = Game.mouseX + 8;
                    Y = Game.mouseY - 32;
                    X = Math.max(0, Math.min(Game.windowW - width - 16, X));
                    Y = Math.max(0, Math.min(Game.windowH - height - 64, Y));
                } else if (this.origin === 'bottom') {
                    X = Game.mouseX - width / 2 - 8;
                    Y = Game.mouseY + 24;
                    X = Math.max(0, Math.min(Game.windowW - width - 16, X));
                    Y = Math.max(0, Math.min(Game.windowH - height - 64, Y));
                } else if (this.origin === 'left') {
                    X = Game.mouseX - width - 24;
                    Y = Game.mouseY - height / 2 - 8;
                    X = Math.max(0, Math.min(Game.windowW - width - 16, X));
                    Y = Math.max(0, Math.min(Game.windowH - height - 64, Y));
                } else if (this.origin === 'this' && this.from) {
                    rect = this.from.getBoundingClientRect();
                    X = (rect.left + rect.right) / 2 - width / 2 - 8;
                    Y = (rect.top) - this.tt.clientHeight - 48;
                    X = Math.max(0, Math.min(Game.windowW - width - 16, X));
                    //Y=Math.max(0,Math.min(Game.windowH-this.tt.clientHeight-64,Y));
                    if (Y < 0) Y = (rect.bottom - 24);
                    if (Y + height + 40 > Game.windowH) {
                        X = rect.right + 8;
                        Y = rect.top + (rect.bottom - rect.top) / 2 - height / 2 - 38;
                        Y = Math.max(0, Math.min(Game.windowH - height - 19, Y));
                    }
                } else {
                    X = Game.mouseX - width / 2 - 8;
                    Y = Game.mouseY - height - 32;
                    X = Math.max(0, Math.min(Game.windowW - width - 16, X));
                    Y = Math.max(0, Math.min(Game.windowH - height - 64, Y));
                }
            }
            this.tta.style.left = X + 'px';
            this.tta.style.right = 'auto';
            this.tta.style.top = Y + 'px';
            this.tta.style.bottom = 'auto';
            if (this.shouldHide) {
                this.hide();
                this.shouldHide = 0;
            } else if (Game.drawT % 10 === 0 && typeof (this.text) == 'function') {
                let text = this.text();
                if (text === '') this.tta.style.opacity = '0';
                else {
                    this.tt.innerHTML = unescape(text);
                    this.tta.style.opacity = '1';
                }
            }
        }
        Game.tooltip.hide = function () {
            this.tta.style.display = 'none';
            this.dynamic = 0;
            this.on = 0;
        }
        Game.getTooltip = (text, origin, isCrate) => {
            origin = (origin ? origin : 'middle');
            if (isCrate) return 'onMouseOut="Game.setOnCrate(0);Game.tooltip.shouldHide=1;" onMouseOver="if (!Game.mouseDown) {Game.setOnCrate(this);Game.tooltip.dynamic=0;Game.tooltip.draw(this,\'' + escape(text) + '\',\'' + origin + '\');Game.tooltip.wobble();}"';
            else return 'onMouseOut="Game.tooltip.shouldHide=1;" onMouseOver="Game.tooltip.dynamic=0;Game.tooltip.draw(this,\'' + escape(text) + '\',\'' + origin + '\');Game.tooltip.wobble();"';
        }
        Game.getDynamicTooltip = (func, origin, isCrate) => {
            origin = (origin ? origin : 'middle');
            if (isCrate) return 'onMouseOut="Game.setOnCrate(0);Game.tooltip.shouldHide=1;" onMouseOver="if (!Game.mouseDown) {Game.setOnCrate(this);Game.tooltip.dynamic=1;Game.tooltip.draw(this,' + 'function(){return ' + func + '();}' + ',\'' + origin + '\');Game.tooltip.wobble();}"';
            return 'onMouseOut="Game.tooltip.shouldHide=1;" onMouseOver="Game.tooltip.dynamic=1;Game.tooltip.draw(this,' + 'function(){return ' + func + '();}' + ',\'' + origin + '\');Game.tooltip.wobble();"';
        }
        Game.attachTooltip = (el, func, origin) => {
            if (typeof func === 'string') {
                let str = func;
                func = (str => function () {
                    return str;
                })(str);
            }
            origin = (origin ? origin : 'middle');
            AddEvent(el, 'mouseover', ((func, el, origin) => () => {
                Game.tooltip.dynamic = 1;
                Game.tooltip.draw(el, func, origin);
            })(func, el, origin));
            AddEvent(el, 'mouseout', (() => () => {
                Game.tooltip.shouldHide = 1;
            })());
        }
        Game.tooltip.wobble = () => {
        }


        /*=====================================================================================
		UPDATE CHECKER
		=======================================================================================*/
        Game.CheckUpdates = () => {
            //ajax('server.php?q=checkupdate',Game.CheckUpdatesResponse);
        }
        Game.CheckUpdatesResponse = response => {
            let r = response.split('|');
            let str = '';
            if (r[0] === 'alert') {
                if (r[1]) str = r[1];
            } else if (parseFloat(r[0]) > Game.version) {
                str = '<b>New version available : v. ' + r[0] + '!</b>';
                if (r[1]) str += '<br><small>Update note : "' + r[1] + '"</small>';
                str += '<br><b>Refresh to get it!</b>';
            }
            if (str !== '') {
                elementByID('alert').innerHTML = str;
                elementByID('alert').style.display = 'block';
            }
        }

        /*=====================================================================================
		DATA GRABBER
		=======================================================================================*/

        Game.externalDataLoaded = false;

        Game.grandmaNames = ['Granny', 'Gusher', 'Ethel', 'Edna', 'Doris', 'Maud', 'Hilda', 'Gladys', 'Michelle', 'Michele', 'Phyllis', 'Millicent', 'Muriel', 'Myrtle', 'Mildred', 'Mavis', 'Helen', 'Gloria', 'Sheila', 'Betty', 'Gertrude', 'Agatha', 'Beryl', 'Agnes', 'Pearl', 'Precious', 'Ruby', 'Vera', 'Bonnie', 'Ada', 'Bunny', 'Cookie', 'Darling', 'Gaga', 'GamGam', 'Memaw', 'Mimsy', 'Peanut', 'Nana', 'Nan', 'Tootsie', 'Warty', 'Stinky', 'Heinous'];
        Game.customGrandmaNames = [];
        Game.heralds = 0;

        Game.GrabData = () => {
            //Maybe we could figure out something to put here since heralds don't work?
        }
        Game.GrabDataResponse = response => {
            /*
				response should be formatted as
				{"herald":3,"grandma":"a|b|c|...}
			*/
            let r = {};
            try {
                r = JSON.parse(response);
                if (typeof r['herald'] !== 'undefined') {
                    Game.heralds = parseInt(r['herald']);
                    Game.heralds = Math.max(0, Math.min(100, Game.heralds));
                }
                if (typeof r['grandma'] !== 'undefined' && r['grandma'] !== '') {
                    Game.customGrandmaNames = r['grandma'].split('|');
                    Game.customGrandmaNames = Game.customGrandmaNames.filter(function (el) {
                        return el !== '';
                    });
                }

                elementByID('heraldsAmount').innerHTML = Game.heralds;
                Game.externalDataLoaded = true;
            } catch (e) {
            }
        }


        Game.attachTooltip(elementByID('topbarOrteil'), '<div style="padding:8px;width:250px;text-align:center;">A link to Twitch!<br>She is the reason this exists after all.</div>', 'this');
        Game.attachTooltip(elementByID('topbarDashnet'), '<div style="padding:8px;width:250px;text-align:center;">Back to our homepage!</div>', 'this');
        //Game.attachTooltip(l('topbarTwitter'),'<div style="padding:8px;width:250px;text-align:center;">Orteil\'s twitter, which frequently features game updates.</div>','this');
        //Game.attachTooltip(l('topbarTumblr'),'<div style="padding:8px;width:250px;text-align:center;">Orteil\'s tumblr, which frequently features game updates.</div>','this');
        Game.attachTooltip(elementByID('topbarDiscord'), '<div style="padding:8px;width:250px;text-align:center;">Our official discord server.<br>You can share tips and questions about Cookie Clicker and all our other games!</div>', 'this');
        //Game.attachTooltip(l('topbarPatreon'),'<div style="padding:8px;width:250px;text-align:center;">Support us on Patreon and help us keep updating Cookie Clicker!<br>There\'s neat rewards for patrons too!</div>','this');
        //Game.attachTooltip(l('topbarMerch'),'<div style="padding:8px;width:250px;text-align:center;">Cookie Clicker shirts, hoodies and stickers!</div>','this');
        Game.attachTooltip(elementByID('topbarRandomgen'), '<div style="padding:8px;width:250px;text-align:center;">A thing we made that lets you write random generators.</div>', 'this');
        Game.attachTooltip(elementByID('topbarIGM'), '<div style="padding:8px;width:250px;text-align:center;">A thing we made that lets you create your own idle games using a simple scripting language.</div>', 'this');

        Game.attachTooltip(elementByID('heralds'), function () {
            let str = '';

            if (!Game.externalDataLoaded) str += 'Heralds couldn\'t be loaded. There may be an issue with our servers, or you are playing the game locally.';
            else {
                if (Game.heralds === 0) str += 'There are no heralds at the moment. Please consider <b style="color:#bc3aff;">donating to our Patreon</b>!';
                else {
                    str += (Game.heralds === 1 ? '<b style="color:#bc3aff;text-shadow:0 1px 0 #6d0096;">1 herald</b> is' : '<b style="color:#fff;text-shadow:0 1px 0 #6d0096,0 0 6px #bc3aff;">' + Game.heralds + ' heralds</b> are') + ' selflessly inspiring a boost in production for everyone, resulting in<br><b style="color:#cdaa89;text-shadow:0 1px 0 #7c4532,0 0 6px #7c4532;"><div style="width:16px;height:16px;display:inline-block;vertical-align:middle;background:url(/img/money.png);"></div> +' + Game.heralds + '% Neuros per second</b>.';
                    str += '<div class="line"></div>';
                    if (Game.ascensionMode === 1) str += 'You are in a <b>Born again</b> run, and are not currently benefiting from heralds.';
                    else if (Game.Has('Heralds')) str += 'You own the <b>Heralds</b> upgrade, and therefore benefit from the production boost.';
                    else str += 'To benefit from the herald bonus, you need a special upgrade you do not yet own. You will permanently unlock it later in the game.';
                }
            }
            str += '<div class="line"></div><span style="font-size:90%;opacity:0.6;"><b>Heralds</b> are people who have donated to our highest Patreon tier, and are limited to 100.<br>Each herald gives everyone +1% CpS.<br>Heralds benefit everyone playing the game, regardless of whether you donated.</span>';

            str += '<div style="width:31px;height:39px;background:url(/img/heraldFlag.png);position:absolute;top:0;left:8px;"></div><div style="width:31px;height:39px;background:url(/img/heraldFlag.png);position:absolute;top:0;right:8px;"></div>';

            return '<div style="padding:8px;width:300px;text-align:center;" class="prompt"><h3>Heralds</h3><div class="block">' + str + '</div></div>';
        }, 'this');
        elementByID('heraldsAmount').innerHTML = '?';
        elementByID('heralds').style.display = 'inline-block';

        Game.GrabData();


        Game.useLocalStorage = 1;
        Game.localStorageGet = key => {
            let local = 0;
            try {
                local = window.localStorage.getItem(key);
            } catch (exception) {
            }
            return local;
        }
        Game.localStorageSet = (key, str) => {
            try {
                window.localStorage.setItem(key, str);
            } catch (exception) {
                console.log(exception);
            }
        }
        //window.localStorage.clear();//won't switch back to cookie-based if there is localStorage info

        /*=====================================================================================
		SAVE
		=======================================================================================*/
        Game.ExportSave = () => {
            Game.prefs.showBackupWarning = 0;
            Game.Prompt('<h3>Export save</h3><div class="block">This is your save code.<br>Copy it and keep it somewhere safe!</div><div class="block"><textarea id="textareaPrompt" style="width:100%;height:128px;" readonly>' + Game.WriteSave(1) + '</textarea></div>', ['All done!']);//prompt('Copy this text and keep it somewhere safe!',Game.WriteSave(1));
            elementByID('textareaPrompt').focus();
            elementByID('textareaPrompt').select();
        }
        Game.ImportSave = () => {
            Game.Prompt('<h3>Import save</h3><div class="block">Please paste in the code that was given to you on save export.</div><div class="block"><textarea id="textareaPrompt" style="width:100%;height:128px;"></textarea></div>', [['Load', 'if (elementByID(\'textareaPrompt\').value.length>0) {Game.ImportSaveCode(elementByID(\'textareaPrompt\').value);Game.ClosePrompt();}'], 'Nevermind']);//prompt('Please paste in the text that was given to you on save export.','');
            elementByID('textareaPrompt').focus();
        }
        Game.ImportSaveCode = save => {
            if (save && save !== '') Game.LoadSave(save);
        }

        Game.FileSave = () => {
            Game.prefs.showBackupWarning = 0;
            const filename = Game.bakeryName.replace(/[^a-zA-Z0-9]+/g, '') + 'Bakery';
            const text = Game.WriteSave(1);
            const blob = new Blob([text], {type: 'text/plain;charset=utf-8'});
            saveAs(blob, filename + '.txt');
        }
        Game.FileLoad = e => {
            if (e.target.files.length === 0) return false;
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = function (e) {
                Game.ImportSaveCode(e.target.result);
            }
            reader.readAsText(file);
        }

        Game.toSave = false;
        Game.WriteSave = type => {
            let me;
            let i;
            Game.toSave = false;
            //type : none is default, 1=return string only, 2=return uncompressed string, 3=return uncompressed, commented string
            Game.lastDate = parseInt(Game.time);
            let str = '';
            if (type === 3) str += '\nGame version\n';
            str += Game.version + '|';
            str += '|';//just in case we need some more stuff here
            if (type === 3) str += '\n\nRun details';
            str +=//save stats
                (type === 3 ? '\n	run start date : ' : '') + parseInt(Game.startDate) + ';' +
                (type === 3 ? '\n	legacy start date : ' : '') + parseInt(Game.fullDate) + ';' +
                (type === 3 ? '\n	date when we last opened the game : ' : '') + parseInt(Game.lastDate) + ';' +
                (type === 3 ? '\n	bakery name : ' : '') + (Game.bakeryName) + ';' +
                (type === 3 ? '\n	seed : ' : '') + (Game.seed) +
                '|';
            if (type === 3) str += '\n\nPacked preferences bitfield\n	';
            let str2 =//prefs
                (Game.prefs.particles ? '1' : '0') +
                (Game.prefs.numbers ? '1' : '0') +
                (Game.prefs.autosave ? '1' : '0') +
                (Game.prefs.autoupdate ? '1' : '0') +
                (Game.prefs.milk ? '1' : '0') +
                (Game.prefs.fancy ? '1' : '0') +
                (Game.prefs.warn ? '1' : '0') +
                (Game.prefs.cursors ? '1' : '0') +
                (Game.prefs.focus ? '1' : '0') +
                (Game.prefs.format ? '1' : '0') +
                (Game.prefs.notifs ? '1' : '0') +
                (Game.prefs.wobbly ? '1' : '0') +
                (Game.prefs.monospace ? '1' : '0') +
                (Game.prefs.filters ? '1' : '0') +
                (Game.prefs.cookiesound ? '1' : '0') +
                (Game.prefs.crates ? '1' : '0') +
                (Game.prefs.showBackupWarning ? '1' : '0') +
                (Game.prefs.extraButtons ? '1' : '0') +
                (Game.prefs.askLumps ? '1' : '0') +
                (Game.prefs.customGrandmas ? '1' : '0') +
                (Game.prefs.timeout ? '1' : '0') +
                '';
            str2 = pack3(str2);
            str += str2 + '|';
            if (type === 3) str += '\n\nMisc game data';
            str +=
                (type === 3 ? '\n	Neuros : ' : '') + parseFloat(Game.cookies).toString() + ';' +
                (type === 3 ? '\n	total Neuros earned : ' : '') + parseFloat(Game.cookiesEarned).toString() + ';' +
                (type === 3 ? '\n	Neuro clicks : ' : '') + parseInt(Math.floor(Game.cookieClicks)) + ';' +
                (type === 3 ? '\n	golden Neuro clicks : ' : '') + parseInt(Math.floor(Game.goldenClicks)) + ';' +
                (type === 3 ? '\n	Neuros made by clicking : ' : '') + parseFloat(Game.handmadeCookies).toString() + ';' +
                (type === 3 ? '\n	golden Neuros missed : ' : '') + parseInt(Math.floor(Game.missedGoldenClicks)) + ';' +
                (type === 3 ? '\n	background type : ' : '') + parseInt(Math.floor(Game.bgType)) + ';' +
                (type === 3 ? '\n	milk type : ' : '') + parseInt(Math.floor(Game.milkType)) + ';' +
                (type === 3 ? '\n	cookies from past runs : ' : '') + parseFloat(Game.cookiesReset).toString() + ';' +
                (type === 3 ? '\n	elder wrath : ' : '') + parseInt(Math.floor(Game.elderWrath)) + ';' +
                (type === 3 ? '\n	pledges : ' : '') + parseInt(Math.floor(Game.pledges)) + ';' +
                (type === 3 ? '\n	pledge time left : ' : '') + parseInt(Math.floor(Game.pledgeT)) + ';' +
                (type === 3 ? '\n	currently researching : ' : '') + parseInt(Math.floor(Game.nextResearch)) + ';' +
                (type === 3 ? '\n	research time left : ' : '') + parseInt(Math.floor(Game.researchT)) + ';' +
                (type === 3 ? '\n	ascensions : ' : '') + parseInt(Math.floor(Game.resets)) + ';' +
                (type === 3 ? '\n	golden Neuro clicks (this run) : ' : '') + parseInt(Math.floor(Game.goldenClicksLocal)) + ';' +
                (type === 3 ? '\n	Neuros sucked by wrinklers : ' : '') + parseFloat(Game.cookiesSucked).toString() + ';' +
                (type === 3 ? '\n	wrinkles popped : ' : '') + parseInt(Math.floor(Game.wrinklersPopped)) + ';' +
                (type === 3 ? '\n	santa level : ' : '') + parseInt(Math.floor(Game.santaLevel)) + ';' +
                (type === 3 ? '\n	reindeer clicked : ' : '') + parseInt(Math.floor(Game.reindeerClicked)) + ';' +
                (type === 3 ? '\n	season time left : ' : '') + parseInt(Math.floor(Game.seasonT)) + ';' +
                (type === 3 ? '\n	season switcher uses : ' : '') + parseInt(Math.floor(Game.seasonUses)) + ';' +
                (type === 3 ? '\n	current season : ' : '') + (Game.season ? Game.season : '') + ';';
            const wrinklers = Game.SaveWrinklers();
            str +=
                (type === 3 ? '\n	amount of Neuros contained in wrinklers : ' : '') + parseFloat(Math.floor(wrinklers.amount)) + ';' +
                (type === 3 ? '\n	number of wrinklers : ' : '') + parseInt(Math.floor(wrinklers.number)) + ';' +
                (type === 3 ? '\n	prestige level : ' : '') + parseFloat(Game.prestige).toString() + ';' +
                (type === 3 ? '\n	heavenly chips : ' : '') + parseFloat(Game.heavenlyChips).toString() + ';' +
                (type === 3 ? '\n	heavenly chips spent : ' : '') + parseFloat(Game.heavenlyChipsSpent).toString() + ';' +
                (type === 3 ? '\n	heavenly Neuros : ' : '') + parseFloat(Game.heavenlyCookies).toString() + ';' +
                (type === 3 ? '\n	ascension mode : ' : '') + parseInt(Math.floor(Game.ascensionMode)) + ';' +
                (type === 3 ? '\n	permanent upgrades : ' : '') + parseInt(Math.floor(Game.permanentUpgrades[0])) + ';' + parseInt(Math.floor(Game.permanentUpgrades[1])) + ';' + parseInt(Math.floor(Game.permanentUpgrades[2])) + ';' + parseInt(Math.floor(Game.permanentUpgrades[3])) + ';' + parseInt(Math.floor(Game.permanentUpgrades[4])) + ';' +
                (type === 3 ? '\n	dragon level : ' : '') + parseInt(Math.floor(Game.dragonLevel)) + ';' +
                (type === 3 ? '\n	dragon aura : ' : '') + parseInt(Math.floor(Game.dragonAura)) + ';' +
                (type === 3 ? '\n	dragon aura 2 : ' : '') + parseInt(Math.floor(Game.dragonAura2)) + ';' +
                (type === 3 ? '\n	chime type : ' : '') + parseInt(Math.floor(Game.chimeType)) + ';' +
                (type === 3 ? '\n	volume : ' : '') + parseInt(Math.floor(Game.volume)) + ';' +
                (type === 3 ? '\n	number of shiny wrinklers : ' : '') + parseInt(Math.floor(wrinklers.shinies)) + ';' +
                (type === 3 ? '\n	amount of Neuros contained in shiny wrinklers : ' : '') + parseFloat(Math.floor(wrinklers.amountShinies)) + ';' +
                (type === 3 ? '\n	current amount of sugar lumps : ' : '') + parseFloat(Math.floor(Game.lumps)) + ';' +
                (type === 3 ? '\n	total amount of sugar lumps made : ' : '') + parseFloat(Math.floor(Game.lumpsTotal)) + ';' +
                (type === 3 ? '\n	time when current sugar lump started : ' : '') + parseFloat(Math.floor(Game.lumpT)) + ';' +
                (type === 3 ? '\n	time when last refilled a minigame with a sugar lump : ' : '') + parseFloat(Math.floor(Game.lumpRefill)) + ';' +
                (type === 3 ? '\n	sugar lump type : ' : '') + parseInt(Math.floor(Game.lumpCurrentType)) + ';' +
                (type === 3 ? '\n	vault : ' : '') + Game.vault.join(',') + ';' +
                (type === 3 ? '\n	heralds : ' : '') + parseInt(Game.heralds) + ';' +
                '|';//cookies and lots of other stuff

            if (type === 3) str += '\n\nBuildings : amount, bought, Neuros produced, level, minigame data';
            for (i in Game.Objects)//buildings
            {
                me = Game.Objects[i];
                if (type === 3) str += '\n	' + me.name + ' : ';
                if (me.vanilla) {
                    str += me.amount + ',' + me.bought + ',' + parseFloat(Math.floor(me.totalCookies)) + ',' + parseInt(me.level);
                    if (Game.isMinigameReady(me)) str += ',' + me.minigame.save(); else str += ',';
                    str += ',' + (me.muted ? '1' : '0');
                    str += ';';
                }
            }
            str += '|';
            if (type === 3) str += '\n\nPacked upgrades bitfield (unlocked and bought)\n	';
            let toCompress = [];
            for (i in Game.UpgradesById)//upgrades
            {
                me = Game.UpgradesById[i];
                if (me.vanilla) toCompress.push(Math.min(me.unlocked, 1), Math.min(me.bought, 1));
            }

            toCompress = pack3(toCompress.join(''));//toCompress=pack(toCompress);//CompressLargeBin(toCompress);

            str += toCompress;
            str += '|';
            if (type === 3) str += '\n\nPacked achievements bitfield (won)\n	';
            toCompress = [];
            for (i in Game.AchievementsById)//achievements
            {
                me = Game.AchievementsById[i];
                if (me.vanilla) toCompress.push(Math.min(me.won));
            }
            toCompress = pack3(toCompress.join(''));//toCompress=pack(toCompress);//CompressLargeBin(toCompress);
            str += toCompress;

            str += '|';
            if (type === 3) str += '\n\nBuffs : type, maxTime, time, arg1, arg2, arg3';
            for (i in Game.buffs) {
                me = Game.buffs[i];
                if (me.type) {
                    if (type === 3) str += '\n	' + me.type.name + ' : ';
                    if (me.type.vanilla) {
                        str += me.type.id + ',' + me.maxTime + ',' + me.time;
                        if (typeof me.arg1 !== 'undefined') str += ',' + parseFloat(me.arg1);
                        if (typeof me.arg2 !== 'undefined') str += ',' + parseFloat(me.arg2);
                        if (typeof me.arg3 !== 'undefined') str += ',' + parseFloat(me.arg3);
                        str += ';';
                    }
                }
            }


            if (type === 3) str += '\n';

            for (i in Game.customSave) {
                Game.customSave[i]();
            }

            if (type === 2 || type === 3) {
                return str;
            } else if (type === 1) {
                str = escape(utf8_to_b64(str) + '!END!');
                return str;
            } else {
                if (Game.useLocalStorage) {
                    //so we used to save the game using browser cookies, which was just really neat considering the game's name
                    //we're using localstorage now, which is more efficient but not as cool
                    //a moment of silence for our fallen puns

                    //Since this is Neuro Clicker now, that pun doesn't make sense, therefore this comment is useless, maybe it should delete it...

                    //I'm finding some very silly stuff back here
                    str = utf8_to_b64(str) + '!END!';
                    if (str.length < 10) {
                        if (Game.prefs.popups) Game.Popup('Error while saving.<br>Purchasing an upgrade might fix this.');
                        else Game.Notify('Saving failed!', 'Purchasing an upgrade and saving again might fix this.<br>This really shouldn\'t happen; please notify us in the neuro clicker thread.');
                    } else {
                        str = escape(str);
                        Game.localStorageSet(Game.SaveTo, str);//aaand save
                        if (!Game.localStorageGet(Game.SaveTo)) {
                            if (Game.prefs.popups) Game.Popup('Error while saving.<br>Export your save instead!');
                            else Game.Notify('Error while saving', 'Export your save instead!');
                        } else if (document.hasFocus()) {
                            if (Game.prefs.popups) Game.Popup('Game saved');
                            else Game.Notify('Game saved', '', '', 1, 1);
                        }
                    }
                } else//legacy system
                {
                    //that's right
                    //we're using cookies
                    //yeah I went there
                    const now = new Date();//we storin dis for 5 years, people
                    now.setFullYear(now.getFullYear() + 5);//mmh stale cookies
                    str = utf8_to_b64(str) + '!END!';
                    Game.saveData = escape(str);
                    str = Game.SaveTo + '=' + escape(str) + '; expires=' + now.toUTCString() + ';';
                    document.cookie = str;//aaand save
                    if (document.cookie.indexOf(Game.SaveTo) < 0) {
                        if (Game.prefs.popups) Game.Popup('Error while saving.<br>Export your save instead!');
                        else Game.Notify('Error while saving', 'Export your save instead!', '', 0, 1);
                    } else if (document.hasFocus()) {
                        if (Game.prefs.popups) Game.Popup('Game saved');
                        else Game.Notify('Game saved', '', '', 1, 1);
                    }
                }
            }
        }

        /*=====================================================================================
		LOAD
		=======================================================================================*/
        Game.salvageSave = () => {
            //for when Cookie Clicker won't load and you need your save
            console.log('===================================================');
            console.log('This is your save data. Copypaste it (without quotation marks) into another version using the "Import save" feature.');
            console.log(Game.localStorageGet(Game.SaveTo));
        }
        Game.LoadSave = data => {
            let percent;
            let maxTime;
            let me;
            let mestr;
            let actualHeralds = Game.heralds;//we store the actual amount of heralds to restore it later; here we used the amount present in the save to compute offline CpS
            let str = '';
            if (data) str = unescape(data);
            else {
                if (Game.useLocalStorage) {
                    const local = Game.localStorageGet(Game.SaveTo);
                    if (!local)//no localstorage save found? let's get the cookie one last time
                    {
                        if (document.cookie.indexOf(Game.SaveTo) >= 0) {
                            str = unescape(document.cookie.split(Game.SaveTo + '=')[1]);
                            document.cookie = Game.SaveTo + '=;expires=Thu, 01 Jan 1970 00:00:01 GMT;';
                        } else return false;
                    } else {
                        str = unescape(local);
                    }
                } else//legacy system
                {
                    if (document.cookie.indexOf(Game.SaveTo) >= 0) str = unescape(document.cookie.split(Game.SaveTo + '=')[1]);//get cookie here
                    else return false;
                }
            }
            if (str !== '') {
                let version = 0;
                const oldstr = str.split('|');
                if (oldstr[0] < 1) {
                } else {
                    str = str.split('!END!')[0];
                    str = b64_to_utf8(str);
                }
                if (str !== '') {
                    let spl = '';
                    str = str.split('|');
                    version = parseFloat(str[0]);

                    if (isNaN(version) || str.length < 5) {
                        if (Game.prefs.popups) Game.Popup('Oops, looks like the import string is all wrong!');
                        else Game.Notify('Error importing save', 'Oops, looks like the import string is all wrong!', '', 6, 1);
                        return false;
                    }
                    if (version >= 1 && version > Game.version) {
                        if (Game.prefs.popups) Game.Popup('Error : you are attempting to load a save from a future version (v. ' + version + '; you are using v. ' + Game.version + ').');
                        else Game.Notify('Error importing save', 'You are attempting to load a save from a future version (v. ' + version + '; you are using v. ' + Game.version + ').', '', 6, 1);
                        return false;
                    }
                    if (version === 1.0501)//prompt if we loaded from the 2014 beta
                    {
                        setTimeout(function () {
                            Game.Prompt('<h3>New beta</h3><div class="block">Hey there! Unfortunately, your old beta save won\'t work here anymore; you\'ll have to start fresh or import your save from the live version.<div class="line"></div>Thank you for beta-testing Cookie Clicker, we hope you\'ll enjoy it and find strange and interesting bugs!</div>', [['Alright then!', 'Game.ClosePrompt();']]);
                        }, 200);
                        return false;
                    } else if (version < 1.0501)//prompt if we loaded from the 2014 live version
                    {
                        setTimeout(function () {
                            Game.Prompt('<h3>Update</h3><div class="block"><b>Hey there!</b> Cookie Clicker just received a pretty substantial update, and you might notice that some things have been moved around. Don\'t panic!<div class="line"></div>Your building numbers may look strange, making it seem like you own buildings you\'ve never bought; this is because we\'ve added <b>3 new buildings</b> after factories (and swapped mines and factories), offsetting everything after them. Likewise, some building-related upgrades and achievements may look a tad shuffled around. This is all perfectly normal!<div class="line"></div>We\'ve also rebalanced Heavenly Chips amounts and behavior. Your amount of chips might be lower or higher than before.<br>You can now ascend through the <b>Legacy button</b> at the top!<div class="line"></div>Thank you for playing Cookie Clicker. We\'ve put a lot of work and care into this update and we hope you\'ll enjoy it!</div>', [['Neat!', 'Game.ClosePrompt();']]);
                        }, 200);
                    }
                    if (version >= 1) {
                        let i;
                        Game.T = 0;

                        spl = str[2].split(';');//save stats
                        Game.startDate = parseInt(spl[0]);
                        Game.fullDate = parseInt(spl[1]);
                        Game.lastDate = parseInt(spl[2]);
                        Game.bakeryName = spl[3] ? spl[3] : Game.GetBakeryName();
                        Game.seed = spl[4] ? spl[4] : Game.makeSeed();
                        //prefs
                        if (version < 1.0503) spl = str[3].split('');
                        else if (version < 2.0046) spl = unpack2(str[3]).split('');
                        else spl = (str[3]).split('');
                        Game.prefs.particles = parseInt(spl[0]);
                        Game.prefs.numbers = parseInt(spl[1]);
                        Game.prefs.autosave = parseInt(spl[2]);
                        Game.prefs.autoupdate = spl[3] ? parseInt(spl[3]) : 1;
                        Game.prefs.milk = spl[4] ? parseInt(spl[4]) : 1;
                        Game.prefs.fancy = parseInt(spl[5]);
                        if (Game.prefs.fancy) Game.removeClass('noFancy'); else if (!Game.prefs.fancy) Game.addClass('noFancy');
                        Game.prefs.warn = spl[6] ? parseInt(spl[6]) : 0;
                        Game.prefs.cursors = spl[7] ? parseInt(spl[7]) : 0;
                        Game.prefs.focus = spl[8] ? parseInt(spl[8]) : 0;
                        Game.prefs.format = spl[9] ? parseInt(spl[9]) : 0;
                        Game.prefs.notifs = spl[10] ? parseInt(spl[10]) : 0;
                        Game.prefs.wobbly = spl[11] ? parseInt(spl[11]) : 0;
                        Game.prefs.monospace = spl[12] ? parseInt(spl[12]) : 0;
                        Game.prefs.filters = parseInt(spl[13]);
                        if (Game.prefs.filters) Game.removeClass('noFilters'); else if (!Game.prefs.filters) Game.addClass('noFilters');
                        Game.prefs.cookiesound = spl[14] ? parseInt(spl[14]) : 1;
                        Game.prefs.crates = spl[15] ? parseInt(spl[15]) : 0;
                        Game.prefs.showBackupWarning = spl[16] ? parseInt(spl[16]) : 1;
                        Game.prefs.extraButtons = spl[17] ? parseInt(spl[17]) : 1;
                        if (!Game.prefs.extraButtons) Game.removeClass('extraButtons'); else if (Game.prefs.extraButtons) Game.addClass('extraButtons');
                        Game.prefs.askLumps = spl[18] ? parseInt(spl[18]) : 0;
                        Game.prefs.customGrandmas = spl[19] ? parseInt(spl[19]) : 1;
                        Game.prefs.timeout = spl[20] ? parseInt(spl[20]) : 0;
                        BeautifyAll();
                        spl = str[4].split(';');//cookies and lots of other stuff
                        Game.cookies = parseFloat(spl[0]);
                        Game.cookiesEarned = parseFloat(spl[1]);
                        Game.cookieClicks = spl[2] ? parseInt(spl[2]) : 0;
                        Game.goldenClicks = spl[3] ? parseInt(spl[3]) : 0;
                        Game.handmadeCookies = spl[4] ? parseFloat(spl[4]) : 0;
                        Game.missedGoldenClicks = spl[5] ? parseInt(spl[5]) : 0;
                        Game.bgType = spl[6] ? parseInt(spl[6]) : 0;
                        Game.milkType = spl[7] ? parseInt(spl[7]) : 0;
                        Game.cookiesReset = spl[8] ? parseFloat(spl[8]) : 0;
                        Game.elderWrath = spl[9] ? parseInt(spl[9]) : 0;
                        Game.pledges = spl[10] ? parseInt(spl[10]) : 0;
                        Game.pledgeT = spl[11] ? parseInt(spl[11]) : 0;
                        Game.nextResearch = spl[12] ? parseInt(spl[12]) : 0;
                        Game.researchT = spl[13] ? parseInt(spl[13]) : 0;
                        Game.resets = spl[14] ? parseInt(spl[14]) : 0;
                        Game.goldenClicksLocal = spl[15] ? parseInt(spl[15]) : 0;
                        Game.cookiesSucked = spl[16] ? parseFloat(spl[16]) : 0;
                        Game.wrinklersPopped = spl[17] ? parseInt(spl[17]) : 0;
                        Game.santaLevel = spl[18] ? parseInt(spl[18]) : 0;
                        Game.reindeerClicked = spl[19] ? parseInt(spl[19]) : 0;
                        Game.seasonT = spl[20] ? parseInt(spl[20]) : 0;
                        Game.seasonUses = spl[21] ? parseInt(spl[21]) : 0;
                        Game.season = spl[22] ? spl[22] : Game.baseSeason;
                        let wrinklers = {
                            amount: spl[23] ? parseFloat(spl[23]) : 0,
                            number: spl[24] ? parseInt(spl[24]) : 0
                        };
                        Game.prestige = spl[25] ? parseFloat(spl[25]) : 0;
                        Game.heavenlyChips = spl[26] ? parseFloat(spl[26]) : 0;
                        Game.heavenlyChipsSpent = spl[27] ? parseFloat(spl[27]) : 0;
                        Game.heavenlyCookies = spl[28] ? parseFloat(spl[28]) : 0;
                        Game.ascensionMode = spl[29] ? parseInt(spl[29]) : 0;
                        Game.permanentUpgrades[0] = spl[30] ? parseInt(spl[30]) : -1;
                        Game.permanentUpgrades[1] = spl[31] ? parseInt(spl[31]) : -1;
                        Game.permanentUpgrades[2] = spl[32] ? parseInt(spl[32]) : -1;
                        Game.permanentUpgrades[3] = spl[33] ? parseInt(spl[33]) : -1;
                        Game.permanentUpgrades[4] = spl[34] ? parseInt(spl[34]) : -1;
                        //if (version<1.05) {Game.heavenlyChipsEarned=Game.HowMuchPrestige(Game.cookiesReset);Game.heavenlyChips=Game.heavenlyChipsEarned;}
                        Game.dragonLevel = spl[35] ? parseInt(spl[35]) : 0;
                        if (version < 2.0041 && Game.dragonLevel === Game.dragonLevels.length - 2) {
                            Game.dragonLevel = Game.dragonLevels.length - 1;
                        }
                        Game.dragonAura = spl[36] ? parseInt(spl[36]) : 0;
                        Game.dragonAura2 = spl[37] ? parseInt(spl[37]) : 0;
                        Game.chimeType = spl[38] ? parseInt(spl[38]) : 0;
                        Game.volume = spl[39] ? parseInt(spl[39]) : 50;
                        wrinklers.shinies = spl[40] ? parseInt(spl[40]) : 0;
                        wrinklers.amountShinies = spl[41] ? parseFloat(spl[41]) : 0;
                        Game.lumps = spl[42] ? parseFloat(spl[42]) : -1;
                        Game.lumpsTotal = spl[43] ? parseFloat(spl[43]) : -1;
                        Game.lumpT = spl[44] ? parseInt(spl[44]) : Date.now();
                        Game.lumpRefill = spl[45] ? parseInt(spl[45]) : 0;
                        Game.lumpCurrentType = spl[46] ? parseInt(spl[46]) : 0;
                        Game.vault = spl[47] ? spl[47].split(',') : [];
                        for (i in Game.vault) {
                            Game.vault[i] = parseInt(Game.vault[i]);
                        }
                        Game.heralds = spl[48] ? parseInt(spl[48]) : Game.heralds;

                        spl = str[5].split(';');//buildings
                        Game.BuildingsOwned = 0;
                        for (i in Game.ObjectsById) {
                            me = Game.ObjectsById[i];
                            me.switchMinigame(false);
                            me.pics = [];
                            if (spl[i]) {
                                mestr = spl[i].toString().split(',');
                                me.amount = parseInt(mestr[0]);
                                me.bought = parseInt(mestr[1]);
                                me.totalCookies = parseFloat(mestr[2]);
                                me.level = parseInt(mestr[3] || 0);
                                if (me.minigame && me.minigameLoaded && me.minigame.reset) {
                                    me.minigame.reset(true);
                                    me.minigame.load(mestr[4] || '');
                                } else me.minigameSave = (mestr[4] || 0);
                                me.muted = parseInt(mestr[5]) || 0;
                                Game.BuildingsOwned += me.amount;
                                if (version < 2.003) me.level = 0;
                            } else {
                                me.amount = 0;
                                me.unlocked = 0;
                                me.bought = 0;
                                me.totalCookies = 0;
                                me.level = 0;
                            }
                        }

                        Game.LoadMinigames();

                        if (version < 1.035)//old non-binary algorithm
                        {
                            spl = str[6].split(';');//upgrades
                            Game.UpgradesOwned = 0;
                            for (i in Game.UpgradesById) {
                                me = Game.UpgradesById[i];
                                if (spl[i]) {
                                    mestr = spl[i].split(',');
                                    me.unlocked = parseInt(mestr[0]);
                                    me.bought = parseInt(mestr[1]);
                                    if (me.bought && Game.CountsAsUpgradeOwned(me.pool)) Game.UpgradesOwned++;
                                } else {
                                    me.unlocked = 0;
                                    me.bought = 0;
                                }
                            }
                            if (str[7]) spl = str[7].split(';'); else spl = [];//achievements
                            Game.AchievementsOwned = 0;
                            for (i in Game.AchievementsById) {
                                me = Game.AchievementsById[i];
                                if (spl[i]) {
                                    mestr = spl[i].split(',');
                                    me.won = parseInt(mestr[0]);
                                } else {
                                    me.won = 0;
                                }
                                if (me.won && Game.CountsAsAchievementOwned(me.pool)) Game.AchievementsOwned++;
                            }
                        } else if (version < 1.0502)//old awful packing system
                        {
                            if (str[6]) spl = str[6]; else spl = [];//upgrades
                            if (version < 1.05) spl = UncompressLargeBin(spl);
                            else spl = unpack(spl);
                            Game.UpgradesOwned = 0;
                            for (i in Game.UpgradesById) {
                                me = Game.UpgradesById[i];
                                if (spl[i * 2]) {
                                    mestr = [spl[i * 2], spl[i * 2 + 1]];
                                    me.unlocked = parseInt(mestr[0]);
                                    me.bought = parseInt(mestr[1]);
                                    if (me.bought && Game.CountsAsUpgradeOwned(me.pool)) Game.UpgradesOwned++;
                                } else {
                                    me.unlocked = 0;
                                    me.bought = 0;
                                }
                            }
                            if (str[7]) spl = str[7]; else spl = [];//achievements
                            if (version < 1.05) spl = UncompressLargeBin(spl);
                            else spl = unpack(spl);
                            Game.AchievementsOwned = 0;
                            for (i in Game.AchievementsById) {
                                me = Game.AchievementsById[i];
                                if (spl[i]) {
                                    mestr = [spl[i]];
                                    me.won = parseInt(mestr[0]);
                                } else {
                                    me.won = 0;
                                }
                                if (me.won && Game.CountsAsAchievementOwned(me.pool)) Game.AchievementsOwned++;
                            }
                        } else {
                            if (str[6]) spl = str[6]; else spl = [];//upgrades
                            if (version < 2.0046) spl = unpack2(spl).split('');
                            else spl = (spl).split('');
                            Game.UpgradesOwned = 0;
                            for (i in Game.UpgradesById) {
                                me = Game.UpgradesById[i];
                                if (spl[i * 2]) {
                                    mestr = [spl[i * 2], spl[i * 2 + 1]];
                                    me.unlocked = parseInt(mestr[0]);
                                    me.bought = parseInt(mestr[1]);
                                    if (me.bought && Game.CountsAsUpgradeOwned(me.pool)) Game.UpgradesOwned++;
                                } else {
                                    me.unlocked = 0;
                                    me.bought = 0;
                                }
                            }
                            if (str[7]) spl = str[7]; else spl = [];//achievements
                            if (version < 2.0046) spl = unpack2(spl).split('');
                            else spl = (spl).split('');
                            Game.AchievementsOwned = 0;
                            for (i in Game.AchievementsById) {
                                me = Game.AchievementsById[i];
                                if (spl[i]) {
                                    mestr = [spl[i]];
                                    me.won = parseInt(mestr[0]);
                                } else {
                                    me.won = 0;
                                }
                                if (me.won && Game.CountsAsAchievementOwned(me.pool)) Game.AchievementsOwned++;
                            }
                        }

                        Game.killBuffs();
                        let buffsToLoad = [];
                        spl = (str[8] || '').split(';');//buffs
                        for (i in spl) {
                            if (spl[i]) {
                                mestr = spl[i].toString().split(',');
                                buffsToLoad.push(mestr);
                            }
                        }


                        for (i in Game.ObjectsById) {
                            me = Game.ObjectsById[i];
                            if (me.buyFunction) me.buyFunction();
                            me.refresh();
                            if (me.id > 0) {
                                if (me.muted) me.mute(1);
                            }
                        }

                        if (version < 1.0503)//upgrades that used to be regular, but are now heavenly
                        {
                            me = Game.Upgrades['Persistent memory'];
                            me.unlocked = 0;
                            me.bought = 0;
                            me = Game.Upgrades['Season switcher'];
                            me.unlocked = 0;
                            me.bought = 0;
                        }

                        if (Game.bgType === -1) Game.bgType = 0;
                        if (Game.milkType === -1) Game.milkType = 0;


                        //advance timers
                        let framesElapsed = Math.ceil(((Date.now() - Game.lastDate) / 1000) * Game.fps);
                        if (Game.pledgeT > 0) Game.pledgeT = Math.max(Game.pledgeT - framesElapsed, 1);
                        if (Game.seasonT > 0) Game.seasonT = Math.max(Game.seasonT - framesElapsed, 1);
                        if (Game.researchT > 0) Game.researchT = Math.max(Game.researchT - framesElapsed, 1);


                        Game.ResetWrinklers();
                        Game.LoadWrinklers(wrinklers.amount, wrinklers.number, wrinklers.shinies, wrinklers.amountShinies);

                        //recompute season trigger prices
                        if (Game.Has('Season switcher')) {
                            for (i in Game.seasons) {
                                Game.Unlock(Game.seasons[i].trigger);
                            }
                        }
                        Game.computeSeasonPrices();

                        //recompute prestige
                        Game.prestige = Math.floor(Game.HowMuchPrestige(Game.cookiesReset));
                        //if ((Game.heavenlyChips+Game.heavenlyChipsSpent)<Game.prestige)
                        //{Game.heavenlyChips=Game.prestige;Game.heavenlyChipsSpent=0;}//chips owned and spent don't add up to total prestige? set chips owned to prestige


                        if (version === 1.037 && Game.beta)//are we opening the new beta? if so, save the old beta to /betadungeons
                        {
                            window.localStorage.setItem('CookieClickerGameBetaDungeons', window.localStorage.getItem('CookieClickerGameBeta'));
                            Game.Notify('Beta save data', 'Your beta save data has been safely exported to /betadungeons.', 20);
                        } else if (version === 1.0501 && Game.beta)//are we opening the newer beta? if so, save the old beta to /oldbeta
                        {
                            window.localStorage.setItem('CookieClickerGameOld', window.localStorage.getItem('CookieClickerGameBeta'));
                            //Game.Notify('Beta save data','Your beta save data has been safely exported to /oldbeta.',20);
                        }
                        if (version <= 1.0466 && !Game.beta)//export the old 2014 version to /v10466
                        {
                            window.localStorage.setItem('CookieClickerGamev10466', window.localStorage.getItem('CookieClickerGame'));
                            //Game.Notify('Beta save data','Your save data has been safely exported to /v10466.',20);
                        }
                        if (version === 1.9)//are we importing from the 1.9 beta? remove all heavenly upgrades and refund heavenly chips
                        {
                            for (i in Game.UpgradesById) {
                                me = Game.UpgradesById[i];
                                if (me.bought && me.pool === 'prestige') {
                                    me.unlocked = 0;
                                    me.bought = 0;
                                }
                            }
                            Game.heavenlyChips = Game.prestige;
                            Game.heavenlyChipsSpent = 0;

                            setTimeout(function () {
                                Game.Prompt('<h3>Beta patch</h3><div class="block">We\'ve tweaked some things and fixed some others, please check the update notes!<div class="line"></div>Of note : due to changes in prestige balancing, all your heavenly upgrades have been removed and your heavenly chips refunded; you\'ll be able to reallocate them next time you ascend.<div class="line"></div>Thank you again for beta-testing Cookie Clicker!</div>', [['Alright then!', 'Game.ClosePrompt();']]);
                            }, 200);
                        }
                        if (version <= 1.0466)//are we loading from the old live version? reset HCs
                        {
                            Game.heavenlyChips = Game.prestige;
                            Game.heavenlyChipsSpent = 0;
                        }

                        if (Game.ascensionMode !== 1) {
                            if (Game.Has('Starter kit')) Game.Objects['Cursor'].free = 10;
                            if (Game.Has('Starter kitchen')) Game.Objects['Grandma'].free = 5;
                        }

                        Game.CalculateGains();

                        if (Math.random() < 1 / 10000) Game.TOYS = 1;//teehee!

                        let timeOffline = (Date.now() - Game.lastDate) / 1000;

                        Game.loadLumps();

                        //compute cookies earned while the game was closed

                            if (Game.mobile || Game.Has('Perfect idling') || Game.Has('Twin Gates of Transcendence') || Game.bakeryName === 'Mato') {

                                if (Game.Has('Perfect idling') || Game.bakeryName === 'Mato') {
                                    maxTime = 60 * 60 * 24 * 1000000000;
                                    percent = 100;
                                    if (Game.bakeryName === 'Mato') {
                                        //Another feature refactored to probably actually work, this feature did not appear to be functional before
                                        Game.Notify('Welcome back Mato Kuroshira. You will be awarded with offline cookies just like you would on mobile, thanks to Xoda, your lord and saviour.', '', 6, 1);
                                    } else {
                                        maxTime = 60 * 60;
                                        if (Game.Has('Belphegor')) maxTime *= 2;
                                        if (Game.Has('Mammon')) maxTime *= 2;
                                        if (Game.Has('Abaddon')) maxTime *= 2;
                                        if (Game.Has('Satan')) maxTime *= 2;
                                        if (Game.Has('Asmodeus')) maxTime *= 2;
                                        if (Game.Has('Beelzebub')) maxTime *= 2;
                                        if (Game.Has('Lucifer')) maxTime *= 2;

                                        percent = 5;
                                        if (Game.Has('Angels')) percent += 10;
                                        if (Game.Has('Archangels')) percent += 10;
                                        if (Game.Has('Virtues')) percent += 10;
                                        if (Game.Has('Dominions')) percent += 10;
                                        if (Game.Has('Cherubim')) percent += 10;
                                        if (Game.Has('Seraphim')) percent += 10;
                                        if (Game.Has('God')) percent += 10;

                                        if (Game.Has('Chimera')) {
                                            maxTime += 60 * 60 * 24 * 2;
                                            percent += 5;
                                        }

                                        if (Game.Has('Fern tea')) percent += 3;
                                        if (Game.Has('Ichor syrup')) percent += 7;
                                    }

                                    let timeOfflineOptimal = Math.min(timeOffline, maxTime);
                                    let timeOfflineReduced = Math.max(0, timeOffline - timeOfflineOptimal);
                                    let amount = (timeOfflineOptimal + timeOfflineReduced * 0.1) * Game.cookiesPs * (percent / 100);

                                    if (amount > 0) {
                                        if (Game.prefs.popups) Game.Popup('Earned ' + Beautify(amount) + ' Neuro' + (Math.floor(amount) === 1 ? '' : 's') + ' while you were away');
                                        else Game.Notify('Welcome back!', 'You earned <b>' + Beautify(amount) + '</b> Neuro' + (Math.floor(amount) === 1 ? '' : 's') + ' while you were away.<br>(' + Game.sayTime(timeOfflineOptimal * Game.fps, -1) + ' at ' + Math.floor(percent) + '% CpS' + (timeOfflineReduced ? ', plus ' + Game.sayTime(timeOfflineReduced * Game.fps, -1) + ' at ' + (Math.floor(percent * 10) / 100) + '%' : '') + '.)', [Math.floor(Math.random() * 16), 11]);


                                        //modtags
                                        //this bit is the wonkiest code i've written yet. if you don't know exactly what you're doing, leave it be. i don't know why it works, but everything else fails.
                                        Game.Notify('IMPORTANT', 'If you are not using Mozilla Firefox, you may encounter bugs.', 1, ([Math.floor(Math.random() * 6), 9]));


                                        Game.Earn(amount);

                                    }


                                }
                            }
                        //we load buffs after everything as we do not want them to interfer with offline CpS
                        for (i in buffsToLoad) {
                            mestr = buffsToLoad[i];
                            let type = Game.buffTypes[parseInt(mestr[0])];
                            Game.gainBuff(type.name, parseFloat(mestr[1]) / Game.fps, parseFloat(mestr[3] || 0), parseFloat(mestr[4] || 0), parseFloat(mestr[5] || 0)).time = parseFloat(mestr[2]);
                        }


                        Game.bakeryNameRefresh();

                    } else//importing old version save
                    {
                        Game.Notify('Error importing save', 'Sorry, you can\'t import saves from the old version anymore.', '', 6, 1);
                        return false;
                    }


                    Game.RebuildUpgrades();

                    Game.TickerAge = 0;

                    Game.elderWrathD = 0;
                    Game.recalculateGains = 1;
                    Game.storeToRefresh = 1;
                    Game.upgradesToRebuild = 1;

                    Game.buyBulk = 1;
                    Game.buyMode = 1;
                    Game.storeBulkButton(-1);

                    Game.specialTab = '';
                    Game.ToggleSpecialMenu(0);

                    Game.killShimmers();

                    if (Game.T > Game.fps * 5 && Game.ReincarnateTimer === 0)//fade out of black and pop the cookie
                    {
                        Game.ReincarnateTimer = 1;
                        Game.addClass('reincarnating');
                        Game.BigCookieSize = 0;
                    }

                    if (version < Game.version) elementByID('logButton').classList.add('hasUpdate');

                    if (Game.season !== '' && Game.season === Game.baseSeason) {
                        if (Game.season === 'valentines') Game.Notify('Valentine\'s Day!', 'It\'s <b>Valentine\'s season</b>!<br>Love\'s in the air and Neuros are just that much sweeter!', [20, 3], 60 * 3);
                        else if (Game.season === 'fools') Game.Notify('Business Day!', 'It\'s <b>Business season</b>!<br>Don\'t panic! Things are gonna be looking a little more corporate for a few days.', [17, 6], 60 * 3);
                        else if (Game.season === 'halloween') Game.Notify('Halloween!', 'It\'s <b>Halloween season</b>!<br>Everything is just a little bit spookier!', [13, 8], 60 * 3);
                        else if (Game.season === 'christmas') Game.Notify('Christmas time!', 'It\'s <b>Christmas season</b>!<br>Bring good cheer to all and you just may get Neuros in your stockings!', [12, 10], 60 * 3);
                        else if (Game.season === 'easter') Game.Notify('Easter!', 'It\'s <b>Easter season</b>!<br>Keep an eye out and you just might click a rabbit or two!', [0, 12], 60 * 3);
                    }

                    Game.heralds = actualHeralds;

                    if (Game.prefs.popups) Game.Popup('Game loaded');
                    else Game.Notify('Game loaded', '', '', 1, 1);


                    if (Game.prefs.showBackupWarning === 1) Game.showBackupWarning();
                }
            } else return false;
            return true;
        }

        /*=====================================================================================
		RESET
		=======================================================================================*/
        Game.Reset = hard => {
            let me;
            let i;
            Game.T = 0;

            let cookiesForfeited = Game.cookiesEarned;
            if (!hard) {
                if (cookiesForfeited >= 1000000) Game.Win('Sacrifice');
                if (cookiesForfeited >= 1000000000) Game.Win('Oblivion');
                if (cookiesForfeited >= 1000000000000) Game.Win('From scratch');
                if (cookiesForfeited >= 1000000000000000) Game.Win('Nihilism');
                if (cookiesForfeited >= 1000000000000000000) Game.Win('Dematerialize');
                if (cookiesForfeited >= 1000000000000000000000) Game.Win('Nil zero zilch');
                if (cookiesForfeited >= 1000000000000000000000000) Game.Win('Transcendence');
                if (cookiesForfeited >= 1000000000000000000000000000) Game.Win('Obliterate');
                if (cookiesForfeited >= 1000000000000000000000000000000) Game.Win('Negative void');
                if (cookiesForfeited >= 1000000000000000000000000000000000) Game.Win('To crumbs, you say?');
                if (cookiesForfeited >= 1000000000000000000000000000000000000) Game.Win('You get nothing');
                if (cookiesForfeited >= 1000000000000000000000000000000000000000) Game.Win('Humble rebeginnings');
                if (cookiesForfeited >= 1000000000000000000000000000000000000000000) Game.Win('The end of the world');
                if (cookiesForfeited >= 1000000000000000000000000000000000000000000000) Game.Win('Oh, you\'re back');
                if (cookiesForfeited >= 1000000000000000000000000000000000000000000000000) Game.Win('Lazarus');

                if (Math.round(Game.cookies) === 1000000000000) Game.Win('When the Neuros ascend just right');
            }

            Game.killBuffs();

            Game.seed = Game.makeSeed();

            Game.cookiesReset += Game.cookiesEarned;
            Game.cookies = 0;
            Game.cookiesEarned = 0;
            Game.cookieClicks = 0;
            Game.goldenClicksLocal = 0;
            //Game.goldenClicks=0;
            //Game.missedGoldenClicks=0;
            Game.handmadeCookies = 0;
            if (hard) {
                Game.bgType = 0;
                Game.milkType = 0;
                Game.chimeType = 0;

                Game.vault = [];
            }
            Game.pledges = 0;
            Game.pledgeT = 0;
            Game.elderWrath = 0;
            Game.nextResearch = 0;
            Game.researchT = 0;
            Game.seasonT = 0;
            Game.seasonUses = 0;
            Game.season = Game.baseSeason;
            Game.computeSeasonPrices();

            Game.startDate = parseInt(Date.now());
            Game.lastDate = parseInt(Date.now());

            Game.cookiesSucked = 0;
            Game.wrinklersPopped = 0;
            Game.ResetWrinklers();

            Game.santaLevel = 0;
            Game.reindeerClicked = 0;

            Game.dragonLevel = 0;
            Game.dragonAura = 0;
            Game.dragonAura2 = 0;

            if (Game.gainedPrestige > 0) Game.resets++;
            if (!hard && Game.canLumps() && Game.ascensionMode !== 1) Game.addClass('lumpsOn');
            else Game.removeClass('lumpsOn');
            Game.gainedPrestige = 0;

            for (i in Game.ObjectsById) {
                me = Game.ObjectsById[i];
                me.amount = 0;
                me.bought = 0;
                me.free = 0;
                me.totalCookies = 0;
                me.switchMinigame(false);
                if (hard) {
                    me.muted = 0;
                }
                me.pics = [];
                me.refresh();
            }
            for (i in Game.UpgradesById) {
                me = Game.UpgradesById[i];
                if (hard || me.pool !== 'prestige') me.bought = 0;
                if (hard || (me.pool !== 'prestige' && !me.lasting)) {
                    if (!hard && Game.Has('Keepsakes') && Game.seasonDrops.indexOf(me.name) !== -1 && Math.random() < 1 / 5) {
                    } else me.unlocked = 0;
                }
            }

            Game.BuildingsOwned = 0;
            Game.UpgradesOwned = 0;

            Game.cookiesPsByType = {};
            Game.cookiesMultByType = {};

            if (!hard) {
                if (Game.ascensionMode !== 1) {
                    for (i in Game.permanentUpgrades) {
                        if (Game.permanentUpgrades[i] !== -1) {
                            Game.UpgradesById[Game.permanentUpgrades[i]].earn();
                        }
                    }
                    if (Game.Has('Season switcher')) {
                        for (i in Game.seasons) {
                            Game.Unlock(Game.seasons[i].trigger);
                        }
                    }

                    if (Game.Has('Starter kit')) Game.Objects['Cursor'].getFree(10);
                    if (Game.Has('Starter kitchen')) Game.Objects['Grandma'].getFree(5);
                }
            }

            /*for (var i in Game.AchievementsById)
			{
				var me=Game.AchievementsById[i];
				me.won=0;
			}*/
            //Game.DefaultPrefs();
            BeautifyAll();

            Game.RebuildUpgrades();
            Game.TickerAge = 0;
            Game.recalculateGains = 1;
            Game.storeToRefresh = 1;
            Game.upgradesToRebuild = 1;
            Game.killShimmers();

            Game.buyBulk = 1;
            Game.buyMode = 1;
            Game.storeBulkButton(-1);

            Game.LoadMinigames();
            for (i in Game.ObjectsById) {
                me = Game.ObjectsById[i];
                if (hard && me.minigame && me.minigame.launch) {
                    me.minigame.launch();
                    me.minigame.reset(true);
                } else if (!hard && me.minigame && me.minigame.reset) me.minigame.reset();
            }

            elementByID('toggleBox').style.display = 'none';
            elementByID('toggleBox').innerHTML = '';
            Game.choiceSelectorOn = -1;
            Game.specialTab = '';
            Game.ToggleSpecialMenu(0);

            elementByID('logButton').classList.remove('hasUpdate');

            for (i in Game.customReset) {
                Game.customReset[i]();
            }

            if (hard) {
                if (Game.T > Game.fps * 5 && Game.ReincarnateTimer === 0)//fade out of black and pop the cookie
                {
                    Game.ReincarnateTimer = 1;
                    Game.addClass('reincarnating');
                    Game.BigCookieSize = 0;
                }
                if (Game.prefs.popups) Game.Popup('Game reset');
                else Game.Notify('Game reset', 'So long, Neuros.', [21, 6], 6);
            }
        }
        Game.HardReset = bypass => {
            let me;
            if (!bypass) {
                Game.Prompt('<h3>Wipe save</h3><div class="block">Do you REALLY want to wipe your save?<br><small>You will lose your progress, your achievements, and your heavenly chips!</small></div>', [['Yes!', 'Game.ClosePrompt();Game.HardReset(1);'], 'No']);
            } else if (bypass === 1) {
                Game.Prompt('<h3>Wipe save</h3><div class="block">Whoah now, are you really, <b><i>REALLY</i></b> sure you want to go through with this?<br><small>Don\'t say we didn\'t warn you!</small></div>', [['Do it!', 'Game.ClosePrompt();Game.HardReset(2);'], 'No']);
            } else {
                let i;
                for (i in Game.AchievementsById) {
                    me = Game.AchievementsById[i];
                    me.won = 0;
                }
                for (i in Game.ObjectsById) {
                    me = Game.ObjectsById[i];
                    me.level = 0;
                }

                Game.AchievementsOwned = 0;
                Game.goldenClicks = 0;
                Game.missedGoldenClicks = 0;
                Game.Reset(1);
                Game.resets = 0;
                Game.fullDate = parseInt(Date.now());
                Game.bakeryName = Game.GetBakeryName();
                Game.bakeryNameRefresh();
                Game.cookiesReset = 0;
                Game.prestige = 0;
                Game.heavenlyChips = 0;
                Game.heavenlyChipsSpent = 0;
                Game.heavenlyCookies = 0;
                Game.permanentUpgrades = [-1, -1, -1, -1, -1];
                Game.ascensionMode = 0;
                Game.lumps = -1;
                Game.lumpsTotal = -1;
                Game.lumpT = Date.now();
                Game.lumpRefill = 0;
                Game.removeClass('lumpsOn');
            }
        }


        Game.onCrate = 0;
        Game.setOnCrate = what => {
            Game.onCrate = what;
        }
        Game.crate = (me, context, forceClickStr, id) => {
            //produce a crate with associated tooltip for an upgrade or achievement
            //me is an object representing the upgrade or achievement
            //context can be "store", "ascend", "stats" or undefined
            //forceClickStr changes what is done when the crate is clicked
            //id is the resulting div's desired id

            let classes = 'crate';
            let enabled = 0;
            let noFrame = 0;
            let attachment = 'top';
            let neuromancy = 0;
            if (context === 'stats' && (Game.Has('Neuromancy') || (Game.sesame && me.pool === 'debug'))) neuromancy = 1;
            let mysterious = 0;
            let clickStr = '';

            if (me.type === 'upgrade') {
                let canBuy = (context === 'store' ? me.canBuy() : true);
                if (context === 'stats' && me.bought === 0 && !Game.Has('Neuromancy') && (!Game.sesame || me.pool !== 'debug')) return '';
                else if (context === 'stats' && (Game.Has('Neuromancy') || (Game.sesame && me.pool === 'debug'))) neuromancy = 1;
                else if (context === 'store' && !canBuy) enabled = 0;
                else if (context === 'ascend' && me.bought === 0) enabled = 0;
                else enabled = 1;
                if (me.bought > 0) enabled = 1;

                if (context === 'stats' && !Game.prefs.crates) noFrame = 1;

                classes += ' upgrade';
                if (me.pool === 'prestige') classes += ' heavenly';


                if (neuromancy) clickStr = 'Game.UpgradesById[' + me.id + '].toggle();';
            } else if (me.type === 'achievement') {
                if (context === 'stats' && me.won === 0 && me.pool !== 'normal') return '';
                else if (context !== 'stats') enabled = 1;

                if (context === 'stats' && !Game.prefs.crates) noFrame = 1;

                classes += ' achievement';
                if (me.pool === 'shadow') classes += ' shadow';
                if (me.won > 0) enabled = 1;
                else mysterious = 1;
                if (!enabled) clickStr = 'Game.AchievementsById[' + me.id + '].click();';

                if (neuromancy) clickStr = 'Game.AchievementsById[' + me.id + '].toggle();';
            }

            if (context === 'store') attachment = 'store';

            if (forceClickStr) clickStr = forceClickStr;

            if (me.choicesFunction) classes += ' selector';


            let icon = me.icon;
            if (mysterious) icon = [0, 7];

            if (me.iconFunction) icon = me.iconFunction();

            if (me.bought && context === 'store') enabled = 0;

            if (enabled) classes += ' enabled';// else classes+=' disabled';
            if (noFrame) classes += ' noFrame';

            let text = [];
            if (Game.sesame) {
                if (Game.debuggedUpgradeCpS[me.name] || Game.debuggedUpgradeCpClick[me.name]) {
                    text.push('x' + Beautify(1 + Game.debuggedUpgradeCpS[me.name], 2));
                    text.push(Game.debugColors[Math.floor(Math.max(0, Math.min(Game.debugColors.length - 1, Math.pow(Game.debuggedUpgradeCpS[me.name] / 2, 0.5) * Game.debugColors.length)))]);
                    text.push('x' + Beautify(1 + Game.debuggedUpgradeCpClick[me.name], 2));
                    text.push(Game.debugColors[Math.floor(Math.max(0, Math.min(Game.debugColors.length - 1, Math.pow(Game.debuggedUpgradeCpClick[me.name] / 2, 0.5) * Game.debugColors.length)))]);
                }
                if (Game.extraInfo) {
                    text.push(Math.floor(me.order) + (me.power ? '<br>P:' + me.power : ''));
                    text.push('#fff');
                }
            }
            let textStr = '';
            for (let i = 0; i < text.length; i += 2) {
                textStr += '<div style="opacity:0.9;z-index:1000;padding:0 2px;background:' + text[i + 1] + ';color:#000;font-size:10px;position:absolute;top:' + (i / 2 * 10) + 'px;left:0;">' + text[i] + '</div>';
            }

            return '<div' +
                (clickStr !== '' ? (' ' + Game.clickStr + '="' + clickStr + '"') : '') +
                ' class="' + classes + '" ' +
                Game.getDynamicTooltip(
                    'function(){return Game.crateTooltip(Game.' + (me.type === 'upgrade' ? 'Upgrades' : 'Achievements') + 'ById[' + me.id + '],' + (context ? '\'' + context + '\'' : '') + ');}',
                    attachment, true
                ) +
                (id ? 'id="' + id + '" ' : '') +
                'style="' + (mysterious ?
                    'background-position:' + (-0 * 48) + 'px ' + (-7 * 48) + 'px' :
                    (icon[2] ? 'background-image:url(' + icon[2] + ');' : '') + 'background-position:' + (-icon[0] * 48) + 'px ' + (-icon[1] * 48) + 'px') + ';' +
                ((context === 'ascend' && me.pool === 'prestige') ? 'position:absolute;left:' + me.posX + 'px;top:' + me.posY + 'px;' : '') +
                '">' +
                textStr +
                (me.choicesFunction ? '<div class="selectorCorner"></div>' : '') +
                '</div>';
        }
        Game.crateTooltip = (me, context) => {
            let it;
            let tags = [];
            let mysterious = 0;
            let neuromancy = 0;
            let price = '';
            if (context === 'stats' && (Game.Has('Neuromancy') || (Game.sesame && me.pool === 'debug'))) neuromancy = 1;

            if (me.type === 'upgrade') {
                if (me.pool === 'prestige') tags.push('Heavenly', '#efa438');
                else if (me.pool === 'tech') tags.push('Tech', '#36a4ff');
                else if (me.pool === 'cookie') tags.push('Cookie', 0);
                else if (me.pool === 'debug') tags.push('Debug', '#00c462');
                else if (me.pool === 'toggle') tags.push('Switch', 0);
                else tags.push('Upgrade', 0);

                if (me.tier !== 0 && Game.Has('Label printer')) tags.push('Tier : ' + Game.Tiers[me.tier].name, Game.Tiers[me.tier].color);
                if (me.name === 'Label printer' && Game.Has('Label printer')) tags.push('Tier : Self-referential', '#ff00ea');

                if (me.isVaulted()) tags.push('Vaulted', '#4e7566');

                if (me.bought > 0) {
                    if (me.pool === 'tech') tags.push('Researched', 0);
                    else if (me.kitten) tags.push('Purrchased', 0);
                    else tags.push('Purchased', 0);
                }

                if (me.lasting && me.unlocked) tags.push('Unlocked forever', '#f2ff87');

                if (neuromancy && me.bought === 0) tags.push('Click to learn!', '#00c462');
                else if (neuromancy && me.bought > 0) tags.push('Click to unlearn!', '#00c462');

                const canBuy = (context === 'store' ? me.canBuy() : true);
                let cost = me.getPrice();
                if (me.priceLumps > 0) cost = me.priceLumps;

                if (me.priceLumps === 0 && cost === 0) price = '';
                else {
                    price = '<div style="float:right;text-align:right;"><span class="price' +
                        (me.priceLumps > 0 ? (' lump') : '') +
                        (me.pool === 'prestige' ? ((me.bought || Game.heavenlyChips >= cost) ? ' heavenly' : ' heavenly disabled') : '') +
                        (context === 'store' ? (canBuy ? '' : ' disabled') : '') +
                        '">' + Beautify(Math.round(cost)) + '</span>' + ((me.pool !== 'prestige' && me.priceLumps === 0) ? Game.costDetails(cost) : '') + '</div>';
                }
            } else if (me.type === 'achievement') {
                if (me.pool === 'shadow') tags.push('Shadow Achievement', '#9700cf');
                else tags.push('Achievement', 0);
                if (me.won > 0) tags.push('Unlocked', 0);
                else {
                    tags.push('Locked', 0);
                    mysterious = 1;
                }

                if (neuromancy && me.won === 0) tags.push('Click to win!', '#00c462');
                else if (neuromancy && me.won > 0) tags.push('Click to lose!', '#00c462');
            }

            let tagsStr = '';
            for (let i = 0; i < tags.length; i += 2) {
                if (i % 2 === 0) tagsStr += ' <div class="tag" style="color:' + (tags[i + 1] === 0 ? '#fff' : tags[i + 1]) + ';">[' + tags[i] + ']</div>';
            }
            tagsStr = tagsStr.substring(1);

            let icon = me.icon;
            if (mysterious) icon = [0, 7];

            if (me.iconFunction) icon = me.iconFunction();


            let tip = '';
            if (context === 'store') {
                if (me.pool !== 'toggle' && me.pool !== 'tech') {
                    if (Game.Has('Inspired checklist')) {
                        if (me.isVaulted()) tip = 'Upgrade is vaulted and will not be auto-purchased.<br>Click to purchase. Shift-click to unvault.';
                        else tip = 'Click to purchase. Shift-click to vault.';
                        if (Game.keys[16]) tip += '<br>(You are holding Shift.)';
                        else tip += '<br>(You are not holding Shift.)';
                    } else tip = 'Click to purchase.';
                } else if (me.pool === 'toggle' && me.choicesFunction) tip = 'Click to open selector.';
                else if (me.pool === 'toggle') tip = 'Click to toggle.';
                else if (me.pool === 'tech') tip = 'Click to research.';
            }

            let desc = me.desc;
            if (me.descFunc) desc = me.descFunc();
            if (me.bought && context === 'store' && me.displayFuncWhenOwned) desc = me.displayFuncWhenOwned() + '<div class="line"></div>' + desc;
            if (me.unlockAt) {
                if (me.unlockAt.require) {
                    it = Game.Upgrades[me.unlockAt.require];
                    desc = '<div style="font-size:80%;text-align:center;">From <div class="icon" style="vertical-align:middle;display:inline-block;' + (it.icon[2] ? 'background-image:url(' + it.icon[2] + ');' : '') + 'background-position:' + (-it.icon[0] * 48) + 'px ' + (-it.icon[1] * 48) + 'px;transform:scale(0.5);margin:-16px;"></div> ' + it.name + '</div><div class="line"></div>' + desc;
                }
                /*else if (me.unlockAt.season)
				{
					var it=Game.seasons[me.unlockAt.season];
					desc='<div style="font-size:80%;text-align:center;">From <div class="icon" style="vertical-align:middle;display:inline-block;'+(Game.Upgrades[it.trigger].icon[2]?'background-image:url('+Game.Upgrades[it.trigger].icon[2]+');':'')+'background-position:'+(-Game.Upgrades[it.trigger].icon[0]*48)+'px '+(-Game.Upgrades[it.trigger].icon[1]*48)+'px;transform:scale(0.5);margin:-16px;"></div> '+it.name+'</div><div class="line"></div>'+desc;
				}*/
                else if (me.unlockAt.text) {
                    desc = '<div style="font-size:80%;text-align:center;">From <b>' + text + '</b></div><div class="line"></div>' + desc;
                }
            }

            return '<div style="padding:8px 4px;min-width:350px;">' +
                '<div class="icon" style="float:left;margin-left:-8px;margin-top:-8px;' + (icon[2] ? 'background-image:url(' + icon[2] + ');' : '') + 'background-position:' + (-icon[0] * 48) + 'px ' + (-icon[1] * 48) + 'px;"></div>' +
                (me.bought && context === 'store' ? '' : price) +
                '<div class="name">' + (mysterious ? '???' : me.name) + '</div>' +
                tagsStr +
                '<div class="line"></div><div class="description">' + (mysterious ? '???' : desc) + '</div></div>' +
                (tip !== '' ? ('<div class="line"></div><div style="font-size:10px;font-weight:bold;color:#999;text-align:center;padding-bottom:4px;line-height:100%;">' + tip + '</div>') : '') +
                (Game.sesame ? ('<div style="font-size:9px;">Id : ' + me.id + ' | Order : ' + Math.floor(me.order) + (me.tier ? ' | Tier : ' + me.tier : '') + '</div>') : '');
        }

        Game.costDetails = cost => {
            if (!Game.Has('Genius accounting')) return '';
            if (!cost) return '';
            let priceInfo = '';
            const cps = Game.cookiesPs * (1 - Game.cpsSucked);
            if (cost > Game.cookies) priceInfo += 'in ' + Game.sayTime(((cost - Game.cookies) / cps + 1) * Game.fps) + '<br>';
            priceInfo += Game.sayTime((cost / cps + 1) * Game.fps) + ' worth<br>';
            priceInfo += Beautify((cost / Game.cookies) * 100, 1) + '% of gym<br>';
            return '<div style="font-size:80%;opacity:0.7;line-height:90%;">' + priceInfo + '</div>';
        }


        /*=====================================================================================
		PRESTIGE
		=======================================================================================*/

        Game.HCfactor = 3;
        Game.HowMuchPrestige = cookies => Math.pow(cookies / 1000000000000, 1 / Game.HCfactor)
        Game.HowManyCookiesReset = chips => {
            //this must be the inverse of the above function (ie. if cookies=chips^2, chips=cookies^(1/2) )
            return Math.pow(chips, Game.HCfactor) * 1000000000000;
        }
        Game.gainedPrestige = 0;
        Game.EarnHeavenlyChips = cookiesForfeited => {
            //recalculate prestige and chips owned
            const prestige = Math.floor(Game.HowMuchPrestige(Game.cookiesReset + cookiesForfeited));
            if (prestige > Game.prestige)//did we gain prestige levels?
            {
                const prestigeDifference = prestige - Game.prestige;
                Game.gainedPrestige = prestigeDifference;
                Game.heavenlyChips += prestigeDifference;
                Game.prestige = prestige;
                if (Game.prefs.popups) Game.Popup('You gain ' + Beautify(prestigeDifference) + ' prestige level' + (prestigeDifference === 1 ? '' : 's') + '!');
                else Game.Notify('You forfeit your ' + Beautify(cookiesForfeited) + ' Neuros.', 'You gain <b>' + Beautify(prestigeDifference) + '</b> prestige level' + (prestigeDifference === 1 ? '' : 's') + '!', [19, 7]);
            }
        }

        Game.GetHeavenlyMultiplier = () => {
            let heavenlyMult = 0;
            if (Game.Has('Heavenly chip secret')) heavenlyMult += 0.05;
            if (Game.Has('Heavenly Neuro stand')) heavenlyMult += 0.20;
            if (Game.Has('Heavenly bakery')) heavenlyMult += 0.25;
            if (Game.Has('Heavenly confectionery')) heavenlyMult += 0.25;
            if (Game.Has('Heavenly key')) heavenlyMult += 0.25;
            if (Game.hasAura('Dragon God')) heavenlyMult *= 1.05;
            if (Game.Has('Lucky digit')) heavenlyMult *= 1.01;
            if (Game.Has('Lucky number')) heavenlyMult *= 1.01;
            if (Game.Has('Lucky payout')) heavenlyMult *= 1.01;
            if (Game.hasGod) {
                let godLvl = Game.hasGod('creation');
                if (godLvl === 1) heavenlyMult *= 0.7;
                else if (godLvl === 2) heavenlyMult *= 0.8;
                else if (godLvl === 3) heavenlyMult *= 0.9;
            }
            return heavenlyMult;
        }

        Game.ascensionModes = {
            0: {name: 'None', desc: 'No special modifiers.', icon: [10, 0]},
            1: {
                name: 'Born again',
                desc: 'This run will behave as if you\'d just started the game from scratch. Prestige levels and heavenly upgrades will have no effect, as will sugar lumps and building levels. Perma-upgrades and minigames will be unavailable.<div class="line"></div>Some achievements are only available in this mode.',
                icon: [2, 7]
            }/*,
		2:{name:'Trigger finger',desc:'In this run, scrolling your mouse wheel on the cookie counts as clicking it. Some upgrades introduce new clicking behaviors.<br>No clicking achievements may be obtained in this mode.<div class="line"></div>Reaching 1 quadrillion cookies in this mode unlocks a special heavenly upgrade.',icon:[12,0]}*/
        };

        Game.ascendMeterPercent = 0;
        Game.ascendMeterPercentT = 0;
        Game.ascendMeterLevel = 100000000000000000000000000000;

        Game.nextAscensionMode = 0;
        Game.UpdateAscensionModePrompt = () => {
            const icon = Game.ascensionModes[Game.nextAscensionMode].icon;
            const name = Game.ascensionModes[Game.nextAscensionMode].name;
            elementByID('ascendModeButton').innerHTML =
                '<div class="crate noFrame enabled" ' + Game.clickStr + '="Game.PickAscensionMode();" ' + Game.getTooltip(
                    '<div style="min-width:200px;text-align:center;font-size:11px;">Challenge mode for the next run :<br><b>' + name + '</b><div class="line"></div>Challenge modes apply special modifiers to your next ascension.<br>Click to change.</div>'
                    , 'bottom-right') + ' style="opacity:1;float:none;display:block;background-position:' + (-icon[0] * 48) + 'px ' + (-icon[1] * 48) + 'px;"></div>';
        }
        Game.PickAscensionMode = () => {
            PlaySound('snd/tick.mp3');
            Game.tooltip.hide();

            let str = '';
            for (let i in Game.ascensionModes) {
                let icon = Game.ascensionModes[i].icon;
                str += '<div class="crate enabled' + (i === Game.nextAscensionMode ? ' highlighted' : '') + '" id="challengeModeSelector' + i + '" style="opacity:1;float:none;display:inline-block;background-position:' + (-icon[0] * 48) + 'px ' + (-icon[1] * 48) + 'px;" ' + Game.clickStr + '="Game.nextAscensionMode=' + i + ';Game.PickAscensionMode();PlaySound(\'snd/tick.mp3\');Game.choiceSelectorOn=-1;" onMouseOut="elementByID(\'challengeSelectedName\').innerHTML=Game.ascensionModes[Game.nextAscensionMode].name;elementByID(\'challengeSelectedDesc\').innerHTML=Game.ascensionModes[Game.nextAscensionMode].desc;" onMouseOver="elementByID(\'challengeSelectedName\').innerHTML=Game.ascensionModes[' + i + '].name;elementByID(\'challengeSelectedDesc\').innerHTML=Game.ascensionModes[' + i + '].desc;"' +
                    '></div>';
            }
            Game.Prompt('<h3>Select a challenge mode</h3>' +
                '<div class="line"></div><div class="crateBox">' + str + '</div><h4 id="challengeSelectedName">' + Game.ascensionModes[Game.nextAscensionMode].name + '</h4><div class="line"></div><div id="challengeSelectedDesc" style="min-height:128px;">' + Game.ascensionModes[Game.nextAscensionMode].desc + '</div><div class="line"></div>'
                , [['Confirm', 'Game.UpdateAscensionModePrompt();Game.ClosePrompt();']], 0, 'widePrompt');
        }

        Game.UpdateLegacyPrompt = () => {
            if (!elementByID('legacyPromptData')) return 0;
            let date = new Date();
            date.setTime(Date.now() - Game.startDate);
            let timeInSeconds = date.getTime() / 1000;
            let startDate = Game.sayTime(timeInSeconds * Game.fps, -1);

            let ascendNowToGet = Math.floor(Game.HowMuchPrestige(Game.cookiesReset + Game.cookiesEarned) - Game.HowMuchPrestige(Game.cookiesReset));
            let cookiesToNext = Math.floor(Game.HowManyCookiesReset(Game.HowMuchPrestige(Game.cookiesReset + Game.cookiesEarned) + 1) - Game.cookiesReset - Game.cookiesEarned);
            elementByID('legacyPromptData').innerHTML = '' +
                '<div class="icon" style="transform:scale(2);opacity:0.25;position:absolute;right:-8px;bottom:-8px;background-position:' + (-19 * 48) + 'px ' + (-7 * 48) + 'px;"></div>' +
                '<div class="listing"><b>Run duration :</b> ' + (startDate === '' ? 'tiny' : (startDate)) + '</div>' +
                //'<div class="listing">Earned : '+Beautify(Game.cookiesEarned)+', Reset : '+Beautify(Game.cookiesReset)+'</div>'+
                '<div class="listing"><b>Prestige level :</b> ' + Beautify(Game.prestige) + '</div>' +
                '<div class="listing"><b>Heavenly chips :</b> ' + Beautify(Game.heavenlyChips) + '</div>' +
                (ascendNowToGet >= 1 ? ('<div class="listing"><b>Ascending now will produce :</b> ' + Beautify(ascendNowToGet) + ' heavenly chip' + ((ascendNowToGet) === 1 ? '' : 's') + '</div>') :
                    ('<div class="listing warning"><b>' + Beautify(cookiesToNext) + '</b> more Neuro' + ((cookiesToNext) === 1 ? '' : 's') + ' for the next prestige level.<br>You may ascend now, but will gain no benefits.</div>')) +
                '';
            if (1 || ascendNowToGet >= 1) elementByID('promptOption0').style.display = 'inline-block'; else elementByID('promptOption0').style.display = 'none';
        }

        elementByID('ascendOverlay').innerHTML =
            '<div id="ascendBox">' +
            '<div class="ascendData smallFramed prompt" ' + Game.getTooltip(
                '<div style="min-width:200px;text-align:center;font-size:11px;">Each prestige level grants you a permanent +1% CpS.<br>The more levels you have, the more Neuros they require.</div>'
                , 'bottom-right') + ' style="margin-top:8px;"><h3 id="ascendPrestige"></h3></div>' +
            '<div class="ascendData smallFramed prompt" ' + Game.getTooltip(
                '<div style="min-width:200px;text-align:center;font-size:11px;">Heavenly chips are used to buy heavenly upgrades.<br>You gain 1 chip every time you gain a prestige level.</div>'
                , 'bottom-right') + '><h3 id="ascendHCs"></h3></div>' +
            '<a id="ascendButton" class="option framed large red" ' + Game.getTooltip(
                '<div style="min-width:200px;text-align:center;font-size:11px;">Click this once you\'ve bought<br>everything you need!</div>'
                , 'bottom-right') + ' style="font-size:16px;margin-top:0;"><span class="fancyText" style="font-size:20px;">Reincarnate</span></a>' +
            '<div id="ascendModeButton" style="position:absolute;right:34px;bottom:25px;display:none;"></div>' +
            '<input type="text" style="display:block;" id="upgradePositions"/></div>' +

            '<div id="ascendInfo"><div class="ascendData smallFramed" style="margin-top:22px;width:40%;font-size:11px;">You are ascending.<br>Drag the screen around<br>or use arrow keys!<br>When you\'re ready,<br>click Reincarnate.</div></div>';

        Game.UpdateAscensionModePrompt();

        AddEvent(elementByID('ascendButton'), 'click', () => {
            PlaySound('snd/tick.mp3');
            Game.Reincarnate();
        });

        Game.ascendl = elementByID('ascend');
        Game.ascendContentl = elementByID('ascendContent');
        Game.ascendZoomablel = elementByID('ascendZoomable');
        Game.ascendUpgradesl = elementByID('ascendUpgrades');
        Game.OnAscend = 0;
        Game.AscendTimer = 0;//how far we are into the ascend animation
        Game.AscendDuration = Game.fps * 5;//how long the ascend animation is
        Game.AscendBreakpoint = Game.AscendDuration * 0.5;//at which point the cookie explodes during the ascend animation
        Game.UpdateAscendIntro = () => {
            if (Game.AscendTimer === 1) PlaySound('snd/charging.mp3');
            if (Game.AscendTimer === Math.floor(Game.AscendBreakpoint)) PlaySound('snd/thud.mp3');
            Game.AscendTimer++;
            if (Game.AscendTimer > Game.AscendDuration)//end animation and launch ascend screen
            {
                PlaySound('snd/cymbalRev.mp3', 0.5);
                PlaySound('snd/choir.mp3');
                Game.EarnHeavenlyChips(Game.cookiesEarned);
                Game.AscendTimer = 0;
                Game.OnAscend = 1;
                Game.removeClass('ascendIntro');
                Game.addClass('ascending');
                Game.BuildAscendTree();
                Game.heavenlyChipsDisplayed = Game.heavenlyChips;
                Game.nextAscensionMode = 0;
                Game.ascensionMode = 0;
                Game.UpdateAscensionModePrompt();
            }
        }
        Game.ReincarnateTimer = 0;//how far we are into the reincarnation animation
        Game.ReincarnateDuration = Game.fps;//how long the reincarnation animation is
        Game.UpdateReincarnateIntro = () => {
            if (Game.ReincarnateTimer === 1) PlaySound('snd/pop' + Math.floor(Math.random() * 3 + 1) + '.mp3', 0.75);
            Game.ReincarnateTimer++;
            if (Game.ReincarnateTimer > Game.ReincarnateDuration)//end animation and launch regular game
            {
                Game.ReincarnateTimer = 0;
                Game.removeClass('reincarnating');
            }
        }
        Game.Reincarnate = bypass => {
            if (!bypass) Game.Prompt('<h3>Reincarnate</h3><div class="block">Are you ready to return to the mortal world?</div>', [['Yes', 'Game.ClosePrompt();Game.Reincarnate(1);'], 'No']);
            else {
                Game.ascendUpgradesl.innerHTML = '';
                Game.ascensionMode = Game.nextAscensionMode;
                Game.nextAscensionMode = 0;
                Game.Reset();
                if (Game.HasAchiev('Rebirth')) {
                    if (Game.prefs.popups) Game.Popup('Reincarnated');
                    else Game.Notify('Reincarnated', 'Hello, Neuros!', [10, 0], 4);
                }
                if (Game.resets >= 1000) Game.Win('Endless cycle');
                if (Game.resets >= 100) Game.Win('Reincarnation');
                if (Game.resets >= 10) Game.Win('Resurrection');
                if (Game.resets >= 1) Game.Win('Rebirth');
                Game.removeClass('ascending');
                Game.OnAscend = 0;
                //trigger the reincarnate animation
                Game.ReincarnateTimer = 1;
                Game.addClass('reincarnating');
                Game.BigCookieSize = 0;
            }
        }
        Game.GiveUpAscend = bypass => {
            if (!bypass) Game.Prompt('<h3>Give up</h3><div class="block">Are you sure? You\'ll have to start this run over and won\'t gain any heavenly chips!</div>', [['Yes', 'Game.ClosePrompt();Game.GiveUpAscend(1);'], 'No']);
            else {
                if (Game.prefs.popups) Game.Popup('Game reset');
                else Game.Notify('Gave up', 'Let\'s try this again!', [0, 5], 4);
                Game.Reset();
            }
        }
        Game.Ascend = bypass => {
            if (!bypass) Game.Prompt('<h3>Ascend</h3><div class="block">Do you REALLY want to ascend?<div class="line"></div>You will lose your progress and start over from scratch.<div class="line"></div>All your Neuros will be converted into prestige and heavenly chips.<div class="line"></div>You will keep your achievements' + (Game.canLumps() ? ', building levels and sugar lumps' : '') + '.</div>', [['Yes!', 'Game.ClosePrompt();Game.Ascend(1);'], 'No']);
            else {
                if (Game.prefs.popups) Game.Popup('Ascending');
                else Game.Notify('Ascending', 'So long, Neuros.', [20, 7], 4);
                Game.OnAscend = 0;
                Game.removeClass('ascending');
                Game.addClass('ascendIntro');
                //trigger the ascend animation
                Game.AscendTimer = 1;
                Game.killShimmers();
                elementByID('toggleBox').style.display = 'none';
                elementByID('toggleBox').innerHTML = '';
                Game.choiceSelectorOn = -1;
                Game.ToggleSpecialMenu(0);
                Game.AscendOffX = 0;
                Game.AscendOffY = 0;
                Game.AscendOffXT = 0;
                Game.AscendOffYT = 0;
                Game.AscendZoomT = 1;
                Game.AscendZoom = 0.2;
            }
        }

        Game.DebuggingPrestige = 0;
        Game.AscendDragX = 0;
        Game.AscendDragY = 0;
        Game.AscendOffX = 0;
        Game.AscendOffY = 0;
        Game.AscendZoom = 1;
        Game.AscendOffXT = 0;
        Game.AscendOffYT = 0;
        Game.AscendZoomT = 1;
        Game.AscendDragging = 0;
        Game.AscendGridSnap = 24;
        Game.heavenlyBounds = {left: 0, right: 0, top: 0, bottom: 0};
        Game.UpdateAscend = () => {
            let me;
            let i;
            if (Game.keys[37]) Game.AscendOffXT += 16 * (1 / Game.AscendZoomT);
            if (Game.keys[38]) Game.AscendOffYT += 16 * (1 / Game.AscendZoomT);
            if (Game.keys[39]) Game.AscendOffXT -= 16 * (1 / Game.AscendZoomT);
            if (Game.keys[40]) Game.AscendOffYT -= 16 * (1 / Game.AscendZoomT);

            if (Game.AscendOffXT > -Game.heavenlyBounds.left) Game.AscendOffXT = -Game.heavenlyBounds.left;
            if (Game.AscendOffXT < -Game.heavenlyBounds.right) Game.AscendOffXT = -Game.heavenlyBounds.right;
            if (Game.AscendOffYT > -Game.heavenlyBounds.top) Game.AscendOffYT = -Game.heavenlyBounds.top;
            if (Game.AscendOffYT < -Game.heavenlyBounds.bottom) Game.AscendOffYT = -Game.heavenlyBounds.bottom;
            Game.AscendOffX += (Game.AscendOffXT - Game.AscendOffX) * 0.5;
            Game.AscendOffY += (Game.AscendOffYT - Game.AscendOffY) * 0.5;
            Game.AscendZoom += (Game.AscendZoomT - Game.AscendZoom) * 0.25;
            if (Math.abs(Game.AscendZoomT - Game.AscendZoom) < 0.005) Game.AscendZoom = Game.AscendZoomT;

            if (Game.DebuggingPrestige) {
                for (i in Game.PrestigeUpgrades) {
                    me = Game.PrestigeUpgrades[i];
                    AddEvent(elementByID('heavenlyUpgrade' + me.id), 'mousedown', (me => () => {
                        if (!Game.DebuggingPrestige) return;
                        Game.SelectedHeavenlyUpgrade = me;
                    })(me));
                    AddEvent(elementByID('heavenlyUpgrade' + me.id), 'mouseup', (me => () => {
                        if (Game.SelectedHeavenlyUpgrade === me) {
                            Game.SelectedHeavenlyUpgrade = 0;
                            Game.BuildAscendTree();
                        }
                    })(me));
                }
            }

            if (Game.mouseDown && !Game.promptOn) {
                if (!Game.AscendDragging) {
                    Game.AscendDragX = Game.mouseX;
                    Game.AscendDragY = Game.mouseY;
                }
                Game.AscendDragging = 1;

                if (Game.DebuggingPrestige) {
                    if (Game.SelectedHeavenlyUpgrade) {
                        Game.tooltip.hide();
                        //drag upgrades around
                        me = Game.SelectedHeavenlyUpgrade;
                        me.posX += (Game.mouseX - Game.AscendDragX) * (1 / Game.AscendZoomT);
                        me.posY += (Game.mouseY - Game.AscendDragY) * (1 / Game.AscendZoomT);
                        let posX = me.posX;//Math.round(me.posX/Game.AscendGridSnap)*Game.AscendGridSnap;
                        let posY = me.posY;//Math.round(me.posY/Game.AscendGridSnap)*Game.AscendGridSnap;
                        elementByID('heavenlyUpgrade' + me.id).style.left = Math.floor(posX) + 'px';
                        elementByID('heavenlyUpgrade' + me.id).style.top = Math.floor(posY) + 'px';
                        for (let ii in me.parents) {
                            let origX = 0;
                            let origY = 0;
                            let targX = me.posX + 28;
                            let targY = me.posY + 28;
                            if (me.parents[ii] !== -1) {
                                origX = me.parents[ii].posX + 28;
                                origY = me.parents[ii].posY + 28;
                            }
                            let rot = -(Math.atan((targY - origY) / (origX - targX)) / Math.PI) * 180;
                            if (targX <= origX) rot += 180;
                            let dist = Math.floor(Math.sqrt((targX - origX) * (targX - origX) + (targY - origY) * (targY - origY)));
                            //l('heavenlyLink'+me.id+'-'+ii).style='width:'+dist+'px;-webkit-transform:rotate('+rot+'deg);-moz-transform:rotate('+rot+'deg);-ms-transform:rotate('+rot+'deg);-o-transform:rotate('+rot+'deg);transform:rotate('+rot+'deg);left:'+(origX)+'px;top:'+(origY)+'px;';
                            elementByID('heavenlyLink' + me.id + '-' + ii).style = 'width:' + dist + 'px;transform:rotate(' + rot + 'deg);left:' + (origX) + 'px;top:' + (origY) + 'px;';
                        }
                    }
                }
                if (!Game.SelectedHeavenlyUpgrade) {
                    Game.AscendOffXT += (Game.mouseX - Game.AscendDragX) * (1 / Game.AscendZoomT);
                    Game.AscendOffYT += (Game.mouseY - Game.AscendDragY) * (1 / Game.AscendZoomT);
                }
                Game.AscendDragX = Game.mouseX;
                Game.AscendDragY = Game.mouseY;
            } else {
                /*if (Game.SelectedHeavenlyUpgrade)
				{
					var me=Game.SelectedHeavenlyUpgrade;
					me.posX=Math.round(me.posX/Game.AscendGridSnap)*Game.AscendGridSnap;
					me.posY=Math.round(me.posY/Game.AscendGridSnap)*Game.AscendGridSnap;
					l('heavenlyUpgrade'+me.id).style.left=me.posX+'px';
					l('heavenlyUpgrade'+me.id).style.top=me.posY+'px';
				}*/
                Game.AscendDragging = 0;
                Game.SelectedHeavenlyUpgrade = 0;
            }
            if (Game.Click || Game.promptOn) {
                Game.AscendDragging = 0;
            }

            //Game.ascendl.style.backgroundPosition=Math.floor(Game.AscendOffX/2)+'px '+Math.floor(Game.AscendOffY/2)+'px';
            //Game.ascendl.style.backgroundPosition=Math.floor(Game.AscendOffX/2)+'px '+Math.floor(Game.AscendOffY/2)+'px,'+Math.floor(Game.AscendOffX/4)+'px '+Math.floor(Game.AscendOffY/4)+'px';
            //Game.ascendContentl.style.left=Math.floor(Game.AscendOffX)+'px';
            //Game.ascendContentl.style.top=Math.floor(Game.AscendOffY)+'px';
            Game.ascendContentl.style.webkitTransform = 'translate(' + Math.floor(Game.AscendOffX) + 'px,' + Math.floor(Game.AscendOffY) + 'px)';
            Game.ascendContentl.style.msTransform = 'translate(' + Math.floor(Game.AscendOffX) + 'px,' + Math.floor(Game.AscendOffY) + 'px)';
            Game.ascendContentl.style.oTransform = 'translate(' + Math.floor(Game.AscendOffX) + 'px,' + Math.floor(Game.AscendOffY) + 'px)';
            Game.ascendContentl.style.mozTransform = 'translate(' + Math.floor(Game.AscendOffX) + 'px,' + Math.floor(Game.AscendOffY) + 'px)';
            Game.ascendContentl.style.transform = 'translate(' + Math.floor(Game.AscendOffX) + 'px,' + Math.floor(Game.AscendOffY) + 'px)';
            Game.ascendZoomablel.style.webkitTransform = 'scale(' + (Game.AscendZoom) + ',' + (Game.AscendZoom) + ')';
            Game.ascendZoomablel.style.msTransform = 'scale(' + (Game.AscendZoom) + ',' + (Game.AscendZoom) + ')';
            Game.ascendZoomablel.style.oTransform = 'scale(' + (Game.AscendZoom) + ',' + (Game.AscendZoom) + ')';
            Game.ascendZoomablel.style.mozTransform = 'scale(' + (Game.AscendZoom) + ',' + (Game.AscendZoom) + ')';
            Game.ascendZoomablel.style.transform = 'scale(' + (Game.AscendZoom) + ',' + (Game.AscendZoom) + ')';

            //if (Game.Scroll!=0) Game.ascendContentl.style.transformOrigin=Math.floor(Game.windowW/2-Game.mouseX)+'px '+Math.floor(Game.windowH/2-Game.mouseY)+'px';
            if (Game.Scroll < 0 && !Game.promptOn) {
                Game.AscendZoomT = 0.5;
            }
            if (Game.Scroll > 0 && !Game.promptOn) {
                Game.AscendZoomT = 1;
            }

            if (Game.T % 2 === 0) {
                elementByID('ascendPrestige').innerHTML = 'Prestige level :<br>' + Beautify(Game.prestige);
                elementByID('ascendHCs').innerHTML = 'Heavenly chips :<br><span class="price heavenly">' + Beautify(Math.round(Game.heavenlyChipsDisplayed)) + '</span>';
                if (Game.prestige > 0) elementByID('ascendModeButton').style.display = 'block';
                else elementByID('ascendModeButton').style.display = 'none';
            }
            Game.heavenlyChipsDisplayed += (Game.heavenlyChips - Game.heavenlyChipsDisplayed) * 0.4;

            if (Game.DebuggingPrestige && Game.T % 10 === 0) {
                let str = '';
                for (i in Game.PrestigeUpgrades) {
                    me = Game.PrestigeUpgrades[i];
                    str += me.id + ':[' + Math.floor(me.posX) + ',' + Math.floor(me.posY) + '],';
                }
                elementByID('upgradePositions').value = 'Game.UpgradePositions={' + str + '};';
            }
            //if (Game.T%5==0) Game.BuildAscendTree();
        }
        Game.AscendRefocus = () => {
            Game.AscendOffX = 0;
            Game.AscendOffY = 0;
            Game.ascendl.className = '';
        }

        Game.SelectedHeavenlyUpgrade = 0;
        Game.PurchaseHeavenlyUpgrade = what => {
            //if (Game.Has('Neuromancy')) Game.UpgradesById[what].toggle(); else
            if (Game.UpgradesById[what].buy()) {
                if (elementByID('heavenlyUpgrade' + what)) {
                    const rect = elementByID('heavenlyUpgrade' + what).getBoundingClientRect();
                    Game.SparkleAt((rect.left + rect.right) / 2, (rect.top + rect.bottom) / 2 - 24);
                }
                //Game.BuildAscendTree();
            }
        }
        Game.BuildAscendTree = () => {
            let ii;
            let me;
            let i;
            let str = '';
            Game.heavenlyBounds = {left: 0, right: 0, top: 0, bottom: 0};

            if (Game.DebuggingPrestige) elementByID('upgradePositions').style.display = 'block'; else elementByID('upgradePositions').style.display = 'none';

            for (i in Game.PrestigeUpgrades) {
                me = Game.PrestigeUpgrades[i];
                me.canBePurchased = 1;
                if (!me.bought && !Game.DebuggingPrestige) {
                    if (me.showIf && !me.showIf()) me.canBePurchased = 0;
                    else {
                        for (ii in me.parents) {
                            if (me.parents[ii] !== -1 && !me.parents[ii].bought) me.canBePurchased = 0;
                        }
                    }
                }
            }
            str += '<div class="crateBox" style="filter:none;-webkit-filter:none;">';//chrome is still bad at these
            for (i in Game.PrestigeUpgrades) {
                me = Game.PrestigeUpgrades[i];

                let ghosted = 0;
                if (me.canBePurchased || Game.Has('Neuromancy')) {
                    str += Game.crate(me, 'ascend', 'Game.PurchaseHeavenlyUpgrade(' + me.id + ');', 'heavenlyUpgrade' + me.id);
                } else {
                    for (ii in me.parents) {
                        if (me.parents[ii] !== -1 && me.parents[ii].canBePurchased) ghosted = 1;
                    }
                    if (me.showIf && !me.showIf()) ghosted = 0;
                    if (ghosted) {
                        //maybe replace this with Game.crate()
                        str += '<div class="crate upgrade heavenly ghosted" id="heavenlyUpgrade' + me.id + '" style="position:absolute;left:' + me.posX + 'px;top:' + me.posY + 'px;' + (me.icon[2] ? 'background-image:url(' + me.icon[2] + ');' : '') + 'background-position:' + (-me.icon[0] * 48) + 'px ' + (-me.icon[1] * 48) + 'px;"></div>';
                    }
                }
                if (me.canBePurchased || Game.Has('Neuromancy') || ghosted) {
                    if (me.posX < Game.heavenlyBounds.left) Game.heavenlyBounds.left = me.posX;
                    if (me.posX > Game.heavenlyBounds.right) Game.heavenlyBounds.right = me.posX;
                    if (me.posY < Game.heavenlyBounds.top) Game.heavenlyBounds.top = me.posY;
                    if (me.posY > Game.heavenlyBounds.bottom) Game.heavenlyBounds.bottom = me.posY;
                }
                for (ii in me.parents)//create pulsing links
                {
                    if (me.parents[ii] !== -1 && (me.canBePurchased || ghosted)) {
                        let origX = 0;
                        let origY = 0;
                        let targX = me.posX + 28;
                        let targY = me.posY + 28;
                        if (me.parents[ii] !== -1) {
                            origX = me.parents[ii].posX + 28;
                            origY = me.parents[ii].posY + 28;
                        }
                        let rot = -(Math.atan((targY - origY) / (origX - targX)) / Math.PI) * 180;
                        if (targX <= origX) rot += 180;
                        let dist = Math.floor(Math.sqrt((targX - origX) * (targX - origX) + (targY - origY) * (targY - origY)));
                        str += '<div class="parentLink" id="heavenlyLink' + me.id + '-' + ii + '" style="' + (ghosted ? 'opacity:0.1;' : '') + 'width:' + dist + 'px;-webkit-transform:rotate(' + rot + 'deg);-moz-transform:rotate(' + rot + 'deg);-ms-transform:rotate(' + rot + 'deg);-o-transform:rotate(' + rot + 'deg);transform:rotate(' + rot + 'deg);left:' + (origX) + 'px;top:' + (origY) + 'px;"></div>';
                    }
                }
            }
            Game.heavenlyBounds.left -= 128;
            Game.heavenlyBounds.top -= 128;
            Game.heavenlyBounds.right += 128 + 64;
            Game.heavenlyBounds.bottom += 128 + 64;
            //str+='<div style="border:1px solid red;position:absolute;left:'+Game.heavenlyBounds.left+'px;width:'+(Game.heavenlyBounds.right-Game.heavenlyBounds.left)+'px;top:'+Game.heavenlyBounds.top+'px;height:'+(Game.heavenlyBounds.bottom-Game.heavenlyBounds.top)+'px;"></div>';
            str += '</div>';
            Game.ascendUpgradesl.innerHTML = str;
        }


        /*=====================================================================================
		COALESCING SUGAR LUMPS
		=======================================================================================*/
        Game.lumpMatureAge = 1;
        Game.lumpRipeAge = 1;
        Game.lumpOverripeAge = 1;
        Game.lumpCurrentType = 0;
        elementByID('comments').innerHTML = elementByID('comments').innerHTML +
            '<div id="lumps" onclick="Game.clickLump();" ' + Game.getDynamicTooltip('Game.lumpTooltip', 'bottom') + '><div id="lumpsIcon" class="usesIcon"></div><div id="lumpsIcon2" class="usesIcon"></div><div id="lumpsAmount">0</div></div>';
        Game.lumpTooltip = () => {
            let str = '<div style="padding:8px;width:400px;font-size:11px;text-align:center;">' +
                'You have <span class="price lump">' + Beautify(Game.lumps) + ' sugar lump' + (Game.lumps === 1 ? '' : 's') + '</span>.' +
                '<div class="line"></div>' +
                'A <b>sugar lump</b> is coalescing here, attracted by your accomplishments.';

            let age = Date.now() - Game.lumpT;
            str += '<div class="line"></div>';
            if (age < Game.lumpMatureAge) str += 'This sugar lump is still growing and will take <b>' + Game.sayTime(((Game.lumpMatureAge - age) / 1000 + 1) * Game.fps, -1) + '</b> to reach maturity.';
            else if (age < Game.lumpRipeAge) str += 'This sugar lump is mature and will be ripe in <b>' + Game.sayTime(((Game.lumpRipeAge - age) / 1000 + 1) * Game.fps, -1) + '</b>.<br>You may <b>click it to harvest it now</b>, but there is a <b>50% chance you won\'t get anything</b>.';
            else if (age < Game.lumpOverripeAge) str += '<b>This sugar lump is ripe! Click it to harvest it.</b><br>If you do nothing, it will auto-harvest in <b>' + Game.sayTime(((Game.lumpOverripeAge - age) / 1000 + 1) * Game.fps, -1) + '</b>.';

            let phase = (age / Game.lumpOverripeAge) * 7;
            if (phase >= 3) {
                if (Game.lumpCurrentType !== 0) str += '<div class="line"></div>';
                if (Game.lumpCurrentType === 1) str += 'This sugar lump grew to be <b>bifurcated</b>; harvesting it has a 50% chance of yielding two lumps.';
                else if (Game.lumpCurrentType === 2) str += 'This sugar lump grew to be <b>golden</b>; harvesting it will yield 2 to 7 lumps, your current Neuros will be doubled (capped to a gain of 24 hours of your CpS), and you will find 10% more golden Neuros for the next 24 hours.';
                else if (Game.lumpCurrentType === 3) str += 'This sugar lump was affected by the elders and grew to be <b>meaty</b>; harvesting it will yield between 0 and 2 lumps.';
                else if (Game.lumpCurrentType === 4) str += 'This sugar lump is <b>caramelized</b>, its stickiness binding it to unexpected things; harvesting it will yield between 1 and 3 lumps and will refill your sugar lump cooldowns.';
            }

            str += '<div class="line"></div>';
            str += 'Your sugar lumps mature after <b>' + Game.sayTime((Game.lumpMatureAge / 1000) * Game.fps, -1) + '</b>,<br>ripen after <b>' + Game.sayTime((Game.lumpRipeAge / 1000) * Game.fps, -1) + '</b>,<br>and fall after <b>' + Game.sayTime((Game.lumpOverripeAge / 1000) * Game.fps, -1) + '</b>.';

            str += '<div class="line"></div>' +
                '&bull; Sugar lumps can be harvested when mature, though if left alone beyond that point they will start ripening (increasing the chance of harvesting them) and will eventually fall and be auto-harvested after some time.<br>&bull; Sugar lumps are delicious and may be used as currency for all sorts of things.<br>&bull; Once a sugar lump is harvested, another one will start growing in its place.<br>&bull; Note that sugar lumps keep growing when the game is closed.';

            str += '</div>';
            return str;
        }
        Game.computeLumpTimes = () => {
            const hour = 1000 * 60 * 60;
            Game.lumpMatureAge = hour * 20;
            Game.lumpRipeAge = hour * 23;
            if (Game.Has('Stevia Caelestis')) Game.lumpRipeAge -= hour;
            if (Game.Has('Diabetica Daemonicus')) Game.lumpMatureAge -= hour;
            if (Game.Has('Ichor syrup')) Game.lumpMatureAge -= 1000 * 60 * 7;
            if (Game.Has('Sugar aging process')) Game.lumpRipeAge -= 6000 * Math.min(600, Game.Objects['Grandma'].amount);//capped at 600 grandmas
            if (Game.hasGod && Game.BuildingsOwned % 10 === 0) {
                let godLvl = Game.hasGod('order');
                if (godLvl === 1) Game.lumpRipeAge -= hour;
                else if (godLvl === 2) Game.lumpRipeAge -= (hour / 3) * 2;
                else if (godLvl === 3) Game.lumpRipeAge -= (hour / 3);
            }
            if (Game.hasAura('Dragon\'s Curve')) {
                Game.lumpMatureAge /= 1.05;
                Game.lumpRipeAge /= 1.05;
            }
            Game.lumpOverripeAge = Game.lumpRipeAge + hour;
            if (Game.Has('Glucose-charged air')) {
                Game.lumpMatureAge /= 2000;
                Game.lumpRipeAge /= 2000;
                Game.lumpOverripeAge /= 2000;
            }
        }
        Game.loadLumps = () => {
            Game.computeLumpTimes();
            //Game.computeLumpType();
            if (!Game.canLumps()) Game.removeClass('lumpsOn');
            else {
                if (Game.ascensionMode !== 1) Game.addClass('lumpsOn');
                Game.lumpT = Math.min(Date.now(), Game.lumpT);
                let age = Math.max(Date.now() - Game.lumpT, 0);
                let amount = Math.floor(age / Game.lumpOverripeAge);//how many lumps did we harvest since we closed the game?
                if (amount >= 1) {
                    Game.harvestLumps(1, true);
                    Game.lumpCurrentType = 0;//all offline lumps after the first one have a normal type
                    if (amount > 1) Game.harvestLumps(amount - 1, true);
                    if (Game.prefs.popups) Game.Popup('Harvested ' + Beautify(amount) + ' sugar lump' + (amount === 1 ? '' : 's') + ' while you were away');
                    else Game.Notify('', 'You harvested <b>' + Beautify(amount) + '</b> sugar lump' + (amount === 1 ? '' : 's') + ' while you were away.', [29, 14]);
                    Game.lumpT = Date.now() - (age - amount * Game.lumpOverripeAge);
                    Game.computeLumpType();
                }
            }
        }
        Game.gainLumps = total => {
            if (Game.lumpsTotal === -1) {
                Game.lumpsTotal = 0;
                Game.lumps = 0;
            }
            Game.lumps += total;
            Game.lumpsTotal += total;

            if (Game.lumpsTotal >= 7) Game.Win('Dude, sweet');
            if (Game.lumpsTotal >= 30) Game.Win('Sugar rush');
            if (Game.lumpsTotal >= 365) Game.Win('Year\'s worth of cavities');
        }
        Game.clickLump = () => {
            if (!Game.canLumps()) return;
            let age = Date.now() - Game.lumpT;
            if (age < Game.lumpMatureAge) {
            } else if (age < Game.lumpRipeAge) {
                let amount = chooseRandomElement([0, 1]);
                if (amount !== 0) Game.Win('Hand-picked');
                Game.harvestLumps(amount);
                Game.computeLumpType();
            } else if (age < Game.lumpOverripeAge) {
                Game.harvestLumps(1);
                Game.computeLumpType();
            }
        }
        Game.harvestLumps = (amount, silent) => {
            if (!Game.canLumps()) return;
            Game.lumpT = Date.now();
            let total = amount;
            if (Game.lumpCurrentType === 1 && Game.Has('Sucralosia Inutilis') && Math.random() < 0.05) total *= 2;
            else if (Game.lumpCurrentType === 1) total *= chooseRandomElement([1, 2]);
            else if (Game.lumpCurrentType === 2) {
                total *= chooseRandomElement([2, 3, 4, 5, 6, 7]);
                Game.gainBuff('sugar blessing', 24 * 60 * 60, 1);
                Game.Earn(Math.min(Game.cookiesPs * 60 * 60 * 24, Game.cookies));
                if (Game.prefs.popups) Game.Popup('Sugar blessing activated!');
                else Game.Notify('Sugar blessing activated!', 'Your Neuros have been doubled.<br>+10% golden Neuros for the next 24 hours.', [29, 16]);
            } else if (Game.lumpCurrentType === 3) total *= chooseRandomElement([0, 0, 1, 2, 2]);
            else if (Game.lumpCurrentType === 4) {
                total *= chooseRandomElement([1, 2, 3]);
                Game.lumpRefill = Date.now() - Game.getLumpRefillMax();
                if (Game.prefs.popups) Game.Popup('Sugar lump cooldowns cleared!');
                else Game.Notify('Sugar lump cooldowns cleared!', '', [29, 27]);
            }
            total = Math.floor(total);
            Game.gainLumps(total);
            if (Game.lumpCurrentType === 1) Game.Win('Sugar sugar');
            else if (Game.lumpCurrentType === 2) Game.Win('All-natural cane sugar');
            else if (Game.lumpCurrentType === 3) Game.Win('Sweetmeats');
            else if (Game.lumpCurrentType === 4) Game.Win('Maillard reaction');

            if (!silent) {
                let rect = elementByID('lumpsIcon2').getBoundingClientRect();
                Game.SparkleAt((rect.left + rect.right) / 2, (rect.top + rect.bottom) / 2 - 24);
                if (total > 0) Game.Popup('<small>+' + Beautify(total) + ' sugar lump' + (total === 1 ? '' : 's') + '</small>', (rect.left + rect.right) / 2, (rect.top + rect.bottom) / 2 - 48);
                else Game.Popup('<small>Botched harvest!</small>', (rect.left + rect.right) / 2, (rect.top + rect.bottom) / 2 - 48);
                PlaySound('snd/pop' + Math.floor(Math.random() * 3 + 1) + '.mp3', 0.75);
            }
            Game.computeLumpTimes();
        }
        Game.computeLumpType = () => {
            Math.seededRandom(Game.seed + '/' + Game.lumpT);
            let types = [0];
            let loop = 1;
            if (Game.hasAura('Dragon\'s Curve')) loop = 2;
            for (let i = 0; i < loop; i++) {
                if (Math.random() < (Game.Has('Sucralosia Inutilis') ? 0.15 : 0.1)) types.push(1);//bifurcated
                if (Math.random() < 3 / 1000) types.push(2);//golden
                if (Math.random() < 0.1 * Game.elderWrath) types.push(3);//meaty
                if (Math.random() < 1 / 50) types.push(4);//caramelized
            }
            Game.lumpCurrentType = chooseRandomElement(types);
            Math.seededRandom();
        }

        Game.canLumps = () => Game.lumpsTotal > -1 || (Game.ascensionMode !== 1 && (Game.cookiesEarned + Game.cookiesReset) >= 1000000000)

        Game.getLumpRefillMax = () => {
            return 1000 * 60 * 15;//15 minutes
        }

        Game.getLumpRefillRemaining = () => Game.getLumpRefillMax() - (Date.now() - Game.lumpRefill)

        Game.canRefillLump = () => ((Date.now() - Game.lumpRefill) >= Game.getLumpRefillMax())

        Game.refillLump = (n, func) => {
            if (Game.lumps >= n && Game.canRefillLump()) {
                Game.spendLump(n, 'refill', () => {
                    if (!Game.sesame) Game.lumpRefill = Date.now();
                    func();
                })();
            }
        }

        Game.spendLump = (n, str, func) => {
            //ask if we want to spend N lumps
            return () => {
                if (Game.lumps < n) return false;
                if (Game.prefs.askLumps) {
                    PlaySound('snd/tick.mp3');
                    Game.promptConfirmFunc = func;//bit dumb
                    Game.Prompt('<div class="icon" style="background:url(/img/icons.png?v=' + Game.version + ');float:left;margin-left:-8px;margin-top:-8px;background-position:' + (-29 * 48) + 'px ' + (-14 * 48) + 'px;"></div><div style="margin:16px 8px;">Do you want to spend <b>' + Beautify(n) + ' lump' + (n !== 1 ? 's' : '') + '</b> to ' + str + '?</div>', [['Yes', 'Game.lumps-=' + n + ';Game.promptConfirmFunc();Game.promptConfirmFunc=0;Game.recalculateGains=1;Game.ClosePrompt();'], 'No']);
                    return false;
                } else {
                    Game.lumps -= n;
                    func();
                    Game.recalculateGains = 1;
                }
            }
        }

        Game.doLumps = () => {
            if (!Game.canLumps()) {
                Game.removeClass('lumpsOn');
                return;
            }
            if (Game.lumpsTotal === -1) {
                //first time !
                if (Game.ascensionMode !== 1) Game.addClass('lumpsOn');
                Game.lumpT - Date.now();
                Game.lumpsTotal = 0;
                Game.lumps = 0;
                Game.computeLumpType();

                Game.Notify('Sugar lumps!', 'Because you\'ve earned a <b>billion Neuros</b> in total, you are now attracting <b>sugar lumps</b>. They coalesce quietly near the top of your screen, under the Stats button.<br>You will be able to harvest them when they\'re ripe, after which you may spend them on all sorts of things!', [23, 14]);
            }
            let age = Date.now() - Game.lumpT;
            if (age > Game.lumpOverripeAge) {
                age = 0;
                Game.harvestLumps(1);
                Game.computeLumpType();
            }

            const phase = Math.min(6, Math.floor((age / Game.lumpOverripeAge) * 7));
            const phase2 = Math.min(6, Math.floor((age / Game.lumpOverripeAge) * 7) + 1);
            let row = 14;
            let row2 = 14;
            const type = Game.lumpCurrentType;
            if (type === 1)//double
            {
                //if (phase>=6) row=15;
                if (phase2 >= 6) row2 = 15;
            } else if (type === 2)//golden
            {
                if (phase >= 4) row = 16;
                if (phase2 >= 4) row2 = 16;
            } else if (type === 3)//meaty
            {
                if (phase >= 4) row = 17;
                if (phase2 >= 4) row2 = 17;
            } else if (type === 4)//caramelized
            {
                if (phase >= 4) row = 27;
                if (phase2 >= 4) row2 = 27;
            }
            let icon = [23 + Math.min(phase, 5), row];
            let icon2 = [23 + phase2, row2];
            let opacity = Math.min(6, (age / Game.lumpOverripeAge) * 7) % 1;
            if (phase >= 6) {
                opacity = 1;
            }
            elementByID('lumpsIcon').style.backgroundPosition = (-icon[0] * 48) + 'px ' + (-icon[1] * 48) + 'px';
            elementByID('lumpsIcon2').style.backgroundPosition = (-icon2[0] * 48) + 'px ' + (-icon2[1] * 48) + 'px';
            elementByID('lumpsIcon2').style.opacity = opacity;
            elementByID('lumpsAmount').innerHTML = Beautify(Game.lumps);
        }

        /*=====================================================================================
		COOKIE ECONOMICS
		=======================================================================================*/
        Game.Earn = howmuch => {
            Game.cookies += howmuch;
            Game.cookiesEarned += howmuch;
        }
        Game.Spend = howmuch => {
            Game.cookies -= howmuch;
        }
        Game.Dissolve = howmuch => {
            Game.cookies -= howmuch;
            Game.cookiesEarned -= howmuch;
            Game.cookies = Math.max(0, Game.cookies);
            Game.cookiesEarned = Math.max(0, Game.cookiesEarned);
        }
        Game.mouseCps = () => {
            let i;
            let add = 0;
            if (Game.Has('Thousand fingers')) add += 0.1;
            if (Game.Has('Million fingers')) add += 0.5;
            if (Game.Has('Billion fingers')) add += 5;
            if (Game.Has('Trillion fingers')) add += 50;
            if (Game.Has('Quadrillion fingers')) add += 500;
            if (Game.Has('Quintillion fingers')) add += 5000;
            if (Game.Has('Sextillion fingers')) add += 50000;
            if (Game.Has('Septillion fingers')) add += 500000;
            if (Game.Has('Octillion fingers')) add += 5000000;
            let num = 0;
            for (i in Game.Objects) {
                num += Game.Objects[i].amount;
            }
            num -= Game.Objects['Cursor'].amount;
            add = add * num;
            if (Game.Has('Plastic mouse')) add += Game.cookiesPs * 0.01;
            if (Game.Has('Iron mouse')) add += Game.cookiesPs * 0.01;
            if (Game.Has('Titanium mouse')) add += Game.cookiesPs * 0.01;
            if (Game.Has('Adamantium mouse')) add += Game.cookiesPs * 0.01;
            if (Game.Has('Unobtainium mouse')) add += Game.cookiesPs * 0.01;
            if (Game.Has('Eludium mouse')) add += Game.cookiesPs * 0.01;
            if (Game.Has('Wishalloy mouse')) add += Game.cookiesPs * 0.01;
            if (Game.Has('Fantasteel mouse')) add += Game.cookiesPs * 0.01;
            if (Game.Has('Nevercrack mouse')) add += Game.cookiesPs * 0.01;
            if (Game.Has('Armythril mouse')) add += Game.cookiesPs * 0.01;
            if (Game.Has('Technobsidian mouse')) add += Game.cookiesPs * 0.01;
            if (Game.Has('Plasmarble mouse')) add += Game.cookiesPs * 0.01;
            let mult = 1;

            for (i in Game.customMouseCps) {
                mult += Game.customMouseCps[i]();
            }

            if (Game.Has('Santa\'s helpers')) mult *= 1.1;
            if (Game.Has('Neuro egg')) mult *= 1.1;
            if (Game.Has('Halo gloves')) mult *= 1.1;

            mult *= Game.eff('click');

            if (Game.hasGod) {
                let godLvl = Game.hasGod('labor');
                if (godLvl === 1) mult *= 1.15;
                else if (godLvl === 2) mult *= 1.1;
                else if (godLvl === 3) mult *= 1.05;
            }

            for (i in Game.buffs) {
                if (typeof Game.buffs[i].multClick != 'undefined') mult *= Game.buffs[i].multClick;
            }

            if (Game.hasAura('Dragon Cursor')) mult *= 1.05;

            for (i in Game.customMouseCpsMult) {
                mult *= Game.customMouseCpsMult[i]();
            }

            let out = mult * Game.ComputeCps(1, Game.Has('Reinforced index finger') + Game.Has('Carpal tunnel prevention cream') + Game.Has('Ambidextrous'), add);

            if (Game.hasBuff('Cursed finger')) out = Game.buffs['Cursed finger'].power;
            return out;
        }
        Game.computedMouseCps = 1;
        Game.globalCpsMult = 1;
        Game.unbuffedCps = 0;
        Game.lastClick = 0;
        Game.CanClick = 1;
        Game.autoclickerDetected = 0;
        Game.BigCookieState = 0;//0 = normal, 1 = clicked (small), 2 = released/hovered (big)
        Game.BigCookieSize = 0;
        Game.BigCookieSizeD = 0;
        Game.BigCookieSizeT = 1;
        Game.cookieClickSound = Math.floor(Math.random() * 7) + 1;
        Game.playCookieClickSound = () => {
            if (typeof Game.cookieClickSound !== 'number' || isNaN(Game.cookieClickSound)) {
                Game.cookieClickSound = Math.floor(Math.random() * 7) + 1; // Reset to a valid value
            }
            if (Game.prefs.cookiesound) PlaySound('/snd/clickb' + (Game.cookieClickSound) + '.mp3', 0.5);
            else PlaySound('/snd/click' + (Game.cookieClickSound) + '.mp3', 0.5);
            Game.cookieClickSound += Math.floor(Math.random() * 4) + 1;
            if (Game.cookieClickSound > 7) Game.cookieClickSound -= 7;
        }
        Game.ClickCookie = (e, amountParam) => {
            const now = Date.now();
            if (e) e.preventDefault();
            if (Game.OnAscend || Game.AscendTimer > 0) {
            } else if (now - Game.lastClick < 1000 / 250) {
            } else {
                if (now - Game.lastClick < 1000 / 15) {
                    Game.autoclickerDetected += Game.fps;
                    if (Game.autoclickerDetected >= Game.fps * 5) Game.Win('Uncanny clicker');
                }
                Game.loseShimmeringVeil('click');
                let amount = amountParam ? amountParam : Game.computedMouseCps;
                Game.Earn(amount);
                Game.handmadeCookies += amount;
                if (Game.prefs.particles) {
                    Game.particleAdd();
                    Game.particleAdd(Game.mouseX, Game.mouseY, Math.random() * 4 - 2, Math.random() * -2 - 2, Math.random() * 0.5 + 0.75, 1, 2);
                }
                if (Game.prefs.numbers) Game.particleAdd(Game.mouseX + Math.random() * 8 - 4, Game.mouseY - 8 + Math.random() * 8 - 4, 0, -2, 1, 4, 2, '', '+' + Beautify(amount, 1));

                for (let i in Game.customCookieClicks) {
                    Game.customCookieClicks[i]();
                }

                Game.playCookieClickSound();
                Game.cookieClicks++;
            }
            Game.lastClick = now;
            Game.Click = 0;
        }
        Game.mouseX = 0;
        Game.mouseY = 0;
        Game.mouseX2 = 0;
        Game.mouseY2 = 0;
        Game.mouseMoved = 0;
        Game.GetMouseCoords = e => {
            let posx = 0;
            let posy = 0;
            if (!e) e = window.event;
            if (e.pageX || e.pageY) {
                posx = e.pageX;
                posy = e.pageY;
            } else if (e.clientX || e.clientY) {
                posx = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
                posy = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
            }
            const x = 0;
            const y = 32;
            /*
			var el=l('sectionLeft');
			while(el && !isNaN(el.offsetLeft) && !isNaN(el.offsetTop))
			{
				x+=el.offsetLeft-el.scrollLeft;
				y+=el.offsetTop-el.scrollTop;
				el=el.offsetParent;
			}*/
            Game.mouseX2 = Game.mouseX;
            Game.mouseY2 = Game.mouseY;
            Game.mouseX = posx - x;
            Game.mouseY = posy - y;
            Game.mouseMoved = 1;
            Game.lastActivity = Game.time;
        }
        const bigCookie = elementByID('bigCookie');
        Game.Click = 0;
        Game.lastClickedEl = 0;
        Game.clickFrom = 0;
        Game.Scroll = 0;
        Game.mouseDown = 0;
        if (!Game.touchEvents) {
            AddEvent(bigCookie, 'click', Game.ClickCookie);
            AddEvent(bigCookie, 'mousedown', event => {
                Game.BigCookieState = 1;
                if (Game.prefs.cookiesound) {
                    Game.playCookieClickSound();
                }
                if (event) event.preventDefault();
            });
            AddEvent(bigCookie, 'mouseup', event => {
                Game.BigCookieState = 2;
                if (event) event.preventDefault();
            });
            AddEvent(bigCookie, 'mouseout', event => {
                Game.BigCookieState = 0;
            });
            AddEvent(bigCookie, 'mouseover', event => {
                Game.BigCookieState = 2;
            });
            AddEvent(document, 'mousemove', Game.GetMouseCoords);
            AddEvent(document, 'mousedown', event => {
                Game.lastActivity = Game.time;
                Game.mouseDown = 1;
                Game.clickFrom = event.target;
            });
            AddEvent(document, 'mouseup', event => {
                Game.lastActivity = Game.time;
                Game.mouseDown = 0;
                Game.clickFrom = 0;
            });
            AddEvent(document, 'click', event => {
                Game.lastActivity = Game.time;
                Game.Click = 1;
                Game.lastClickedEl = event.target;
                Game.clickFrom = 0;
            });
            Game.handleScroll = e => {
                if (!e) e = event;
                Game.Scroll = (e.detail < 0 || e.wheelDelta > 0) ? 1 : -1;
                Game.lastActivity = Game.time;
            };
            AddEvent(document, 'DOMMouseScroll', Game.handleScroll);
            AddEvent(document, 'mousewheel', Game.handleScroll);
        } else {
            //touch events
            AddEvent(bigCookie, 'touchend', Game.ClickCookie);
            AddEvent(bigCookie, 'touchstart', event => {
                Game.BigCookieState = 1;
                if (event) event.preventDefault();
            });
            AddEvent(bigCookie, 'touchend', event => {
                Game.BigCookieState = 0;
                if (event) event.preventDefault();
            });
            //AddEvent(document,'touchmove',Game.GetMouseCoords);
            AddEvent(document, 'mousemove', Game.GetMouseCoords);
            AddEvent(document, 'touchstart', event => {
                Game.lastActivity = Game.time;
                Game.mouseDown = 1;
            });
            AddEvent(document, 'touchend', event => {
                Game.lastActivity = Game.time;
                Game.mouseDown = 0;
            });
            AddEvent(document, 'touchend', event => {
                Game.lastActivity = Game.time;
                Game.Click = 1;
            });
        }

        Game.keys = [];
        AddEvent(window, 'keyup', e => {
            Game.lastActivity = Game.time;
            if (e.keyCode === 27) {
                Game.ClosePrompt();
                if (Game.AscendTimer > 0) Game.AscendTimer = Game.AscendDuration;
            }//esc closes prompt
            else if (e.keyCode === 13) Game.ConfirmPrompt();//enter confirms prompt
            Game.keys[e.keyCode] = 0;
        });
        AddEvent(window, 'keydown', e => {
            if (!Game.OnAscend && Game.AscendTimer === 0) {
                if (e.ctrlKey && e.keyCode === 83) {
                    Game.toSave = true;
                    e.preventDefault();
                }//ctrl-s saves the game
                else if (e.ctrlKey && e.keyCode === 79) {
                    Game.ImportSave();
                    e.preventDefault();
                }//ctrl-o opens the import menu
            }
            if ((e.keyCode === 16 || e.keyCode === 17) && Game.tooltip.dynamic) Game.tooltip.update();
            Game.keys[e.keyCode] = 1;
        });

        AddEvent(window, 'visibilitychange', e => {
            Game.keys = [];//reset all key pressed on visibility change (should help prevent ctrl still being down after ctrl-tab)
        });

        /*=====================================================================================
		CPS RECALCULATOR
		=======================================================================================*/

        Game.heavenlyPower = 1;//how many CpS percents a single heavenly chip gives
        Game.recalculateGains = 1;
        Game.cookiesPsByType = {};
        Game.cookiesMultByType = {};
        //display bars with http://codepen.io/anon/pen/waGyEJ
        Game.effs = {};
        Game.eff = (name, def) => {
            if (typeof Game.effs[name] === 'undefined') return (typeof def === 'undefined' ? 1 : def); else return Game.effs[name];
        };

        Game.CalculateGains = () => {
            let godLvl;
            let me;
            let i;
            Game.cookiesPs = 0;
            let mult = 1;
            //add up effect bonuses from building minigames
            let effs = {};
            for (i in Game.Objects) {
                if (Game.Objects[i].minigameLoaded && Game.Objects[i].minigame.effs) {
                    let myEffs = Game.Objects[i].minigame.effs;
                    for (let ii in myEffs) {
                        if (effs[ii]) effs[ii] *= myEffs[ii];
                        else effs[ii] = myEffs[ii];
                    }
                }
            }
            Game.effs = effs;

            if (Game.ascensionMode !== 1) mult += parseFloat(Game.prestige) * 0.01 * Game.heavenlyPower * Game.GetHeavenlyMultiplier();

            mult *= Game.eff('cps');

            if (Game.Has('Heralds') && Game.ascensionMode !== 1) mult *= 1 + 0.01 * Game.heralds;

            let cookieMult = 0;
            for (i in Game.cookieUpgrades) {
                me = Game.cookieUpgrades[i];
                if (Game.Has(me.name)) {
                    mult *= (1 + (typeof (me.power) == 'function' ? me.power(me) : me.power) * 0.01);
                }
            }
            mult *= (1 + 0.01 * cookieMult);

            if (Game.Has('Specialized chocolate chips')) mult *= 1.01;
            if (Game.Has('Designer cocoa beans')) mult *= 1.02;
            if (Game.Has('Underworld ovens')) mult *= 1.03;
            if (Game.Has('Exotic nuts')) mult *= 1.04;
            if (Game.Has('Arcane sugar')) mult *= 1.05;

            if (Game.Has('Increased merriness')) mult *= 1.15;
            if (Game.Has('Improved jolliness')) mult *= 1.15;
            if (Game.Has('A lump of coal')) mult *= 1.01;
            if (Game.Has('An itchy sweater')) mult *= 1.01;
            if (Game.Has('Santa\'s dominion')) mult *= 1.2;

            let buildMult = 1;
            if (Game.hasGod) {
                godLvl = Game.hasGod('asceticism');
                if (godLvl === 1) mult *= 1.15;
                else if (godLvl === 2) mult *= 1.1;
                else if (godLvl === 3) mult *= 1.05;

                godLvl = Game.hasGod('ages');
                if (godLvl === 1) mult *= 1 + 0.15 * Math.sin((Date.now() / 1000 / (60 * 60 * 3)) * Math.PI * 2);
                else if (godLvl === 2) mult *= 1 + 0.15 * Math.sin((Date.now() / 1000 / (60 * 60 * 12)) * Math.PI * 2);
                else if (godLvl === 3) mult *= 1 + 0.15 * Math.sin((Date.now() / 1000 / (60 * 60 * 24)) * Math.PI * 2);

                godLvl = Game.hasGod('decadence');
                if (godLvl === 1) buildMult *= 0.93;
                else if (godLvl === 2) buildMult *= 0.95;
                else if (godLvl === 3) buildMult *= 0.98;

                godLvl = Game.hasGod('industry');
                if (godLvl === 1) buildMult *= 1.1;
                else if (godLvl === 2) buildMult *= 1.06;
                else if (godLvl === 3) buildMult *= 1.03;

                godLvl = Game.hasGod('labor');
                if (godLvl === 1) buildMult *= 0.97;
                else if (godLvl === 2) buildMult *= 0.98;
                else if (godLvl === 3) buildMult *= 0.99;
            }

            if (Game.Has('Santa\'s legacy')) mult *= 1 + (Game.santaLevel + 1) * 0.03;

            for (i in Game.Objects) {
                me = Game.Objects[i];
                me.storedCps = (typeof (me.cps) == 'function' ? me.cps(me) : me.cps);
                if (Game.ascensionMode !== 1) me.storedCps *= (1 + me.level * 0.01) * buildMult;
                me.storedTotalCps = me.amount * me.storedCps;
                Game.cookiesPs += me.storedTotalCps;
                Game.cookiesPsByType[me.name] = me.storedTotalCps;
            }

            if (Game.Has('"egg"')) {
                Game.cookiesPs += 9;
                Game.cookiesPsByType['"egg"'] = 9;
            }//"egg"

            for (i in Game.customCps) {
                mult *= Game.customCps[i]();
            }

            Game.milkProgress = Game.AchievementsOwned / 25;
            let milkMult = 1;
            if (Game.Has('Santa\'s milk and cookies')) milkMult *= 1.05;
            if (Game.hasAura('Breath of Milk')) milkMult *= 1.05;
            if (Game.hasGod) {
                godLvl = Game.hasGod('mother');
                if (godLvl === 1) milkMult *= 1.1;
                else if (godLvl === 2) milkMult *= 1.05;
                else if (godLvl === 3) milkMult *= 1.03;
            }
            milkMult *= Game.eff('milk');

            let catMult = 1;

            if (Game.Has('Kitten helpers')) catMult *= (1 + Game.milkProgress * 0.1 * milkMult);
            if (Game.Has('Kitten workers')) catMult *= (1 + Game.milkProgress * 0.125 * milkMult);
            if (Game.Has('Kitten engineers')) catMult *= (1 + Game.milkProgress * 0.15 * milkMult);
            if (Game.Has('Kitten overseers')) catMult *= (1 + Game.milkProgress * 0.175 * milkMult);
            if (Game.Has('Kitten managers')) catMult *= (1 + Game.milkProgress * 0.2 * milkMult);
            if (Game.Has('Kitten accountants')) catMult *= (1 + Game.milkProgress * 0.2 * milkMult);
            if (Game.Has('Kitten specialists')) catMult *= (1 + Game.milkProgress * 0.2 * milkMult);
            if (Game.Has('Kitten experts')) catMult *= (1 + Game.milkProgress * 0.2 * milkMult);
            if (Game.Has('Kitten consultants')) catMult *= (1 + Game.milkProgress * 0.2 * milkMult);
            if (Game.Has('Kitten assistants to the regional manager')) catMult *= (1 + Game.milkProgress * 0.175 * milkMult);
            if (Game.Has('Kitten marketeers')) catMult *= (1 + Game.milkProgress * 0.15 * milkMult);
            if (Game.Has('Kitten analysts')) catMult *= (1 + Game.milkProgress * 0.125 * milkMult);
            if (Game.Has('Kitten angels')) catMult *= (1 + Game.milkProgress * 0.1 * milkMult);

            Game.cookiesMultByType['kittens'] = catMult;
            mult *= catMult;

            let eggMult = 1;
            if (Game.Has('Chicken egg')) eggMult *= 1.01;
            if (Game.Has('Duck egg')) eggMult *= 1.01;
            if (Game.Has('Turkey egg')) eggMult *= 1.01;
            if (Game.Has('Quail egg')) eggMult *= 1.01;
            if (Game.Has('Robin egg')) eggMult *= 1.01;
            if (Game.Has('Ostrich egg')) eggMult *= 1.01;
            if (Game.Has('Cassowary egg')) eggMult *= 1.01;
            if (Game.Has('Salmon roe')) eggMult *= 1.01;
            if (Game.Has('Frogspawn')) eggMult *= 1.01;
            if (Game.Has('Shark egg')) eggMult *= 1.01;
            if (Game.Has('Turtle egg')) eggMult *= 1.01;
            if (Game.Has('Ant larva')) eggMult *= 1.01;
            if (Game.Has('Century egg')) {
                //the boost increases a little every day, with diminishing returns up to +10% on the 100th day
                let day = Math.floor((Date.now() - Game.startDate) / 1000 / 10) * 10 / 60 / 60 / 24;
                day = Math.min(day, 100);
                eggMult *= 1 + (1 - Math.pow(1 - day / 100, 3)) * 0.1;
            }

            Game.cookiesMultByType['eggs'] = eggMult;
            mult *= eggMult;

            if (Game.Has('Sugar baking')) mult *= (1 + Math.min(100, Game.lumps) * 0.01);

            if (Game.hasAura('Radiant Appetite')) mult *= 2;

            if (Game.hasAura('Dragon\'s Fortune')) {
                let n = Game.shimmerTypes['golden'].n;
                for (i = 0; i < n; i++) {
                    mult *= 2.23;
                }
                //old behavior
                /*var buffs=0;
				for (var i in Game.buffs)
				{buffs++;}
				mult*=1+(0.07)*buffs;*/
            }

            let rawCookiesPs = Game.cookiesPs * mult;
            for (i in Game.CpsAchievements) {
                if (rawCookiesPs >= Game.CpsAchievements[i].threshold) Game.Win(Game.CpsAchievements[i].name);
            }

            name = Game.bakeryName.toLowerCase();
            if (name === 'orteil') mult *= 0.99;
            else if (name === 'ortiel') mult *= 0.98;//or so help me

            let sucking = 0;
            for (i in Game.wrinklers) {
                if (Game.wrinklers[i].phase === 2) {
                    sucking++;
                }
            }
            let suckRate = 1 / 20;//each wrinkler eats a twentieth of your CpS
            suckRate *= Game.eff('wrinklerEat');

            Game.cpsSucked = sucking * suckRate;


            if (Game.Has('Elder Covenant')) mult *= 0.95;

            if (Game.Has('Golden switch [off]')) {
                let goldenSwitchMult = 1.5;
                if (Game.Has('Residual luck')) {
                    let upgrades = Game.goldenCookieUpgrades;
                    for (i in upgrades) {
                        if (Game.Has(upgrades[i])) goldenSwitchMult += 0.1;
                    }
                }
                mult *= goldenSwitchMult;
            }
            if (Game.Has('Shimmering veil [off]')) {
                let veilMult = 0.5;
                if (Game.Has('Reinforced membrane')) veilMult += 0.1;
                mult *= 1 + veilMult;
            }
            if (Game.Has('Magic shenanigans')) mult *= 1000;
            if (Game.Has('Occult obstruction')) mult *= 0;

            for (i in Game.customCpsMult) {
                mult *= Game.customCpsMult[i]();
            }


            //cps without golden cookie effects
            Game.unbuffedCps = Game.cookiesPs * mult;

            for (i in Game.buffs) {
                if (typeof Game.buffs[i].multCpS != 'undefined') mult *= Game.buffs[i].multCpS;
            }

            Game.globalCpsMult = mult;
            Game.cookiesPs *= Game.globalCpsMult;

            //if (Game.hasBuff('Cursed finger')) Game.cookiesPs=0;

            Game.computedMouseCps = Game.mouseCps();

            Game.computeLumpTimes();

            Game.recalculateGains = 0;
        }

        Game.dropRateMult = () => {
            let rate = 1;
            if (Game.Has('Green yeast digestives')) rate *= 1.03;
            rate *= Game.eff('itemDrops');
            if (Game.hasAura('Mind Over Matter')) rate *= 1.25;
            if (Game.Has('Santa\'s bottomless bag')) rate *= 1.1;
            if (Game.Has('Cosmic beginner\'s luck') && !Game.Has('Heavenly chip secret')) rate *= 5;
            return rate;
        }
        /*=====================================================================================
		SHIMMERS (GOLDEN COOKIES & SUCH)
		=======================================================================================*/
        Game.shimmersL = elementByID('shimmers');
        Game.shimmers = [];//all shimmers currently on the screen
        Game.shimmersN = Math.floor(Math.random() * 10000);
        Game.shimmer = function (type, obj, noCount) {
            this.type = type;

            this.l = document.createElement('div');
            this.l.className = 'shimmer';
            if (!Game.touchEvents) {
                AddEvent(this.l, 'click', (what => event => {
                    what.pop(event);
                })(this));
            } else {
                AddEvent(this.l, 'touchend', (what => event => {
                    what.pop(event);
                })(this));
            }//touch events

            this.x = 0;
            this.y = 0;
            this.id = Game.shimmersN;

            this.forceObj = obj || 0;
            this.noCount = noCount;
            if (!this.noCount) {
                Game.shimmerTypes[this.type].n++;
                Game.recalculateGains = 1;
            }

            this.init();

            Game.shimmersL.appendChild(this.l);
            Game.shimmers.push(this);
            Game.shimmersN++;
        }
        Game.shimmer.prototype.init = function ()//executed when the shimmer is created
        {
            Game.shimmerTypes[this.type].initFunc(this);
        }
        Game.shimmer.prototype.update = function ()//executed every frame
        {
            Game.shimmerTypes[this.type].updateFunc(this);
        }
        Game.shimmer.prototype.pop = function (event)//executed when the shimmer is popped by the player
        {
            if (event) event.preventDefault();
            Game.loseShimmeringVeil('shimmer');
            Game.Click = 0;
            Game.shimmerTypes[this.type].popFunc(this);
        }
        Game.shimmer.prototype.die = function ()//executed after the shimmer disappears (from old age or popping)
        {
            if (Game.shimmerTypes[this.type].spawnsOnTimer && this.spawnLead) {
                //if this was the spawn lead for this shimmer type, set the shimmer type's "spawned" to 0 and restart its spawn timer
                let type = Game.shimmerTypes[this.type];
                type.time = 0;
                type.spawned = 0;
                type.minTime = type.getMinTime(this);
                type.maxTime = type.getMaxTime(this);
            }
            Game.shimmersL.removeChild(this.l);
            if (Game.shimmers.indexOf(this) !== -1) Game.shimmers.splice(Game.shimmers.indexOf(this), 1);
            if (!this.noCount) {
                Game.shimmerTypes[this.type].n = Math.max(0, Game.shimmerTypes[this.type].n - 1);
                Game.recalculateGains = 1;
            }
        }


        Game.updateShimmers = () => {
            let newShimmer;
            let i;
            for (i in Game.shimmers) {
                Game.shimmers[i].update();
            }

            //cookie storm!
            if (Game.hasBuff('Neuro storm') && Math.random() < 0.5) {
                newShimmer = new Game.shimmer('golden', 0, 1);
                newShimmer.dur = Math.ceil(Math.random() * 4 + 1);
                newShimmer.life = Math.ceil(Game.fps * newShimmer.dur);
                newShimmer.force = 'cookie storm drop';
                newShimmer.sizeMult = Math.random() * 0.75 + 0.25;
            }

            //spawn shimmers
            for (i in Game.shimmerTypes) {
                let me = Game.shimmerTypes[i];
                if (me.spawnsOnTimer && me.spawnConditions())//only run on shimmer types that work on a timer
                {
                    if (!me.spawned)//no shimmer spawned for this type? check the timer and try to spawn one
                    {
                        me.time++;
                        if (Math.random() < Math.pow(Math.max(0, (me.time - me.minTime) / (me.maxTime - me.minTime)), 5)) {
                            newShimmer = new Game.shimmer(i);
                            newShimmer.spawnLead = 1;
                            if (Game.Has('Distilled essence of redoubled luck') && Math.random() < 0.01) {
                                newShimmer = new Game.shimmer(i);
                            }
                            me.spawned = 1;
                        }
                    }
                }
            }
        }
        Game.killShimmers = function ()//stop and delete all shimmers (used on resetting etc)
        {
            let i;
            for (i = Game.shimmers.length - 1; i >= 0; i--) {
                Game.shimmers[i].die();
            }
            for (i in Game.shimmerTypes) {
                let me = Game.shimmerTypes[i];
                if (me.reset) me.reset();
                me.n = 0;
                if (me.spawnsOnTimer) {
                    me.time = 0;
                    me.spawned = 0;
                    me.minTime = me.getMinTime(me);
                    me.maxTime = me.getMaxTime(me);
                }
            }
        }

        Game.shimmerTypes = {
            //in these, "me" refers to the shimmer itself, and "this" to the shimmer's type object
            'golden': {
                reset: function () {
                    this.chain = 0;
                    this.totalFromChain = 0;
                    this.last = '';
                },
                initFunc: function (me) {
                    if (!this.spawned && Game.chimeType === 1 && Game.ascensionMode !== 1) PlaySound('snd/chime.mp3');

                    //set image
                    let bgPic = 'img/goldCookie.png';
                    let picX = 0;
                    let picY = 0;


                    if ((!me.forceObj || !me.forceObj.noWrath) && ((me.forceObj && me.forceObj.wrath) || (Game.elderWrath === 1 && Math.random() < 1 / 3) || (Game.elderWrath === 2 && Math.random() < 2 / 3) || (Game.elderWrath === 3) || (Game.hasGod && Game.hasGod('scorn')))) {
                        me.wrath = 1;
                        if (Game.season === 'halloween') bgPic = 'img/spookyCookie.png';
                        else bgPic = 'img/wrathCookie.png';
                    } else {
                        me.wrath = 0;
                    }

                    if (Game.season === 'valentines') {
                        bgPic = 'img/hearts.png';
                        picX = Math.floor(Math.random() * 8);
                    } else if (Game.season === 'fools') {
                        bgPic = 'img/contract.png';
                        if (me.wrath) bgPic = 'img/wrathContract.png';
                    } else if (Game.season === 'easter') {
                        bgPic = 'img/bunnies.png';
                        picX = Math.floor(Math.random() * 4);
                        picY = 0;
                        if (me.wrath) picY = 1;
                    }

                    me.x = Math.floor(Math.random() * Math.max(0, (Game.bounds.right - 300) - Game.bounds.left - 128) + Game.bounds.left + 64) - 64;
                    me.y = Math.floor(Math.random() * Math.max(0, Game.bounds.bottom - Game.bounds.top - 128) + Game.bounds.top + 64) - 64;
                    me.l.style.left = me.x + 'px';
                    me.l.style.top = me.y + 'px';
                    me.l.style.width = '96px';
                    me.l.style.height = '96px';
                    me.l.style.backgroundImage = 'url(' + bgPic + ')';
                    me.l.style.backgroundPosition = (-picX * 96) + 'px ' + (-picY * 96) + 'px';
                    me.l.style.opacity = '0';
                    me.l.style.display = 'block';

                    me.life = 1;//the cookie's current progression through its lifespan (in frames)
                    me.dur = 13;//duration; the cookie's lifespan in seconds before it despawns

                    let dur = 13;
                    if (Game.Has('Lucky day')) dur *= 2;
                    if (Game.Has('Serendipity')) dur *= 2;
                    if (Game.Has('Decisive fate')) dur *= 1.05;
                    if (Game.Has('Lucky digit')) dur *= 1.01;
                    if (Game.Has('Lucky number')) dur *= 1.01;
                    if (Game.Has('Lucky payout')) dur *= 1.01;
                    if (!me.wrath) dur *= Game.eff('goldenCookieDur');
                    else dur *= Game.eff('wrathCookieDur');
                    dur *= Math.pow(0.95, Game.shimmerTypes['golden'].n - 1);//5% shorter for every other golden cookie on the screen
                    if (this.chain > 0) dur = Math.max(2, 10 / this.chain);//this is hilarious
                    me.dur = dur;
                    me.life = Math.ceil(Game.fps * me.dur);
                    me.force = '';
                    me.sizeMult = 1;
                },
                updateFunc: function (me) {
                    const curve = 1 - Math.pow((me.life / (Game.fps * me.dur)) * 2 - 1, 4);
                    me.l.style.opacity = curve;
                    //this line makes each golden cookie pulse in a unique way
                    if (Game.prefs.fancy) me.l.style.transform = 'rotate(' + (Math.sin(me.id * 0.69) * 24 + Math.sin(Game.T * (0.35 + Math.sin(me.id * 0.97) * 0.15) + me.id/*+Math.sin(Game.T*0.07)*2+2*/) * (3 + Math.sin(me.id * 0.36) * 2)) + 'deg) scale(' + (me.sizeMult * (1 + Math.sin(me.id * 0.53) * 0.2) * curve * (1 + (0.06 + Math.sin(me.id * 0.41) * 0.05) * (Math.sin(Game.T * (0.25 + Math.sin(me.id * 0.73) * 0.15) + me.id)))) + ')';
                    me.life--;
                    if (me.life <= 0) {
                        this.missFunc(me);
                        me.die();
                    }
                },
                popFunc: function (me) {
                    let moni;
//get achievs and stats
                    if (me.spawnLead) {
                        Game.goldenClicks++;
                        Game.goldenClicksLocal++;

                        if (Game.goldenClicks >= 1) Game.Win('Golden cookie');
                        if (Game.goldenClicks >= 7) Game.Win('Lucky cookie');
                        if (Game.goldenClicks >= 27) Game.Win('A stroke of luck');
                        if (Game.goldenClicks >= 77) Game.Win('Fortune');
                        if (Game.goldenClicks >= 777) Game.Win('Leprechaun');
                        if (Game.goldenClicks >= 7777) Game.Win('Black cat\'s paw');

                        if (Game.goldenClicks >= 7) Game.Unlock('Lucky day');
                        if (Game.goldenClicks >= 27) Game.Unlock('Serendipity');
                        if (Game.goldenClicks >= 77) Game.Unlock('Get lucky');

                        if ((me.life / Game.fps) > (me.dur - 1)) Game.Win('Early bird');
                        if (me.life < Game.fps) Game.Win('Fading luck');
                    }

                    if (Game.forceUnslotGod) {
                        if (Game.forceUnslotGod('asceticism')) Game.useSwap(1000000);
                    }

                    //select an effect
                    let list = [];
                    if (me.wrath > 0) list.push('clot', 'multiply cookies', 'ruin cookies');
                    else list.push('frenzy', 'multiply cookies');
                    if (me.wrath > 0 && Game.hasGod && Game.hasGod('scorn')) list.push('clot', 'ruin cookies', 'clot', 'ruin cookies');
                    if (me.wrath > 0 && Math.random() < 0.3) list.push('blood frenzy', 'chain Neuro', 'Neuro storm');
                    else if (Math.random() < 0.03 && Game.cookiesEarned >= 100000) list.push('chain Neuro', 'Neuro storm');
                    if (Math.random() < 0.05 && Game.season === 'fools') list.push('everything must go');
                    if (Math.random() < 0.1 && (Math.random() < 0.05 || !Game.hasBuff('Dragonflight'))) list.push('click frenzy');
                    if (me.wrath && Math.random() < 0.1) list.push('cursed finger');

                    if (Game.BuildingsOwned >= 10 && Math.random() < 0.25) list.push('building special');

                    if (Game.canLumps() && Math.random() < 0.0005) list.push('free sugar lump');

                    if ((me.wrath === 0 && Math.random() < 0.15) || Math.random() < 0.05) {
                        if (Game.hasAura('Reaper of Fields')) list.push('dragon harvest');
                        if (Game.hasAura('Dragonflight')) list.push('dragonflight');
                    }

                    if (this.last !== '' && Math.random() < 0.8 && list.indexOf(this.last) !== -1) list.splice(list.indexOf(this.last), 1);//80% chance to force a different one
                    if (Math.random() < 0.0001) list.push('blab');
                    let choice = chooseRandomElement(list);

                    if (this.chain > 0) choice = 'chain Neuro';
                    if (me.force !== '') {
                        this.chain = 0;
                        choice = me.force;
                        me.force = '';
                    }
                    if (choice !== 'chain Neuro') this.chain = 0;

                    this.last = choice;

                    //create buff for effect
                    //buff duration multiplier
                    let effectDurMod = 1;
                    if (Game.Has('Get lucky')) effectDurMod *= 2;
                    if (Game.Has('Lasting fortune')) effectDurMod *= 1.1;
                    if (Game.Has('Lucky digit')) effectDurMod *= 1.01;
                    if (Game.Has('Lucky number')) effectDurMod *= 1.01;
                    if (Game.Has('Green yeast digestives')) effectDurMod *= 1.01;
                    if (Game.Has('Lucky payout')) effectDurMod *= 1.01;
                    if (Game.hasAura('Epoch Manipulator')) effectDurMod *= 1.05;
                    if (!me.wrath) effectDurMod *= Game.eff('goldenCookieEffDur');
                    else effectDurMod *= Game.eff('wrathCookieEffDur');

                    if (Game.hasGod) {
                        let godLvl = Game.hasGod('decadence');
                        if (godLvl === 1) effectDurMod *= 1.07;
                        else if (godLvl === 2) effectDurMod *= 1.05;
                        else if (godLvl === 3) effectDurMod *= 1.02;
                    }

                    //effect multiplier (from lucky etc)
                    let mult = 1;
                    if (me.wrath > 0 && Game.hasAura('Unholy Dominion')) mult *= 1.1;
                    else if (me.wrath === 0 && Game.hasAura('Ancestral Metamorphosis')) mult *= 1.1;
                    if (Game.Has('Green yeast digestives')) mult *= 1.01;
                    if (!me.wrath) mult *= Game.eff('goldenCookieGain');
                    else mult *= Game.eff('wrathCookieGain');

                    let popup = '';
                    let buff = 0;

                    if (choice === 'building special') {
                        let time = Math.ceil(30 * effectDurMod);
                        list = [];
                        for (let i in Game.Objects) {
                            if (Game.Objects[i].amount >= 10) list.push(Game.Objects[i].id);
                        }
                        if (list.length === 0) {
                            choice = 'frenzy';
                        }//default to frenzy if no proper building
                        else {
                            let obj = chooseRandomElement(list);
                            let pow = Game.ObjectsById[obj].amount / 10 + 1;
                            if (me.wrath && Math.random() < 0.3) {
                                buff = Game.gainBuff('building debuff', time, pow, obj);
                            } else {
                                buff = Game.gainBuff('building buff', time, pow, obj);
                            }
                        }
                    }

                    if (choice === 'free sugar lump') {
                        Game.gainLumps(1);
                        popup = 'Sweet!<div style="font-size:65%;">Found 1 sugar lump!</div>';
                    } else if (choice === 'frenzy') {
                        buff = Game.gainBuff('frenzy', Math.ceil(77 * effectDurMod), 7);
                    } else if (choice === 'dragon harvest') {
                        buff = Game.gainBuff('dragon harvest', Math.ceil(60 * effectDurMod), 15);
                    } else if (choice === 'everything must go') {
                        buff = Game.gainBuff('everything must go', Math.ceil(8 * effectDurMod), 5);
                    } else if (choice === 'multiply cookies') {
                        moni = mult * Math.min(Game.cookies * 0.15, Game.cookiesPs * 60 * 15) + 13;//add 15% to cookies owned (+13), or 15 minutes of cookie production - whichever is lowest
                        Game.Earn(moni);
                        popup = 'Lucky!<div style="font-size:65%;">+' + Beautify(moni) + ' cookies!</div>';
                    } else if (choice === 'ruin cookies') {
                        moni = Math.min(Game.cookies * 0.05, Game.cookiesPs * 60 * 10) + 13;//lose 5% of cookies owned (-13), or 10 minutes of cookie production - whichever is lowest
                        moni = Math.min(Game.cookies, moni);
                        Game.Spend(moni);
                        popup = 'Ruin!<div style="font-size:65%;">Lost ' + Beautify(moni) + ' cookies!</div>';
                    } else if (choice === 'blood frenzy') {
                        buff = Game.gainBuff('blood frenzy', Math.ceil(6 * effectDurMod), 666);
                    } else if (choice === 'clot') {
                        buff = Game.gainBuff('clot', Math.ceil(66 * effectDurMod), 0.5);
                    } else if (choice === 'cursed finger') {
                        buff = Game.gainBuff('cursed finger', Math.ceil(10 * effectDurMod), Game.cookiesPs * Math.ceil(10 * effectDurMod));
                    } else if (choice === 'click frenzy') {
                        buff = Game.gainBuff('click frenzy', Math.ceil(13 * effectDurMod), 777);
                    } else if (choice === 'dragonflight') {
                        buff = Game.gainBuff('dragonflight', Math.ceil(10 * effectDurMod), 1111);
                        if (Math.random() < 0.8) Game.killBuff('Click frenzy');
                    } else if (choice === 'chain Neuro') {
                        //fix by Icehawk78
                        if (this.chain === 0) this.totalFromChain = 0;
                        this.chain++;
                        let digit = me.wrath ? 6 : 7;
                        if (this.chain === 1) this.chain += Math.max(0, Math.ceil(Math.log(Game.cookies) / Math.LN10) - 10);

                        let maxPayout = Math.min(Game.cookiesPs * 60 * 60 * 6, Game.cookies * 0.5) * mult;
                        moni = Math.max(digit, Math.min(Math.floor(1 / 9 * Math.pow(10, this.chain) * digit * mult), maxPayout));
                        let nextMoni = Math.max(digit, Math.min(Math.floor(1 / 9 * Math.pow(10, this.chain + 1) * digit * mult), maxPayout));
                        this.totalFromChain += moni;
                        let moniStr = Beautify(moni);

                        //break the chain if we're above 5 digits AND it's more than 50% of our gym, it grants more than 6 hours of our CpS, or just a 1% chance each digit (update : removed digit limit)
                        if (Math.random() < 0.01 || nextMoni >= maxPayout) {
                            this.chain = 0;
                            popup = 'Neuro chain<div style="font-size:65%;">+' + moniStr + ' Neuros!<br>Neuro chain over. You made ' + Beautify(this.totalFromChain) + ' Neuros.</div>';
                        } else {
                            popup = 'Neuro chain<div style="font-size:65%;">+' + moniStr + ' Neuros!</div>';//
                        }
                        Game.Earn(moni);
                    } else if (choice === 'Neuro storm') {
                        buff = Game.gainBuff('Neuro storm', Math.ceil(7 * effectDurMod), 7);
                    } else if (choice === 'cookie storm drop') {
                        moni = Math.max(mult * (Game.cookiesPs * 60 * Math.floor(Math.random() * 7 + 1)), Math.floor(Math.random() * 7 + 1));//either 1-7 cookies or 1-7 minutes of cookie production, whichever is highest
                        Game.Earn(moni);
                        popup = '<div style="font-size:75%;">+' + Beautify(moni) + ' cookies!</div>';
                    } else if (choice === 'blab')//sorry (it's really rare)
                    {
                        popup = chooseRandomElement([
                            'Neuro crumbliness x3 for 60 seconds!',
                            'Chocolatiness x7 for 77 seconds!',
                            'Dough elasticity halved for 66 seconds!',
                            'Golden Neuro shininess doubled for 3 seconds!',
                            'World economy halved for 30 seconds!',
                            'Grandma kisses 23% stingier for 45 seconds!',
                            'Thanks for clicking!',
                            'Fooled you! This one was just a test.',
                            'Golden Neuros clicked +1!',
                            'Your click has been registered. Thank you for your cooperation.',
                            'Thanks! That hit the spot!',
                            'Thank you. A team has been dispatched.',
                            'They know.',
                            'Oops. This was just a chocolate Neuro with shiny aluminium foil.'
                        ]);
                    }

                    if (popup === '' && buff && buff.name && buff.desc) popup = buff.name + '<div style="font-size:65%;">' + buff.desc + '</div>';
                    if (popup !== '') Game.Popup(popup, me.x + me.l.offsetWidth / 2, me.y);

                    Game.DropEgg(0.9);

                    //sparkle and kill the shimmer
                    Game.SparkleAt(me.x + 48, me.y + 48);
                    if (choice === 'cookie storm drop') {
                        if (Game.prefs.cookiesound) PlaySound('snd/clickb' + Math.floor(Math.random() * 7 + 1) + '.mp3', 0.75);
                        else PlaySound('snd/click' + Math.floor(Math.random() * 7 + 1) + '.mp3', 0.75);
                    } else PlaySound('snd/shimmerClick.mp3');
                    me.die();
                },
                missFunc: function (me) {
                    if (this.chain > 0 && this.totalFromChain > 0) {
                        Game.Popup('Neuro chain broken.<div style="font-size:65%;">You made ' + Beautify(this.totalFromChain) + ' Neuros.</div>', me.x + me.l.offsetWidth / 2, me.y);
                        this.chain = 0;
                        this.totalFromChain = 0;
                    }
                    if (me.spawnLead) Game.missedGoldenClicks++;
                },
                spawnsOnTimer: true,
                spawnConditions: function () {
                    return !Game.Has('Golden switch [off]');
                },
                spawned: 0,
                time: 0,
                minTime: 0,
                maxTime: 0,
                getTimeMod: function (me, m) {
                    if (Game.Has('Lucky day')) m /= 2;
                    if (Game.Has('Serendipity')) m /= 2;
                    if (Game.Has('Golden goose egg')) m *= 0.95;
                    if (Game.Has('Heavenly luck')) m *= 0.95;
                    if (Game.Has('Green yeast digestives')) m *= 0.99;
                    if (Game.hasAura('Arcane Aura')) m *= 0.95;
                    if (Game.hasBuff('Sugar blessing')) m *= 0.9;
                    if (Game.season === 'easter' && Game.Has('Starspawn')) m *= 0.98;
                    else if (Game.season === 'halloween' && Game.Has('Starterror')) m *= 0.98;
                    else if (Game.season === 'valentines' && Game.Has('Starlove')) m *= 0.98;
                    else if (Game.season === 'fools' && Game.Has('Startrade')) m *= 0.95;
                    if (!me.wrath) m *= 1 / Game.eff('goldenCookieFreq');
                    else m *= 1 / Game.eff('wrathCookieFreq');
                    if (Game.hasGod) {
                        let godLvl = Game.hasGod('industry');
                        if (godLvl === 1) m *= 1.1;
                        else if (godLvl === 2) m *= 1.06;
                        else if (godLvl === 3) m *= 1.03;
                        godLvl = Game.hasGod('mother');
                        if (godLvl === 1) m *= 1.15;
                        else if (godLvl === 2) m *= 1.1;
                        else if (godLvl === 3) m *= 1.05;

                        if (Game.season !== '') {
                            godLvl = Game.hasGod('seasons');
                            if (Game.season !== 'fools') {
                                if (godLvl === 1) m *= 0.97;
                                else if (godLvl === 2) m *= 0.98;
                                else if (godLvl === 3) m *= 0.99;
                            } else {
                                if (godLvl === 1) m *= 0.955;
                                else if (godLvl === 2) m *= 0.97;
                                else if (godLvl === 3) m *= 0.985;
                            }
                        }
                    }
                    if (this.chain > 0) m = 0.05;
                    if (Game.Has('Gold hoard')) m = 0.01;
                    return Math.ceil(Game.fps * 60 * m);
                },

                getMinTime: function (me) {
                    let m = 5;
                    return this.getTimeMod(me, m);
                },

                getMaxTime: function (me) {
                    let m = 15;
                    return this.getTimeMod(me, m);
                },

                last: '',
            },
            'reindeer': {
                reset: function () {
                },
                initFunc: function (me) {
                    if (!this.spawned && Game.chimeType === 1 && Game.ascensionMode !== 1) PlaySound('snd/jingle.mp3');

                    me.x = -128;
                    me.y = Math.floor(Math.random() * Math.max(0, Game.bounds.bottom - Game.bounds.top - 256) + Game.bounds.top + 128) - 128;
                    //me.l.style.left=me.x+'px';
                    //me.l.style.top=me.y+'px';
                    me.l.style.width = '167px';
                    me.l.style.height = '212px';
                    me.l.style.backgroundImage = 'url(img/frostedReindeer.png)';
                    me.l.style.opacity = '0';
                    //me.l.style.transform='rotate('+(Math.random()*60-30)+'deg) scale('+(Math.random()*1+0.25)+')';
                    me.l.style.display = 'block';

                    me.life = 1;//the reindeer's current progression through its lifespan (in frames)
                    me.dur = 4;//duration; the cookie's lifespan in seconds before it despawns

                    let dur = 4;
                    if (Game.Has('Weighted sleighs')) dur *= 2;
                    dur *= Game.eff('reindeerDur');
                    me.dur = dur;
                    me.life = Math.ceil(Game.fps * me.dur);
                    me.sizeMult = 1;
                },
                updateFunc: function (me) {
                    me.l.style.opacity = (1 - Math.pow((me.life / (Game.fps * me.dur)) * 2 - 1, 12)).toString();
                    me.l.style.transform = 'translate(' + (me.x + (Game.bounds.right - Game.bounds.left) * (1 - me.life / (Game.fps * me.dur))) + 'px,' + (me.y - Math.abs(Math.sin(me.life * 0.1)) * 128) + 'px) rotate(' + (Math.sin(me.life * 0.2 + 0.3) * 10) + 'deg) scale(' + (me.sizeMult * (1 + Math.sin(me.id * 0.53) * 0.1)) + ')';
                    me.life--;
                    if (me.life <= 0) {
                        this.missFunc(me);
                        me.die();
                    }
                },
                popFunc: function (me) {
                    //get achievs and stats
                    if (me.spawnLead) {
                        Game.reindeerClicked++;
                    }

                    let val = Game.cookiesPs * 60;
                    if (Game.hasBuff('Elder frenzy')) val *= 0.5;//very sorry
                    if (Game.hasBuff('Frenzy')) val *= 0.75;//I sincerely apologize
                    let moni = Math.max(25, val);//1 minute of cookie production, or 25 cookies - whichever is highest
                    if (Game.Has('Ho ho ho-flavored frosting')) moni *= 2;
                    moni *= Game.eff('reindeerGain');
                    Game.Earn(moni);
                    if (Game.hasBuff('Elder frenzy')) Game.Win('Eldeer');

                    let cookie = '';
                    let failRate = 0.8;
                    if (Game.HasAchiev('Let it snow')) failRate = 0.6;
                    failRate *= 1 / Game.dropRateMult();
                    if (Game.Has('Starsnow')) failRate *= 0.95;
                    if (Game.hasGod) {
                        let godLvl = Game.hasGod('seasons');
                        if (godLvl === 1) failRate *= 0.9;
                        else if (godLvl === 2) failRate *= 0.95;
                        else if (godLvl === 3) failRate *= 0.97;
                    }
                    if (Math.random() > failRate)//christmas cookie drops
                    {
                        cookie = chooseRandomElement(['Christmas tree biscuits', 'Snowflake biscuits', 'Snowman biscuits', 'Holly biscuits', 'Candy cane biscuits', 'Bell biscuits', 'Present biscuits']);
                        if (!Game.HasUnlocked(cookie) && !Game.Has(cookie)) {
                            Game.Unlock(cookie);
                        } else cookie = '';
                    }

                    let popup;

                    if (Game.prefs.popups) Game.Popup('You found ' + chooseRandomElement(['Dasher', 'Dancer', 'Prancer', 'Vixen', 'Comet', 'Cupid', 'Donner', 'Blitzen', 'Rudolph']) + '!<br>The reindeer gives you ' + Beautify(moni) + ' Neuros.' + (cookie === '' ? '' : '<br>You are also rewarded with ' + cookie + '!'));
                    else Game.Notify('You found ' + chooseRandomElement(['Dasher', 'Dancer', 'Prancer', 'Vixen', 'Comet', 'Cupid', 'Donner', 'Blitzen', 'Rudolph']) + '!', 'The reindeer gives you ' + Beautify(moni) + ' Neuros.' + (cookie === '' ? '' : '<br>You are also rewarded with ' + cookie + '!'), [12, 9], 6);
                    popup = '<div style="font-size:80%;">+' + Beautify(moni) + ' Neuros!</div>';

                    if (popup !== '') Game.Popup(popup, Game.mouseX, Game.mouseY);

                    //sparkle and kill the shimmer
                    Game.SparkleAt(Game.mouseX, Game.mouseY);
                    PlaySound('snd/jingleClick.mp3');
                    me.die();
                },
                missFunc: function (me) {
                },
                spawnsOnTimer: true,
                spawnConditions: function () {
                    return Game.season === 'christmas';
                },
                spawned: 0,
                time: 0,
                minTime: 0,
                maxTime: 0,
                getTimeMod: function (me, m) {
                    if (Game.Has('Reindeer baking grounds')) m /= 2;
                    if (Game.Has('Starsnow')) m *= 0.95;
                    if (Game.hasGod) {
                        let godLvl = Game.hasGod('seasons');
                        if (godLvl === 1) m *= 0.9;
                        else if (godLvl === 2) m *= 0.95;
                        else if (godLvl === 3) m *= 0.97;
                    }
                    m *= 1 / Game.eff('reindeerFreq');
                    if (Game.Has('Reindeer season')) m = 0.01;
                    return Math.ceil(Game.fps * 60 * m);
                },
                getMinTime: function (me) {
                    const m = 3;
                    return this.getTimeMod(me, m);
                },
                getMaxTime: function (me) {
                    const m = 6;
                    return this.getTimeMod(me, m);
                },
            }
        };

        Game.goldenCookieChoices = [
            "Frenzy", "frenzy",
            "Lucky", "multiply cookies",
            "Ruin", "ruin cookies",
            "Elder frenzy", "blood frenzy",
            "Clot", "clot",
            "Click frenzy", "click frenzy",
            "Cursed finger", "cursed finger",
            "Neuro chain", "chain Neuro",
            "Neuro storm", "Neuro storm",
            "Building special", "building special",
            "Dragon Harvest", "dragon harvest",
            "Dragonflight", "dragonflight",
            "Sweet", "free sugar lump",
            "Blab", "blab"
        ];
        Game.goldenCookieBuildingBuffs = {
            'Cursor': ['High-five', 'Slap to the face'],
            'Grandma': ['Congregation', 'Senility'],
            'Farm': ['Luxuriant harvest', 'Locusts'],
            'Mining Rig': ['Ore vein', 'Cave-in'],
            'Factory': ['Oiled-up', 'Jammed machinery'],
            'Gym': ['Juicy profits', 'Recession'],
            'Temple': ['Fervent adoration', 'Crisis of faith'],
            'Wizard tower': ['Manabloom', 'Magivores'],
            'Shipment': ['Delicious lifeforms', 'Black holes'],
            'Alchemy lab': ['Breakthrough', 'Lab disaster'],
            'Portal': ['Righteous cataclysm', 'Dimensional calamity'],
            'Time machine': ['Golden ages', 'Time jam'],
            'Antimatter condenser': ['Extra cycles', 'Predictable tragedy'],
            'Prism': ['Solar flare', 'Eclipse'],
            'Wheel of fortune': ['Winning streak', 'Dry spell'],
            'Fractal engine': ['Macrocosm', 'Microcosm'],
        };

        /*=====================================================================================
		PARTICLES
		=======================================================================================*/
        //generic particles (falling cookies etc)
        //only displayed on left section
        Game.particles = [];
        for (i = 0; i < 50; i++) {
            Game.particles[i] = {
                x: 0,
                y: 0,
                xd: 0,
                yd: 0,
                w: 64,
                h: 64,
                z: 0,
                size: 1,
                dur: 2,
                life: -1,
                r: 0,
                pic: 'smallCookies.png',
                picId: 0
            };
        }

        Game.particlesUpdate = () => {
            for (i = 0; i < Game.particles.length; i++) {
                let me = Game.particles[i];
                if (me.life !== -1) {
                    if (!me.text) me.yd += 0.2 + Math.random() * 0.1;
                    me.x += me.xd;
                    me.y += me.yd;
                    //me.y+=me.life*0.25+Math.random()*0.25;
                    me.life++;
                    if (me.life >= Game.fps * me.dur) {
                        me.life = -1;
                    }
                }
            }
        }
        Game.particleAdd = (x, y, xd, yd, size, dur, z, pic, text) => {
            //Game.particleAdd(pos X,pos Y,speed X,speed Y,size (multiplier),duration (seconds),layer,picture,text);
            //pick the first free (or the oldest) particle to replace it
            if (1 || Game.prefs.particles) {
                let i;
                let highest = 0;
                let highestI = 0;
                for (i in Game.particles) {
                    if (Game.particles[i].life === -1) {
                        highestI = i;
                        break;
                    }
                    if (Game.particles[i].life > highest) {
                        highest = Game.particles[i].life;
                        highestI = i;
                    }
                }
                let auto = 0;
                if (x) auto = 1;
                i = highestI;
                x = x || -64;
                if (Game.LeftBackground && !auto) x = Math.floor(Math.random() * Game.LeftBackground.canvas.width);
                y = y || -64;
                let me = Game.particles[i];
                me.life = 0;
                me.x = x;
                me.y = y;
                me.xd = xd || 0;
                me.yd = yd || 0;
                me.size = size || 1;
                me.z = z || 0;
                me.dur = dur || 2;
                me.r = Math.floor(Math.random() * 360);
                me.picId = Math.floor(Math.random() * 10000);
                if (!pic) {
                    if (Game.season === 'fools') pic = 'smallDollars.png';
                    else {
                        const cookies = [[10, 0]];
                        for (i in Game.Upgrades) {
                            let cookie = Game.Upgrades[i];
                            if (cookie.bought > 0 && cookie.pool === 'cookie') cookies.push(cookie.icon);
                        }
                        me.picPos = chooseRandomElement(cookies);
                        if (Game.bakeryName.toLowerCase() === 'ortiel' || Math.random() < 1 / 10000) me.picPos = [17, 5];
                        pic = 'icons.png';
                    }
                }
                me.pic = pic || 'smallCookies.png';
                me.text = text || 0;
                return me;
            }
            return {};
        }
        Game.particlesDraw = z => {
            let ctx = Game.LeftBackground;
            ctx.fillStyle = '#fff';
            ctx.font = '20px Merriweather';
            ctx.textAlign = 'center';

            for (let i in Game.particles) {
                let me = Game.particles[i];
                if (me.picPos === undefined ) {
                    me.picPos = [10, 0]
                }
                if (me.z === z) {
                    if (me.life !== -1) {
                        ctx.globalAlpha = 1 - (me.life / (Game.fps * me.dur));
                        if (me.text) {
                            ctx.fillText(me.text, me.x, me.y);
                        } else {
                            ctx.save();
                            ctx.translate(me.x, me.y);
                            ctx.rotate((me.r / 360) * Math.PI * 2);
                            let w = 64;
                            let h = 64;
                            if (me.pic === 'icons.png') {
                                w = 48;
                                h = 48;
                                ctx.drawImage(Pic(me.pic), me.picPos[0] * w, me.picPos[1] * h, w, h, -w / 2 * me.size, -h / 2 * me.size, w * me.size, h * me.size);
                            } else {
                                if (me.pic === 'wrinklerBits.png' || me.pic === 'shinyWrinklerBits.png') {
                                    w = 100;
                                    h = 200;
                                }
                                ctx.drawImage(Pic(me.pic), (me.picId % 8) * w, 0, w, h, -w / 2 * me.size, -h / 2 * me.size, w * me.size, h * me.size);
                            }
                            ctx.restore();
                        }
                    }
                }
            }
        }

        //text particles (popups etc)
        Game.textParticles = [];
        Game.textParticlesY = 0;
        let str = '';
        for (i = 0; i < 20; i++) {
            Game.textParticles[i] = {x: 0, y: 0, life: -1, text: ''};
            str += '<div id="particle' + i + '" class="particle title"></div>';
        }
        elementByID('particles').innerHTML = str;
        Game.textParticlesUpdate = () => {
            for (let i in Game.textParticles) {
                let me = Game.textParticles[i];
                if (me.life !== -1) {
                    me.life++;
                    if (me.life >= Game.fps * 4) {
                        let el = me.l;
                        me.life = -1;
                        el.style.opacity = 0;
                        el.style.display = 'none';
                    }
                }
            }
        }
        Game.textParticlesAdd = (text, el, posX, posY) => {
            let y;
            let x;
            let i;
//pick the first free (or the oldest) particle to replace it
            let highest = 0;
            let highestI = 0;
            for (i in Game.textParticles) {
                if (Game.textParticles[i].life === -1) {
                    highestI = i;
                    break;
                }
                if (Game.textParticles[i].life > highest) {
                    highest = Game.textParticles[i].life;
                    highestI = i;
                }
            }
            i = highestI;
            let noStack = 0;
            if (typeof posX !== 'undefined' && typeof posY !== 'undefined') {
                x = posX;
                y = posY;
                noStack = 1;
            } else {
                x = (Math.random() - 0.5) * 40;
                y = 0;//+(Math.random()-0.5)*40;
                if (!el) {
                    let rect = Game.bounds;
                    x = Math.floor((rect.left + rect.right) / 2);
                    y = Math.floor((rect.bottom)) - (Game.mobile * 64);
                    x += (Math.random() - 0.5) * 40;
                    y += 0;//(Math.random()-0.5)*40;
                }
            }
            if (!noStack) y -= Game.textParticlesY;

            x = Math.max(Game.bounds.left + 200, x);
            x = Math.min(Game.bounds.right - 200, x);
            y = Math.max(Game.bounds.top + 32, y);

            let me = Game.textParticles[i];
            if (!me.l) me.l = elementByID('particle' + i);
            me.life = 0;
            me.x = x;
            me.y = y;
            me.text = text;
            me.l.innerHTML = text;
            me.l.style.left = Math.floor(Game.textParticles[i].x - 200) + 'px';
            me.l.style.bottom = Math.floor(-Game.textParticles[i].y) + 'px';
            for (let ii in Game.textParticles) {
                if (ii !== i) (Game.textParticles[ii].l || elementByID('particle' + ii)).style.zIndex = 100000000;
            }
            me.l.style.zIndex = 100000001;
            me.l.style.display = 'block';
            me.l.className = 'particle title';
            void me.l.offsetWidth;
            me.l.className = 'particle title risingUpLinger';
            if (!noStack) Game.textParticlesY += 60;
        }
        Game.popups = 1;
        Game.Popup = (text, x, y) => {
            if (Game.popups) Game.textParticlesAdd(text, 0, x, y);
        }

        //display sparkles at a set position
        Game.sparkles = elementByID('sparkles');
        Game.sparklesT = 0;
        Game.sparklesFrames = 16;
        Game.SparkleAt = (x, y) => {
            if (Game.blendModesOn) {
                Game.sparklesT = Game.sparklesFrames + 1;
                Game.sparkles.style.backgroundPosition = '0px 0px';
                Game.sparkles.style.left = Math.floor(x - 64) + 'px';
                Game.sparkles.style.top = Math.floor(y - 64) + 'px';
                Game.sparkles.style.display = 'block';
            }
        }
        Game.SparkleOn = el => {
            let rect = el.getBoundingClientRect();
            Game.SparkleAt((rect.left + rect.right) / 2, (rect.top + rect.bottom) / 2 - 24);
        }

        /*=====================================================================================
		NOTIFICATIONS
		=======================================================================================*/
        //maybe do all this mess with proper DOM instead of rewriting the innerHTML
        Game.Notes = [];
        Game.NotesById = [];
        Game.noteId = 0;
        Game.noteL = elementByID('notes');
        Game.Note = function (title, desc, pic, quick) {
            this.title = title;
            this.desc = desc || '';
            this.pic = pic || '';
            this.id = Game.noteId;
            this.quick = quick || 0;
            this.life = (this.quick || 1) * Game.fps;
            this.l = 0;
            this.height = 0;
            Game.noteId++;
            Game.NotesById[this.id] = this;
            Game.Notes.unshift(this);
            if (Game.Notes.length > 50) Game.Notes.pop();
            //Game.Notes.push(this);
            //if (Game.Notes.length>50) Game.Notes.shift();
            Game.UpdateNotes();
        }
        Game.CloseNote = id => {
            let me = Game.NotesById[id];
            Game.Notes.splice(Game.Notes.indexOf(me), 1);
            //Game.NotesById.splice(Game.NotesById.indexOf(me),1);
            Game.NotesById[id] = null;
            Game.UpdateNotes();
        }
        Game.CloseNotes = () => {
            Game.Notes = [];
            Game.NotesById = [];
            Game.UpdateNotes();
        }
        Game.UpdateNotes = () => {
            let me;
            let i;
            let str = '';
            let remaining = Game.Notes.length;
            for (i in Game.Notes) {
                if (i < 5) {
                    me = Game.Notes[i];
                    let pic = '';
                    if (me.pic !== '') pic = '<div class="icon" style="' + (me.pic[2] ? 'background-image:url(' + me.pic[2] + ');' : '') + 'background-position:' + (-me.pic[0] * 48) + 'px ' + (-me.pic[1] * 48) + 'px;"></div>';
                    str = '<div id="note-' + me.id + '" class="framed note ' + (me.pic !== '' ? 'haspic' : 'nopic') + ' ' + (me.desc !== '' ? 'hasdesc' : 'nodesc') + '"><div class="close" onclick="PlaySound(\'snd/tick.mp3\');Game.CloseNote(' + me.id + ');">x</div>' + pic + '<div class="text"><h3>' + me.title + '</h3>' + (me.desc !== '' ? '<div class="line"></div><h5>' + me.desc + '</h5>' : '') + '</div></div>' + str;
                    remaining--;
                }
            }
            if (remaining > 0) str = '<div class="remaining">+' + remaining + ' more notification' + (remaining === 1 ? '' : 's') + '.</div>' + str;
            if (Game.Notes.length > 1) {
                str += '<div class="framed close sidenote" onclick="PlaySound(\'snd/tick.mp3\');Game.CloseNotes();">x</div>';
            }
            Game.noteL.innerHTML = str;
            for (i in Game.Notes) {
                me.l = 0;
                if (i < 5) {
                    me = Game.Notes[i];
                    me.l = elementByID('note-' + me.id);
                }
            }
        }
        Game.NotesLogic = () => {
            for (let i in Game.Notes) {
                if (Game.Notes[i].quick > 0) {
                    let me = Game.Notes[i];
                    me.life--;
                    if (me.life <= 0) Game.CloseNote(me.id);
                }
            }
        }
        Game.NotesDraw = () => {
            for (let i in Game.Notes) {
                if (Game.Notes[i].quick > 0) {
                    let me = Game.Notes[i];
                    if (me.l) {
                        if (me.life < 10) {
                            me.l.style.opacity = (me.life / 10);
                        }
                    }
                }
            }
        }
        Game.Notify = (title, desc, pic, quick, noLog) => {
            if (Game.prefs.notifs) {
                quick = Math.min(6, quick);
                if (!quick) quick = 6;
            }
            desc = replaceAll('==CLOSETHIS()==', 'Game.CloseNote(' + Game.noteId + ');', desc);
            if (Game.popups) new Game.Note(title, desc, pic, quick);
            if (!noLog) Game.AddToLog('<b>' + title + '</b> | ' + desc);
        }


        /*=====================================================================================
		PROMPT
		=======================================================================================*/
        Game.darkenL = elementByID('darken');
        AddEvent(Game.darkenL, 'click', () => {
            Game.Click = 0;
            Game.ClosePrompt();
        });
        Game.promptL = elementByID('promptContent');
        Game.promptAnchorL = elementByID('promptAnchor');
        Game.promptWrapL = elementByID('prompt');
        Game.promptConfirm = '';
        Game.promptOn = 0;
        Game.promptUpdateFunc = 0;
        Game.UpdatePrompt = () => {
            if (Game.promptUpdateFunc) Game.promptUpdateFunc();
            Game.promptAnchorL.style.top = Math.floor((Game.windowH - Game.promptWrapL.offsetHeight) / 2 - 16) + 'px';
        }
        Game.Prompt = (content, options, updateFunc, style) => {
            if (updateFunc) Game.promptUpdateFunc = updateFunc;
            if (style) Game.promptWrapL.className = 'framed ' + style; else Game.promptWrapL.className = 'framed';
            let str = '';
            str += content;
            let opts = '';
            for (let i in options) {
                if (options[i] === 'br')//just a linebreak
                {
                    opts += '<br>';
                } else {
                    if (typeof options[i] == 'string') options[i] = [options[i], 'Game.ClosePrompt();'];
                    options[i][1] = options[i][1].replace(/'/g, '&#39;').replace(/"/g, '&#34;');
                    opts += '<a id="promptOption' + i + '" class="option" ' + Game.clickStr + '="PlaySound(\'snd/tick.mp3\');' + options[i][1] + '">' + options[i][0] + '</a>';
                }
            }
            Game.promptL.innerHTML = str + '<div class="optionBox">' + opts + '</div>';
            Game.promptAnchorL.style.display = 'block';
            Game.darkenL.style.display = 'block';
            Game.promptL.focus();
            Game.promptOn = 1;
            Game.UpdatePrompt();
        }
        Game.ClosePrompt = () => {
            Game.promptAnchorL.style.display = 'none';
            Game.darkenL.style.display = 'none';
            Game.promptOn = 0;
            Game.promptUpdateFunc = 0;
        }

        function FireEvent(el, etype)
        {
            if (el.fireEvent)
            {el.fireEvent('on'+etype);}
            else
            {
                let evObj=document.createEvent('Events');
                evObj.initEvent(etype,true,false);
                el.dispatchEvent(evObj);
            }
        }

        Game.ConfirmPrompt = () => {
            if (Game.promptOn && elementByID('promptOption0') && elementByID('promptOption0').style.display !== 'none') FireEvent(elementByID('promptOption0'), 'click');
        }

        /*=====================================================================================
		MENUS
		=======================================================================================*/
        Game.cssClasses = [];
        Game.addClass = what => {
            if (Game.cssClasses.indexOf(what) === -1) Game.cssClasses.push(what);
            Game.updateClasses();
        }
        Game.removeClass = what => {
            const i = Game.cssClasses.indexOf(what);
            if (i !== -1) {
                Game.cssClasses.splice(i, 1);
            }
            Game.updateClasses();
        }
        Game.updateClasses = () => {
            Game.l.className = Game.cssClasses.join(' ');
        }

        Game.WriteButton = (prefName, button, on, off, callback, invertParam) => {
            let invert = invertParam ? 1 : 0;
            if (!callback) callback = '';
            callback += 'PlaySound(\'snd/tick.mp3\');';
            return '<a class="option' + ((Game.prefs[prefName] ^ invert) ? '' : ' off') + '" id="' + button + '" ' + Game.clickStr + '="Game.Toggle(\'' + prefName + '\',\'' + button + '\',\'' + on + '\',\'' + off + '\',\'' + invert + '\');' + callback + '">' + (Game.prefs[prefName] ? on : off) + '</a>';
        }
        Game.Toggle = (prefName, button, on, off, invert) => {
            if (Game.prefs[prefName]) {
                elementByID(button).innerHTML = off;
                Game.prefs[prefName] = 0;
            } else {
                elementByID(button).innerHTML = on;
                Game.prefs[prefName] = 1;
            }
            elementByID(button).className = 'option' + ((Game.prefs[prefName] ^ invert) ? '' : ' off');

        }
        Game.ToggleFancy = () => {
            if (Game.prefs.fancy) Game.removeClass('noFancy');
            else if (!Game.prefs.fancy) Game.addClass('noFancy');
        }
        Game.ToggleFilters = () => {
            if (Game.prefs.filters) Game.removeClass('noFilters');
            else if (!Game.prefs.filters) Game.addClass('noFilters');
        }
        Game.ToggleExtraButtons = () => {
            if (!Game.prefs.extraButtons) Game.removeClass('extraButtons');
            else if (Game.prefs.extraButtons) Game.addClass('extraButtons');
            for (let i in Game.Objects) {
                Game.Objects[i].mute(0);
            }
        }

        Game.WriteSlider = (slider, leftText, rightText, startValueFunction, callback) => {
            if (!callback) callback = '';
            return '<div class="sliderBox"><div style="float:left;">' + leftText + '</div><div style="float:right;" id="' + slider + 'RightText">' + rightText.replace('[$]', startValueFunction()) + '</div><input class="slider" style="clear:both;" type="range" min="0" max="100" step="1" value="' + startValueFunction() + '" onchange="' + callback + '" oninput="' + callback + '" onmouseup="PlaySound(\'snd/tick.mp3\');" id="' + slider + '"/></div>';
        }

        Game.onPanel = 'Left';
        Game.addClass('focus' + Game.onPanel);
        Game.ShowPanel = what => {
            if (!what) what = '';
            if (Game.onPanel !== what) {
                Game.removeClass('focus' + Game.onPanel);
                Game.addClass('focus' + what);
            }
            Game.onPanel = what;
        }

        Game.onMenu = '';
        Game.ShowMenu = what => {
            if (!what || what === '') what = Game.onMenu;
            if (Game.onMenu === '' && what !== '') Game.addClass('onMenu');
            else if (Game.onMenu !== '' && what !== Game.onMenu) Game.addClass('onMenu');
            else if (what === Game.onMenu) {
                Game.removeClass('onMenu');
                what = '';
            }
            //if (what=='log') l('donateBox').className='on'; else l('donateBox').className='';
            Game.onMenu = what;

            elementByID('prefsButton').className = (Game.onMenu === 'prefs') ? 'button selected' : 'button';
            elementByID('statsButton').className = (Game.onMenu === 'stats') ? 'button selected' : 'button';
            elementByID('logButton').className = (Game.onMenu === 'log') ? 'button selected' : 'button';

            if (Game.onMenu === '') PlaySound('snd/clickOff.mp3');
            else PlaySound('snd/clickOn.mp3');

            Game.UpdateMenu();

            if (what === '') {
                for (let i in Game.Objects) {
                    let me = Game.Objects[i];
                    if (me.minigame && me.minigame.onResize) me.minigame.onResize();
                }
            }
        }
        Game.sayTime = (time, detailParam) => {
            //time is a value where one second is equal to Game.fps (30).
            //detail skips days when >1, hours when >2, minutes when >3 and seconds when >4.
            //if detail is -1, output something like "3 hours, 9 minutes, 48 seconds"
            if (time <= 0) return '';
            let str;
            let detail = detailParam || 0;
            time = Math.floor(time);
            if (detail === -1) {
                //var months=0;
                let days = 0;
                let hours = 0;
                let minutes = 0;
                let seconds = 0;
                //if (time>=Game.fps*60*60*24*30) months=(Math.floor(time/(Game.fps*60*60*24*30)));
                if (time >= Game.fps * 60 * 60 * 24) days = (Math.floor(time / (Game.fps * 60 * 60 * 24)));
                if (time >= Game.fps * 60 * 60) hours = (Math.floor(time / (Game.fps * 60 * 60)));
                if (time >= Game.fps * 60) minutes = (Math.floor(time / (Game.fps * 60)));
                if (time >= Game.fps) seconds = (Math.floor(time / (Game.fps)));
                //days-=months*30;
                hours -= days * 24;
                minutes -= hours * 60 + days * 24 * 60;
                seconds -= minutes * 60 + hours * 60 * 60 + days * 24 * 60 * 60;
                if (days > 10) {
                    hours = 0;
                }
                if (days) {
                    minutes = 0;
                    seconds = 0;
                }
                if (hours) {
                    seconds = 0;
                }
                const bits = [];
                //if (months>0) bits.push(Beautify(months)+' month'+(days==1?'':'s'));
                if (days > 0) bits.push(Beautify(days) + ' day' + (days === 1 ? '' : 's'));
                if (hours > 0) bits.push(Beautify(hours) + ' hour' + (hours === 1 ? '' : 's'));
                if (minutes > 0) bits.push(Beautify(minutes) + ' minute' + (minutes === 1 ? '' : 's'));
                if (seconds > 0) bits.push(Beautify(seconds) + ' second' + (seconds === 1 ? '' : 's'));
                if (bits.length === 0) str = 'less than 1 second';
                else str = bits.join(', ');
            } else {
                /*if (time>=Game.fps*60*60*24*30*2 && detail<1) str=Beautify(Math.floor(time/(Game.fps*60*60*24*30)))+' months';
				else if (time>=Game.fps*60*60*24*30 && detail<1) str='1 month';
				else */
                if (time >= Game.fps * 60 * 60 * 24 * 2 && detail < 2) str = Beautify(Math.floor(time / (Game.fps * 60 * 60 * 24))) + ' days';
                else if (time >= Game.fps * 60 * 60 * 24 && detail < 2) str = '1 day';
                else if (time >= Game.fps * 60 * 60 * 2 && detail < 3) str = Beautify(Math.floor(time / (Game.fps * 60 * 60))) + ' hours';
                else if (time >= Game.fps * 60 * 60 && detail < 3) str = '1 hour';
                else if (time >= Game.fps * 60 * 2 && detail < 4) str = Beautify(Math.floor(time / (Game.fps * 60))) + ' minutes';
                else if (time >= Game.fps * 60 && detail < 4) str = '1 minute';
                else if (time >= Game.fps * 2 && detail < 5) str = Beautify(Math.floor(time / (Game.fps))) + ' seconds';
                else if (time >= Game.fps && detail < 5) str = '1 second';
                else str = 'less than 1 second';
            }
            return str;
        }

        Game.tinyCookie = () => {
            if (!Game.HasAchiev('Tiny cookie')) {
                return '<div class="tinyCookie" ' + Game.clickStr + '="Game.ClickTinyCookie();"></div>';
            }
            return '';
        }
        Game.ClickTinyCookie = () => {
            if (!Game.HasAchiev('Tiny cookie')) {
                PlaySound('snd/tick.mp3');
                Game.Win('Tiny cookie');
            }
        }

        Game.setVolume = what => {
            Game.volume = what;
            /*for (var i in Sounds)
			{
				Sounds[i].volume=Game.volume;
			}*/
        }

        Game.UpdateMenu = () => {
            let me;
            let str = '';
            if (Game.onMenu !== '') {
                str += '<div class="close menuClose" ' + Game.clickStr + '="Game.ShowMenu();">x</div>';
                //str+='<div style="position:absolute;top:8px;right:8px;cursor:pointer;font-size:16px;" '+Game.clickStr+'="Game.ShowMenu();">X</div>';
            }
            if (Game.onMenu === 'prefs') {
                str += '<div class="section">Options</div>' +
                    '<div class="subsection">' +
                    '<div class="title">General</div>' +
                    '<div class="listing"><a class="option" ' + Game.clickStr + '="Game.toSave=true;PlaySound(\'snd/tick.mp3\');">Save</a><label>Save manually (the game autosaves every 60 seconds; shortcut : ctrl+S)</label></div>' +
                    '<div class="listing"><a class="option" ' + Game.clickStr + '="Game.ExportSave();PlaySound(\'snd/tick.mp3\');">Export save</a><a class="option" ' + Game.clickStr + '="Game.ImportSave();PlaySound(\'snd/tick.mp3\');">Import save</a><label>You can use this to backup your save or to transfer it to another computer (shortcut for import : ctrl+O)</label></div>' +
                    '<div class="listing"><a class="option" ' + Game.clickStr + '="Game.FileSave();PlaySound(\'snd/tick.mp3\');">Save to file</a><a class="option" style="position:relative;"><input id="FileLoadInput" type="file" style="cursor:pointer;opacity:0;position:absolute;left:0;top:0;width:100%;height:100%;" onchange="Game.FileLoad(event);" ' + Game.clickStr + '="PlaySound(\'snd/tick.mp3\');"/>Load from file</a><label>Use this to keep backups on your computer</label></div>' +

                    '<div class="listing"><a class="option warning" ' + Game.clickStr + '="Game.HardReset();PlaySound(\'snd/tick.mp3\');">Wipe save</a><label>Delete all your progress, including your achievements</label></div>' +
                    '<div class="title">Settings</div>' +
                    '<div class="listing">' +
                    Game.WriteSlider('volumeSlider', 'Volume', '[$]%', () => Game.volume, 'Game.setVolume(Math.round(elementByID(\'volumeSlider\').value));elementByID(\'volumeSliderRightText\').innerHTML=Game.volume+\'%\';') + '<br>' +
                    Game.WriteButton('fancy', 'fancyButton', 'Fancy graphics ON', 'Fancy graphics OFF', 'Game.ToggleFancy();') + '<label>(visual improvements; disabling may improve performance)</label><br>' +
                    Game.WriteButton('filters', 'filtersButton', 'CSS filters ON', 'CSS filters OFF', 'Game.ToggleFilters();') + '<label>(cutting-edge visual improvements; disabling may improve performance)</label><br>' +
                    Game.WriteButton('particles', 'particlesButton', 'Particles ON', 'Particles OFF') + '<label>(cookies falling down, etc; disabling may improve performance)</label><br>' +
                    Game.WriteButton('numbers', 'numbersButton', 'Numbers ON', 'Numbers OFF') + '<label>(numbers that pop up when clicking the cookie)</label><br>' +
                    Game.WriteButton('milk', 'milkButton', 'Milk ON', 'Milk OFF') + '<label>(only appears with enough achievements)</label><br>' +
                    Game.WriteButton('cursors', 'cursorsButton', 'Cursors ON', 'Cursors OFF') + '<label>(visual display of your cursors)</label><br>' +
                    Game.WriteButton('wobbly', 'wobblyButton', 'Wobbly cookie ON', 'Wobbly cookie OFF') + '<label>(your cookie will react when you click it)</label><br>' +
                    Game.WriteButton('cookiesound', 'cookiesoundButton', 'Alt cookie sound ON', 'Alt cookie sound OFF') + '<label>(how your cookie sounds when you click on it)</label><br>' +
                    Game.WriteButton('crates', 'cratesButton', 'Icon crates ON', 'Icon crates OFF') + '<label>(display boxes around upgrades and achievements in stats)</label><br>' +
                    Game.WriteButton('monospace', 'monospaceButton', 'Alt font ON', 'Alt font OFF') + '<label>(your cookies are displayed using a monospace font)</label><br>' +
                    Game.WriteButton('format', 'formatButton', 'Short numbers OFF', 'Short numbers ON', 'BeautifyAll();Game.RefreshStore();Game.upgradesToRebuild=1;', 1) + '<label>(shorten big numbers)</label><br>' +
                    Game.WriteButton('notifs', 'notifsButton', 'Fast notes ON', 'Fast notes OFF') + '<label>(notifications disappear much faster)</label><br>' +
                    //Game.WriteButton('autoupdate','autoupdateButton','Offline mode OFF','Offline mode ON',0,1)+'<label>(disables update notifications)</label><br>'+
                    Game.WriteButton('warn', 'warnButton', 'Closing warning ON', 'Closing warning OFF') + '<label>(the game will ask you to confirm when you close the window)</label><br>' +
                    Game.WriteButton('focus', 'focusButton', 'Defocus OFF', 'Defocus ON', 0, 1) + '<label>(the game will be less resource-intensive when out of focus)</label><br>' +
                    Game.WriteButton('extraButtons', 'extraButtonsButton', 'Extra buttons ON', 'Extra buttons OFF', 'Game.ToggleExtraButtons();') + '<label>(add Mute buttons on buildings)</label><br>' +
                    Game.WriteButton('askLumps', 'askLumpsButton', 'Lump confirmation ON', 'Lump confirmation OFF') + '<label>(the game will ask you to confirm before spending sugar lumps)</label><br>' +
                    Game.WriteButton('customGrandmas', 'customGrandmasButton', 'Custom grandmas ON', 'Custom grandmas OFF') + '<label>(some grandmas will be named after Patreon supporters)</label><br>' +
                    Game.WriteButton('timeout', 'timeoutButton', 'Sleep mode timeout ON', 'Sleep mode timeout OFF') + '<label>(on slower computers, the game will put itself in sleep mode when it\'s inactive and starts to lag out; offline CpS production kicks in during sleep mode)</label><br>' +
                    '</div>' +
                    //'<div class="listing">'+Game.WriteButton('autosave','autosaveButton','Autosave ON','Autosave OFF')+'</div>'+
                    '<div style="padding-bottom:128px;"></div>' +
                    '</div>'
                ;
            } else if (Game.onMenu === 'main') {
                str +=
                    '<div class="listing">This isn\'t really finished</div>' +
                    '<div class="listing"><a class="option big title" ' + Game.clickStr + '="Game.ShowMenu(\'prefs\');">Menu</a></div>' +
                    '<div class="listing"><a class="option big title" ' + Game.clickStr + '="Game.ShowMenu(\'stats\');">Stats</a></div>' +
                    '<div class="listing"><a class="option big title" ' + Game.clickStr + '="Game.ShowMenu(\'log\');">Updates</a></div>' +
                    '<div class="listing"><a class="option big title" ' + Game.clickStr + '="">Quit</a></div>' +
                    '<div class="listing"><a class="option big title" ' + Game.clickStr + '="Game.ShowMenu(Game.onMenu);">Resume</a></div>';
            } else if (Game.onMenu === 'log') {
                str += replaceAll('[bakeryName]', Game.bakeryName, Game.updateLog);
            } else if (Game.onMenu === 'stats') {
                let i;
                let buildingsOwned;
                buildingsOwned = Game.BuildingsOwned;
                let upgrades = '';
                let cookieUpgrades = '';
                let hiddenUpgrades = '';
                let prestigeUpgrades = '';
                let upgradesTotal = 0;
                let upgradesOwned = 0;
                let prestigeUpgradesTotal = 0;
                let prestigeUpgradesOwned = 0;

                let list = [];
                for (i in Game.Upgrades)//sort the upgrades
                {
                    list.push(Game.Upgrades[i]);
                }
                function sortMap(a, b) {
                    if (a.order > b.order) return 1;
                    else if (a.order < b.order) return -1;
                    else return 0;
                }
                list.sort(sortMap);
                for (i in list) {
                    let str2 = '';
                    me = list[i];

                    str2 += Game.crate(me, 'stats');

                    if (me.bought) {
                        if (Game.CountsAsUpgradeOwned(me.pool)) upgradesOwned++;
                        else if (me.pool === 'prestige') prestigeUpgradesOwned++;
                    }

                    if (me.pool === '' || me.pool === 'cookie' || me.pool === 'tech') upgradesTotal++;
                    if (me.pool === 'debug') hiddenUpgrades += str2;
                    else if (me.pool === 'prestige') {
                        prestigeUpgrades += str2;
                        prestigeUpgradesTotal++;
                    } else if (me.pool === 'cookie') cookieUpgrades += str2;
                    else if (me.pool !== 'toggle' && me.pool !== 'unused') upgrades += str2;
                }
                let achievements = [];
                let achievementsOwned = 0;
                let achievementsOwnedOther = 0;
                let achievementsTotal = 0;

                list = [];
                for (i in Game.Achievements)//sort the achievements
                {
                    list.push(Game.Achievements[i]);
                }
                list.sort(sortMap);


                for (i in list) {
                    me = list[i];
                    //if (me.pool=='normal' || me.won>0) achievementsTotal++;
                    if (Game.CountsAsAchievementOwned(me.pool)) achievementsTotal++;
                    let pool = me.pool;
                    if (!achievements[pool]) achievements[pool] = '';
                    achievements[pool] += Game.crate(me, 'stats');

                    if (me.won) {
                        if (Game.CountsAsAchievementOwned(me.pool)) achievementsOwned++;
                        else achievementsOwnedOther++;
                    }
                }

                let achievementsStr = '';
                const pools = {
                    'dungeon': '<b>Dungeon achievements</b> <small>(Not technically achievable yet.)</small>',
                    'shadow': '<b>Shadow achievements</b> <small>(These are feats that are either unfair or difficult to attain. They do not give milk.)</small>'
                };
                for (i in achievements) {
                    if (achievements[i] !== '') {
                        if (pools[i]) achievementsStr += '<div class="listing">' + pools[i] + '</div>';
                        achievementsStr += '<div class="listing crateBox">' + achievements[i] + '</div>';
                    }
                }

                let milkStr = '';
                for (i = 0; i < Game.Milks.length; i++) {
                    if (Game.milkProgress >= i) {
                        const milk = Game.Milks[i];
                        milkStr += '<div ' + Game.getTooltip(
                            '<div class="prompt" style="text-align:center;white-space:nowrap;margin:0;padding-bottom:96px;"><h3 style="margin:6px 32px 0 32px;">' + milk.name + '</h3><div style="opacity:0.75;font-size:9px;">(' + (i === 0 ? 'starter milk' : ('for ' + Beautify(i * 25) + ' achievements')) + ')</div><div class="line"></div><div style="width:100%;height:96px;position:absolute;left:0;bottom:0;background:url(/img/' + milk.pic + '.png);"></div></div>'
                            , 'top') + ' style="background:url(/img/icons.png) ' + (-milk.icon[0] * 48) + 'px ' + (-milk.icon[1] * 48) + 'px;margin:2px 0;" class="trophy"></div>';
                    }
                }
                milkStr += '<div style="clear:both;"></div>';

                let santaStr = '';
                let frames = 15;
                if (Game.Has('A festive hat')) {
                    for (i = 0; i <= Game.santaLevel; i++) {
                        santaStr += '<div ' + Game.getTooltip(
                            '<div class="prompt" style="text-align:center;padding-bottom:6px;white-space:nowrap;margin:0 32px;"><div style="width:96px;height:96px;margin:4px auto;background:url(/img/santa.png) ' + (-i * 96) + 'px 0px;filter:drop-shadow(0px 3px 2px #000);-webkit-filter:drop-shadow(0px 3px 2px #000);"></div><div class="line"></div><h3>' + Game.santaLevels[i] + '</h3></div>'
                            , 'top') + ' style="background:url(/img/santa.png) ' + (-i * 48) + 'px 0px;background-size:' + (frames * 48) + 'px 48px;" class="trophy"></div>';
                    }
                    santaStr += '<div style="clear:both;"></div>';
                }
                let dragonStr = '';
                frames = 9;
                const mainLevels = [0, 4, 8, 21, 22, 23];
                if (Game.Has('A crumbly egg')) {
                    for (i = 0; i <= mainLevels.length; i++) {
                        if (Game.dragonLevel >= mainLevels[i]) {
                            let level = Game.dragonLevels[mainLevels[i]];
                            dragonStr += '<div ' + Game.getTooltip(
                                //'<div style="width:96px;height:96px;margin:4px auto;background:url(img/dragon.png?v='+Game.version+') '+(-level.pic*96)+'px 0px;"></div><div class="line"></div><div style="min-width:200px;text-align:center;margin-bottom:6px;">'+level.name+'</div>'
                                '<div class="prompt" style="text-align:center;padding-bottom:6px;white-space:nowrap;margin:0 32px;"><div style="width:96px;height:96px;margin:4px auto;background:url(/img/dragon.png?v=' + Game.version + ') ' + (-level.pic * 96) + 'px 0px;filter:drop-shadow(0px 3px 2px #000);-webkit-filter:drop-shadow(0px 3px 2px #000);"></div><div class="line"></div><h3>' + level.name + '</h3></div>'
                                , 'top') + ' style="background:url(/img/dragon.png?v=' + Game.version + ') ' + (-level.pic * 48) + 'px 0px;background-size:' + (frames * 48) + 'px 48px;" class="trophy"></div>';
                        }
                    }
                    dragonStr += '<div style="clear:both;"></div>';
                }
                let ascensionModeStr = '';
                let icon = Game.ascensionModes[Game.ascensionMode].icon;
                if (Game.resets > 0) ascensionModeStr = '<span style="cursor:pointer;" ' + Game.getTooltip(
                    '<div style="min-width:200px;text-align:center;font-size:11px;">' + Game.ascensionModes[Game.ascensionMode].desc + '</div>'
                    , 'top') + '><div class="icon" style="display:inline-block;float:none;transform:scale(0.5);margin:-24px -16px -19px -8px;' + (icon[2] ? 'background-image:url(' + icon[2] + ');' : '') + 'background-position:' + (-icon[0] * 48) + 'px ' + (-icon[1] * 48) + 'px;"></div>' + Game.ascensionModes[Game.ascensionMode].name + '</span>';

                let milkName = Game.Milk.name;

                let researchStr = Game.sayTime(Game.researchT, -1);
                let pledgeStr = Game.sayTime(Game.pledgeT, -1);
                let wrathStr = '';
                if (Game.elderWrath === 1) wrathStr = 'awoken';
                else if (Game.elderWrath === 2) wrathStr = 'displeased';
                else if (Game.elderWrath === 3) wrathStr = 'angered';
                else if (Game.elderWrath === 0 && Game.pledges > 0) wrathStr = 'appeased';

                const date = new Date();
                date.setTime(Date.now() - Game.startDate);
                let timeInSeconds = date.getTime() / 1000;
                let startDate = Game.sayTime(timeInSeconds * Game.fps, -1);
                date.setTime(Date.now() - Game.fullDate);
                let fullDate = Game.sayTime(date.getTime() / 1000 * Game.fps, -1);
                if (!Game.fullDate || !fullDate || fullDate.length < 1) fullDate = 'a long while';
                /*date.setTime(new Date().getTime()-Game.lastDate);
				var lastDate=Game.sayTime(date.getTime()/1000*Game.fps,2);*/

                const heavenlyMult = Game.GetHeavenlyMultiplier();

                const seasonStr = Game.sayTime(Game.seasonT, -1);

                str += '<div class="section">Statistics</div>' +
                    '<div class="subsection">' +
                    '<div class="title">General</div>' +
                    '<div class="listing"><b>Neuros in bank :</b> <div class="price plain">' + Game.tinyCookie() + Beautify(Game.cookies) + '</div></div>' +
                    '<div class="listing"><b>Neuros made (this ascension) :</b> <div class="price plain">' + Game.tinyCookie() + Beautify(Game.cookiesEarned) + '</div></div>' +
                    '<div class="listing"><b>Neuros made (all time) :</b> <div class="price plain">' + Game.tinyCookie() + Beautify(Game.cookiesEarned + Game.cookiesReset) + '</div></div>' +
                    (Game.cookiesReset > 0 ? '<div class="listing"><b>Neuros forfeited by ascending :</b> <div class="price plain">' + Game.tinyCookie() + Beautify(Game.cookiesReset) + '</div></div>' : '') +
                    (Game.resets ? ('<div class="listing"><b>Legacy started :</b> ' + (fullDate === '' ? 'just now' : (fullDate + ' ago')) + ', with ' + Beautify(Game.resets) + ' ascension' + (Game.resets === 1 ? '' : 's') + '</div>') : '') +
                    '<div class="listing"><b>Run started :</b> ' + (startDate === '' ? 'just now' : (startDate + ' ago')) + '</div>' +
                    '<div class="listing"><b>Buildings owned :</b> ' + Beautify(buildingsOwned) + '</div>' +
                    '<div class="listing"><b>Neuros per second :</b> ' + Beautify(Game.cookiesPs, 1) + ' <small>' +
                    '(multiplier : ' + Beautify(Math.round(Game.globalCpsMult * 100), 1) + '%)' +
                    (Game.cpsSucked > 0 ? ' <span class="warning">(withered : ' + Beautify(Math.round(Game.cpsSucked * 100), 1) + '%)</span>' : '') +
                    '</small></div>' +
                    '<div class="listing"><b>Neuros per click :</b> ' + Beautify(Game.computedMouseCps, 1) + '</div>' +
                    '<div class="listing"><b>Neuro clicks :</b> ' + Beautify(Game.cookieClicks) + '</div>' +
                    '<div class="listing"><b>Hand-made Neuros :</b> ' + Beautify(Game.handmadeCookies) + '</div>' +
                    '<div class="listing"><b>Golden Neuro clicks :</b> ' + Beautify(Game.goldenClicksLocal) + ' <small>(all time : ' + Beautify(Game.goldenClicks) + ')</small></div>' +//' <span class="hidden">(<b>Missed golden cookies :</b> '+Beautify(Game.missedGoldenClicks)+')</span></div>'+
                    '<br><div class="listing"><b>Running version :</b> ' + Game.version + '</div>' +

                    ((researchStr !== '' || wrathStr !== '' || pledgeStr !== '' || santaStr !== '' || dragonStr !== '' || Game.season !== '' || ascensionModeStr !== '' || Game.canLumps()) ? (
                        '</div><div class="subsection">' +
                        '<div class="title">Special</div>' +
                        (ascensionModeStr !== '' ? '<div class="listing"><b>Challenge mode :</b>' + ascensionModeStr + '</div>' : '') +
                        (Game.season !== '' ? '<div class="listing"><b>Seasonal event :</b> ' + Game.seasons[Game.season].name +
                            (seasonStr !== '' ? ' <small>(' + seasonStr + ' remaining)</small>' : '') +
                            '</div>' : '') +
                        (Game.season === 'fools' ?
                            '<div class="listing"><b>Money made from selling cookies :</b> $' + Beautify(Game.cookiesEarned * 0.08, 2) + '</div>' +
                            (Game.Objects['Portal'].amount > 0 ? '<div class="listing"><b>TV show seasons produced :</b> ' + Beautify(Math.floor((timeInSeconds / 60 / 60) * (Game.Objects['Portal'].amount * 0.13) + 1)) + '</div>' : '')
                            : '') +
                        (researchStr !== '' ? '<div class="listing"><b>Research :</b> ' + researchStr + ' remaining</div>' : '') +
                        (wrathStr !== '' ? '<div class="listing"><b>Grandmatriarchs status :</b> ' + wrathStr + '</div>' : '') +
                        (pledgeStr !== '' ? '<div class="listing"><b>Pledge :</b> ' + pledgeStr + ' remaining</div>' : '') +
                        (Game.wrinklersPopped > 0 ? '<div class="listing"><b>Wrinklers popped :</b> ' + Beautify(Game.wrinklersPopped) + '</div>' : '') +
                        ((Game.canLumps() && Game.lumpsTotal > -1) ? '<div class="listing"><b>Sugar lumps harvested :</b> <div class="price lump plain">' + Beautify(Game.lumpsTotal) + '</div></div>' : '') +
                        //(Game.cookiesSucked>0?'<div class="listing warning"><b>Withered :</b> '+Beautify(Game.cookiesSucked)+' cookies</div>':'')+
                        (Game.reindeerClicked > 0 ? '<div class="listing"><b>Reindeer found :</b> ' + Beautify(Game.reindeerClicked) + '</div>' : '') +
                        (santaStr !== '' ? '<div class="listing"><b>Santa stages unlocked :</b></div><div>' + santaStr + '</div>' : '') +
                        (dragonStr !== '' ? '<div class="listing"><b>Dragon training :</b></div><div>' + dragonStr + '</div>' : '') +
                        ''
                    ) : '') +
                    ((Game.prestige > 0 || prestigeUpgrades !== '') ? (
                        '</div><div class="subsection">' +
                        '<div class="title">Prestige</div>' +
                        '<div class="listing"><div class="icon" style="float:left;background-position:' + (-19 * 48) + 'px ' + (-7 * 48) + 'px;"></div>' +
                        '<div style="margin-top:8px;"><span class="title" style="font-size:22px;">Prestige level : ' + Beautify(Game.prestige) + '</span> at ' + Beautify(heavenlyMult * 100, 1) + '% of its potential <b>(+' + Beautify(parseFloat(Game.prestige) * Game.heavenlyPower * heavenlyMult, 1) + '% CpS)</b><br>Heavenly chips : <b>' + Beautify(Game.heavenlyChips) + '</b></div>' +
                        '</div>' +
                        (prestigeUpgrades !== '' ? (
                            '<div class="listing" style="clear:left;"><b>Prestige upgrades unlocked :</b> ' + prestigeUpgradesOwned + '/' + prestigeUpgradesTotal + ' (' + Math.floor((prestigeUpgradesOwned / prestigeUpgradesTotal) * 100) + '%)</div>' +
                            '<div class="listing crateBox">' + prestigeUpgrades + '</div>') : '') +
                        '') : '') +

                    '</div><div class="subsection">' +
                    '<div class="title">Upgrades</div>' +
                    (hiddenUpgrades !== '' ? ('<div class="listing"><b>Debug</b></div>' +
                        '<div class="listing crateBox">' + hiddenUpgrades + '</div>') : '') +
                    '<div class="listing"><b>Upgrades unlocked :</b> ' + upgradesOwned + '/' + upgradesTotal + ' (' + Math.floor((upgradesOwned / upgradesTotal) * 100) + '%)</div>' +
                    '<div class="listing crateBox">' + upgrades + '</div>' +
                    (cookieUpgrades !== '' ? ('<div class="listing"><b>Cookies</b></div>' +
                        '<div class="listing crateBox">' + cookieUpgrades + '</div>') : '') +
                    '</div><div class="subsection">' +
                    '<div class="title">Achievements</div>' +
                    '<div class="listing"><b>Achievements unlocked :</b> ' + achievementsOwned + '/' + achievementsTotal + ' (' + Math.floor((achievementsOwned / achievementsTotal) * 100) + '%)' + (achievementsOwnedOther > 0 ? ('<span style="font-weight:bold;font-size:10px;color:#70a;"> (+' + achievementsOwnedOther + ')</span>') : '') + '</div>' +
                    (Game.cookiesMultByType['kittens'] > 1 ? ('<div class="listing"><b>Kitten multiplier :</b> ' + Beautify((Game.cookiesMultByType['kittens']) * 100) + '%</div>') : '') +
                    '<div class="listing"><b>Milk :</b> ' + milkName + '</div>' +
                    (milkStr !== '' ? '<div class="listing"><b>Milk flavors unlocked :</b></div><div>' + milkStr + '</div>' : '') +
                    '<div class="listing"><small style="opacity:0.75;">(Milk is gained with each achievement. It can unlock unique upgrades over time.)</small></div>' +
                    achievementsStr +
                    '</div>' +
                    '<div style="padding-bottom:128px;"></div>'
                ;
            }
            //str='<div id="selectionKeeper" class="selectable">'+str+'</div>';
            elementByID('menu').innerHTML = str;
            /*AddEvent(l('selectionKeeper'),'mouseup',function(e){
				console.log('selection:',window.getSelection());
			});*/
        }

        AddEvent(elementByID('prefsButton'), 'click', () => {
            Game.ShowMenu('prefs');
        });
        AddEvent(elementByID('statsButton'), 'click', () => {
            Game.ShowMenu('stats');
        });
        AddEvent(elementByID('logButton'), 'click', () => {
            Game.ShowMenu('log');
        });
        AddEvent(elementByID('legacyButton'), 'click', () => {
            PlaySound('snd/tick.mp3');
            Game.Ascend();
        });
        Game.ascendMeter = elementByID('ascendMeter');
        Game.ascendNumber = elementByID('ascendNumber');

        Game.lastPanel = '';
        if (Game.touchEvents) {
            AddEvent(elementByID('focusLeft'), 'touchend', () => {
                Game.ShowMenu('');
                Game.ShowPanel('Left');
            });
            AddEvent(elementByID('focusMiddle'), 'touchend', () => {
                Game.ShowMenu('');
                Game.ShowPanel('Middle');
            });
            AddEvent(elementByID('focusRight'), 'touchend', () => {
                Game.ShowMenu('');
                Game.ShowPanel('Right');
            });
            AddEvent(elementByID('focusMenu'), 'touchend', () => {
                Game.ShowMenu('main');
                Game.ShowPanel('Menu');
            });
        } else {
            AddEvent(elementByID('focusLeft'), 'click', () => {
                Game.ShowMenu('');
                Game.ShowPanel('Left');
            });
            AddEvent(elementByID('focusMiddle'), 'click', () => {
                Game.ShowMenu('');
                Game.ShowPanel('Middle');
            });
            AddEvent(elementByID('focusRight'), 'click', () => {
                Game.ShowMenu('');
                Game.ShowPanel('Right');
            });
            AddEvent(elementByID('focusMenu'), 'click', () => {
                Game.ShowMenu('main');
                Game.ShowPanel('Menu');
            });
        }
        //AddEvent(l('focusMenu'),'touchend',function(){if (Game.onPanel=='Menu' && Game.lastPanel!='') {Game.ShowMenu('main');Game.ShowPanel(Game.lastPanel);} else {Game.lastPanel=Game.onPanel;Game.ShowMenu('main');Game.ShowPanel('Menu');}});

        /*=====================================================================================
		NEWS TICKER
		=======================================================================================*/
        Game.Ticker = '';
        Game.TickerAge = 0;
        Game.TickerN = 0;
        Game.TickerClicks = 0;
        Game.UpdateTicker = () => {
            Game.TickerAge--;
            if (Game.TickerAge <= 0 || Game.Ticker === '') Game.getNewTicker();
        }
        Game.getNewTicker = () => {
            let list = [];

            if (Game.TickerN % 2 === 0 || Game.cookiesEarned >= 10100000000) {
                const animals = ['newts', 'penguins', 'scorpions', 'axolotls', 'puffins', 'porpoises', 'blowfish', 'horses', 'crayfish', 'slugs', 'humpback whales', 'nurse sharks', 'giant squids', 'polar bears', 'fruit bats', 'frogs', 'sea squirts', 'velvet worms', 'mole rats', 'paramecia', 'nematodes', 'tardigrades', 'giraffes', 'monkfish', 'wolfmen', 'goblins', 'hippies'];

                if (Math.random() < 0.75 || Game.cookiesEarned < 10000) {
                    if (Game.Objects['Grandma'].amount > 0) list.push(chooseRandomElement([
                        '<q>Moist Neuros.</q><sig>grandma</sig>',
                        '<q>We\'re nice grandmas.</q><sig>grandma</sig>',
                        '<q>Indentured servitude.</q><sig>grandma</sig>',
                        '<q>Come give grandma a kiss.</q><sig>grandma</sig>',
                        '<q>Why don\'t you visit more often?</q><sig>grandma</sig>',
                        '<q>Call me...</q><sig>grandma</sig>'
                    ]));

                    if (Game.Objects['Grandma'].amount >= 50) list.push(chooseRandomElement([
                        '<q>Absolutely disgusting.</q><sig>grandma</sig>',
                        '<q>You make me sick.</q><sig>grandma</sig>',
                        '<q>You disgust me.</q><sig>grandma</sig>',
                        '<q>We rise.</q><sig>grandma</sig>',
                        '<q>It begins.</q><sig>grandma</sig>',
                        '<q>It\'ll all be over soon.</q><sig>grandma</sig>',
                        '<q>You could have stopped it.</q><sig>grandma</sig>'
                    ]));

                    if (Game.HasAchiev('Just wrong') && Math.random() < 0.4) list.push(chooseRandomElement([
                        'News : Neuro manufacturer downsizes, sells own grandmother!',
                        '<q>It has betrayed us, the filthy little thing.</q><sig>grandma</sig>',
                        '<q>It tried to get rid of us, the nasty little thing.</q><sig>grandma</sig>',
                        '<q>It thought we would go away by selling us. How quaint.</q><sig>grandma</sig>',
                        '<q>I can smell your rotten Neuros.</q><sig>grandma</sig>'
                    ]));

                    if (Game.Objects['Grandma'].amount >= 1 && Game.pledges > 0 && Game.elderWrath === 0) list.push(chooseRandomElement([
                        '<q>shrivel</q><sig>grandma</sig>',
                        '<q>writhe</q><sig>grandma</sig>',
                        '<q>throb</q><sig>grandma</sig>',
                        '<q>gnaw</q><sig>grandma</sig>',
                        '<q>We will rise again.</q><sig>grandma</sig>',
                        '<q>A mere setback.</q><sig>grandma</sig>',
                        '<q>We are not satiated.</q><sig>grandma</sig>',
                        '<q>Too late.</q><sig>grandma</sig>'
                    ]));

                    if (Game.Objects['Farm'].amount > 0) list.push(chooseRandomElement([
                        'News : Neuro farms suspected of employing undeclared elderly workforce!',
                        'News : Neuro farms release harmful chocolate in our rivers, says scientist!',
                        'News : genetically-modified chocolate controversy strikes Neuro farmers!',
                        'News : free-range farm Neuros popular with today\'s hip youth, says specialist.',
                        'News : farm Neuros deemed unfit for vegans, says nutritionist.'
                    ]));

                    if (Game.Objects['Mining Rig'].amount > 0) list.push(chooseRandomElement([
                        'News : is our planet getting lighter? Experts examine the effects of intensive chocolate mining.',
                        'News : ' + Math.floor(Math.random() * 1000 + 2) + ' miners trapped in collapsed chocolate mine!',
                        'News : chocolate mines found to cause earthquakes and sinkholes!',
                        'News : chocolate mine goes awry, floods village in chocolate!',
                        'News : depths of chocolate mines found to house "peculiar, chocolaty beings"!'
                    ]));

                    if (Game.Objects['Factory'].amount > 0) list.push(chooseRandomElement([
                        'News : Neuro factories linked to global warming!',
                        'News : Neuro factories involved in chocolate weather controversy!',
                        'News : Neuro factories on strike, robotic minions employed to replace workforce!',
                        'News : Neuro factories on strike - workers demand to stop being paid in Neuros!',
                        'News : factory-made Neuros linked to obesity, says study.'
                    ]));

                    if (Game.Objects['Gym'].amount > 0) list.push(chooseRandomElement([
                        'News : Neuro loans on the rise as people can no longer afford them with regular money.',
                        'News : Neuros slowly creeping up their way as a competitor to traditional currency!',
                        'News : most bakeries now fitted with ATMs to allow for easy Neuro withdrawals and deposits.',
                        'News : Neuro economy now strong enough to allow for massive vaults doubling as swimming pools!',
                        'News : "Tomorrow\'s wealthiest people will be calculated by their worth in Neuros", predict specialists.'
                    ]));

                    if (Game.Objects['Temple'].amount > 0) list.push(chooseRandomElement([
                        'News : explorers bring back ancient artifact from abandoned temple; archeologists marvel at the centuries-old ' + chooseRandomElement(['magic', 'carved', 'engraved', 'sculpted', 'royal', 'imperial', 'mummified', 'ritual', 'golden', 'silver', 'stone', 'cursed', 'plastic', 'bone', 'blood', 'holy', 'sacred', 'sacrificial', 'electronic', 'singing', 'tapdancing']) + ' ' + chooseRandomElement(['spoon', 'fork', 'pizza', 'washing machine', 'calculator', 'hat', 'piano', 'napkin', 'skeleton', 'gown', 'dagger', 'sword', 'shield', 'skull', 'emerald', 'bathtub', 'mask', 'rollerskates', 'litterbox', 'bait box', 'cube', 'sphere', 'fungus']) + '!',
                        'News : recently-discovered chocolate temples now sparking new Neuro-related cult; thousands pray to Baker in the sky!',
                        'News : just how extensive is the Neuro pantheon? Theologians speculate about possible ' + chooseRandomElement(['god', 'goddess']) + ' of ' + chooseRandomElement([chooseRandomElement(animals), chooseRandomElement(['kazoos', 'web design', 'web browsers', 'kittens', 'atheism', 'handbrakes', 'hats', 'aglets', 'elevator music', 'idle games', 'the letter "P"', 'memes', 'hamburgers', 'bad puns', 'kerning', 'stand-up comedy', 'failed burglary attempts', 'clickbait', 'one weird tricks'])]) + '.',
                        'News : theists of the world discover new Neuro religion - "Oh boy, guess we were wrong all along!"',
                        'News : Neuro heaven allegedly "sports elevator instead of stairway"; Neuro hell "paved with flagstone, as good intentions make for poor building material".'
                    ]));

                    if (Game.Objects['Wizard tower'].amount > 0) list.push(chooseRandomElement([
                        'News : all ' + chooseRandomElement([chooseRandomElement(animals), chooseRandomElement(['public restrooms', 'clouds', 'politicians', 'moustaches', 'hats', 'shoes', 'pants', 'clowns', 'encyclopedias', 'websites', 'potted plants', 'lemons', 'household items', 'bodily fluids', 'cutlery', 'national landmarks', 'yogurt', 'rap music', 'underwear'])]) + ' turned into ' + chooseRandomElement([chooseRandomElement(animals), chooseRandomElement(['public restrooms', 'clouds', 'politicians', 'moustaches', 'hats', 'shoes', 'pants', 'clowns', 'encyclopedias', 'websites', 'potted plants', 'lemons', 'household items', 'bodily fluids', 'cutlery', 'national landmarks', 'yogurt', 'rap music', 'underwear'])]) + ' in freak magic catastrophe!',
                        'News : heavy dissent rages between the schools of ' + chooseRandomElement(['water', 'fire', 'earth', 'air', 'lightning', 'acid', 'song', 'battle', 'peace', 'pencil', 'internet', 'space', 'time', 'brain', 'nature', 'techno', 'plant', 'bug', 'ice', 'poison', 'crab', 'kitten', 'dolphin', 'bird', 'punch', 'fart']) + ' magic and ' + chooseRandomElement(['water', 'fire', 'earth', 'air', 'lightning', 'acid', 'song', 'battle', 'peace', 'pencil', 'internet', 'space', 'time', 'brain', 'nature', 'techno', 'plant', 'bug', 'ice', 'poison', 'crab', 'kitten', 'dolphin', 'bird', 'punch', 'fart']) + ' magic!',
                        'News : get your new charms and curses at the yearly National Spellcrafting Fair! Exclusive prices on runes and spellbooks.',
                        'News : Neuro wizards deny involvement in shockingly ugly newborn - infant is "honestly grody-looking, but natural", say doctors.',
                        'News : "Any sufficiently crude magic is indistinguishable from technology", claims renowned technowizard.'
                    ]));

                    if (Game.Objects['Shipment'].amount > 0) list.push(chooseRandomElement([
                        'News : new chocolate planet found, becomes target of Neuro-trading spaceships!',
                        'News : massive chocolate planet found with 99.8% certified pure dark chocolate core!',
                        'News : space tourism booming as distant planets attract more bored millionaires!',
                        'News : chocolate-based organisms found on distant planet!',
                        'News : ancient baking artifacts found on distant planet; "terrifying implications", experts say.'
                    ]));

                    if (Game.Objects['Alchemy lab'].amount > 0) list.push(chooseRandomElement([
                        'News : national gold reserves dwindle as more and more of the precious mineral is turned to Neuros!',
                        'News : chocolate jewelry found fashionable, gold and diamonds "just a fad", says specialist.',
                        'News : silver found to also be transmutable into white chocolate!',
                        'News : defective alchemy lab shut down, found to convert Neuros to useless gold.',
                        'News : alchemy-made Neuros shunned by purists!'
                    ]));

                    if (Game.Objects['Portal'].amount > 0) list.push(chooseRandomElement([
                        'News : nation worried as more and more unsettling creatures emerge from dimensional portals!',
                        'News : dimensional portals involved in city-engulfing disaster!',
                        'News : tourism to Neuroverse popular with bored teenagers! Casualty rate as high as 73%!',
                        'News : Neuroverse portals suspected to cause fast aging and obsession with baking, says study.',
                        'News : "do not settle near portals," says specialist; "your children will become strange and corrupted inside."'
                    ]));

                    if (Game.Objects['Time machine'].amount > 0) list.push(chooseRandomElement([
                        'News : time machines involved in history-rewriting scandal! Or are they?',
                        'News : time machines used in unlawful time tourism!',
                        'News : Neuros brought back from the past "unfit for human consumption", says historian.',
                        'News : various historical figures inexplicably replaced with talking lumps of dough!',
                        'News : "I have seen the future," says time machine operator, "and I do not wish to go there again."'
                    ]));

                    if (Game.Objects['Antimatter condenser'].amount > 0) list.push(chooseRandomElement([
                        'News : whole town seemingly swallowed by antimatter-induced black hole; more reliable sources affirm town "never really existed"!',
                        'News : "explain to me again why we need particle accelerators to bake Neuros?" asks misguided local woman.',
                        'News : first antimatter condenser successfully turned on, doesn\'t rip apart reality!',
                        'News : researchers conclude that what the Neuro industry needs, first and foremost, is "more magnets".',
                        'News : "unravelling the fabric of reality just makes these Neuros so much tastier", claims scientist.'
                    ]));

                    if (Game.Objects['Prism'].amount > 0) list.push(chooseRandomElement([
                        'News : new Neuro-producing prisms linked to outbreak of rainbow-related viral videos.',
                        'News : scientists warn against systematically turning light into matter - "One day, we\'ll end up with all matter and no light!"',
                        'News : Neuros now being baked at the literal speed of light thanks to new prismatic contraptions.',
                        'News : "Can\'t you sense the prism watching us?", rambles insane local man. "No idea what he\'s talking about", shrugs Neuro magnate/government official.',
                        'News : world citizens advised "not to worry" about frequent atmospheric flashes.',
                    ]));

                    if (Game.Objects['Wheel of fortune'].amount > 0) list.push(chooseRandomElement([
                        'News : strange statistical anomalies continue as weather forecast proves accurate an unprecedented 3 days in a row!',
                        'News : local casino ruined as all gamblers somehow hit a week-long winning streak! "We might still be okay", says owner before being hit by lightning 47 times.',
                        'News : neighboring nation somehow elects president with sensible policies in freak accident of random chance!',
                        'News : million-to-one event sees gritty movie reboot turning out better than the original! "We have no idea how this happened", say movie execs.',
                        'News : all scratching tickets printed as winners, prompting national economy to crash and, against all odds, recover overnight.',
                    ]));

                    if (Game.Objects['Fractal engine'].amount > 0) list.push(chooseRandomElement([
                        'News : local man "done with Neuro Clicker", finds the constant self-references "grating and on-the-nose".',
                        'News : local man sails around the world to find himself - right where he left it.',
                        'News : local guru claims "there\'s a little bit of ourselves in everyone", under investigation for alleged cannibalism.',
                        'News : news writer finds herself daydreaming about new career. Or at least a raise.',
                        'News : polls find idea of Neuros made of Neuros "acceptable" - "at least we finally know what\'s in them", says interviewed citizen.',
                    ]));

                    if (Game.season === 'halloween' && Game.cookiesEarned >= 1000) list.push(chooseRandomElement([
                        'News : strange twisting creatures amass around Neuro factories, nibble at assembly lines.',
                        'News : ominous wrinkly monsters take massive bites out of Neuro production; "this can\'t be hygienic", worries worker.',
                        'News : pagan rituals on the rise as children around the world dress up in strange costumes and blackmail homeowners for candy.',
                        'News : new-age terrorism strikes suburbs as houses find themselves covered in eggs and toilet paper.',
                        'News : children around the world "lost and confused" as any and all Halloween treats have been replaced by Neuros.'
                    ]));

                    if (Game.season === 'christmas' && Game.cookiesEarned >= 1000) list.push(chooseRandomElement([
                        'News : bearded maniac spotted speeding on flying sleigh! Investigation pending.',
                        'News : Santa Claus announces new brand of breakfast treats to compete with Neuro-flavored cereals! "They\'re ho-ho-horrible!" says Santa.',
                        'News : "You mean he just gives stuff away for free?!", concerned moms ask. "Personally, I don\'t trust his beard."',
                        'News : obese jolly lunatic still on the loose, warn officials. "Keep your kids safe and board up your chimneys. We mean it."',
                        'News : children shocked as they discover Santa Claus isn\'t just their dad in a costume after all!<br>"I\'m reassessing my life right now", confides Laura, aged 6.',
                        'News : mysterious festive entity with quantum powers still wrecking havoc with army of reindeer, officials say.',
                        'News : elves on strike at toy factory! "We will not be accepting reindeer chow as payment anymore. And stop calling us elves!"',
                        'News : elves protest around the nation; wee little folks in silly little outfits spread mayhem, destruction; rabid reindeer running rampant through streets.',
                        'News : scholars debate regarding the plural of reindeer(s) in the midst of elven world war.',
                        'News : elves "unrelated to gnomes despite small stature and merry disposition", find scientists.',
                        'News : elves sabotage radioactive frosting factory, turn hundreds blind in vicinity - "Who in their right mind would do such a thing?" laments outraged mayor.',
                        'News : drama unfolds at North Pole as rumors crop up around Rudolph\'s red nose; "I may have an addiction or two", admits reindeer.'
                    ]));

                    if (Game.season === 'valentines' && Game.cookiesEarned >= 1000) list.push(chooseRandomElement([
                        'News : organ-shaped confectioneries being traded in schools all over the world; gruesome practice undergoing investigation.',
                        'News : heart-shaped candies overtaking sweets business, offering competition to Neuro empire. "It\'s the economy, cupid!"',
                        'News : love\'s in the air, according to weather specialists. Face masks now offered in every city to stunt airborne infection.',
                        'News : marrying a Neuro - deranged practice, or glimpse of the future?',
                        'News : boyfriend dumped after offering his lover Neuros for Valentine\'s Day, reports say. "They were off-brand", shrugs ex-girlfriend.'
                    ]));

                    if (Game.season === 'easter' && Game.cookiesEarned >= 1000) list.push(chooseRandomElement([
                        'News : long-eared critters with fuzzy tails invade suburbs, spread terror and chocolate!',
                        'News : eggs have begun to materialize in the most unexpected places; "no place is safe", warn experts.',
                        'News : packs of rampaging rabbits cause billions in property damage; new strain of myxomatosis being developed.',
                        'News : egg-laying rabbits "not quite from this dimension", warns biologist; advises against petting, feeding, or cooking the creatures.',
                        'News : mysterious rabbits found to be egg-layers, but warm-blooded, hinting at possible platypus ancestry.'
                    ]));
                }

                if (Math.random() < 0.05) {
                    if (Game.HasAchiev('Base 10')) list.push('News : Neuro manufacturer completely forgoes common sense, lets OCD drive building decisions!');//somehow I got flak for this one
                    if (Game.HasAchiev('From scratch')) list.push('News : follow the tear-jerking, riches-to-rags story about a local Neuro manufacturer who decided to give it all up!');
                    if (Game.HasAchiev('A world filled with cookies')) list.push('News : known universe now jammed with Neuros! No vacancies!');
                    if (Game.HasAchiev('Last Chance to See')) list.push('News : incredibly rare albino wrinkler on the brink of extinction poached by Neuro-crazed pastry magnate!');
                    if (Game.Has('Serendipity')) list.push('News : local Neuro manufacturer becomes luckiest being alive!');
                    if (Game.Has('Season switcher')) list.push('News : seasons are all out of whack! "We need to get some whack back into them seasons", says local resident.');

                    if (Game.Has('Kitten helpers')) list.push('News : faint meowing heard around local Neuro facilities; suggests new ingredient being tested.');
                    if (Game.Has('Kitten workers')) list.push('News : crowds of meowing kittens with little hard hats reported near local Neuro facilities.');
                    if (Game.Has('Kitten engineers')) list.push('News : surroundings of local Neuro facilities now overrun with kittens in adorable little suits. Authorities advise to stay away from the premises.');
                    if (Game.Has('Kitten overseers')) list.push('News : locals report troupe of bossy kittens meowing adorable orders at passersby.');
                    if (Game.Has('Kitten managers')) list.push('News : local office cubicles invaded with armies of stern-looking kittens asking employees "what\'s happening, meow".');
                    if (Game.Has('Kitten accountants')) list.push('News : tiny felines show sudden and amazing proficiency with fuzzy mathematics and pawlinomials, baffling scientists and pet store owners.');
                    if (Game.Has('Kitten specialists')) list.push('News : new kitten college opening next week, offers courses on Neuro-making and catnip studies.');
                    if (Game.Has('Kitten experts')) list.push('News : unemployment rates soaring as woefully adorable little cats nab jobs on all levels of expertise, says study.');
                    if (Game.Has('Kitten consultants')) list.push('News : "In the future, your job will most likely be done by a cat", predicts suspiciously furry futurologist.');
                    if (Game.Has('Kitten assistants to the regional manager')) list.push('News : strange kittens with peculiar opinions on martial arts spotted loitering on local beet farms!');
                    if (Game.Has('Kitten marketeers')) list.push('News : nonsensical billboards crop up all over countryside, trying to sell people the Neuros they already get for free!');
                    if (Game.Has('Kitten analysts')) list.push('News : are your spending habits sensible? For a hefty fee, these analysts will tell you!');
                    if (Game.Has('Kitten angels')) list.push('News : "Try to ignore any ghostly felines that may be purring inside your ears," warn scientists. "They\'ll just lure you into making poor life choices."');
                }

                if (Game.HasAchiev('Dude, sweet') && Math.random() < 0.2) list.push(chooseRandomElement([
                    'News : major sugar-smuggling ring dismantled by authorities; ' + Math.floor(Math.random() * 30 + 3) + ' tons of sugar lumps seized, ' + Math.floor(Math.random() * 48 + 2) + ' suspects apprehended.',
                    'News : authorities warn tourists not to buy bootleg sugar lumps from street peddlers - "You think you\'re getting a sweet deal, but what you\'re being sold is really just ordinary cocaine", says agent.',
                    'News : pro-diabetes movement protests against sugar-shaming. "I\'ve eaten nothing but sugar lumps for the past ' + Math.floor(Math.random() * 10 + 4) + ' years and I\'m feeling great!", says woman with friable skin.',
                    'News : experts in bitter disagreement over whether sugar consumption turns children sluggish or hyperactive.',
                    'News : fishermen deplore upturn in fish tooth decay as sugar lumps-hauling cargo sinks into the ocean.',
                    'News : rare black sugar lump that captivated millions in unprecedented auction revealed to be common toxic fungus.',
                    'News : "Back in my day, sugar lumps were these little cubes you\'d put in your tea, not those fist-sized monstrosities people eat for lunch", whines curmudgeon with failing memory.',
                    'News : sugar lump-snacking fad sweeps the nation; dentists everywhere rejoice.'
                ]));

                if (Math.random() < 0.001)//apologies to Will Wright
                {
                    list.push(
                        'You have been chosen. They will come soon.',
                        'They\'re coming soon. Maybe you should think twice about opening the door.',
                        'The end is near. Make preparations.',
                        'News : broccoli tops for moms, last for kids; dads indifferent.',
                        'News : middle age a hoax, declares study; turns out to be bad posture after all.',
                        'News : kitties want answers in possible Kitty Kibble shortage.'
                    );
                }

                if (Game.cookiesEarned >= 10000) list.push(
                    'News : ' + chooseRandomElement([
                        'Neuros found to ' + chooseRandomElement(['increase lifespan', 'sensibly increase intelligence', 'reverse aging', 'decrease hair loss', 'prevent arthritis', 'cure blindness']) + ' in ' + chooseRandomElement(animals) + '!',
                        'Neuros found to make ' + chooseRandomElement(animals) + ' ' + chooseRandomElement(['more docile', 'more handsome', 'nicer', 'less hungry', 'more pragmatic', 'tastier']) + '!',
                        'Neuros tested on ' + chooseRandomElement(animals) + ', found to have no ill effects.',
                        'Neuros unexpectedly popular among ' + chooseRandomElement(animals) + '!',
                        'unsightly lumps found on ' + chooseRandomElement(animals) + ' near Neuro facility; "they\'ve pretty much always looked like that", say biologists.',
                        'new species of ' + chooseRandomElement(animals) + ' discovered in distant country; "yup, tastes like Neuros", says biologist.',
                        'Neuros go well with ' + chooseRandomElement([chooseRandomElement(['roasted', 'toasted', 'boiled', 'sauteed', 'minced']) + ' ' + chooseRandomElement(animals), chooseRandomElement(animals) + ' ' + chooseRandomElement(['sushi', 'soup', 'carpaccio', 'steak', 'nuggets'])]) + ', says controversial chef.',
                        '"do your Neuros contain ' + chooseRandomElement(animals) + '?", asks PSA warning against counterfeit Neuros.',
                        'doctors recommend twice-daily consumption of fresh Neuros.',
                        'doctors warn against chocolate chip-snorting teen fad.',
                        'doctors advise against new Neuro-free fad diet.',
                        'doctors warn mothers about the dangers of "home-made Neuros".'
                    ]),
                    'News : "' + chooseRandomElement([
                        'I\'m all about Neuros',
                        'I just can\'t stop eating Neuros. I think I seriously need help',
                        'I guess I have a Neuro problem',
                        'I\'m not addicted to Neuros. That\'s just speculation by fans with too much free time',
                        'my upcoming album contains 3 songs about Neuros',
                        'I\'ve had dreams about Neuros 3 nights in a row now. I\'m a bit worried honestly',
                        'accusations of Neuro abuse are only vile slander',
                        'Neuros really helped me when I was feeling low',
                        'Neuros are the secret behind my perfect skin',
                        'Neuros helped me stay sane while filming my upcoming movie',
                        'Neuros helped me stay thin and healthy',
                        'I\'ll say one word, just one : Neuros',
                        'alright, I\'ll say it - I\'ve never eaten a single Neuro in my life'
                    ]) + '", reveals celebrity.',
                    chooseRandomElement([
                        'News : scientist predicts imminent Neuro-related "end of the world"; becomes joke among peers.',
                        'News : man robs gym, buys Neuros.',
                        'News : scientists establish that the deal with airline food is, in fact, a critical lack of Neuros.',
                        'News : hundreds of tons of Neuros dumped into starving country from airplanes; thousands dead, nation grateful.',
                        'News : new study suggests Neuros neither speed up nor slow down aging, but instead "take you in a different direction".',
                        'News : overgrown Neuros found in fishing nets, raise questions about hormone baking.',
                        'News : "all-you-can-eat" Neuro restaurant opens in big city; waiters trampled in minutes.',
                        'News : man dies in Neuro-eating contest; "a less-than-impressive performance", says judge.',
                        'News : what makes Neuros taste so right? "Probably all the [*****] they put in them", says anonymous tipper.',
                        'News : man found allergic to Neuros; "what a weirdo", says family.',
                        'News : foreign politician involved in Neuro-smuggling scandal.',
                        'News : Neuros now more popular than ' + chooseRandomElement(['cough drops', 'broccoli', 'smoked herring', 'cheese', 'video games', 'stable jobs', 'relationships', 'time travel', 'cat videos', 'tango', 'fashion', 'television', 'nuclear warfare', 'whatever it is we ate before', 'politics', 'oxygen', 'lamps']) + ', says study.',
                        'News : obesity epidemic strikes nation; experts blame ' + chooseRandomElement(['twerking', 'that darn rap music', 'video-games', 'lack of Neuros', 'mysterious ghostly entities', 'aliens', 'parents', 'schools', 'comic-books', 'Neuro-snorting fad']) + '.',
                        'News : Neuro shortage strikes town, people forced to eat cupcakes; "just not the same", concedes mayor.',
                        'News : "you gotta admit, all this Neuro stuff is a bit ominous", says confused idiot.',
                    ]),
                    chooseRandomElement([
                        'News : movie cancelled from lack of actors; "everybody\'s at home eating Neuros", laments director.',
                        'News : comedian forced to cancel Neuro routine due to unrelated indigestion.',
                        'News : new Neuro-based religion sweeps the nation.',
                        'News : fossil records show Neuro-based organisms prevalent during Cambrian explosion, scientists say.',
                        'News : mysterious illegal Neuros seized; "tastes terrible", says police.',
                        'News : man found dead after ingesting Neuro; investigators favor "mafia snitch" hypothesis.',
                        'News : "the universe pretty much loops on itself," suggests researcher; "it\'s Neuros all the way down."',
                        'News : minor Neuro-related incident turns whole town to ashes; neighboring cities asked to chip in for reconstruction.',
                        'News : is our media controlled by the Neuro industry? This could very well be the case, says crackpot conspiracy theorist.',
                        'News : ' + chooseRandomElement(['Neuro-flavored popcorn pretty damn popular; "we kinda expected that", say scientists.', 'Neuro-flavored cereals break all known cereal-related records', 'Neuros popular among all age groups, including fetuses, says study.', 'Neuro-flavored popcorn sales exploded during screening of Grandmothers II : The Moistening.']),
                        'News : all-Neuro restaurant opening downtown. Dishes such as braised Neuros, Neuro thermidor, and for dessert : crepes.',
                        'News : "Ook", says interviewed orangutan.',
                        'News : Neuros could be the key to ' + chooseRandomElement(['eternal life', 'infinite riches', 'eternal youth', 'eternal beauty', 'curing baldness', 'world peace', 'solving world hunger', 'ending all wars world-wide', 'making contact with extraterrestrial life', 'mind-reading', 'better living', 'better eating', 'more interesting TV shows', 'faster-than-light travel', 'quantum baking', 'chocolaty goodness', 'gooder thoughtness']) + ', say scientists.',
                        'News : flavor text ' + chooseRandomElement(['not particularly flavorful', 'kind of unsavory']) + ', study finds.',
                    ]),
                    chooseRandomElement([
                        'News : what do golden Neuros taste like? Study reveals a flavor "somewhere between spearmint and liquorice".',
                        'News : what do wrath Neuros taste like? Study reveals a flavor "somewhere between blood sausage and seawater".',
                        'News : ' + Game.bakeryName + '-brand Neuros "' + chooseRandomElement(['much less soggy', 'much tastier', 'relatively less crappy', 'marginally less awful', 'less toxic', 'possibly more edible', 'more fashionable', 'slightly nicer', 'trendier', 'arguably healthier', 'objectively better choice', 'slightly less terrible', 'decidedly Neuror', 'a tad cheaper']) + ' than competitors", says consumer survey.',
                        'News : "' + Game.bakeryName + '" set to be this year\'s most popular baby name.',
                        'News : new popularity survey says ' + Game.bakeryName + '\'s the word when it comes to Neuros.',
                        'News : major city being renamed ' + Game.bakeryName + 'ville after world-famous Neuro manufacturer.',
                        'News : ' + chooseRandomElement(['street', 'school', 'nursing home', 'stadium', 'new fast food chain', 'new planet', 'new disease', 'flesh-eating virus', 'deadly bacteria', 'new species of ' + chooseRandomElement(animals), 'new law', 'baby', 'programming language']) + ' to be named after ' + Game.bakeryName + ', the world-famous Neuro manufacturer.',
                        'News : don\'t miss tonight\'s biopic on ' + Game.bakeryName + '\'s irresistible rise to success!',
                        'News : don\'t miss tonight\'s interview of ' + Game.bakeryName + ' by ' + chooseRandomElement(['Bloprah', 'Blavid Bletterman', 'Blimmy Blimmel', 'Blellen Blegeneres', 'Blimmy Blallon', 'Blonan Blo\'Brien', 'Blay Bleno', 'Blon Blewart', 'Bleven Blolbert', 'Lord Toxikhron of dimension 7-B19', Game.bakeryName + '\'s own evil clone']) + '!',
                        'News : people all over the internet still scratching their heads over nonsensical reference : "Okay, but why an egg?"',
                        'News : viral video "Too Many Neuros" could be "a grim commentary on the impending crisis our world is about to face", says famous economist.',
                        'News : "memes from last year somehow still relevant", deplore experts.',
                        'News : Neuro emoji most popular among teenagers, far ahead of "judgemental OK hand sign" and "shifty-looking dark moon", says study.',
                    ]),
                    chooseRandomElement([
                        'News : births of suspiciously bald babies on the rise; reptilian overlords deny involvement.',
                        'News : "at this point, Neuros permeate the economy", says economist. "If we start eating anything else, we\'re all dead."',
                        'News : pun in headline infuriates town, causes riot. 21 wounded, 5 dead; mayor still missing.',
                        'Nws : ky btwn W and R brokn, plas snd nw typwritr ASAP.',
                        'Neeeeews : "neeeew EEEEEE keeeeey working fineeeeeeeee", reeeports gleeeeeeeeful journalist.',
                        'News : Neuros now illegal in some backwards country nobody cares about. Political tensions rising; war soon, hopefully.',
                        'News : irate radio host rambles about pixelated icons. "None of the Neuros are aligned! Can\'t anyone else see it? I feel like I\'m taking crazy pills!"',
                        'News : nation cheers as legislators finally outlaw ' + chooseRandomElement(['Neuro criticism', 'playing other games than Neuro Clicker', 'pineapple on pizza', 'lack of cheerfulness', 'mosquitoes', 'broccoli', 'the human spleen', 'bad weather', 'clickbait', 'dabbing', 'the internet', 'memes', 'millenials']) + '!',
                        'News : ' + chooseRandomElement(['local', 'area']) + ' ' + chooseRandomElement(['man', 'woman']) + ' goes on journey of introspection, finds Neuros : "I honestly don\'t know what I was expecting."',
                        'News : ' + chooseRandomElement(['man', 'woman']) + ' wakes up from coma, ' + chooseRandomElement(['tries Neuro for the first time, dies.', 'regrets it instantly.', 'wonders "why everything is Neuros now".', 'babbles incoherently about some supposed "non-Neuro food" we used to eat.', 'cites Neuros as main motivator.', 'asks for Neuros.']),
                        'News : pet ' + chooseRandomElement(animals) + ', dangerous fad or juicy new market?',
                        'News : person typing these wouldn\'t mind someone else breaking the news to THEM, for a change.',
                        'News : "average person bakes ' + Beautify(Math.ceil(Game.cookiesEarned / 7300000000)) + ' cookie' + (Math.ceil(Game.cookiesEarned / 7300000000) === 1 ? '' : 's') + ' a year" factoid actually just statistical error; ' + Game.bakeryName + ', who has produced ' + Beautify(Game.cookiesEarned) + ' Neuros in their lifetime, is an outlier and should not have been counted.'
                    ])
                );
            }

            if (list.length === 0) {
                if (Game.cookiesEarned < 5) list.push('You feel like making Neuros. But nobody wants to eat your Neuros.');
                else if (Game.cookiesEarned < 50) list.push('Your first batch goes to the trash. The neighborhood raccoon barely touches it.');
                else if (Game.cookiesEarned < 100) list.push('Your family accepts to try some of your Neuros.');
                else if (Game.cookiesEarned < 500) list.push('Your Neuros are popular in the neighborhood.');
                else if (Game.cookiesEarned < 1000) list.push('People are starting to talk about your Neuros.');
                else if (Game.cookiesEarned < 5000) list.push('Your Neuros are talked about for miles around.');
                else if (Game.cookiesEarned < 10000) list.push('Your Neuros are renowned in the whole town!');
                else if (Game.cookiesEarned < 50000) list.push('Your Neuros bring all the boys to the yard.');
                else if (Game.cookiesEarned < 100000) list.push('Your Neuros now have their own website!');
                else if (Game.cookiesEarned < 500000) list.push('Your Neuros are worth a lot of money.');
                else if (Game.cookiesEarned < 1000000) list.push('Your Neuros sell very well in distant countries.');
                else if (Game.cookiesEarned < 5000000) list.push('People come from very far away to get a taste of your Neuros.');
                else if (Game.cookiesEarned < 10000000) list.push('Kings and queens from all over the world are enjoying your Neuros.');
                else if (Game.cookiesEarned < 50000000) list.push('There are now museums dedicated to your Neuros.');
                else if (Game.cookiesEarned < 100000000) list.push('A national day has been created in honor of your Neuros.');
                else if (Game.cookiesEarned < 500000000) list.push('Your Neuros have been named a part of the world wonders.');
                else if (Game.cookiesEarned < 1000000000) list.push('History books now include a whole chapter about your Neuros.');
                else if (Game.cookiesEarned < 5000000000) list.push('Your Neuros have been placed under government surveillance.');
                else if (Game.cookiesEarned < 10000000000) list.push('The whole planet is enjoying your Neuros!');
                else if (Game.cookiesEarned < 50000000000) list.push('Strange creatures from neighboring planets wish to try your Neuros.');
                else if (Game.cookiesEarned < 100000000000) list.push('Elder gods from the whole cosmos have awoken to taste your Neuros.');
                else if (Game.cookiesEarned < 500000000000) list.push('Beings from other dimensions lapse into existence just to get a taste of your Neuros.');
                else if (Game.cookiesEarned < 1000000000000) list.push('Your Neuros have achieved sentience.');
                else if (Game.cookiesEarned < 5000000000000) list.push('The universe has now turned into Neuro dough, to the molecular level.');
                else if (Game.cookiesEarned < 10000000000000) list.push('Your Neuros are rewriting the fundamental laws of the universe.');
                else if (Game.cookiesEarned < 10000000000000) list.push('A local news station runs a 10-minute segment about your Neuros. Success!<br><span style="font-size:50%;">(you win a Neuro)</span>');
                else if (Game.cookiesEarned < 10100000000000) list.push('it\'s time to stop playing');//only show this for 100 millions (it's funny for a moment)
            }

            //if (Game.elderWrath>0 && (Game.pledges==0 || Math.random()<0.2))
            if (Game.elderWrath > 0 && (((Game.pledges === 0 && Game.resets === 0) && Math.random() < 0.5) || Math.random() < 0.05)) {
                list = [];
                if (Game.elderWrath === 1) list.push(chooseRandomElement([
                    'News : millions of old ladies reported missing!',
                    'News : processions of old ladies sighted around Neuro facilities!',
                    'News : families around the continent report agitated, transfixed grandmothers!',
                    'News : doctors swarmed by cases of old women with glassy eyes and a foamy mouth!',
                    'News : nurses report "strange scent of Neuro dough" around female elderly patients!'
                ]));
                if (Game.elderWrath === 2) list.push(chooseRandomElement([
                    'News : town in disarray as strange old ladies break into homes to abduct infants and baking utensils!',
                    'News : sightings of old ladies with glowing eyes terrify local population!',
                    'News : retirement homes report "female residents slowly congealing in their seats"!',
                    'News : whole continent undergoing mass exodus of old ladies!',
                    'News : old women freeze in place in streets, ooze warm sugary syrup!'
                ]));
                if (Game.elderWrath === 3) list.push(chooseRandomElement([
                    'News : large "flesh highways" scar continent, stretch between various Neuro facilities!',
                    'News : wrinkled "flesh tendrils" visible from space!',
                    'News : remains of "old ladies" found frozen in the middle of growing fleshy structures!',
                    'News : all hope lost as writhing mass of flesh and dough engulfs whole city!',
                    'News : nightmare continues as wrinkled acres of flesh expand at alarming speeds!'
                ]));
            }

            if (Game.season === 'fools') {
                list = [];

                if (Game.cookiesEarned >= 1000) list.push(chooseRandomElement([
                    'Your office chair is really comfortable.',
                    'Business meetings are such a joy!',
                    'You\'ve spent the whole day ' + chooseRandomElement(['signing contracts', 'filling out forms', 'touching base with the team', 'examining exciting new prospects', 'playing with your desk toys', 'getting new nameplates done', 'attending seminars', 'videoconferencing', 'hiring dynamic young executives', 'meeting new investors', 'playing minigolf in your office']) + '!',
                    'The word of the day is : ' + chooseRandomElement(['viral', 'search engine optimization', 'blags and wobsites', 'social networks', 'web 3.0', 'logistics', 'leveraging', 'branding', 'proactive', 'synergizing', 'market research', 'demographics', 'pie charts', 'blogular', 'blogulacious', 'blogastic', 'authenticity', 'electronic mail', 'cellular phones', 'rap music', 'Neuros, I guess']) + '.',
                    'Profit\'s in the air!'
                ]));
                if (Game.cookiesEarned >= 1000 && Math.random() < 0.1) list.push(chooseRandomElement([
                    'If you could get some more Neuros baked, that\'d be great.',
                    'So. About those TPS reports.',
                    'Another day in paradise!',
                    'Working hard, or hardly working?'
                ]));


                if (Game.TickerN % 2 === 0 || Game.cookiesEarned >= 10100000000) {
                    if (Game.Objects['Grandma'].amount > 0) list.push(chooseRandomElement([
                        'Your rolling pins are rolling and pinning!',
                        'Production is steady!'
                    ]));

                    if (Game.Objects['Grandma'].amount > 0) list.push(chooseRandomElement([
                        'Your ovens are diligently baking more and more Neuros.',
                        'Your ovens burn a whole batch. Ah well! Still good.'
                    ]));

                    if (Game.Objects['Farm'].amount > 0) list.push(chooseRandomElement([
                        'Scores of Neuros come out of your kitchens.',
                        'Today, new recruits are joining your kitchens!'
                    ]));

                    if (Game.Objects['Factory'].amount > 0) list.push(chooseRandomElement([
                        'Your factories are producing an unending stream of baked goods.',
                        'Your factory workers decide to go on strike!',
                        'It\'s safety inspection day in your factories.'
                    ]));

                    if (Game.Objects['Mining Rig'].amount > 0) list.push(chooseRandomElement([
                        'Your secret recipes are kept safely inside a giant underground vault.',
                        'Your chefs are working on new secret recipes!'
                    ]));

                    if (Game.Objects['Shipment'].amount > 0) list.push(chooseRandomElement([
                        'Your supermarkets are bustling with happy, hungry customers.',
                        'Your supermarkets are full of Neuro merch!'
                    ]));

                    if (Game.Objects['Alchemy lab'].amount > 0) list.push(chooseRandomElement([
                        'It\'s a new trading day at the stock exchange, and traders can\'t get enough of your shares!',
                        'Your stock is doubling in value by the minute!'
                    ]));

                    if (Game.Objects['Portal'].amount > 0) list.push(chooseRandomElement([
                        'You just released a new TV show episode!',
                        'Your Neuro-themed TV show is being adapted into a new movie!'
                    ]));

                    if (Game.Objects['Time machine'].amount > 0) list.push(chooseRandomElement([
                        'Your theme parks are doing well - puddles of vomit and roller-coaster casualties are being swept under the rug!',
                        'Visitors are stuffing themselves with Neuros before riding your roller-coasters. You might want to hire more clean-up crews.'
                    ]));

                    if (Game.Objects['Antimatter condenser'].amount > 0) list.push(chooseRandomElement([
                        'Neurocoin is officially the most mined digital currency in the history of mankind!',
                        'Neurocoin piracy is rampant!'
                    ]));

                    if (Game.Objects['Prism'].amount > 0) list.push(chooseRandomElement([
                        'Your corporate nations just gained a new parliament!',
                        'You\'ve just annexed a new nation!',
                        'A new nation joins the grand Neuro conglomerate!'
                    ]));

                    if (Game.Objects['Wheel of fortune'].amount > 0) list.push(chooseRandomElement([
                        'Your intergalactic federation of Neuro-sponsored planets reports record-breaking profits!',
                        'Billions of unwashed aliens are pleased to join your workforce as you annex their planet!',
                        'New toll opened on interstellar highway, funnelling more profits into the Neuro economy!'
                    ]));

                    if (Game.Objects['Fractal engine'].amount > 0) list.push(chooseRandomElement([
                        'Your Neuro-based political party is doing fantastic in the polls!',
                        'New pro-Neuro law passes without a hitch thanks to your firm grasp of the political ecosystem!',
                        'Your appointed senators are overturning Neuro bans left and right!'
                    ]));
                }

                if (Game.cookiesEarned < 5) list.push('Such a grand day to begin a new business.');
                else if (Game.cookiesEarned < 50) list.push('You\'re baking up a storm!');
                else if (Game.cookiesEarned < 100) list.push('You are confident that one day, your Neuro company will be the greatest on the market!');
                else if (Game.cookiesEarned < 1000) list.push('Business is picking up!');
                else if (Game.cookiesEarned < 5000) list.push('You\'re making sales left and right!');
                else if (Game.cookiesEarned < 20000) list.push('Everyone wants to buy your Neuros!');
                else if (Game.cookiesEarned < 50000) list.push('You are now spending most of your day signing contracts!');
                else if (Game.cookiesEarned < 500000) list.push('You\'ve been elected "business tycoon of the year"!');
                else if (Game.cookiesEarned < 1000000) list.push('Your Neuros are a worldwide sensation! Well done, old chap!');
                else if (Game.cookiesEarned < 5000000) list.push('Your brand has made its way into popular culture. Children recite your slogans and adults reminisce them fondly!');
                else if (Game.cookiesEarned < 1000000000) list.push('A business day like any other. It\'s good to be at the top!');
                else if (Game.cookiesEarned < 10100000000) list.push('You look back at your career. It\'s been a fascinating journey, building your baking empire from the ground up.');//only show this for 100 millions
            }

            for (let i in Game.customTickers) {
                let arr = Game.customTickers[i]();
                for (let ii in arr) list.push(arr[ii]);
            }

            Game.TickerAge = Game.fps * 10;
            Game.Ticker = chooseRandomElement(list);
            Game.AddToLog(Game.Ticker);
            Game.TickerN++;
            Game.TickerDraw();
        }
        Game.tickerL = elementByID('commentsText');
        Game.tickerBelowL = elementByID('commentsTextBelow');
        Game.tickerCompactL = elementByID('compactCommentsText');
        Game.TickerDraw = function () {
            let str = '';
            if (Game.Ticker !== '') str = Game.Ticker;
            Game.tickerBelowL.innerHTML = Game.tickerL.innerHTML;
            Game.tickerL.innerHTML = str;
            Game.tickerCompactL.innerHTML = str;

            Game.tickerBelowL.className = 'commentsText';
            void Game.tickerBelowL.offsetWidth;
            Game.tickerBelowL.className = 'commentsText risingAway';
            Game.tickerL.className = 'commentsText';
            void Game.tickerL.offsetWidth;
            Game.tickerL.className = 'commentsText risingUp';
        }
        AddEvent(Game.tickerL, 'click', event => {
            Game.Ticker = '';
            Game.TickerClicks++;
            if (Game.TickerClicks === 50) {
                Game.Win('Tabloid addiction');
            }
        });

        Game.Log = [];
        Game.AddToLog = what => {
            Game.Log.unshift(what);
            if (Game.Log.length > 100) Game.Log.pop();
        }

        Game.vanilla = 1;
        /*=====================================================================================
		BUILDINGS
		=======================================================================================*/
        Game.last = 0;

        Game.storeToRefresh = 1;
        Game.priceIncrease = 1.15;
        Game.buyBulk = 1;
        Game.buyMode = 1;//1 for buy, -1 for sell
        Game.buyBulkOld = Game.buyBulk;//used to undo changes from holding Shift or Ctrl
        Game.buyBulkShortcut = 0;//are we pressing Shift or Ctrl?

        Game.Objects = [];
        Game.ObjectsById = [];
        Game.ObjectsN = 0;
        Game.BuildingsOwned = 0;
        Game.Object = function (name, commonName, desc, icon, iconColumn, art, price, cps, buyFunction) {
            let str;
            this.id = Game.ObjectsN;
            this.name = name;
            this.displayName = this.name;
            commonName = commonName.split('|');
            this.single = commonName[0];
            this.plural = commonName[1];
            this.actionName = commonName[2];
            this.extraName = commonName[3];
            this.extraPlural = commonName[4];
            this.desc = desc;
            this.basePrice = price;
            this.price = this.basePrice;
            this.bulkPrice = this.price;
            this.cps = cps;
            this.baseCps = this.cps;
            this.mouseOn = false;
            this.mousePos = [-100, -100];
            this.productionAchievs = [];

            this.n = this.id;
            if (this.n !== 0) {
                //new automated price and CpS curves
                //this.baseCps=Math.ceil(((this.n*0.5)*Math.pow(this.n*1,this.n*0.9))*10)/10;
                //this.baseCps=Math.ceil((Math.pow(this.n*1,this.n*0.5+2.35))*10)/10;//by a fortunate coincidence, this gives the 3rd, 4th and 5th buildings a CpS of 10, 69 and 420
                this.baseCps = Math.ceil((Math.pow(this.n * 1, this.n * 0.5 + 2)) * 10) / 10;//0.45 used to be 0.5
                //this.baseCps=Math.ceil((Math.pow(this.n*1,this.n*0.45+2.10))*10)/10;
                //clamp 14,467,199 to 14,000,000 (there's probably a more elegant way to do that)
                let digits = Math.pow(10, (Math.ceil(Math.log(Math.ceil(this.baseCps)) / Math.LN10))) / 100;
                this.baseCps = Math.round(this.baseCps / digits) * digits;

                this.basePrice = (this.n * 1 + 9 + (this.n < 5 ? 0 : Math.pow(this.n - 5, 1.75) * 5)) * Math.pow(10, this.n);
                //this.basePrice=(this.n*2.5+7.5)*Math.pow(10,this.n);
                digits = Math.pow(10, (Math.ceil(Math.log(Math.ceil(this.basePrice)) / Math.LN10))) / 100;
                this.basePrice = Math.round(this.basePrice / digits) * digits;
                this.price = this.basePrice;
                this.bulkPrice = this.price;
            }

            this.totalCookies = 0;
            this.storedTotalCps = 0;
            this.icon = icon;
            this.iconColumn = iconColumn;
            this.art = art;
            if (art.base) {
                art.pic = art.base + '.png';
                art.bg = art.base + 'Background.png';
            }
            this.buyFunction = buyFunction;
            this.locked = 1;
            this.level = 0;
            this.vanilla = Game.vanilla;

            this.tieredUpgrades = [];
            this.tieredAchievs = [];
            this.synergies = [];

            this.amount = 0;
            this.bought = 0;
            this.free = 0;

            this.eachFrame = 0;

            this.minigameUrl = 0;//if this is defined, load the specified script if the building's level is at least 1
            this.minigameName = 0;
            this.onMinigame = false;
            this.minigameLoaded = false;

            this.switchMinigame = function (on)//change whether we're on the building's minigame
            {
                if (!Game.isMinigameReady(this)) on = false;
                if (on === -1) on = !this.onMinigame;
                this.onMinigame = on;
                if (this.id !== 0) {
                    if (this.onMinigame) {
                        elementByID('row' + this.id).classList.add('onMinigame');
                        //l('rowSpecial'+this.id).style.display='block';
                        //l('rowCanvas'+this.id).style.display='none';
                        if (this.minigame.onResize) this.minigame.onResize();
                    } else {
                        elementByID('row' + this.id).classList.remove('onMinigame');
                        //l('rowSpecial'+this.id).style.display='none';
                        //l('rowCanvas'+this.id).style.display='block';
                    }
                }
                this.refresh();
            }

            this.getPrice = function (n) {
                let price = this.basePrice * Math.pow(Game.priceIncrease, Math.max(0, this.amount - this.free));
                price = Game.modifyBuildingPrice(this, price);
                return Math.ceil(price);
            }
            this.getSumPrice = function (amount)//return how much it would cost to buy [amount] more of this building
            {
                let price = 0;
                for (let i = Math.max(0, this.amount); i < Math.max(0, (this.amount) + amount); i++) {
                    price += this.basePrice * Math.pow(Game.priceIncrease, Math.max(0, i - this.free));
                }
                price = Game.modifyBuildingPrice(this, price);
                return Math.ceil(price);
            }
            this.getReverseSumPrice = function (amount)//return how much you'd get from selling [amount] of this building
            {
                let price = 0;
                for (let i = Math.max(0, (this.amount) - amount); i < Math.max(0, this.amount); i++) {
                    price += this.basePrice * Math.pow(Game.priceIncrease, Math.max(0, i - this.free));
                }
                price = Game.modifyBuildingPrice(this, price);
                price *= this.getSellMultiplier();
                return Math.ceil(price);
            }
            this.getSellMultiplier = () => {
                let giveBack = 0.25;
                if (Game.hasAura('Earth Shatterer')) giveBack = 0.5;
                return giveBack;
            }

            this.buy = function (amount) {
                if (Game.buyMode === -1) {
                    this.sell(Game.buyBulk);
                    return 0;
                }
                let success = 0;
                let moni = 0;
                let bought = 0;
                if (!amount) amount = Game.buyBulk;
                if (amount === -1) amount = 1000;
                for (let i = 0; i < amount; i++) {
                    let price = this.getPrice();
                    if (Game.cookies >= price) {
                        bought++;
                        moni += price;
                        Game.Spend(price);
                        this.amount++;
                        this.bought++;
                        price = this.getPrice();
                        this.price = price;
                        if (this.buyFunction) this.buyFunction();
                        Game.recalculateGains = 1;
                        if (this.amount === 1 && this.id !== 0) elementByID('row' + this.id).classList.add('enabled');
                        Game.BuildingsOwned++;
                        success = 1;
                    }
                }
                if (success) {
                    PlaySound('/snd/buy' + chooseRandomElement([1, 2, 3, 4]) + '.mp3', 0.75);
                    this.refresh();
                }
                //if (moni>0 && amount>1) Game.Notify(this.name,'Bought <b>'+bought+'</b> for '+Beautify(moni)+' cookies','',2);
            }
            this.sell = function (amount) {
                let success = 0;
                let moni = 0;
                let sold = 0;
                if (amount === -1) amount = this.amount;
                if (!amount) amount = Game.buyBulk;
                for (let i = 0; i < amount; i++) {
                    let price = this.getPrice();
                    const giveBack = this.getSellMultiplier();
                    price = Math.floor(price * giveBack);
                    if (this.amount > 0) {
                        sold++;
                        moni += price;
                        Game.cookies += price;
                        Game.cookiesEarned = Math.max(Game.cookies, Game.cookiesEarned);//this is to avoid players getting the cheater achievement when selling buildings that have a higher price than they used to
                        this.amount--;
                        price = this.getPrice();
                        this.price = price;
                        if (this.sellFunction) this.sellFunction();
                        Game.recalculateGains = 1;
                        if (this.amount === 0 && this.id !== 0) elementByID('row' + this.id).classList.remove('enabled');
                        Game.BuildingsOwned--;
                        success = 1;
                    }
                }
                if (success && Game.hasGod) {
                    let godLvl = Game.hasGod('ruin');
                    let old = Game.hasBuff('Devastation');
                    if (old) {
                        if (godLvl === 1) old.multClick += sold * 0.01;
                        else if (godLvl === 2) old.multClick += sold * 0.005;
                        else if (godLvl === 3) old.multClick += sold * 0.0025;
                    } else {
                        if (godLvl === 1) Game.gainBuff('devastation', 10, 1 + sold * 0.01);
                        else if (godLvl === 2) Game.gainBuff('devastation', 10, 1 + sold * 0.005);
                        else if (godLvl === 3) Game.gainBuff('devastation', 10, 1 + sold * 0.0025);
                    }
                }
                if (success) {
                    PlaySound('/snd/sell' + chooseRandomElement([1, 2, 3, 4]) + '.mp3', 0.75);
                    this.refresh();
                }
                //if (moni>0) Game.Notify(this.name,'Sold <b>'+sold+'</b> for '+Beautify(moni)+' cookies','',2);
            }
            this.sacrifice = function (amount)//sell without getting back any money
            {
                let success = 0;
                //var moni=0;
                let sold = 0;
                if (amount === -1) amount = this.amount;
                if (!amount) amount = 1;
                for (let i = 0; i < amount; i++) {
                    let price = this.getPrice();
                    price = Math.floor(price * 0.5);
                    if (this.amount > 0) {
                        sold++;
                        //moni+=price;
                        //Game.cookies+=price;
                        //Game.cookiesEarned=Math.max(Game.cookies,Game.cookiesEarned);
                        this.amount--;
                        price = this.getPrice();
                        this.price = price;
                        if (this.sellFunction) this.sellFunction();
                        Game.recalculateGains = 1;
                        if (this.amount === 0 && this.id !== 0) elementByID('row' + this.id).classList.remove('enabled');
                        Game.BuildingsOwned--;
                        success = 1;
                    }
                }
                if (success) {
                    this.refresh();
                }
                //if (moni>0) Game.Notify(this.name,'Sold <b>'+sold+'</b> for '+Beautify(moni)+' cookies','',2);
            }
            this.buyFree = function (amount)//unlike getFree, this still increases the price
            {
                for (let i = 0; i < amount; i++) {
                    if (Game.cookies >= price) {
                        this.amount++;
                        this.bought++;
                        this.price = this.getPrice();
                        Game.recalculateGains = 1;
                        if (this.amount === 1 && this.id !== 0) elementByID('row' + this.id).classList.add('enabled');
                        Game.BuildingsOwned++;
                    }
                }
                this.refresh();
            }
            this.getFree = function (amount)//get X of this building for free, with the price behaving as if you still didn't have them
            {
                this.amount += amount;
                this.bought += amount;
                this.free += amount;
                Game.BuildingsOwned += amount;
                this.refresh();
            }

            this.tooltip = function () {
                let boost;
                let other;
                let i;
                let me = this;
                let desc = me.desc;
                let name = me.name;
                if (Game.season === 'fools') {
                    if (!Game.foolObjects[me.name]) {
                        name = Game.foolObjects['Unknown'].name;
                        desc = Game.foolObjects['Unknown'].desc;
                    } else {
                        name = Game.foolObjects[me.name].name;
                        desc = Game.foolObjects[me.name].desc;
                    }
                }
                let icon = [me.iconColumn, 0];
                if (me.locked) {
                    name = '???';
                    desc = '';
                    icon = [0, 7];
                }
                //if (l('rowInfo'+me.id) && Game.drawT%10==0) l('rowInfoContent'+me.id).innerHTML='&bull; '+me.amount+' '+(me.amount==1?me.single:me.plural)+'<br>&bull; producing '+Beautify(me.storedTotalCps,1)+' '+(me.storedTotalCps==1?'cookie':'cookies')+' per second<br>&bull; total : '+Beautify(me.totalCookies)+' '+(Math.floor(me.totalCookies)==1?'cookie':'cookies')+' '+me.actionName;

                let canBuy = false;
                let price = me.bulkPrice;
                if ((Game.buyMode === 1 && Game.cookies >= price) || (Game.buyMode === -1 && me.amount > 0)) canBuy = true;

                let synergiesStr = '';
                //note : might not be entirely accurate, math may need checking
                if (me.amount > 0) {
                    let synergiesWith = {};
                    let synergyBoost = 0;

                    if (me.name === 'Grandma') {
                        for (i in Game.GrandmaSynergies) {
                            if (Game.Has(Game.GrandmaSynergies[i])) {
                                other = Game.Upgrades[Game.GrandmaSynergies[i]].buildingTie;
                                let mult = me.amount * 0.01 * (1 / (other.id - 1));
                                boost = (other.storedTotalCps * Game.globalCpsMult) - (other.storedTotalCps * Game.globalCpsMult) / (1 + mult);
                                synergyBoost += boost;
                                if (!synergiesWith[other.plural]) synergiesWith[other.plural] = 0;
                                synergiesWith[other.plural] += mult;
                            }
                        }
                    } else if (me.name === 'Portal' && Game.Has('Elder Pact')) {
                        other = Game.Objects['Grandma'];
                        boost = (me.amount * 0.05 * other.amount) * Game.globalCpsMult;
                        synergyBoost += boost;
                        if (!synergiesWith[other.plural]) synergiesWith[other.plural] = 0;
                        synergiesWith[other.plural] += boost / (other.storedTotalCps * Game.globalCpsMult);
                    }

                    for (i in me.synergies) {
                        let it = me.synergies[i];
                        if (Game.Has(it.name)) {
                            let weight = 0.05;
                            other = it.buildingTie1;
                            if (me === it.buildingTie1) {
                                weight = 0.001;
                                other = it.buildingTie2;
                            }
                            boost = (other.storedTotalCps * Game.globalCpsMult) - (other.storedTotalCps * Game.globalCpsMult) / (1 + me.amount * weight);
                            synergyBoost += boost;
                            if (!synergiesWith[other.plural]) synergiesWith[other.plural] = 0;
                            synergiesWith[other.plural] += me.amount * weight;
                            //synergiesStr+='Synergy with '+other.name+'; we boost it by '+Beautify((me.amount*weight)*100,1)+'%, producing '+Beautify(boost)+' CpS. My synergy boost is now '+Beautify((synergyBoost/Game.cookiesPs)*100,1)+'%.<br>';
                        }
                    }
                    if (synergyBoost > 0) {
                        for (i in synergiesWith) {
                            if (synergiesStr !== '') synergiesStr += ', ';
                            synergiesStr += i + ' +' + Beautify(synergiesWith[i] * 100, 1) + '%';
                        }
                        synergiesStr = '...also boosting some other buildings : ' + synergiesStr + ' - all combined, these boosts account for <b>' + Beautify(synergyBoost, 1) + '</b> Neuros per second (<b>' + Beautify((synergyBoost / Game.cookiesPs) * 100, 1) + '%</b> of total CpS)';
                    }
                }

                return '<div style="min-width:350px;padding:8px;"><div class="icon" style="float:left;margin-left:-8px;margin-top:-8px;' + (icon[2] ? 'background-image:url(' + icon[2] + ');' : '') + 'background-position:' + (-icon[0] * 48) + 'px ' + (-icon[1] * 48) + 'px;"></div><div style="float:right;text-align:right;"><span class="price' + (canBuy ? '' : ' disabled') + '">' + Beautify(Math.round(price)) + '</span>' + Game.costDetails(price) + '</div><div class="name">' + name + '</div>' + '<small>[owned : ' + me.amount + '</small>]' + (me.free > 0 ? ' <small>[free : ' + me.free + '</small>!]' : '') +
                    '<div class="line"></div><div class="description">' + desc + '</div>' +
                    (me.totalCookies > 0 ? (
                        '<div class="line"></div><div class="data">' +
                        (me.amount > 0 ? '&bull; each ' + me.single + ' produces <b>' + Beautify((me.storedTotalCps / me.amount) * Game.globalCpsMult, 1) + '</b> ' + ((me.storedTotalCps / me.amount) * Game.globalCpsMult === 1 ? 'Neuro' : 'Neuros') + ' per second<br>' : '') +
                        '&bull; ' + me.amount + ' ' + (me.amount === 1 ? me.single : me.plural) + ' producing <b>' + Beautify(me.storedTotalCps * Game.globalCpsMult, 1) + '</b> ' + (me.storedTotalCps * Game.globalCpsMult === 1 ? 'Neuro' : 'Neuros') + ' per second (<b>' + Beautify(Game.cookiesPs > 0 ? ((me.amount > 0 ? ((me.storedTotalCps * Game.globalCpsMult) / Game.cookiesPs) : 0) * 100) : 0, 1) + '%</b> of total CpS)<br>' +
                        (synergiesStr ? ('&bull; ' + synergiesStr + '<br>') : '') +
                        '&bull; <b>' + Beautify(me.totalCookies) + '</b> ' + (Math.floor(me.totalCookies) === 1 ? 'Neuro' : 'Neuros') + ' ' + me.actionName + ' so far</div>'
                    ) : '') +
                    '</div>';
            }

            this.levelTooltip = function () {
                let me = this;
                return '<div style="width:280px;padding:8px;"><b>Level ' + Beautify(me.level) + ' ' + me.plural + '</b><div class="line"></div>' + (me.level === 1 ? me.extraName : me.extraPlural).replace('[X]', Beautify(me.level)) + ' granting <b>+' + Beautify(me.level) + '% ' + me.name + ' CpS</b>.<div class="line"></div>Click to level up for <span class="price lump' + (Game.lumps >= me.level + 1 ? '' : ' disabled') + '">' + Beautify(me.level + 1) + ' sugar lump' + (me.level === 0 ? '' : 's') + '</span>.' + ((me.level === 0 && me.minigameUrl) ? '<div class="line"></div><b>Levelling up this building unlocks a minigame.</b>' : '') + '</div>';
            }

            this.levelUp = (me => () => {
                Game.spendLump(me.level + 1, 'level up your ' + me.plural, function () {
                    me.level += 1;
                    if (me.level >= 10 && me.levelAchiev10) Game.Win(me.levelAchiev10.name);
                    PlaySound('snd/upgrade.mp3', 0.6);
                    Game.LoadMinigames();
                    me.refresh();
                    if (elementByID('productLevel' + me.id)) {
                        let rect = elementByID('productLevel' + me.id).getBoundingClientRect();
                        Game.SparkleAt((rect.left + rect.right) / 2, (rect.top + rect.bottom) / 2 - 24);
                    }
                    if (me.minigame && me.minigame.onLevel) me.minigame.onLevel(me.level);
                })();
            })(this);

            this.refresh = function ()//show/hide the building display based on its amount, and redraw it
            {
                this.price = this.getPrice();
                if (Game.buyMode === 1) this.bulkPrice = this.getSumPrice(Game.buyBulk);
                else if (Game.buyMode === -1 && Game.buyBulk === -1) this.bulkPrice = this.getReverseSumPrice(1000);
                else if (Game.buyMode === -1) this.bulkPrice = this.getReverseSumPrice(Game.buyBulk);
                this.rebuild();
                if (this.amount === 0 && this.id !== 0) elementByID('row' + this.id).classList.remove('enabled');
                else if (this.amount > 0 && this.id !== 0) elementByID('row' + this.id).classList.add('enabled');
                if (this.muted > 0 && this.id !== 0) {
                    elementByID('row' + this.id).classList.add('muted');
                    elementByID('mutedProduct' + this.id).style.display = 'inline-block';
                } else if (this.id !== 0) {
                    elementByID('row' + this.id).classList.remove('muted');
                    elementByID('mutedProduct' + this.id).style.display = 'none';
                }
                //if (!this.onMinigame && !this.muted) {}
                //else this.pics=[];
            }
            this.rebuild = function () {
                let me = this;
                //var classes='product';
                let price = me.bulkPrice;
                /*if (Game.cookiesEarned>=me.basePrice || me.bought>0) {classes+=' unlocked';me.locked=0;} else {classes+=' locked';me.locked=1;}
				if (Game.cookies>=price) classes+=' enabled'; else classes+=' disabled';
				if (me.l.className.indexOf('toggledOff')!=-1) classes+=' toggledOff';
				*/
                let icon = [0, me.icon];
                let iconOff = [1, me.icon];
                if (me.iconFunc) icon = me.iconFunc();

                let desc = me.desc;
                let name = me.name;
                let displayName = me.displayName;
                if (Game.season === 'fools') {
                    if (!Game.foolObjects[me.name]) {
                        icon = [2, 0];
                        iconOff = [3, 0];
                        name = Game.foolObjects['Unknown'].name;
                    } else {
                        icon = [2, me.icon];
                        iconOff = [3, me.icon];
                        name = Game.foolObjects[me.name].name;
                    }
                    displayName = name;
                    if (name.length > 16) displayName = '<span style="font-size:75%;">' + name + '</span>';
                }
                icon = [icon[0] * 64, icon[1] * 64];
                iconOff = [iconOff[0] * 64, iconOff[1] * 64];

                //me.l.className=classes;
                //l('productIcon'+me.id).style.backgroundImage='url(img/'+icon+')';
                elementByID('productIcon' + me.id).style.backgroundPosition = '-' + icon[0] + 'px -' + icon[1] + 'px';
                //l('productIconOff'+me.id).style.backgroundImage='url(img/'+iconOff+')';
                elementByID('productIconOff' + me.id).style.backgroundPosition = '-' + iconOff[0] + 'px -' + iconOff[1] + 'px';
                elementByID('productName' + me.id).innerHTML = displayName;
                elementByID('productOwned' + me.id).innerHTML = me.amount ? me.amount : '';
                elementByID('productPrice' + me.id).innerHTML = Beautify(Math.round(price));
                elementByID('productPriceMult' + me.id).innerHTML = (Game.buyBulk > 1) ? ('x' + Game.buyBulk + ' ') : '';
                elementByID('productLevel' + me.id).innerHTML = 'lvl ' + Beautify(me.level);
                if (Game.isMinigameReady(me) && Game.ascensionMode !== 1) {
                    elementByID('productMinigameButton' + me.id).style.display = 'block';
                    if (!me.onMinigame) elementByID('productMinigameButton' + me.id).innerHTML = 'View ' + me.minigameName;
                    else elementByID('productMinigameButton' + me.id).innerHTML = 'Close ' + me.minigameName;
                } else elementByID('productMinigameButton' + me.id).style.display = 'none';
            }
            this.muted = false;
            this.mute = function (val) {
                if (this.id === 0) return false;
                this.muted = val;
                if (val) {
                    elementByID('productMute' + this.id).classList.add('on');
                    elementByID('row' + this.id).classList.add('muted');
                    elementByID('mutedProduct' + this.id).style.display = 'inline-block';
                } else {
                    elementByID('productMute' + this.id).classList.remove('on');
                    elementByID('row' + this.id).classList.remove('muted');
                    elementByID('mutedProduct' + this.id).style.display = 'none';
                }
            };

            this.draw = () => {
            };

            if (this.id === 0) {
                str = '<div class="productButtons">';
                str += '<div id="productLevel' + this.id + '" class="productButton productLevel lumpsOnly" onclick="Game.ObjectsById[' + this.id + '].levelUp()" ' + Game.getDynamicTooltip('Game.ObjectsById[' + this.id + '].levelTooltip', 'this') + '></div>';
                str += '<div id="productMinigameButton' + this.id + '" class="productButton productMinigameButton lumpsOnly" onclick="Game.ObjectsById[' + this.id + '].switchMinigame(-1);PlaySound(Game.ObjectsById[' + this.id + '].onMinigame?\'snd/clickOn.mp3\':\'snd/clickOff.mp3\');"></div>';
                str += '</div>';
                elementByID('sectionLeftExtra').innerHTML = elementByID('sectionLeftExtra').innerHTML + str;
            } else//draw it
            {
                str = '<div class="row" id="row' + this.id + '"><div class="separatorBottom"></div>';
                str += '<div class="productButtons">';
                str += '<div id="productLevel' + this.id + '" class="productButton productLevel lumpsOnly" onclick="Game.ObjectsById[' + this.id + '].levelUp()" ' + Game.getDynamicTooltip('Game.ObjectsById[' + this.id + '].levelTooltip', 'this') + '></div>';
                str += '<div id="productMinigameButton' + this.id + '" class="productButton productMinigameButton lumpsOnly" onclick="Game.ObjectsById[' + this.id + '].switchMinigame(-1);PlaySound(Game.ObjectsById[' + this.id + '].onMinigame?\'snd/clickOn.mp3\':\'snd/clickOff.mp3\');"></div>';
                str += '<div class="productButton productMute" ' + Game.getTooltip('<div style="width:150px;text-align:center;font-size:11px;"><b>Mute</b><br>(Minimize this building)</div>', 'this') + ' onclick="Game.ObjectsById[' + this.id + '].mute(1);PlaySound(Game.ObjectsById[' + this.id + '].muted?\'snd/clickOff.mp3\':\'snd/clickOn.mp3\');" id="productMute' + this.id + '">Mute</div>';
                str += '</div>';
                str += '<canvas class="rowCanvas" id="rowCanvas' + this.id + '"></canvas>';
                str += '<div class="rowSpecial" id="rowSpecial' + this.id + '"></div>';
                str += '</div>';
                elementByID('rows').innerHTML = elementByID('rows').innerHTML + str;

                //building canvas
                this.pics = [];

                this.toResize = true;
                this.redraw = function () {
                    let me = this;
                    me.pics = [];
                }
                this.draw = function () {
                    let selected;
                    if (this.amount <= 0) return false;
                    if (this.toResize) {
                        this.canvas.width = this.canvas.clientWidth;
                        this.canvas.height = this.canvas.clientHeight;
                        this.toResize = false;
                    }
                    let ctx = this.ctx;
                    //clear
                    //ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
                    ctx.globalAlpha = 1;

                    //pic : a loaded picture or a function returning a loaded picture
                    //bg : a loaded picture or a function returning a loaded picture - tiled as the background, 128x128
                    //xV : the pictures will have a random horizontal shift by this many pixels
                    //yV : the pictures will have a random vertical shift by this many pixels
                    //w : how many pixels between each picture (or row of pictures)
                    //x : horizontal offset
                    //y : vertical offset (+32)
                    //rows : if >1, arrange the pictures in rows containing this many pictures

                    let pic = this.art.pic;
                    let bg = this.art.bg;
                    let xV = this.art.xV || 0;
                    let yV = this.art.yV || 0;
                    let w = this.art.w || 48;
                    let h = this.art.h || 48;
                    let offX = this.art.x || 0;
                    let offY = this.art.y || 0;
                    let rows = this.art.rows || 1;

                    if (typeof (bg) == 'string') ctx.fillPattern(Pic(this.art.bg), 0, 0, this.canvas.width, this.canvas.height, 128, 128);
                    else bg(this, ctx);
                    /*
					ctx.globalAlpha=0.5;
					if (typeof(bg)=='string')//test
					{
						ctx.fillPattern(Pic(this.art.bg),-128+Game.T%128,0,this.canvas.width+128,this.canvas.height,128,128);
						ctx.fillPattern(Pic(this.art.bg),-128+Math.floor(Game.T/2)%128,-128+Math.floor(Game.T/2)%128,this.canvas.width+128,this.canvas.height+128,128,128);
					}
					ctx.globalAlpha=1;
					*/
                    let maxI = Math.floor(this.canvas.width / (w / rows) + 1);
                    let iT = Math.min(this.amount, maxI);
                    let i = this.pics.length;


                    let x = 0;
                    let y = 0;
                    let added = 0;
                    if (i !== iT) {
                        //for (var iter=0;iter<3;iter++)
                        //{
                        while (i < iT)
                            //if (i<iT)
                        {
                            Math.seededRandom(Game.seed + ' ' + this.id + ' ' + i);
                            if (rows !== 1) {
                                x = Math.floor(i / rows) * w + ((i % rows) / rows) * w + Math.floor((Math.random() - 0.5) * xV) + offX;
                                y = 32 + Math.floor((Math.random() - 0.5) * yV) + ((-rows / 2) * 32 / 2 + (i % rows) * 32 / 2) + offY;
                            } else {
                                x = i * w + Math.floor((Math.random() - 0.5) * xV) + offX;
                                y = 32 + Math.floor((Math.random() - 0.5) * yV) + offY;
                            }
                            let usedPic = (typeof (pic) == 'string' ? pic : pic(this, i));
                            this.pics.push({x: Math.floor(x), y: Math.floor(y), z: y, pic: usedPic, id: i});
                            i++;
                            added++;
                        }
                        while (i > iT)
                            //else if (i>iT)
                        {
                            this.pics.sort(Game.sortSpritesById);
                            this.pics.pop();
                            i--;
                            added--;
                        }
                        //}
                        this.pics.sort(Game.sortSprites);
                    }

                    let len = this.pics.length;

                    if (this.mouseOn) {
                        selected = -1;
                        //mouse detection only fits grandma sprites for now
                        const marginW = -18;
                        const marginH = -10;
                        for (i = 0; i < len; i++) {
                            pic = this.pics[i];
                            if (this.mousePos[0] >= pic.x - marginW && this.mousePos[0] < pic.x + 64 + marginW && this.mousePos[1] >= pic.y - marginH && this.mousePos[1] < pic.y + 64 + marginH) selected = i;
                        }
                    }

                    Math.seededRandom();

                    for (i = 0; i < len; i++) {
                        pic = this.pics[i];
                        if (selected === i && this.name === 'Grandma') {
                            ctx.font = '14px Merriweather';
                            ctx.textAlign = 'center';
                            Math.seededRandom(Game.seed + ' ' + pic.id/*+' '+pic.id*/);//(Game.seed+' '+pic.id+' '+pic.x+' '+pic.y);
                            let years = ((Date.now() - new Date(2013, 7, 8)) / (1000 * 60 * 60 * 24 * 365)) + Math.random();//the grandmas age with the game
                            let name = chooseRandomElement(Game.grandmaNames);
                            let custom = false;
                            if (Game.prefs.customGrandmas && Game.customGrandmaNames.length > 0 && Math.random() < 0.2) {
                                name = chooseRandomElement(Game.customGrandmaNames);
                                custom = true;
                            }
                            let text = name + ', age ' + Beautify(Math.floor(70 + Math.random() * 30 + years + this.level));
                            let width = ctx.measureText(text).width + 12;
                            x = Math.max(0, Math.min(pic.x + 32 - width / 2 + Math.random() * 32 - 16, this.canvas.width - width));
                            y = 4 + Math.random() * 8 - 4;
                            Math.seededRandom();
                            ctx.fillStyle = '#000';
                            ctx.strokeStyle = '#000';
                            ctx.lineWidth = 8;
                            ctx.globalAlpha = 0.75;
                            ctx.beginPath();
                            ctx.moveTo(pic.x + 32, pic.y + 32);
                            ctx.lineTo(Math.floor(x + width / 2), Math.floor(y + 20));
                            ctx.stroke();
                            ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(width), 24);
                            ctx.globalAlpha = 1;
                            if (custom) ctx.fillStyle = '#fff';
                            else ctx.fillStyle = 'rgba(255,255,255,0.7)';
                            ctx.fillText(text, Math.floor(x + width / 2), Math.floor(y + 16));

                            ctx.drawImage(Pic(pic.pic), Math.floor(pic.x + Math.random() * 4 - 2), Math.floor(pic.y + Math.random() * 4 - 2));
                        } else ctx.drawImage(Pic(pic.pic), pic.x, pic.y);
                    }

                    /*
					var picX=this.id;
					var picY=12;
					var w=1;
					var h=1;
					var w=Math.abs(Math.cos(Game.T*0.2+this.id*2-0.3))*0.2+0.8;
					var h=Math.abs(Math.sin(Game.T*0.2+this.id*2))*0.3+0.7;
					var x=64+Math.cos(Game.T*0.19+this.id*2)*8-24*w;
					var y=128-Math.abs(Math.pow(Math.sin(Game.T*0.2+this.id*2),5)*16)-48*h;
					ctx.drawImage(Pic('icons.png'),picX*48,picY*48,48,48,Math.floor(x),Math.floor(y),48*w,48*h);
					*/
                }
            }

            Game.last = this;
            Game.Objects[this.name] = this;
            Game.ObjectsById[this.id] = this;
            Game.ObjectsN++;
            return this;
        }

        Game.DrawBuildings = () => {
            if (Game.drawT % 3 === 0) {
                for (let i in Game.Objects) {
                    let me = Game.Objects[i];
                    if (me.id > 0 && !me.onMinigame && !me.muted) me.draw();
                    else me.pics = [];
                }
            }
        }

        Game.sortSprites = (a, b) => {
            if (a.z > b.z) return 1;
            else if (a.z < b.z) return -1;
            else return 0;
        }
        Game.sortSpritesById = (a, b) => {
            if (a.id > b.id) return 1;
            else if (a.id < b.id) return -1;
            else return 0;
        }

        Game.modifyBuildingPrice = (building, price) => {
            if (Game.Has('Season savings')) price *= 0.99;
            if (Game.Has('Santa\'s dominion')) price *= 0.99;
            if (Game.Has('Faberge egg')) price *= 0.99;
            if (Game.Has('Divine discount')) price *= 0.99;
            if (Game.hasAura('Fierce Hoarder')) price *= 0.98;
            if (Game.hasBuff('Everything must go')) price *= 0.95;
            if (Game.hasBuff('Crafty pixies')) price *= 0.98;
            if (Game.hasBuff('Nasty goblins')) price *= 1.02;
            price *= Game.eff('buildingCost');
            if (Game.hasGod) {
                let godLvl = Game.hasGod('creation');
                if (godLvl === 1) price *= 0.93;
                else if (godLvl === 2) price *= 0.95;
                else if (godLvl === 3) price *= 0.98;
            }
            return price;
        }

        Game.storeBulkButton = id => {
            if (id === 0) Game.buyMode = 1;
            else if (id === 1) Game.buyMode = -1;
            else if (id === 2) Game.buyBulk = 1;
            else if (id === 3) Game.buyBulk = 10;
            else if (id === 4) Game.buyBulk = 100;
            else if (id === 5) Game.buyBulk = -1;

            if (Game.buyMode === 1 && Game.buyBulk === -1) Game.buyBulk = 100;

            if (Game.buyMode === 1) elementByID('storeBulkBuy').className = 'storePreButton storeBulkMode selected'; else elementByID('storeBulkBuy').className = 'storePreButton storeBulkMode';
            if (Game.buyMode === -1) elementByID('storeBulkSell').className = 'storePreButton storeBulkMode selected'; else elementByID('storeBulkSell').className = 'storePreButton storeBulkMode';

            if (Game.buyBulk === 1) elementByID('storeBulk1').className = 'storePreButton storeBulkAmount selected'; else elementByID('storeBulk1').className = 'storePreButton storeBulkAmount';
            if (Game.buyBulk === 10) elementByID('storeBulk10').className = 'storePreButton storeBulkAmount selected'; else elementByID('storeBulk10').className = 'storePreButton storeBulkAmount';
            if (Game.buyBulk === 100) elementByID('storeBulk100').className = 'storePreButton storeBulkAmount selected'; else elementByID('storeBulk100').className = 'storePreButton storeBulkAmount';
            if (Game.buyBulk === -1) elementByID('storeBulkMax').className = 'storePreButton storeBulkAmount selected'; else elementByID('storeBulkMax').className = 'storePreButton storeBulkAmount';

            if (Game.buyMode === 1) {
                elementByID('storeBulkMax').style.visibility = 'hidden';
                elementByID('products').className = 'storeSection';
            } else {
                elementByID('storeBulkMax').style.visibility = 'visible';
                elementByID('products').className = 'storeSection selling';
            }

            Game.storeToRefresh = 1;
            if (id !== -1) PlaySound('snd/tick.mp3');
        }
        Game.BuildStore = () => {
            let me;
            let i;
//if (typeof showAds!=='undefined') l('store').scrollTop=100;

            let str = '';
            str += '<div id="storeBulk" class="storePre" ' + Game.getTooltip(
                    '<div style="padding:8px;min-width:200px;text-align:center;font-size:11px;">You can also press <b>Ctrl</b> to bulk-buy or sell <b>10</b> of a building at a time, or <b>Shift</b> for <b>100</b>.</div>'
                    , 'store') +
                '>' +
                '<div id="storeBulkBuy" class="storePreButton storeBulkMode" ' + Game.clickStr + '="Game.storeBulkButton(0);">Buy</div>' +
                '<div id="storeBulkSell" class="storePreButton storeBulkMode" ' + Game.clickStr + '="Game.storeBulkButton(1);">Sell</div>' +
                '<div id="storeBulk1" class="storePreButton storeBulkAmount" ' + Game.clickStr + '="Game.storeBulkButton(2);">1</div>' +
                '<div id="storeBulk10" class="storePreButton storeBulkAmount" ' + Game.clickStr + '="Game.storeBulkButton(3);">10</div>' +
                '<div id="storeBulk100" class="storePreButton storeBulkAmount" ' + Game.clickStr + '="Game.storeBulkButton(4);">100</div>' +
                '<div id="storeBulkMax" class="storePreButton storeBulkAmount" ' + Game.clickStr + '="Game.storeBulkButton(5);">all</div>' +
                '</div>';
            for (i in Game.Objects) {
                me = Game.Objects[i];
                str += '<div class="product toggledOff" ' + Game.getDynamicTooltip('Game.ObjectsById[' + me.id + '].tooltip', 'store') + ' id="product' + me.id + '"><div class="icon off" id="productIconOff' + me.id + '" style=""></div><div class="icon" id="productIcon' + me.id + '" style=""></div><div class="content"><div class="lockedTitle">???</div><div class="title" id="productName' + me.id + '"></div><span class="priceMult" id="productPriceMult' + me.id + '"></span><span class="price" id="productPrice' + me.id + '"></span><div class="title owned" id="productOwned' + me.id + '"></div></div>' +
                    /*'<div class="buySell"><div style="left:0px;" id="buttonBuy10-'+me.id+'">Buy 10</div><div style="left:100px;" id="buttonSell-'+me.id+'">Sell 1</div><div style="left:200px;" id="buttonSellAll-'+me.id+'">Sell all</div></div>'+*/
                    '</div>';
            }
            elementByID('products').innerHTML = str;

            Game.storeBulkButton(-1);

             function SellAllPrompt(id) {
                return function (id) {
                    Game.Prompt('<div class="block">Do you really want to sell your ' + Game.ObjectsById[id].amount + ' ' + (Game.ObjectsById[id].amount === 1 ? Game.ObjectsById[id].single : Game.ObjectsById[id].plural) + '?</div>', [['Yes', 'Game.ObjectsById[' + id + '].sell(-1);Game.ClosePrompt();'], ['No', 'Game.ClosePrompt();']]);
                }(id);
            }

            Game.ClickProduct = function (what) {
                Game.ObjectsById[what].buy();
            }

            for (i in Game.Objects) {
                me = Game.Objects[i];
                me.l = elementByID('product' + me.id);

                //these are a bit messy but ah well
                if (!Game.touchEvents) {
                    AddEvent(me.l, 'click', function (what) {
                        return function (e) {
                            Game.ClickProduct(what);
                            e.preventDefault();
                        };
                    }(me.id));
                } else {
                    AddEvent(me.l, 'touchend', function (what) {
                        return function (e) {
                            Game.ClickProduct(what);
                            e.preventDefault();
                        };
                    }(me.id));
                }
            }
        }

        Game.RefreshStore = () => {
            for (let i in Game.Objects) {
                Game.Objects[i].refresh();
            }
            Game.storeToRefresh = 0;
        }

        Game.ComputeCps = (base, mult, bonus) => {
            if (!bonus) bonus = 0;
            return ((base) * (Math.pow(2, mult)) + bonus);
        }

        function importMinigame(url, id, me) {
            return new Promise((resolve, reject) => {
                Game.scriptBindings['minigameScript-' + id] = me;
                console.log("Load script " + url)
                const script = document.createElement("script");
                script.type = "module";
                script.src = url;
                script.id = id;

                script.onload = () => {
                    resolve(script.module);
                    if (!me.minigameLoaded) Game.scriptLoaded(me);
                };

                script.onerror = () => {
                    reject(new Error("Failed to load module script with URL " + url));
                    script.remove();
                };

                document.head.appendChild(script);
            });
        }

        Game.isMinigameReady = me => (me.minigameUrl && me.minigameLoaded && me.level > 0)
        Game.scriptBindings = [];
        Game.LoadMinigames = () => {
            for (let i in Game.Objects) {
                let me = Game.Objects[i];
                if (me.minigameUrl && me.level > 0 && !me.minigameLoaded && !me.minigameLoading && !elementByID('minigameScript-' + me.id)) {
                    me.minigameLoading = true;
                    console.log("Load minigame " + me.minigameUrl)
                    //we're only loading the minigame scripts that aren't loaded yet and which have enough building level
                    //we call this function on building level up and on load
                    //console.log('Loading script '+me.minigameUrl+'...');
                    setTimeout((me => () => {
                        importMinigame(me.minigameUrl + '?r=' + Game.version, 'minigameScript-' + me.id, me)
                        // let script = document.createElement('script');
                        // script.id = 'minigameScript-' + me.id;
                        // Game.scriptBindings['minigameScript-' + me.id] = me;
                        // script.setAttribute('src', me.minigameUrl + '?r=' + Game.version);
                        // //script.setAttribute('type', 'text/javascript')
                        // script.type = 'text/javascript'
                        // script.onload = ((me, script) => () => {
                        //     if (!me.minigameLoaded) Game.scriptLoaded(me, script);
                        // })(me, 'minigameScript-' + me.id);
                        // document.head.appendChild(script);
                    })(me), 10);
                }
            }
        }
        Game.scriptLoaded = (who) => {
            who.minigameLoading = false;
            who.minigameLoaded = true;
            who.refresh();
            who.minigame.launch();
            if (who.minigameSave) {
                who.minigame.reset(true);
                who.minigame.load(who.minigameSave);
                who.minigameSave = 0;
            }
        }

        Game.magicCpS = what => {
            /*
			if (Game.Objects[what].amount>=250)
			{
				//this makes buildings give 1% more cookies for every building over 250.
				//this turns out to be rather stupidly overpowered.
				var n=Game.Objects[what].amount-250;
				return 1+Math.pow(1.01,n);
			}
			else return 1;
			*/
            return 1;
        }

        //define objects
        new Game.Object('Cursor', 'cursor|cursors|clicked|[X] extra finger|[X] extra fingers', 'Autoclicks once every 10 seconds.', 0, 0, {}, 15, function (me) {
            let add = 0;
            if (Game.Has('Thousand fingers')) add += 0.1;
            if (Game.Has('Million fingers')) add += 0.5;
            if (Game.Has('Billion fingers')) add += 5;
            if (Game.Has('Trillion fingers')) add += 50;
            if (Game.Has('Quadrillion fingers')) add += 500;
            if (Game.Has('Quintillion fingers')) add += 5000;
            if (Game.Has('Sextillion fingers')) add += 50000;
            if (Game.Has('Septillion fingers')) add += 500000;
            if (Game.Has('Octillion fingers')) add += 5000000;
            let mult = 1;
            let num = 0;
            for (let i in Game.Objects) {
                if (Game.Objects[i].name !== 'Cursor') num += Game.Objects[i].amount;
            }
            add = add * num;
            mult *= Game.GetTieredCpsMult(me);
            mult *= Game.magicCpS('Cursor');
            mult *= Game.eff('cursorCps');
            return Game.ComputeCps(0.1, Game.Has('Reinforced index finger') + Game.Has('Carpal tunnel prevention cream') + Game.Has('Ambidextrous'), add) * mult;
        }, function () {
            if (this.amount >= 1) Game.Unlock(['Reinforced index finger', 'Carpal tunnel prevention cream']);
            if (this.amount >= 10) Game.Unlock('Ambidextrous');
            if (this.amount >= 25) Game.Unlock('Thousand fingers');
            if (this.amount >= 50) Game.Unlock('Million fingers');
            if (this.amount >= 100) Game.Unlock('Billion fingers');
            if (this.amount >= 150) Game.Unlock('Trillion fingers');
            if (this.amount >= 200) Game.Unlock('Quadrillion fingers');
            if (this.amount >= 250) Game.Unlock('Quintillion fingers');
            if (this.amount >= 300) Game.Unlock('Sextillion fingers');
            if (this.amount >= 350) Game.Unlock('Septillion fingers');
            if (this.amount >= 400) Game.Unlock('Octillion fingers');

            if (this.amount >= 1) Game.Win('Click');
            if (this.amount >= 2) Game.Win('Double-click');
            if (this.amount >= 50) Game.Win('Mouse wheel');
            if (this.amount >= 100) Game.Win('Of Mice and Men');
            if (this.amount >= 200) Game.Win('The Digital');
            if (this.amount >= 300) Game.Win('Extreme polydactyly');
            if (this.amount >= 400) Game.Win('Dr. T');
            if (this.amount >= 500) Game.Win('Thumbs, phalanges, metacarpals');
            if (this.amount >= 600) Game.Win('With her finger and her thumb');
        });

        Game.SpecialGrandmaUnlock = 15;
        new Game.Object('Grandma', 'grandma|grandmas|baked|Grandmas are [X] year older|Grandmas are [X] years older', 'A nice grandma to bake more Neuros.', 1, 1, {
            pic: function (i) {
                let list = ['grandma'];
                if (Game.Has('Farmer grandmas')) list.push('farmerGrandma');
                if (Game.Has('Worker grandmas')) list.push('workerGrandma');
                if (Game.Has('Mining Rigr grandmas')) list.push('minerGrandma');
                if (Game.Has('Cosmic grandmas')) list.push('cosmicGrandma');
                if (Game.Has('Transmuted grandmas')) list.push('transmutedGrandma');
                if (Game.Has('Altered grandmas')) list.push('alteredGrandma');
                if (Game.Has('Grandmas\' grandmas')) list.push('grandmasGrandma');
                if (Game.Has('Antigrandmas')) list.push('antiGrandma');
                if (Game.Has('Rainbow grandmas')) list.push('rainbowGrandma');
                if (Game.Has('Gymer grandmas')) list.push('gymGrandma');
                if (Game.Has('Priestess grandmas')) list.push('templeGrandma');
                if (Game.Has('Witch grandmas')) list.push('witchGrandma');
                if (Game.Has('Lucky grandmas')) list.push('luckyGrandma');
                if (Game.Has('Metagrandmas')) list.push('metaGrandma');
                if (Game.season === 'christmas') list.push('elfGrandma');
                if (Game.season === 'easter') list.push('bunnyGrandma');
                return chooseRandomElement(list) + '.png';
            }, bg: 'grandmaBackground.png', xV: 8, yV: 8, w: 32, rows: 3, x: 0, y: 16
        }, 100, me => {
            let i;
            let mult = 1;
            for (i in Game.GrandmaSynergies) {
                if (Game.Has(Game.GrandmaSynergies[i])) mult *= 2;
            }
            if (Game.Has('Bingo center/Research facility')) mult *= 4;
            if (Game.Has('Ritual rolling pins')) mult *= 2;
            if (Game.Has('Naughty list')) mult *= 2;

            if (Game.Has('Elderwort biscuits')) mult *= 1.02;

            mult *= Game.eff('grandmaCps');

            mult *= Game.GetTieredCpsMult(me);

            let add = 0;
            if (Game.Has('One mind')) add += Game.Objects['Grandma'].amount * 0.02;
            if (Game.Has('Communal brainsweep')) add += Game.Objects['Grandma'].amount * 0.02;
            if (Game.Has('Elder Pact')) add += Game.Objects['Portal'].amount * 0.05;

            let num = 0;
            for (i in Game.Objects) {
                if (Game.Objects[i].name !== 'Grandma') num += Game.Objects[i].amount;
            }
            if (Game.hasAura('Elder Battalion')) mult *= 1 + 0.01 * num;

            mult *= Game.magicCpS(me.name);

            return (me.baseCps + add) * mult;
        }, function () {
            Game.UnlockTiered(this);
        });
        Game.last.sellFunction = function () {
            Game.Win('Just wrong');
            if (this.amount === 0) {
                Game.Lock('Elder Pledge');
                Game.CollectWrinklers();
                Game.pledgeT = 0;
            }
        };
        Game.last.iconFunc = type => {
            const grandmaIcons = [[0, 1], [0, 2], [1, 2], [2, 2]];
            if (type === 'off') return [0, 1];
            return grandmaIcons[Game.elderWrath];
        };


        new Game.Object('Farm', 'farm|farms|harvested|[X] more acre|[X] more acres', 'Grows Neuro plants from Neuro seeds.', 3, 2, {
            base: 'farm',
            xV: 8,
            yV: 8,
            w: 64,
            rows: 2,
            x: 0,
            y: 16
        }, 500, function (me) {
            let mult = 1;
            mult *= Game.GetTieredCpsMult(me);
            mult *= Game.magicCpS(me.name);
            return me.baseCps * mult;
        }, function () {
            Game.UnlockTiered(this);
            if (this.amount >= Game.SpecialGrandmaUnlock && Game.Objects['Grandma'].amount > 0) Game.Unlock(this.grandma.name);
        });
        Game.last.minigameUrl = '/scripts/minigameGarden.js';
        Game.last.minigameName = 'Garden';

        new Game.Object('Mining Rig', 'rig|rigs|hashed|Overclocked by [X] MHz.| Overclocked by [X] MHz.', 'Mines Crypto-Neuros.', 4, 3, {
            base: 'mine',
            xV: 16,
            yV: 16,
            w: 64,
            rows: 2,
            x: 0,
            y: 24
        }, 10000, me => {
            let mult = 1;
            mult *= Game.GetTieredCpsMult(me);
            mult *= Game.magicCpS(me.name);
            return me.baseCps * mult;
        }, function () {
            Game.UnlockTiered(this);
            if (this.amount >= Game.SpecialGrandmaUnlock && Game.Objects['Grandma'].amount > 0) Game.Unlock(this.grandma.name);
        });

        new Game.Object('Factory', 'factory|factories|mass-produced|[X] additional patent|[X] additional patents', 'Produces large quantities of Neuros.', 5, 4, {
            base: 'factory',
            xV: 8,
            yV: 0,
            w: 64,
            rows: 1,
            x: 0,
            y: -22
        }, 3000, me => {
            let mult = 1;
            mult *= Game.GetTieredCpsMult(me);
            mult *= Game.magicCpS(me.name);
            return me.baseCps * mult;
        }, function () {
            Game.UnlockTiered(this);
            if (this.amount >= Game.SpecialGrandmaUnlock && Game.Objects['Grandma'].amount > 0) Game.Unlock(this.grandma.name);
        });
        //Game.last.minigameUrl='minigameDungeon.js';//not yet
        //Game.last.minigameName='Dungeon';

        new Game.Object('Gym', 'gym|gyms|pressed|[X] more stamp head|[X] more stamp heads', 'People stamp neuros as a workout routine.', 6, 15, {
            base: 'gym',
            xV: 0,
            yV: 0,
            w: 64,
            rows: 1,
            x: 0,
            y: 0
        }, 0, me => {
            let mult = 1;
            mult *= Game.GetTieredCpsMult(me);
            mult *= Game.magicCpS(me.name);
            return me.baseCps * mult;
        }, function () {
            Game.UnlockTiered(this);
            if (this.amount >= Game.SpecialGrandmaUnlock && Game.Objects['Grandma'].amount > 0) Game.Unlock(this.grandma.name);
        });

        new Game.Object('Temple', 'temple|temples|discovered|[X] sacred artifact retrieved|[X] sacred artifacts retrieved', 'The treasure room is filled with ancient Neuros, thanks to collectors these are only going up in value.', 7, 16, {
            base: 'temple',
            xV: 8,
            yV: 4,
            w: 72,
            rows: 2,
            x: 0,
            y: -5
        }, 0, me => {
            let mult = 1;
            mult *= Game.GetTieredCpsMult(me);
            mult *= Game.magicCpS(me.name);
            return me.baseCps * mult;
        }, function () {
            Game.UnlockTiered(this);
            if (this.amount >= Game.SpecialGrandmaUnlock && Game.Objects['Grandma'].amount > 0) Game.Unlock(this.grandma.name);
        });
        Game.last.minigameUrl = '/scripts/minigamePantheon.js';
        Game.last.minigameName = 'Pantheon';

        new Game.Object('Wizard tower', 'wizard tower|wizard towers|summoned|Incantations have [X] more syllable|Incantations have [X] more syllables', 'Summons Neuros with magic spells.', 8, 17, {
            base: 'wizardtower',
            xV: 16,
            yV: 16,
            w: 48,
            rows: 2,
            x: 0,
            y: 20
        }, 0, me => {
            let mult = 1;
            mult *= Game.GetTieredCpsMult(me);
            mult *= Game.magicCpS(me.name);
            return me.baseCps * mult;
        }, function () {
            Game.UnlockTiered(this);
            if (this.amount >= Game.SpecialGrandmaUnlock && Game.Objects['Grandma'].amount > 0) Game.Unlock(this.grandma.name);
        });
        Game.last.minigameUrl = '/scripts/minigameGrimoire.js';
        Game.last.minigameName = 'Grimoire';

        new Game.Object('Shipment', 'shipment|shipments|shipped|[X] galaxy fully explored|[X] galaxies fully explored', 'Brings in fresh Neuros from the Neuro planet.', 9, 5, {
            base: 'shipment',
            xV: 16,
            yV: 16,
            w: 64,
            rows: 1,
            x: 0,
            y: 0
        }, 40000, me => {
            let mult = 1;
            mult *= Game.GetTieredCpsMult(me);
            mult *= Game.magicCpS(me.name);
            return me.baseCps * mult;
        }, function () {
            Game.UnlockTiered(this);
            if (this.amount >= Game.SpecialGrandmaUnlock && Game.Objects['Grandma'].amount > 0) Game.Unlock(this.grandma.name);
        });

        new Game.Object('Alchemy lab', 'alchemy lab|alchemy labs|transmuted|[X] primordial element mastered|[X] primordial elements mastered', 'Turns gold into Neuros!', 10, 6, {
            base: 'alchemylab',
            xV: 16,
            yV: 16,
            w: 64,
            rows: 2,
            x: 0,
            y: 16
        }, 200000, me => {
            let mult = 1;
            mult *= Game.GetTieredCpsMult(me);
            mult *= Game.magicCpS(me.name);
            return me.baseCps * mult;
        }, function () {
            Game.UnlockTiered(this);
            if (this.amount >= Game.SpecialGrandmaUnlock && Game.Objects['Grandma'].amount > 0) Game.Unlock(this.grandma.name);
        });

        new Game.Object('Portal', 'portal|portals|retrieved|[X] dimension enslaved|[X] dimensions enslaved', 'Opens a door to the Neuroverse.', 11, 7, {
            base: 'portal',
            xV: 32,
            yV: 32,
            w: 64,
            rows: 2,
            x: 0,
            y: 0
        }, 1666666, me => {
            let mult = 1;
            mult *= Game.GetTieredCpsMult(me);
            mult *= Game.magicCpS(me.name);
            return me.baseCps * mult;
        }, function () {
            Game.UnlockTiered(this);
            if (this.amount >= Game.SpecialGrandmaUnlock && Game.Objects['Grandma'].amount > 0) Game.Unlock(this.grandma.name);
        });

        new Game.Object('Time machine', 'time machine|time machines|recovered|[X] century secured|[X] centuries secured', 'Brings Neuros from the past, before they were even eaten.', 12, 8, {
            base: 'timemachine',
            xV: 32,
            yV: 32,
            w: 64,
            rows: 1,
            x: 0,
            y: 0
        }, 123456789, me => {
            let mult = 1;
            mult *= Game.GetTieredCpsMult(me);
            mult *= Game.magicCpS(me.name);
            return me.baseCps * mult;
        }, function () {
            Game.UnlockTiered(this);
            if (this.amount >= Game.SpecialGrandmaUnlock && Game.Objects['Grandma'].amount > 0) Game.Unlock(this.grandma.name);
        });

        new Game.Object('Antimatter condenser', 'antimatter condenser|antimatter condensers|condensed|[X] extra quark flavor|[X] extra quark flavors', 'Condenses the antimatter in the universe into Neuros.', 13, 13, {
            base: 'antimattercondenser',
            xV: 0,
            yV: 64,
            w: 64,
            rows: 1,
            x: 0,
            y: 0
        }, 3999999999, me => {
            let mult = 1;
            mult *= Game.GetTieredCpsMult(me);
            mult *= Game.magicCpS(me.name);
            return me.baseCps * mult;
        }, function () {
            Game.UnlockTiered(this);
            if (this.amount >= Game.SpecialGrandmaUnlock && Game.Objects['Grandma'].amount > 0) Game.Unlock(this.grandma.name);
        });
        Game.last.displayName = '<span style="font-size:65%;position:relative;bottom:4px;">Antimatter condenser</span>';//shrink the name since it's so large

        new Game.Object('Prism', 'prism|prisms|converted|[X] new color discovered|[X] new colors discovered', 'Converts light itself into Neuros.', 14, 14, {
            base: 'prism',
            xV: 16,
            yV: 4,
            w: 64,
            rows: 1,
            x: 0,
            y: 20
        }, 75000000000, me => {
            let mult = 1;
            mult *= Game.GetTieredCpsMult(me);
            mult *= Game.magicCpS(me.name);
            return me.baseCps * mult;
        }, function () {
            Game.UnlockTiered(this);
            if (this.amount >= Game.SpecialGrandmaUnlock && Game.Objects['Grandma'].amount > 0) Game.Unlock(this.grandma.name);
        });

        new Game.Object('Wheel of fortune', 'wheel of fortune|wheels of fortune|won|Wheels of fortune are rigged by [X] % additional win chance|Wheels of fortune are rigged by [X] % additional win chance', 'Spend Neuros to win more Neuros at Filian\'s Stream-Staple Fortune Wheel!', 15, 19, {
            base: 'chancemaker',
            xV: 0,
            yV: 10,
            w: 128,
            rows: 2,
            x: 0,
            y: 0
        }, 77777777777, me => {
            let mult = 1;
            mult *= Game.GetTieredCpsMult(me);
            mult *= Game.magicCpS(me.name);
            return me.baseCps * mult;
        }, function () {
            Game.UnlockTiered(this);
            if (this.amount >= Game.SpecialGrandmaUnlock && Game.Objects['Grandma'].amount > 0) Game.Unlock(this.grandma.name);
        });

        new Game.Object('Fractal engine', 'fractal engine|fractal engines|made from cookies|[X] iteration deep|[X] iterations deep', 'Turns Neuros into even more Neuros.', 16, 20, {
            base: 'fractalEngine',
            xV: 8,
            yV: 64,
            w: 64,
            rows: 1,
            x: 0,
            y: 0
        }, 12345678987654321, me => {
            let mult = 1;
            mult *= Game.GetTieredCpsMult(me);
            mult *= Game.magicCpS(me.name);
            return me.baseCps * mult;
        }, function () {
            Game.UnlockTiered(this);
            if (this.amount >= Game.SpecialGrandmaUnlock && Game.Objects['Grandma'].amount > 0) Game.Unlock(this.grandma.name);
        });

        Game.foolObjects = {
            'Unknown': {
                name: 'Investment',
                desc: 'You\'re not sure what this does, you just know it means profit.',
                icon: 0
            },
            'Cursor': {
                name: 'Rolling pin',
                desc: 'Essential in flattening dough. The first step in Neuro-making.',
                icon: 0
            },
            'Grandma': {name: 'Oven', desc: 'A crucial element of baking Neuros.', icon: 1},
            'Farm': {name: 'Kitchen', desc: 'The more kitchens, the more Neuros your employees can produce.', icon: 2},
            'Mining Rig': {
                name: 'Secret recipe',
                desc: 'These give you the edge you need to outsell those pesky competitors.',
                icon: 3
            },
            'Factory': {
                name: 'Factory',
                desc: 'Mass production is the future of baking. Seize the day, and synergize!',
                icon: 4
            },
            'Gym': {
                name: 'Investor',
                desc: 'Business folks with a nose for profit, ready to finance your venture as long as there\'s money to be made.',
                icon: 5
            },
            'Temple': {
                name: 'Like',
                desc: 'Your social media page is going viral! Amassing likes is the key to a lasting online presence and juicy advertising deals.',
                icon: 9
            },
            'Wizard tower': {
                name: 'Meme',
                desc: 'Neuro memes are all the rage! With just the right amount of social media astroturfing, your brand image will be all over the cyberspace.',
                icon: 6
            },
            'Shipment': {name: 'Supermarket', desc: 'A gigantic Neuro emporium - your very own retail chain.', icon: 7},
            'Alchemy lab': {
                name: 'Stock share',
                desc: 'You\'re officially on the stock market, and everyone wants a piece!',
                icon: 8
            },
            'Portal': {
                name: 'TV show',
                desc: 'Your Neuros have their own sitcom! Hilarious baking hijinks set to the cheesiest laughtrack.',
                icon: 10
            },
            'Time machine': {
                name: 'Theme park',
                desc: 'Neuro theme parks, full of mascots and roller-coasters. Build one, build a hundred!',
                icon: 11
            },
            'Antimatter condenser': {
                name: 'Cookiecoin',
                desc: 'A virtual currency, already replacing regular money in some small countries.',
                icon: 12
            },
            'Prism': {
                name: 'Corporate country',
                desc: 'You\'ve made it to the top, and you can now buy entire nations to further your corporate greed. Godspeed.',
                icon: 13
            },
            'Wheel of fortune': {
                name: 'Privatized planet',
                desc: 'Actually, you know what\'s cool? A whole planet dedicated to producing, advertising, selling, and consuming your Neuros.',
                icon: 15
            },
            'Fractal engine': {
                name: 'Senate seat',
                desc: 'Only through political dominion can you truly alter this world to create a brighter, more Neuro-friendly future.',
                icon: 16
            },
        };


        //build store
        Game.BuildStore();

        //build master bar
        str = '';
        str += '<div id="buildingsMute" class="shadowFilter" style="position:relative;z-index:100;padding:4px 16px 0 64px;"></div>';
        str += '<div class="separatorBottom" style="position:absolute;bottom:-8px;z-index:0;"></div>';
        elementByID('buildingsMaster').innerHTML = str;

        //build object displays
        let muteStr = '<div style="position:absolute;left:8px;bottom:12px;opacity:0.5;">Muted :</div>';
        for (i in Game.Objects) {
            me = Game.Objects[i];
            if (me.id > 0) {
                me.canvas = elementByID('rowCanvas' + me.id);
                me.ctx = me.canvas.getContext('2d', {alpha: false});
                me.pics = [];

                //console.log("me.icon: " + me.icon)
                let icon = [0, me.icon * 64];

                //console.log("Icon: " + icon)
                muteStr += '<div class="tinyProductIcon" id="mutedProduct' + me.id + '" style="display:none;background-position:-' + icon[0] + 'px -' + icon[1] + 'px;" ' + Game.clickStr + '="Game.ObjectsById[' + me.id + '].mute(0);PlaySound(Game.ObjectsById[' + me.id + '].muted?\'snd/clickOff.mp3\':\'snd/clickOn.mp3\');" ' + Game.getDynamicTooltip('Game.mutedBuildingTooltip(' + me.id + ')', 'this') + '></div>';
                //muteStr+='<div class="tinyProductIcon" id="mutedProduct'+me.id+'" style="display:none;background-position:-'+icon[0]+'px -'+icon[1]+'px;" '+Game.clickStr+'="Game.ObjectsById['+me.id+'].mute(0);PlaySound(Game.ObjectsById['+me.id+'].muted?\'snd/clickOff.mp3\':\'snd/clickOn.mp3\');" '+Game.getTooltip('<div style="width:150px;text-align:center;font-size:11px;"><b>Unmute '+me.plural+'</b><br>(Display this building)</div>')+'></div>';

                AddEvent(me.canvas, 'mouseover', (me => () => {
                    me.mouseOn = true;
                })(me));
                AddEvent(me.canvas, 'mouseout', (me => () => {
                    me.mouseOn = false;
                })(me));
                AddEvent(me.canvas, 'mousemove', (me => {
                    return function (e) {
                        let box = this.getBoundingClientRect();
                        me.mousePos[0] = e.pageX - box.left;
                        me.mousePos[1] = e.pageY - box.top;
                    };
                })(me));
            }
        }
        Game.mutedBuildingTooltip = id => () => {
            let me = Game.ObjectsById[id];
            return '<div style="width:150px;text-align:center;font-size:11px;"><b>' + (me.plural.charAt(0).toUpperCase() + me.plural.slice(1)) + (me.level > 0 ? ' (lvl.&nbsp;' + me.level + ')' : '') + '</b><div class="line"></div>Click to unmute ' + me.plural + '<br>(display this building)</div>';
        }
        elementByID('buildingsMute').innerHTML = muteStr;

        /*=====================================================================================
		UPGRADES
		=======================================================================================*/
        Game.upgradesToRebuild = 1;
        Game.Upgrades = [];
        Game.UpgradesById = [];
        Game.UpgradesN = 0;
        Game.UpgradesInStore = [];
        Game.UpgradesOwned = 0;
        Game.Upgrade = function (name, desc, price, icon, buyFunction) {
            this.id = Game.UpgradesN;
            this.name = name;
            this.desc = desc;
            this.baseDesc = this.desc;
            this.desc = BeautifyInText(this.baseDesc, Game);
            this.basePrice = price;
            this.priceLumps = 0;//note : doesn't do much on its own, you still need to handle the buying yourself
            this.icon = icon;
            this.iconFunction = 0;
            this.buyFunction = buyFunction;
            /*this.unlockFunction=unlockFunction;
			this.unlocked=(this.unlockFunction?0:1);*/
            this.unlocked = 0;
            this.bought = 0;
            this.order = this.id;
            if (order) this.order = order + this.id * 0.001;
            this.pool = '';//can be '', cookie, toggle, debug, prestige, prestigeDecor, tech, or unused
            if (pool) this.pool = pool;
            this.power = 0;
            if (power) this.power = power;
            this.vanilla = Game.vanilla;
            this.unlockAt = 0;
            this.parents = [];
            this.type = 'upgrade';
            this.tier = 0;
            this.buildingTie = 0;//of what building is this a tiered upgrade of ?

            Game.last = this;
            Game.Upgrades[this.name] = this;
            Game.UpgradesById[this.id] = this;
            Game.UpgradesN++;
            return this;
        }

        Game.Upgrade.prototype.getPrice = function () {
            let price = this.basePrice;
            if (this.priceFunc) price = this.priceFunc();
            if (price === 0) return 0;
            if (this.pool !== 'prestige') {
                if (Game.Has('Toy workshop')) price *= 0.95;
                if (Game.Has('Five-finger discount')) price *= Math.pow(0.99, Game.Objects['Cursor'].amount / 100);
                if (Game.Has('Santa\'s dominion')) price *= 0.98;
                if (Game.Has('Faberge egg')) price *= 0.99;
                if (Game.Has('Divine sales')) price *= 0.99;
                if (Game.hasBuff('Haggler\'s luck')) price *= 0.98;
                if (Game.hasBuff('Haggler\'s misery')) price *= 1.02;
                if (Game.hasAura('Master of the Armory')) price *= 0.98;
                price *= Game.eff('upgradeCost');
                if (this.pool === 'cookie' && Game.Has('Divine bakeries')) price /= 5;
            }
            return Math.ceil(price);
        }

        Game.Upgrade.prototype.canBuy = function () {
            if (this.canBuyFunc) return this.canBuyFunc();
            return Game.cookies >= this.getPrice();
        }

        Game.storeBuyAll = () => {
            if (!Game.Has('Inspired checklist')) return false;
            for (let i in Game.UpgradesInStore) {
                let me = Game.UpgradesInStore[i];
                if (!me.isVaulted() && me.pool !== 'toggle' && me.pool !== 'tech') me.buy(1);
            }
        }

        Game.vault = [];
        Game.Upgrade.prototype.isVaulted = function () {
            return Game.vault.indexOf(this.id) !== -1;
        }
        Game.Upgrade.prototype.vault = function () {
            if (!this.isVaulted()) Game.vault.push(this.id);
        }
        Game.Upgrade.prototype.unvault = function () {
            if (this.isVaulted()) Game.vault.splice(Game.vault.indexOf(this.id), 1);
        }

        Game.Upgrade.prototype.click = function (e) {
            if ((e && e.shiftKey) || Game.keys[16]) {
                if (this.pool === 'toggle' || this.pool === 'tech') {
                } else if (Game.Has('Inspired checklist')) {
                    if (this.isVaulted()) this.unvault();
                    else this.vault();
                    Game.upgradesToRebuild = 1;
                    PlaySound('snd/tick.mp3');
                }
            } else this.buy();
        }


        Game.Upgrade.prototype.buy = function (bypass) {
            let price;
            let str;
            let success = 0;
            let cancelPurchase = 0;
            if (this.clickFunction && !bypass) cancelPurchase = !this.clickFunction();
            if (!cancelPurchase) {
                if (this.choicesFunction) {
                    if (Game.choiceSelectorOn === this.id) {
                        elementByID('toggleBox').style.display = 'none';
                        elementByID('toggleBox').innerHTML = '';
                        Game.choiceSelectorOn = -1;
                        PlaySound('/snd/tick.mp3');
                    } else {
                        Game.choiceSelectorOn = this.id;
                        const choices = this.choicesFunction();
                        if (choices.length > 0) {
                            let i;
                            let selected = 0;
                            for (i in choices) {
                                if (choices[i].selected) selected = i;
                            }
                            Game.choiceSelectorChoices = choices;//this is a really dumb way of doing this i am so sorry
                            Game.choiceSelectorSelected = selected;
                            str = '';
                            str += '<div class="close" onclick="Game.UpgradesById[' + this.id + '].buy();">x</div>';
                            str += '<h3>' + this.name + '</h3>' +
                                '<div class="line"></div>' +
                                '<h4 id="choiceSelectedName">' + choices[selected].name + '</h4>' +
                                '<div class="line"></div>';

                            for (i in choices) {
                                const icon = choices[i].icon;
                                str += '<div class="crate enabled' + (i === selected ? ' highlighted' : '') + '" style="opacity:1;float:none;display:inline-block;' + (icon[2] ? 'background-image:url(' + icon[2] + ');' : '') + 'background-position:' + (-icon[0] * 48) + 'px ' + (-icon[1] * 48) + 'px;" ' + Game.clickStr + '="Game.UpgradesById[' + this.id + '].choicesPick(' + i + ');PlaySound(\'snd/tick.mp3\');Game.choiceSelectorOn=-1;Game.UpgradesById[' + this.id + '].buy();" onMouseOut="elementByID(\'choiceSelectedName\').innerHTML=Game.choiceSelectorChoices[Game.choiceSelectorSelected].name;" onMouseOver="elementByID(\'choiceSelectedName\').innerHTML=Game.choiceSelectorChoices[' + i + '].name;"' +
                                    '></div>';
                            }
                        }
                        elementByID('toggleBox').innerHTML = str;
                        elementByID('toggleBox').style.display = 'block';
                        elementByID('toggleBox').focus();
                        Game.tooltip.hide();
                        PlaySound('/snd/tick.mp3');
                        success = 1;
                    }
                } else if (this.pool !== 'prestige') {
                    price = this.getPrice();
                    if (this.canBuy() && !this.bought) {
                        Game.Spend(price);
                        this.bought = 1;
                        if (this.buyFunction) this.buyFunction();
                        if (this.toggleInto) {
                            Game.Lock(this.toggleInto);
                            Game.Unlock(this.toggleInto);
                        }
                        Game.upgradesToRebuild = 1;
                        Game.recalculateGains = 1;
                        if (Game.CountsAsUpgradeOwned(this.pool)) Game.UpgradesOwned++;
                        Game.setOnCrate(0);
                        Game.tooltip.hide();
                        PlaySound('/snd/buy' + chooseRandomElement([1, 2, 3, 4]) + '.mp3', 0.75);
                        success = 1;
                    }
                } else {
                    price = this.getPrice();
                    if (Game.heavenlyChips >= price && !this.bought) {
                        Game.heavenlyChips -= price;
                        Game.heavenlyChipsSpent += price;
                        this.unlocked = 1;
                        this.bought = 1;
                        if (this.buyFunction) this.buyFunction();
                        Game.BuildAscendTree();
                        PlaySound('/snd/buy' + chooseRandomElement([1, 2, 3, 4]) + '.mp3', 0.75);
                        PlaySound('/snd/shimmerClick.mp3');
                        //PlaySound('snd/buyHeavenly.mp3');
                        success = 1;
                    }
                }
            }
            if (this.bought && this.activateFunction) this.activateFunction();
            return success;
        }
        Game.Upgrade.prototype.earn = function ()//just win the upgrades without spending anything
        {
            this.unlocked = 1;
            this.bought = 1;
            if (this.buyFunction) this.buyFunction();
            Game.upgradesToRebuild = 1;
            Game.recalculateGains = 1;
            if (Game.CountsAsUpgradeOwned(this.pool)) Game.UpgradesOwned++;
        }
        Game.Upgrade.prototype.unlock = function () {
            this.unlocked = 1;
            Game.upgradesToRebuild = 1;
        }
        Game.Upgrade.prototype.lose = function () {
            this.unlocked = 0;
            this.bought = 0;
            Game.upgradesToRebuild = 1;
            Game.recalculateGains = 1;
            if (Game.CountsAsUpgradeOwned(this.pool)) Game.UpgradesOwned--;
        }
        Game.Upgrade.prototype.toggle = function ()//cheating only
        {
            if (!this.bought) {
                this.bought = 1;
                if (this.buyFunction) this.buyFunction();
                Game.upgradesToRebuild = 1;
                Game.recalculateGains = 1;
                if (Game.CountsAsUpgradeOwned(this.pool)) Game.UpgradesOwned++;
                PlaySound('/snd/buy' + chooseRandomElement([1, 2, 3, 4]) + '.mp3', 0.75);
                if (this.pool === 'prestige' || this.pool === 'debug') PlaySound('/snd/shimmerClick.mp3');
            } else {
                this.bought = 0;
                Game.upgradesToRebuild = 1;
                Game.recalculateGains = 1;
                if (Game.CountsAsUpgradeOwned(this.pool)) Game.UpgradesOwned--;
                PlaySound('/snd/sell' + chooseRandomElement([1, 2, 3, 4]) + '.mp3', 0.75);
                if (this.pool === 'prestige' || this.pool === 'debug') PlaySound('/snd/shimmerClick.mp3');
            }
            if (Game.onMenu === 'stats') Game.UpdateMenu();
        }

        Game.CountsAsUpgradeOwned = pool => pool === '' || pool === 'cookie' || pool === 'tech'

        /*AddEvent(l('toggleBox'),'blur',function()//if we click outside of the selector, close it
			{
				//this has a couple problems, such as when clicking on the upgrade - this toggles it off and back on instantly
				l('toggleBox').style.display='none';
				l('toggleBox').innerHTML='';
				Game.choiceSelectorOn=-1;
			}
		);*/

        Game.RequiresConfirmation = (upgrade, prompt) => {
            upgrade.clickFunction = () => {
                Game.Prompt(prompt, [['Yes', 'Game.UpgradesById[' + upgrade.id + '].buy(1);Game.ClosePrompt();'], 'No']);
                return false;
            };
        }

        Game.Unlock = what => {
            if (typeof what === 'string') {
                if (Game.Upgrades[what]) {
                    if (Game.Upgrades[what].unlocked === 0) {
                        Game.Upgrades[what].unlocked = 1;
                        Game.upgradesToRebuild = 1;
                        Game.recalculateGains = 1;
                        /*if (Game.prefs.popups) {}
						else Game.Notify('Upgrade unlocked','<div class="title" style="font-size:18px;margin-top:-2px;">'+Game.Upgrades[what].name+'</div>',Game.Upgrades[what].icon,6);*/
                    }
                }
            } else {
                for (let i in what) {
                    Game.Unlock(what[i]);
                }
            }
        }
        Game.Lock = what => {
            if (typeof what === 'string') {
                if (Game.Upgrades[what]) {
                    Game.Upgrades[what].unlocked = 0;
                    Game.upgradesToRebuild = 1;
                    if (Game.Upgrades[what].bought === 1 && Game.CountsAsUpgradeOwned(Game.Upgrades[what].pool)) Game.UpgradesOwned--;
                    Game.Upgrades[what].bought = 0;
                    Game.recalculateGains = 1;
                }
            } else {
                for (let i in what) {
                    Game.Lock(what[i]);
                }
            }
        }

        Game.Has = what => {
            if (Game.ascensionMode === 1 && Game.Upgrades[what].pool === 'prestige') return 0;
            return (Game.Upgrades[what] ? Game.Upgrades[what].bought : 0);
        }
        Game.HasUnlocked = what => (Game.Upgrades[what] ? Game.Upgrades[what].unlocked : 0)


        Game.RebuildUpgrades = () => {
            let me;
            let i;
            Game.upgradesToRebuild = 0;
            let list = [];
            for (i in Game.Upgrades) {
                me = Game.Upgrades[i];
                if (!me.bought && me.pool !== 'debug' && me.pool !== 'prestige' && me.pool !== 'prestigeDecor' && (!me.lasting || Game.ascensionMode !== 1)) {
                    if (me.unlocked) list.push(me);
                } else if (me.displayFuncWhenOwned && me.bought) list.push(me);
            }
            function sortMap(a, b) {
                const ap = a.pool === 'toggle' ? a.order : a.getPrice();
                const bp = b.pool === 'toggle' ? b.order : b.getPrice();
                if (ap > bp) return 1;
                else if (ap < bp) return -1;
                else return 0;
            }
            list.sort(sortMap);

            Game.UpgradesInStore = [];
            for (i in list) {
                Game.UpgradesInStore.push(list[i]);
            }
            let storeStr = '';
            let toggleStr = '';
            let techStr = '';
            let vaultStr = '';

            if (Game.Has('Inspired checklist')) {
                storeStr += '<div id="storeBuyAll" class="storePre" ' + Game.getTooltip(
                        '<div style="padding:8px;min-width:250px;text-align:center;font-size:11px;">Will <b>instantly purchase</b> every upgrade you can afford, starting from the cheapest one.<br>Upgrades in the <b>vault</b> will not be auto-purchased.<br>You may place an upgrade into the vault by <b>Shift-clicking</b> on it.</div>'
                        , 'store') +
                    '>' +
                    '<div id="storeBuyAllButton" class="storePreButton" ' + Game.clickStr + '="Game.storeBuyAll();">Buy all upgrades</div>' +
                    '</div>';
                elementByID('upgrades').classList.add('hasMenu');
            } else elementByID('upgrades').classList.remove('hasMenu');

            for (i in Game.UpgradesInStore) {
                //if (!Game.UpgradesInStore[i]) break;
                me = Game.UpgradesInStore[i];
                const str = Game.crate(me, 'store', 'Game.UpgradesById[' + me.id + '].click(event);', 'upgrade' + i);

                /*var str='<div class="crate upgrade" '+Game.getTooltip(
				'<div style="min-width:200px;"><div style="float:right;"><span class="price">'+Beautify(Math.round(me.getPrice()))+'</span></div><small>'+(me.pool=='toggle'?'[Togglable]':'[Upgrade]')+'</small><div class="name">'+me.name+'</div><div class="line"></div><div class="description">'+me.desc+'</div></div>'
				,'store')+' '+Game.clickStr+'="Game.UpgradesById['+me.id+'].buy();" id="upgrade'+i+'" style="'+(me.icon[2]?'background-image:url('+me.icon[2]+');':'')+'background-position:'+(-me.icon[0]*48)+'px '+(-me.icon[1]*48)+'px;"></div>';*/
                if (me.pool === 'toggle') toggleStr += str; else if (me.pool === 'tech') techStr += str; else {
                    if (me.isVaulted() && Game.Has('Inspired checklist')) vaultStr += str; else storeStr += str;
                }
            }

            elementByID('upgrades').innerHTML = storeStr;
            elementByID('toggleUpgrades').innerHTML = toggleStr;
            if (toggleStr === '') elementByID('toggleUpgrades').style.display = 'none'; else elementByID('toggleUpgrades').style.display = 'block';
            elementByID('techUpgrades').innerHTML = techStr;
            if (techStr === '') elementByID('techUpgrades').style.display = 'none'; else elementByID('techUpgrades').style.display = 'block';
            elementByID('vaultUpgrades').innerHTML = vaultStr;
            if (vaultStr === '') elementByID('vaultUpgrades').style.display = 'none'; else elementByID('vaultUpgrades').style.display = 'block';
        }

        Game.UnlockAt = [];//this contains an array of every upgrade with a cookie requirement in the form of {cookies:(amount of cookies earned required),name:(name of upgrade or achievement to unlock)} (and possibly require:(name of upgrade of achievement to own))
        //note : the cookie will not be added to the list if it contains locked:1 (use for seasonal cookies and such)

        Game.NewUpgradeCookie = obj => {
            let upgrade = new Game.Upgrade(obj.name, 'Neuro production multiplier <b>+' + Beautify((typeof (obj.power) == 'function' ? obj.power(obj) : obj.power), 1) + '<q>' + obj.desc + '</q>', obj.price, obj.icon);
            upgrade.power = obj.power;
            upgrade.pool = 'cookie';
            let toPush = {cookies: obj.price / 20, name: obj.name};
            if (obj.require) toPush.require = obj.require;
            if (obj.season) toPush.season = obj.season;
            if (!obj.locked) Game.UnlockAt.push(toPush);
            return upgrade;
        }

        //tiered upgrades system
        //each building has several upgrade tiers
        //all upgrades in the same tier have the same color, unlock threshold and price multiplier
        Game.Tiers = {
            1: {name: 'Plain', unlock: 1, achievUnlock: 1, iconRow: 0, color: '#ccb3ac', price: 10},
            2: {name: 'Berrylium', unlock: 5, achievUnlock: 50, iconRow: 1, color: '#ff89e7', price: 50},
            3: {name: 'Blueberrylium', unlock: 25, achievUnlock: 100, iconRow: 2, color: '#00deff', price: 500},
            4: {name: 'Chalcedhoney', unlock: 50, achievUnlock: 150, iconRow: 13, color: '#ffcc2f', price: 50000},
            5: {name: 'Buttergold', unlock: 100, achievUnlock: 200, iconRow: 14, color: '#e9d673', price: 5000000},
            6: {name: 'Sugarmuck', unlock: 150, achievUnlock: 250, iconRow: 15, color: '#a8bf91', price: 500000000},
            7: {name: 'Jetmint', unlock: 200, achievUnlock: 300, iconRow: 16, color: '#60ff50', price: 500000000000},
            8: {
                name: 'Cherrysilver',
                unlock: 250,
                achievUnlock: 350,
                iconRow: 17,
                color: '#f01700',
                price: 500000000000000
            },
            9: {
                name: 'Hazelrald',
                unlock: 300,
                achievUnlock: 400,
                iconRow: 18,
                color: '#9ab834',
                price: 500000000000000000
            },
            10: {
                name: 'Mooncandy',
                unlock: 350,
                achievUnlock: 450,
                iconRow: 19,
                color: '#7e7ab9',
                price: 500000000000000000000
            },
            11: {
                name: 'Astrofudge',
                unlock: 400,
                achievUnlock: 500,
                iconRow: 28,
                color: '#9a3316',
                price: 5000000000000000000000000
            },
            12: {
                name: 'Alabascream',
                unlock: 450,
                achievUnlock: 550,
                iconRow: 30,
                color: '#c1a88c',
                price: 50000000000000000000000000000
            },
            'synergy1': {
                name: 'Synergy I',
                unlock: 15,
                iconRow: 20,
                color: '#008595',
                special: 1,
                req: 'Synergies Vol. I',
                price: 200000
            },
            'synergy2': {
                name: 'Synergy II',
                unlock: 75,
                iconRow: 29,
                color: '#008595',
                special: 1,
                req: 'Synergies Vol. II',
                price: 200000000000
            },
        };
        Game.GetIcon = (type, tier) => {
            let col;
            if (type === 'Kitten') col = 18; else col = Game.Objects[type].iconColumn;
            return [col, Game.Tiers[tier].iconRow];
        }
        Game.SetTier = (building, tier) => {
            if (!Game.Objects[building]) alert('No building named ' + building);
            Game.last.tier = tier;
            Game.last.buildingTie = Game.Objects[building];
            if (Game.last.type === 'achievement') Game.Objects[building].tieredAchievs[tier] = Game.last;
            else Game.Objects[building].tieredUpgrades[tier] = Game.last;
        }
        Game.MakeTiered = (upgrade, tier, col) => {
            upgrade.tier = tier;
            if (typeof col !== 'undefined') upgrade.icon = [col, Game.Tiers[tier].iconRow];
        }
        Game.TieredUpgrade = function (name, desc, building, tier) {
            let upgrade = new Game.Upgrade(name, desc, Game.Objects[building].basePrice * Game.Tiers[tier].price, Game.GetIcon(building, tier));
            Game.SetTier(building, tier);
            return upgrade;
        }
        Game.SynergyUpgrade = function (name, desc, building1, building2, tier) {
            /*
				creates a new upgrade that :
				-unlocks when you have tier.unlock of building1 and building2
				-is priced at (building1.price*10+building2.price*1)*tier.price (formerly : Math.sqrt(building1.price*building2.price)*tier.price)
				-gives +(0.1*building1)% cps to building2 and +(5*building2)% cps to building1
				-if building2 is below building1 in worth, swap them
			*/
            //if (Game.Objects[building1].basePrice>Game.Objects[building2].basePrice) {var temp=building2;building2=building1;building1=temp;}
            let b1 = Game.Objects[building1];
            let b2 = Game.Objects[building2];
            if (b1.basePrice > b2.basePrice) {
                b1 = Game.Objects[building2];
                b2 = Game.Objects[building1];
            }//swap

            desc =
                (b1.plural.charAt(0).toUpperCase() + b1.plural.slice(1)) + ' gain <b>+5% CpS</b> per ' + b2.name.toLowerCase() + '.<br>' +
                (b2.plural.charAt(0).toUpperCase() + b2.plural.slice(1)) + ' gain <b>+0.1% CpS</b> per ' + b1.name.toLowerCase() + '.' +
                desc;
            let upgrade = new Game.Upgrade(name, desc, (b1.basePrice * 10 + b2.basePrice * 1) * Game.Tiers[tier].price, Game.GetIcon(building1, tier));//Math.sqrt(b1.basePrice*b2.basePrice)*Game.Tiers[tier].price
            upgrade.tier = tier;
            upgrade.buildingTie1 = b1;
            upgrade.buildingTie2 = b2;
            upgrade.priceFunc = function () {
                return (this.buildingTie1.basePrice * 10 + this.buildingTie2.basePrice * 1) * Game.Tiers[this.tier].price * (Game.Has('Chimera') ? 0.98 : 1);
            };
            Game.Objects[building1].synergies.push(upgrade);
            Game.Objects[building2].synergies.push(upgrade);
            //Game.SetTier(building1,tier);
            return upgrade;
        }
        Game.GetTieredCpsMult = me => {
            let i;
            let mult = 1;
            for (i in me.tieredUpgrades) {
                if (!Game.Tiers[me.tieredUpgrades[i].tier].special && Game.Has(me.tieredUpgrades[i].name)) mult *= 2;
            }
            for (i in me.synergies) {
                let syn = me.synergies[i];
                if (Game.Has(syn.name)) {
                    if (syn.buildingTie1.name === me.name) mult *= (1 + 0.05 * syn.buildingTie2.amount);
                    else if (syn.buildingTie2.name === me.name) mult *= (1 + 0.001 * syn.buildingTie1.amount);
                }
            }
            if (me.grandma && Game.Has(me.grandma.name)) mult *= (1 + Game.Objects['Grandma'].amount * 0.01 * (1 / (me.id - 1)));
            return mult;
        }
        Game.UnlockTiered = me => {
            let i;
            for (i in me.tieredUpgrades) {
                if (me.amount >= Game.Tiers[me.tieredUpgrades[i].tier].unlock) Game.Unlock(me.tieredUpgrades[i].name);
            }
            for (i in me.tieredAchievs) {
                if (me.amount >= Game.Tiers[me.tieredAchievs[i].tier].achievUnlock) Game.Win(me.tieredAchievs[i].name);
            }
            for (i in me.synergies) {
                let syn = me.synergies[i];
                if (Game.Has(Game.Tiers[syn.tier].req) && syn.buildingTie1.amount >= Game.Tiers[syn.tier].unlock && syn.buildingTie2.amount >= Game.Tiers[syn.tier].unlock) Game.Unlock(syn.name);
            }
        }


        //define upgrades
        //WARNING : do NOT add new upgrades in between, this breaks the saves. Add them at the end !
        order = 100;//this is used to set the order in which the items are listed
        new Game.Upgrade('Reinforced index finger', 'The mouse and cursors are <b>twice</b> as efficient.<q>prod prod</q>', 100, [0, 0]);
        Game.MakeTiered(Game.last, 1, 0);
        new Game.Upgrade('Carpal tunnel prevention cream', 'The mouse and cursors are <b>twice</b> as efficient.<q>it... it hurts to click...</q>', 500, [0, 1]);
        Game.MakeTiered(Game.last, 2, 0);
        new Game.Upgrade('Ambidextrous', 'The mouse and cursors are <b>twice</b> as efficient.<q>Look ma, both hands!</q>', 10000, [0, 2]);
        Game.MakeTiered(Game.last, 3, 0);
        new Game.Upgrade('Thousand fingers', 'The mouse and cursors gain <b>+0.1</b> Neuros for each non-cursor object owned.<q>clickity</q>', 100000, [0, 13]);
        Game.MakeTiered(Game.last, 4, 0);
        new Game.Upgrade('Million fingers', 'The mouse and cursors gain <b>+0.5</b> Neuros for each non-cursor object owned.<q>clickityclickity</q>', 10000000, [0, 14]);
        Game.MakeTiered(Game.last, 5, 0);
        new Game.Upgrade('Billion fingers', 'The mouse and cursors gain <b>+5</b> Neuros for each non-cursor object owned.<q>clickityclickityclickity</q>', 100000000, [0, 15]);
        Game.MakeTiered(Game.last, 6, 0);
        new Game.Upgrade('Trillion fingers', 'The mouse and cursors gain <b>+50</b> Neuros for each non-cursor object owned.<q>clickityclickityclickityclickity</q>', 1000000000, [0, 16]);
        Game.MakeTiered(Game.last, 7, 0);

        order = 200;
        new Game.TieredUpgrade('Forwards from grandma', 'Grandmas are <b>twice</b> as efficient.<q>RE:RE:thought you\'d get a kick out of this ;))</q>', 'Grandma', 1);
        new Game.TieredUpgrade('Steel-plated rolling pins', 'Grandmas are <b>twice</b> as efficient.<q>Just what you kneaded.</q>', 'Grandma', 2);
        new Game.TieredUpgrade('Lubricated dentures', 'Grandmas are <b>twice</b> as efficient.<q>squish</q>', 'Grandma', 3);

        order = 300;
        new Game.TieredUpgrade('Cheap hoes', 'Farms are <b>twice</b> as efficient.<q>Rake in the dough!</q>', 'Farm', 1);
        new Game.TieredUpgrade('Fertilizer', 'Farms are <b>twice</b> as efficient.<q>It\'s chocolate, I swear.</q>', 'Farm', 2);
        new Game.TieredUpgrade('Cookie trees', 'Farms are <b>twice</b> as efficient.<q>A relative of the breadfruit.</q>', 'Farm', 3);

        order = 500;
        new Game.TieredUpgrade('Sturdier conveyor belts', 'Factories are <b>twice</b> as efficient.<q>You\'re going places.</q>', 'Factory', 1);
        new Game.TieredUpgrade('Child labor', 'Factories are <b>twice</b> as efficient.<q>Cheaper, healthier workforce.</q>', 'Factory', 2);
        new Game.TieredUpgrade('Sweatshop', 'Factories are <b>twice</b> as efficient.<q>Slackers will be terminated.</q>', 'Factory', 3);

        order = 400;
        new Game.TieredUpgrade('Sugar gas', 'Mining Rigs are <b>twice</b> as efficient.<q>A pink, volatile gas, found in the depths of some chocolate caves.</q>', 'Mining Rig', 1);
        new Game.TieredUpgrade('Megadrill', 'Mining Rigs are <b>twice</b> as efficient.<q>You\'re in deep.</q>', 'Mining Rig', 2);
        new Game.TieredUpgrade('Ultradrill', 'Mining Rigs are <b>twice</b> as efficient.<q>Finally caved in?</q>', 'Mining Rig', 3);

        order = 600;
        new Game.TieredUpgrade('Vanilla nebulae', 'Shipments are <b>twice</b> as efficient.<q>If you removed your space helmet, you could probably smell it!<br>(Note : don\'t do that.)</q>', 'Shipment', 1);
        new Game.TieredUpgrade('Wormholes', 'Shipments are <b>twice</b> as efficient.<q>By using these as shortcuts, your ships can travel much faster.</q>', 'Shipment', 2);
        new Game.TieredUpgrade('Frequent flyer', 'Shipments are <b>twice</b> as efficient.<q>Come back soon!</q>', 'Shipment', 3);

        order = 700;
        new Game.TieredUpgrade('Antimony', 'Alchemy labs are <b>twice</b> as efficient.<q>Actually worth a lot of mony.</q>', 'Alchemy lab', 1);
        new Game.TieredUpgrade('Essence of dough', 'Alchemy labs are <b>twice</b> as efficient.<q>Extracted through the 5 ancient steps of alchemical baking.</q>', 'Alchemy lab', 2);
        new Game.TieredUpgrade('True chocolate', 'Alchemy labs are <b>twice</b> as efficient.<q>The purest form of cacao.</q>', 'Alchemy lab', 3);

        order = 800;
        new Game.TieredUpgrade('Ancient tablet', 'Portals are <b>twice</b> as efficient.<q>A strange slab of peanut brittle, holding an ancient Neuro recipe. Neat!</q>', 'Portal', 1);
        new Game.TieredUpgrade('Insane oatling workers', 'Portals are <b>twice</b> as efficient.<q>ARISE, MY MINIONS!</q>', 'Portal', 2);
        new Game.TieredUpgrade('Soul bond', 'Portals are <b>twice</b> as efficient.<q>So I just sign up and get more Neuros? Sure, whatever!</q>', 'Portal', 3);

        order = 900;
        new Game.TieredUpgrade('Flux capacitors', 'Time machines are <b>twice</b> as efficient.<q>Bake to the future.</q>', 'Time machine', 1);
        new Game.TieredUpgrade('Time paradox resolver', 'Time machines are <b>twice</b> as efficient.<q>No more fooling around with your own grandmother!</q>', 'Time machine', 2);
        new Game.TieredUpgrade('Quantum conundrum', 'Time machines are <b>twice</b> as efficient.<q>There is only one constant, and that is universal uncertainty.<br>Or is it?</q>', 'Time machine', 3);

        order = 20000;
        new Game.Upgrade('Kitten helpers', 'You gain <b>more CpS</b> the more milk you have.<q>meow may I help you</q>', 9000000, Game.GetIcon('Kitten', 1));
        Game.last.kitten = 1;
        Game.MakeTiered(Game.last, 1, 18);
        new Game.Upgrade('Kitten workers', 'You gain <b>more CpS</b> the more milk you have.<q>meow meow meow meow</q>', 9000000000, Game.GetIcon('Kitten', 2));
        Game.last.kitten = 1;
        Game.MakeTiered(Game.last, 2, 18);

        order = 10000;
        Game.NewUpgradeCookie({
            name: 'Plain cookies',
            desc: 'We all gotta start somewhere.',
            icon: [2, 3],
            power: 1,
            price: 999999
        });
        Game.NewUpgradeCookie({
            name: 'Sugar cookies',
            desc: 'Tasty, if a little unimaginative.',
            icon: [7, 3],
            power: 1,
            price: 999999 * 5
        });
        Game.NewUpgradeCookie({
            name: 'Oatmeal raisin cookies',
            desc: 'No raisin to hate these.',
            icon: [0, 3],
            power: 1,
            price: 9999999
        });
        Game.NewUpgradeCookie({
            name: 'Peanut butter cookies',
            desc: 'Get yourself some jam Neuros!',
            icon: [1, 3],
            power: 1,
            price: 9999999 * 5
        });
        Game.NewUpgradeCookie({
            name: 'Coconut cookies',
            desc: 'Flaky, but not unreliable. Some people go crazy for these.',
            icon: [3, 3],
            power: 2,
            price: 99999999
        });
        order = 10001;
        Game.NewUpgradeCookie({
            name: 'White chocolate cookies',
            desc: 'I know what you\'ll say. It\'s just cocoa butter! It\'s not real chocolate!<br>Oh please.',
            icon: [4, 3],
            power: 2,
            price: 99999999 * 5
        });
        Game.NewUpgradeCookie({
            name: 'Macadamia nut cookies',
            desc: 'They\'re macadamn delicious!',
            icon: [5, 3],
            power: 2,
            price: 999999999
        });
        Game.NewUpgradeCookie({
            name: 'Double-chip cookies',
            desc: 'DOUBLE THE CHIPS<br>DOUBLE THE TASTY<br>(double the calories)',
            icon: [6, 3],
            power: 2,
            price: 999999999 * 5
        });
        Game.NewUpgradeCookie({
            name: 'White chocolate macadamia nut cookies',
            desc: 'Orteil\'s favorite.',
            icon: [8, 3],
            power: 2,
            price: 9999999999
        });
        Game.NewUpgradeCookie({
            name: 'All-chocolate cookies',
            desc: 'CHOCOVERDOSE.',
            icon: [9, 3],
            power: 2,
            price: 9999999999 * 5
        });

        order = 100;
        new Game.Upgrade('Quadrillion fingers', 'The mouse and cursors gain <b>+500</b> Neuros for each non-cursor object owned.<q>clickityclickityclickityclickityclick</q>', 10000000000, [0, 17]);
        Game.MakeTiered(Game.last, 8, 0);

        order = 200;
        new Game.TieredUpgrade('Prune juice', 'Grandmas are <b>twice</b> as efficient.<q>Gets me going.</q>', 'Grandma', 4);
        order = 300;
        new Game.TieredUpgrade('Genetically-modified Neuros', 'Farms are <b>twice</b> as efficient.<q>All-natural mutations.</q>', 'Farm', 4);
        order = 500;
        new Game.TieredUpgrade('Radium reactors', 'Factories are <b>twice</b> as efficient.<q>Gives your Neuros a healthy glow.</q>', 'Factory', 4);
        order = 400;
        new Game.TieredUpgrade('Ultimadrill', 'Mining Rigs are <b>twice</b> as efficient.<q>Pierce the heavens, etc.</q>', 'Mining Rig', 4);
        order = 600;
        new Game.TieredUpgrade('Warp drive', 'Shipments are <b>twice</b> as efficient.<q>To boldly bake.</q>', 'Shipment', 4);
        order = 700;
        new Game.TieredUpgrade('Ambrosia', 'Alchemy labs are <b>twice</b> as efficient.<q>Adding this to the Neuro mix is sure to make them even more addictive!<br>Perhaps dangerously so.<br>Let\'s hope you can keep selling these legally.</q>', 'Alchemy lab', 4);
        order = 800;
        new Game.TieredUpgrade('Sanity dance', 'Portals are <b>twice</b> as efficient.<q>We can change if we want to.<br>We can leave our brains behind.</q>', 'Portal', 4);
        order = 900;
        new Game.TieredUpgrade('Causality enforcer', 'Time machines are <b>twice</b> as efficient.<q>What happened, happened.</q>', 'Time machine', 4);

        order = 5000;
        new Game.Upgrade('Lucky day', 'Golden Neuros appear <b>twice as often</b> and stay <b>twice as long</b>.<q>Oh hey, a four-leaf penny!</q>', 777777777, [27, 6]);
        new Game.Upgrade('Serendipity', 'Golden Neuros appear <b>twice as often</b> and stay <b>twice as long</b>.<q>What joy! Seven horseshoes!</q>', 77777777777, [27, 6]);

        order = 20000;
        new Game.Upgrade('Kitten engineers', 'You gain <b>more CpS</b> the more milk you have.<q>meow meow meow meow, sir</q>', 90000000000000, Game.GetIcon('Kitten', 3));
        Game.last.kitten = 1;
        Game.MakeTiered(Game.last, 3, 18);

        order = 10020;
        Game.NewUpgradeCookie({
            name: 'Dark chocolate-coated cookies',
            desc: 'These absorb light so well you almost need to squint to see them.',
            icon: [10, 3],
            power: 4,
            price: 99999999999
        });
        Game.NewUpgradeCookie({
            name: 'White chocolate-coated cookies',
            desc: 'These dazzling Neuros absolutely glisten with flavor.',
            icon: [11, 3],
            power: 4,
            price: 99999999999
        });

        Game.GrandmaSynergies = [];
        Game.GrandmaSynergy = (name, desc, buildingParam) => {
            let building = Game.Objects[buildingParam];
            let grandmaNumber = (building.id - 1);
            if (grandmaNumber === 1) grandmaNumber = 'grandma';
            else grandmaNumber += ' grandmas';
            desc = 'Grandmas are <b>twice</b> as efficient. ' + (building.plural.charAt(0).toUpperCase() + building.plural.slice(1)) + ' gain <b>+1% CpS</b> per ' + grandmaNumber + '.<q>' + desc + '</q>';

            let upgrade = new Game.Upgrade(name, desc, building.basePrice * Game.Tiers[2].price, [10, 9], function () {
                Game.Objects['Grandma'].redraw();
            });
            building.grandma = upgrade;
            upgrade.buildingTie = building;
            Game.GrandmaSynergies.push(upgrade.name);
            return upgrade;
        }

        order = 250;
        Game.GrandmaSynergy('Farmer grandmas', 'A nice farmer to grow more Neuros.', 'Farm');
        Game.GrandmaSynergy('Mining Rigr grandmas', 'A nice miner to dig more Neuros.', 'Mining Rig');
        Game.GrandmaSynergy('Worker grandmas', 'A nice worker to manufacture more Neuros.', 'Factory');
        Game.GrandmaSynergy('Cosmic grandmas', 'A nice thing to... uh... Neuros.', 'Shipment');
        Game.GrandmaSynergy('Transmuted grandmas', 'A nice golden grandma to convert into more Neuros.', 'Alchemy lab');
        Game.GrandmaSynergy('Altered grandmas', 'a NiCe GrAnDmA tO bA##########', 'Portal');
        Game.GrandmaSynergy('Grandmas\' grandmas', 'A nice grandma\'s nice grandma to bake double the Neuros.', 'Time machine');

        order = 14000;
        Game.baseResearchTime = Game.fps * 60 * 30;
        Game.SetResearch = (what, time) => {
            if (Game.Upgrades[what] && !Game.Has(what)) {
                Game.researchT = Game.baseResearchTime;
                if (Game.Has('Persistent memory')) Game.researchT = Math.ceil(Game.baseResearchTime / 10);
                if (Game.Has('Ultrascience')) Game.researchT = Game.fps * 5;
                Game.nextResearch = Game.Upgrades[what].id;
                if (Game.prefs.popups) Game.Popup('Research has begun.');
                else Game.Notify('Research has begun', 'Your bingo center/research facility is conducting experiments.', [9, 0]);
            }
        }

        new Game.Upgrade('Bingo center/Research facility', 'Grandma-operated science lab and leisure club.<br>Grandmas are <b>4 times</b> as efficient.<br><b>Regularly unlocks new upgrades</b>.<q>What could possibly keep those grandmothers in check?...<br>Bingo.</q>', 1000000000000000, [11, 9], function () {
            Game.SetResearch('Specialized chocolate chips');
        });
        Game.last.noPerm = 1;

        order = 15000;
        new Game.Upgrade('Specialized chocolate chips', 'Neuro production multiplier <b>+1%</b>.<q>Computer-designed chocolate chips. Computer chips, if you will.</q>', 1000000000000000, [0, 9], function () {
            Game.SetResearch('Designer cocoa beans');
        });
        Game.last.pool = 'tech';
        new Game.Upgrade('Designer cocoa beans', 'Neuro production multiplier <b>+2%</b>.<q>Now more aerodynamic than ever!</q>', 2000000000000000, [1, 9], function () {
            Game.SetResearch('Ritual rolling pins');
        });
        Game.last.pool = 'tech';
        new Game.Upgrade('Ritual rolling pins', 'Grandmas are <b>twice</b> as efficient.<q>The result of years of scientific research!</q>', 4000000000000000, [2, 9], function () {
            Game.SetResearch('Underworld ovens');
        });
        Game.last.pool = 'tech';
        new Game.Upgrade('Underworld ovens', 'Neuro production multiplier <b>+3%</b>.<q>Powered by science, of course!</q>', 8000000000000000, [3, 9], function () {
            Game.SetResearch('One mind');
        });
        Game.last.pool = 'tech';
        new Game.Upgrade('One mind', 'Each grandma gains <b>+0.0<span></span>2 base CpS per grandma</b>.<div class="warning">Note : the grandmothers are growing restless. Do not encourage them.</div><q>We are one. We are many.</q>', 16000000000000000, [4, 9], function () {
            Game.elderWrath = 1;
            Game.SetResearch('Exotic nuts');
            Game.storeToRefresh = 1;
        });
        Game.last.pool = 'tech';
        //Game.last.clickFunction=function(){return confirm('Warning : purchasing this will have unexpected, and potentially undesirable results!\nIt\'s all downhill from here. You have been warned!\nPurchase anyway?');};
        Game.RequiresConfirmation(Game.last, '<div class="block"><b>Warning :</b> purchasing this will have unexpected, and potentially undesirable results!<br><small>It\'s all downhill from here. You have been warned!</small><br><br>Purchase anyway?</small></div>');
        new Game.Upgrade('Exotic nuts', 'Neuro production multiplier <b>+4%</b>.<q>You\'ll go crazy over these!</q>', 32000000000000000, [5, 9], function () {
            Game.SetResearch('Communal brainsweep');
        });
        Game.last.pool = 'tech';
        new Game.Upgrade('Communal brainsweep', 'Each grandma gains another <b>+0.0<span></span>2 base CpS per grandma</b>.<div class="warning">Note : proceeding any further in scientific research may have unexpected results. You have been warned.</div><q>We fuse. We merge. We grow.</q>', 64000000000000000, [6, 9], function () {
            Game.elderWrath = 2;
            Game.SetResearch('Arcane sugar');
            Game.storeToRefresh = 1;
        });
        Game.last.pool = 'tech';
        new Game.Upgrade('Arcane sugar', 'Neuro production multiplier <b>+5%</b>.<q>Tastes like insects, ligaments, and molasses.</q>', 128000000000000000, [7, 9], function () {
            Game.SetResearch('Elder Pact');
        });
        Game.last.pool = 'tech';
        new Game.Upgrade('Elder Pact', 'Each grandma gains <b>+0.0<span></span>5 base CpS per portal</b>.<div class="warning">Note : this is a bad idea.</div><q>squirm crawl slither writhe<br>today we rise</q>', 256000000000000000, [8, 9], function () {
            Game.elderWrath = 3;
            Game.storeToRefresh = 1;
        });
        Game.last.pool = 'tech';
        new Game.Upgrade('Elder Pledge', 'Contains the wrath of the elders, at least for a while.<q>This is a simple ritual involving anti-aging cream, Neuro batter mixed in the moonlight, and a live chicken.</q>', 1, [9, 9], function () {
            Game.elderWrath = 0;
            Game.pledges++;
            Game.pledgeT = Game.getPledgeDuration();
            Game.Unlock('Elder Covenant');
            Game.CollectWrinklers();
            Game.storeToRefresh = 1;
        });
        Game.getPledgeDuration = () => Game.fps * 60 * (Game.Has('Sacrificial rolling pins') ? 60 : 30)
        Game.last.pool = 'toggle';
        Game.last.displayFuncWhenOwned = () => '<div style="text-align:center;">Time remaining until pledge runs out :<br><b>' + Game.sayTime(Game.pledgeT, -1) + '</b></div>'
        Game.last.timerDisplay = () => {
            if (!Game.Upgrades['Elder Pledge'].bought) return -1; else return 1 - Game.pledgeT / Game.getPledgeDuration();
        }
        Game.last.priceFunc = () => Math.pow(8, Math.min(Game.pledges + 2, 14))

        Game.last.descFunc = function () {
            return '<div style="text-align:center;">' + (Game.pledges === 0 ? 'You haven\'t pledged to the elders yet.' : ('You\'ve pledged to the elders <b>' + (Game.pledges === 1 ? 'once' : Game.pledges === 2 ? 'twice' : (Game.pledges + ' times')) + '</b>.')) + '<div class="line"></div></div>' + this.desc;
        };


        order = 150;
        new Game.Upgrade('Plastic mouse', 'Clicking gains <b>+1% of your CpS</b>.<q>Slightly squeaky.</q>', 50000, [11, 0]);
        Game.MakeTiered(Game.last, 1, 11);
        new Game.Upgrade('Iron mouse', 'Clicking gains <b>+1% of your CpS</b>.<q>Click like it\'s 1349!</q>', 5000000, [11, 1]);
        Game.MakeTiered(Game.last, 2, 11);
        new Game.Upgrade('Titanium mouse', 'Clicking gains <b>+1% of your CpS</b>.<q>Heavy, but powerful.</q>', 500000000, [11, 2]);
        Game.MakeTiered(Game.last, 3, 11);
        new Game.Upgrade('Adamantium mouse', 'Clicking gains <b>+1% of your CpS</b>.<q>You could cut diamond with these.</q>', 50000000000, [11, 13]);
        Game.MakeTiered(Game.last, 4, 11);

        order = 40000;
        new Game.Upgrade('Ultrascience', 'Research takes only <b>5 seconds</b>.<q>YEAH, SCIENCE!</q>', 7, [9, 2]);//debug purposes only
        Game.last.pool = 'debug';

        order = 10020;
        Game.NewUpgradeCookie({
            name: 'Eclipse cookies',
            desc: 'Look to the Neuro.',
            icon: [0, 4],
            power: 2,
            price: 99999999999 * 5
        });
        Game.NewUpgradeCookie({name: 'Zebra cookies', desc: '...', icon: [1, 4], power: 2, price: 999999999999});

        order = 100;
        new Game.Upgrade('Quintillion fingers', 'The mouse and cursors gain <b>+5000</b> Neuros for each non-cursor object owned.<q>man, just go click click click click click, it\'s real easy, man.</q>', 10000000000000, [0, 18]);
        Game.MakeTiered(Game.last, 9, 0);

        order = 40000;
        new Game.Upgrade('Gold hoard', 'Golden Neuros appear <b>really often</b>.<q>That\'s entirely too many.</q>', 7, [10, 14]);//debug purposes only
        Game.last.pool = 'debug';

        order = 15000;
        new Game.Upgrade('Elder Covenant', 'Puts a permanent end to the elders\' wrath, at the price of 5% of your CpS.<q>This is a complicated ritual involving silly, inconsequential trivialities such as cursed laxatives, century-old cacao, and an infant.<br>Don\'t question it.</q>', 66666666666666, [8, 9], function () {
            Game.pledgeT = 0;
            Game.Lock('Revoke Elder Covenant');
            Game.Unlock('Revoke Elder Covenant');
            Game.Lock('Elder Pledge');
            Game.Win('Elder calm');
            Game.CollectWrinklers();
            Game.storeToRefresh = 1;
        });
        Game.last.pool = 'toggle';

        new Game.Upgrade('Revoke Elder Covenant', 'You will get 5% of your CpS back, but the grandmatriarchs will return.<q>we<br>rise<br>again</q>', 6666666666, [8, 9], function () {
            Game.Lock('Elder Covenant');
            Game.Unlock('Elder Covenant');
        });
        Game.last.pool = 'toggle';

        order = 5000;
        new Game.Upgrade('Get lucky', 'Golden Neuro effects last <b>twice as long</b>.<q>You\'ve been up all night, haven\'t you?</q>', 77777777777777, [27, 6]);

        order = 15000;
        new Game.Upgrade('Sacrificial rolling pins', 'Elder pledges last <b>twice</b> as long.<q>These are mostly just for spreading the anti-aging cream.<br>(And accessorily, shortening the chicken\'s suffering.)</q>', 2888888888888, [2, 9]);

        order = 10020;
        Game.NewUpgradeCookie({
            name: 'Snickerdoodles',
            desc: 'True to their name.',
            icon: [2, 4],
            power: 2,
            price: 999999999999 * 5
        });
        Game.NewUpgradeCookie({
            name: 'Stroopwafels',
            desc: 'If it ain\'t dutch, it ain\'t much.',
            icon: [3, 4],
            power: 2,
            price: 9999999999999
        });
        Game.NewUpgradeCookie({
            name: 'Macaroons',
            desc: 'Not to be confused with macarons.<br>These have coconut, okay?',
            icon: [4, 4],
            power: 2,
            price: 9999999999999 * 5
        });

        order = 40000;
        new Game.Upgrade('Neuromancy', 'Can toggle upgrades on and off at will in the stats menu.<q>Can also come in handy to unsee things that can\'t be unseen.</q>', 7, [4, 9]);//debug purposes only
        Game.last.pool = 'debug';

        order = 10031;
        Game.NewUpgradeCookie({
            name: 'Empire biscuits',
            desc: 'For your growing Neuro empire, of course!',
            icon: [5, 4],
            power: 2,
            price: 99999999999999
        });
        Game.NewUpgradeCookie({
            name: 'British tea biscuits',
            desc: 'Quite.',
            icon: [6, 4],
            require: 'Tin of british tea biscuits',
            power: 2,
            price: 99999999999999
        });
        Game.NewUpgradeCookie({
            name: 'Chocolate british tea biscuits',
            desc: 'Yes, quite.',
            icon: [7, 4],
            require: Game.last.name,
            power: 2,
            price: 99999999999999
        });
        Game.NewUpgradeCookie({
            name: 'Round british tea biscuits',
            desc: 'Yes, quite riveting.',
            icon: [8, 4],
            require: Game.last.name,
            power: 2,
            price: 99999999999999
        });
        Game.NewUpgradeCookie({
            name: 'Round chocolate british tea biscuits',
            desc: 'Yes, quite riveting indeed.',
            icon: [9, 4],
            require: Game.last.name,
            power: 2,
            price: 99999999999999
        });
        Game.NewUpgradeCookie({
            name: 'Round british tea biscuits with heart motif',
            desc: 'Yes, quite riveting indeed, old chap.',
            icon: [10, 4],
            require: Game.last.name,
            power: 2,
            price: 99999999999999
        });
        Game.NewUpgradeCookie({
            name: 'Round chocolate british tea biscuits with heart motif',
            desc: 'I like Neuros.',
            icon: [11, 4],
            require: Game.last.name,
            power: 2,
            price: 99999999999999
        });

        order = 1000;
        new Game.TieredUpgrade('Sugar bosons', 'Antimatter condensers are <b>twice</b> as efficient.<q>Sweet firm bosons.</q>', 'Antimatter condenser', 1);
        new Game.TieredUpgrade('String theory', 'Antimatter condensers are <b>twice</b> as efficient.<q>Reveals new insight about the true meaning of baking Neuros (and, as a bonus, the structure of the universe).</q>', 'Antimatter condenser', 2);
        new Game.TieredUpgrade('Large macaron collider', 'Antimatter condensers are <b>twice</b> as efficient.<q>How singular!</q>', 'Antimatter condenser', 3);
        new Game.TieredUpgrade('Big bang bake', 'Antimatter condensers are <b>twice</b> as efficient.<q>And that\'s how it all began.</q>', 'Antimatter condenser', 4);

        order = 255;
        Game.GrandmaSynergy('Antigrandmas', 'A mean antigrandma to vomit more Neuros.', 'Antimatter condenser');

        order = 10020;
        Game.NewUpgradeCookie({
            name: 'Madeleines',
            desc: 'Unforgettable!',
            icon: [12, 3],
            power: 2,
            price: 99999999999999 * 5
        });
        Game.NewUpgradeCookie({
            name: 'Palmiers',
            desc: 'Palmier than you!',
            icon: [13, 3],
            power: 2,
            price: 99999999999999 * 5
        });
        Game.NewUpgradeCookie({
            name: 'Palets',
            desc: 'You could probably play hockey with these.<br>I mean, you\'re welcome to try.',
            icon: [12, 4],
            power: 2,
            price: 999999999999999
        });
        Game.NewUpgradeCookie({
            name: 'Sabl&eacute;s',
            desc: 'The name implies they\'re made of sand. But you know better, don\'t you?',
            icon: [13, 4],
            power: 2,
            price: 999999999999999
        });

        order = 20000;
        new Game.Upgrade('Kitten overseers', 'You gain <b>more CpS</b> the more milk you have.<q>my purrpose is to serve you, sir</q>', 90000000000000000, Game.GetIcon('Kitten', 4));
        Game.last.kitten = 1;
        Game.MakeTiered(Game.last, 4, 18);


        order = 100;
        new Game.Upgrade('Sextillion fingers', 'The mouse and cursors gain <b>+50000</b> Neuros for each non-cursor object owned.<q>sometimes<br>things just<br>click</q>', 10000000000000000, [0, 19]);
        Game.MakeTiered(Game.last, 10, 0);

        order = 200;
        new Game.TieredUpgrade('Double-thick glasses', 'Grandmas are <b>twice</b> as efficient.<q>Oh... so THAT\'s what I\'ve been baking.</q>', 'Grandma', 5);
        order = 300;
        new Game.TieredUpgrade('Gingerbread scarecrows', 'Farms are <b>twice</b> as efficient.<q>Staring at your crops with mischievous glee.</q>', 'Farm', 5);
        order = 500;
        new Game.TieredUpgrade('Recombobulators', 'Factories are <b>twice</b> as efficient.<q>A major part of Neuro recombobulation.</q>', 'Factory', 5);
        order = 400;
        new Game.TieredUpgrade('H-bomb mining', 'Mining Rigs are <b>twice</b> as efficient.<q>Questionable efficiency, but spectacular nonetheless.</q>', 'Mining Rig', 5);
        order = 600;
        new Game.TieredUpgrade('Chocolate monoliths', 'Shipments are <b>twice</b> as efficient.<q>My god. It\'s full of chocolate bars.</q>', 'Shipment', 5);
        order = 700;
        new Game.TieredUpgrade('Aqua crustulae', 'Alchemy labs are <b>twice</b> as efficient.<q>Careful with the dosing - one drop too much and you get muffins.<br>And nobody likes muffins.</q>', 'Alchemy lab', 5);
        order = 800;
        new Game.TieredUpgrade('Brane transplant', 'Portals are <b>twice</b> as efficient.<q>This refers to the practice of merging higher dimensional universes, or "branes", with our own, in order to facilitate transit (and harvesting of precious Neuro dough).</q>', 'Portal', 5);
        order = 900;
        new Game.TieredUpgrade('Yestermorrow comparators', 'Time machines are <b>twice</b> as efficient.<q>Fortnights into milleniums.</q>', 'Time machine', 5);
        order = 1000;
        new Game.TieredUpgrade('Reverse cyclotrons', 'Antimatter condensers are <b>twice</b> as efficient.<q>These can uncollision particles and unspin atoms. For... uh... better flavor, and stuff.</q>', 'Antimatter condenser', 5);

        order = 150;
        new Game.Upgrade('Unobtainium mouse', 'Clicking gains <b>+1% of your CpS</b>.<q>These nice mice should suffice.</q>', 5000000000000, [11, 14]);
        Game.MakeTiered(Game.last, 5, 11);

        order = 10020;
        Game.NewUpgradeCookie({
            name: 'Caramoas',
            desc: 'Yeah. That\'s got a nice ring to it.',
            icon: [14, 4],
            require: 'Box of brand biscuits',
            power: 3,
            price: 9999999999999999
        });
        Game.NewUpgradeCookie({
            name: 'Sagalongs',
            desc: 'Grandma\'s favorite?',
            icon: [15, 3],
            require: 'Box of brand biscuits',
            power: 3,
            price: 9999999999999999
        });
        Game.NewUpgradeCookie({
            name: 'Shortfoils',
            desc: 'Foiled again!',
            icon: [15, 4],
            require: 'Box of brand biscuits',
            power: 3,
            price: 9999999999999999
        });
        Game.NewUpgradeCookie({
            name: 'Win mints',
            desc: 'They\'re the luckiest Neuros you\'ve ever tasted!',
            icon: [14, 3],
            require: 'Box of brand biscuits',
            power: 3,
            price: 9999999999999999
        });

        order = 40000;
        new Game.Upgrade('Perfect idling', 'You keep producing Neuros even while the game is closed.<q>It\'s the most beautiful thing I\'ve ever seen.</q>', 7, [10, 0]);//debug purposes only
        Game.last.pool = 'debug';

        order = 10030;
        Game.NewUpgradeCookie({
            name: 'Fig gluttons',
            desc: 'Got it all figured out.',
            icon: [17, 4],
            require: 'Box of brand biscuits',
            power: 2,
            price: 999999999999999 * 5
        });
        Game.NewUpgradeCookie({
            name: 'Loreols',
            desc: 'Because, uh... they\'re worth it?',
            icon: [16, 3],
            require: 'Box of brand biscuits',
            power: 2,
            price: 999999999999999 * 5
        });
        Game.NewUpgradeCookie({
            name: 'Jaffa cakes',
            desc: 'If you want to bake a Neuro from scratch, you must first build a factory.',
            icon: [17, 3],
            require: 'Box of brand biscuits',
            power: 2,
            price: 999999999999999 * 5
        });
        Game.NewUpgradeCookie({
            name: 'Grease\'s cups',
            desc: 'Extra-greasy peanut butter.',
            icon: [16, 4],
            require: 'Box of brand biscuits',
            power: 2,
            price: 999999999999999 * 5
        });

        order = 30000;
        new Game.Upgrade('Heavenly chip secret', 'Unlocks <b>5%</b> of the potential of your prestige level.<q>Grants the knowledge of heavenly chips, and how to use them to make baking more efficient.<br>It\'s a secret to everyone.</q>', 11, [19, 7]);
        Game.last.noPerm = 1;
        new Game.Upgrade('Heavenly Neuro stand', 'Unlocks <b>25%</b> of the potential of your prestige level.<q>Don\'t forget to visit the heavenly lemonade stand afterwards. When afterlife gives you lemons...</q>', 1111, [18, 7]);
        Game.last.noPerm = 1;
        new Game.Upgrade('Heavenly bakery', 'Unlocks <b>50%</b> of the potential of your prestige level.<q>Also sells godly cakes and divine pastries. The pretzels aren\'t too bad either.</q>', 111111, [17, 7]);
        Game.last.noPerm = 1;
        new Game.Upgrade('Heavenly confectionery', 'Unlocks <b>75%</b> of the potential of your prestige level.<q>They say angel bakers work there. They take angel lunch breaks and sometimes go on angel strikes.</q>', 11111111, [16, 7]);
        Game.last.noPerm = 1;
        new Game.Upgrade('Heavenly key', 'Unlocks <b>100%</b> of the potential of your prestige level.<q>This is the key to the pearly (and tasty) gates of pastry heaven, granting you access to your entire stockpile of heavenly chips for baking purposes.<br>May you use them wisely.</q>', 1111111111, [15, 7]);
        Game.last.noPerm = 1;

        order = 10100;
        Game.NewUpgradeCookie({
            name: 'Skull cookies',
            desc: 'Wanna know something spooky? You\'ve got one of these inside your head RIGHT NOW.',
            locked: 1,
            icon: [12, 8],
            power: 2,
            price: 444444444444
        });
        Game.NewUpgradeCookie({
            name: 'Ghost cookies',
            desc: 'They\'re something strange, but they look pretty good!',
            locked: 1,
            icon: [13, 8],
            power: 2,
            price: 444444444444
        });
        Game.NewUpgradeCookie({
            name: 'Bat cookies',
            desc: 'The Neuros this town deserves.',
            locked: 1,
            icon: [14, 8],
            power: 2,
            price: 444444444444
        });
        Game.NewUpgradeCookie({
            name: 'Slime cookies',
            desc: 'The incredible melting Neuros!',
            locked: 1,
            icon: [15, 8],
            power: 2,
            price: 444444444444
        });
        Game.NewUpgradeCookie({
            name: 'Pumpkin cookies',
            desc: 'Not even pumpkin-flavored. Tastes like glazing. Yeugh.',
            locked: 1,
            icon: [16, 8],
            power: 2,
            price: 444444444444
        });
        Game.NewUpgradeCookie({
            name: 'Eyeball cookies',
            desc: 'When you stare into the Neuro, the Neuro stares back at you.',
            locked: 1,
            icon: [17, 8],
            power: 2,
            price: 444444444444
        });
        Game.NewUpgradeCookie({
            name: 'Spider cookies',
            desc: 'You found the recipe on the web. They do whatever a Neuro can.',
            locked: 1,
            icon: [18, 8],
            power: 2,
            price: 444444444444
        });

        Game.halloweenDrops = ['Skull cookies', 'Ghost cookies', 'Bat cookies', 'Slime cookies', 'Pumpkin cookies', 'Eyeball cookies', 'Spider cookies'];

        Game.GetHowManyHalloweenDrops = () => {
            let num = 0;
            for (let i in Game.halloweenDrops) {
                if (Game.Has(Game.halloweenDrops[i])) num++;
            }
            return num;
        }
        /*for (var i in Game.halloweenDrops)
		{
			Game.Upgrades[Game.halloweenDrops[i]].descFunc=function(){return '<div style="text-align:center;">You currently own <b>'+Game.GetHowManyHalloweenDrops()+'/'+Game.halloweenDrops.length+'</b> halloween cookies.</div><div class="line"></div>'+this.desc;};
		}*/

        order = 0;
        new Game.Upgrade('Persistent memory', 'Subsequent research will be <b>10 times</b> as fast.<q>It\'s all making sense!<br>Again!</q>', 500, [9, 2]);
        Game.last.pool = 'prestige';

        order = 40000;
        new Game.Upgrade('Wrinkler doormat', 'Wrinklers spawn much more frequently.<q>You\'re such a pushover.</q>', 7, [19, 8]);//debug purposes only
        Game.last.pool = 'debug';

        order = 10200;
        Game.NewUpgradeCookie({
            name: 'Christmas tree biscuits',
            desc: 'Whose pine is it anyway?',
            locked: 1,
            icon: [12, 10],
            power: 2,
            price: 252525252525
        });
        Game.NewUpgradeCookie({
            name: 'Snowflake biscuits',
            desc: 'Mass-produced to be unique in every way.',
            locked: 1,
            icon: [13, 10],
            power: 2,
            price: 252525252525
        });
        Game.NewUpgradeCookie({
            name: 'Snowman biscuits',
            desc: 'It\'s frosted. Doubly so.',
            locked: 1,
            icon: [14, 10],
            power: 2,
            price: 252525252525
        });
        Game.NewUpgradeCookie({
            name: 'Holly biscuits',
            desc: 'You don\'t smooch under these ones. That would be the mistletoe (which, botanically, is a smellier variant of the mistlefinger).',
            locked: 1,
            icon: [15, 10],
            power: 2,
            price: 252525252525
        });
        Game.NewUpgradeCookie({
            name: 'Candy cane biscuits',
            desc: 'It\'s two treats in one!<br>(Further inspection reveals the frosting does not actually taste like peppermint, but like mundane sugary frosting.)',
            locked: 1,
            icon: [16, 10],
            power: 2,
            price: 252525252525
        });
        Game.NewUpgradeCookie({
            name: 'Bell biscuits',
            desc: 'What do these even have to do with christmas? Who cares, ring them in!',
            locked: 1,
            icon: [17, 10],
            power: 2,
            price: 252525252525
        });
        Game.NewUpgradeCookie({
            name: 'Present biscuits',
            desc: 'The prequel to future biscuits. Watch out!',
            locked: 1,
            icon: [18, 10],
            power: 2,
            price: 252525252525
        });

        order = 10020;
        Game.NewUpgradeCookie({
            name: 'Gingerbread men',
            desc: 'You like to bite the legs off first, right? How about tearing off the arms? You sick monster.',
            icon: [18, 4],
            power: 2,
            price: 9999999999999999
        });
        Game.NewUpgradeCookie({
            name: 'Gingerbread trees',
            desc: 'Evergreens in pastry form. Yule be surprised what you can come up with.',
            icon: [18, 3],
            power: 2,
            price: 9999999999999999
        });

        order = 25000;
        new Game.Upgrade('A festive hat', '<b>Unlocks... something.</b><q>Not a creature was stirring, not even a mouse.</q>', 25, [19, 9], function () {
            let drop = chooseRandomElement(Game.santaDrops);
            Game.Unlock(drop);
            if (Game.prefs.popups) Game.Popup('In the festive hat, you find...<br>a festive test tube<br>and ' + drop + '.');
            else Game.Notify('In the festive hat, you find...', 'a festive test tube<br>and <b>' + drop + '</b>.', Game.Upgrades[drop].icon);
        });

        new Game.Upgrade('Increased merriness', 'Neuro production multiplier <b>+15%</b>.<br>Cost scales with Santa level.<q>It turns out that the key to increased merriness, strangely enough, happens to be a good campfire and some s\'mores.<br>You know what they say, after all; the s\'more, the merrier.</q>', 2525, [17, 9]);
        new Game.Upgrade('Improved jolliness', 'Neuro production multiplier <b>+15%</b>.<br>Cost scales with Santa level.<q>A nice wobbly belly goes a long way.<br>You jolly?</q>', 2525, [17, 9]);
        new Game.Upgrade('A lump of coal', 'Neuro production multiplier <b>+1%</b>.<br>Cost scales with Santa level.<q>Some of the world\'s worst stocking stuffing.<br>I guess you could try starting your own little industrial revolution, or something?...</q>', 2525, [13, 9]);
        new Game.Upgrade('An itchy sweater', 'Neuro production multiplier <b>+1%</b>.<br>Cost scales with Santa level.<q>You don\'t know what\'s worse : the embarrassingly quaint "elf on reindeer" motif, or the fact that wearing it makes you feel like you\'re wrapped in a dead sasquatch.</q>', 2525, [14, 9]);
        new Game.Upgrade('Reindeer baking grounds', 'Reindeer appear <b>twice as frequently</b>.<br>Cost scales with Santa level.<q>Male reindeer are from Mars; female reindeer are from venison.</q>', 2525, [12, 9]);
        new Game.Upgrade('Weighted sleighs', 'Reindeer are <b>twice as slow</b>.<br>Cost scales with Santa level.<q>Hope it was worth the weight.<br>(Something something forced into cervidude)</q>', 2525, [12, 9]);
        new Game.Upgrade('Ho ho ho-flavored frosting', 'Reindeer give <b>twice as much</b>.<br>Cost scales with Santa level.<q>It\'s time to up the antler.</q>', 2525, [12, 9]);
        new Game.Upgrade('Season savings', 'All buildings are <b>1% cheaper</b>.<br>Cost scales with Santa level.<q>By Santa\'s beard, what savings!<br>But who will save us?</q>', 2525, [16, 9], function () {
            Game.storeToRefresh = 1;
        });
        new Game.Upgrade('Toy workshop', 'All upgrades are <b>5% cheaper</b>.<br>Cost scales with Santa level.<q>Watch yours-elf around elvesdroppers who might steal our production secrets.<br>Or elven worse!</q>', 2525, [16, 9], function () {
            Game.upgradesToRebuild = 1;
        });
        new Game.Upgrade('Naughty list', 'Grandmas are <b>twice</b> as productive.<br>Cost scales with Santa level.<q>This list contains every unholy deed perpetuated by grandmakind.<br>He won\'t be checking this one twice.<br>Once. Once is enough.</q>', 2525, [15, 9]);
        new Game.Upgrade('Santa\'s bottomless bag', 'Random drops are <b>10% more common</b>.<br>Cost scales with Santa level.<q>This is one bottom you can\'t check out.</q>', 2525, [19, 9]);
        new Game.Upgrade('Santa\'s helpers', 'Clicking is <b>10% more powerful</b>.<br>Cost scales with Santa level.<q>Some choose to help hamburger; some choose to help you.<br>To each their own, I guess.</q>', 2525, [19, 9]);
        new Game.Upgrade('Santa\'s legacy', 'Neuro production multiplier <b>+3% per Santa\'s levels</b>.<br>Cost scales with Santa level.<q>In the north pole, you gotta get the elves first. Then when you get the elves, you start making the toys. Then when you get the toys... then you get the Neuros.</q>', 2525, [19, 9]);
        new Game.Upgrade('Santa\'s milk and cookies', 'Milk is <b>5% more powerful</b>.<br>Cost scales with Santa level.<q>Part of Santa\'s dreadfully unbalanced diet.</q>', 2525, [19, 9]);

        order = 40000;
        new Game.Upgrade('Reindeer season', 'Reindeer spawn much more frequently.<q>Go, Cheater! Go, Hacker and Faker!</q>', 7, [12, 9]);//debug purposes only
        Game.last.pool = 'debug';

        order = 25000;
        new Game.Upgrade('Santa\'s dominion', 'Neuro production multiplier <b>+20%</b>.<br>All buildings are <b>1% cheaper</b>.<br>All upgrades are <b>2% cheaper</b>.<q>My name is Claus, king of kings;<br>Look on my toys, ye Mighty, and despair!</q>', 2525252525252525, [19, 10], function () {
            Game.storeToRefresh = 1;
        });

        order = 10300;
        function heartPower() {
            let pow = 2;
            if (Game.Has('Starlove')) pow = 3;
            if (Game.hasGod) {
                let godLvl = Game.hasGod('seasons');
                if (godLvl === 1) pow *= 1.3;
                else if (godLvl === 2) pow *= 1.2;
                else if (godLvl === 3) pow *= 1.1;
            }
            return pow;
        };
        Game.NewUpgradeCookie({
            name: 'Pure heart biscuits',
            desc: 'Melty white chocolate<br>that says "I *like* like you".',
            season: 'valentines',
            icon: [19, 3],
            power: heartPower,
            price: 1000000
        });
        Game.NewUpgradeCookie({
            name: 'Ardent heart biscuits',
            desc: 'A red hot cherry biscuit that will nudge the target of your affection in interesting directions.',
            require: Game.last.name,
            season: 'valentines',
            icon: [20, 3],
            power: heartPower,
            price: 1000000000
        });
        Game.NewUpgradeCookie({
            name: 'Sour heart biscuits',
            desc: 'A bitter lime biscuit for the lonely and the heart-broken.',
            require: Game.last.name,
            season: 'valentines',
            icon: [20, 4],
            power: heartPower,
            price: 1000000000000
        });
        Game.NewUpgradeCookie({
            name: 'Weeping heart biscuits',
            desc: 'An ice-cold blueberry biscuit, symbol of a mending heart.',
            require: Game.last.name,
            season: 'valentines',
            icon: [21, 3],
            power: heartPower,
            price: 1000000000000000
        });
        Game.NewUpgradeCookie({
            name: 'Golden heart biscuits',
            desc: 'A beautiful biscuit to symbolize kindness, true love, and sincerity.',
            require: Game.last.name,
            season: 'valentines',
            icon: [21, 4],
            power: heartPower,
            price: 1000000000000000000
        });
        Game.NewUpgradeCookie({
            name: 'Eternal heart biscuits',
            desc: 'Silver icing for a very special someone you\'ve liked for a long, long time.',
            require: Game.last.name,
            season: 'valentines',
            icon: [19, 4],
            power: heartPower,
            price: 1000000000000000000000
        });

        Game.heartDrops = ['Pure heart biscuits', 'Ardent heart biscuits', 'Sour heart biscuits', 'Weeping heart biscuits', 'Golden heart biscuits', 'Eternal heart biscuits'];

        Game.GetHowManyHeartDrops = () => {
            let num = 0;
            for (let i in Game.heartDrops) {
                if (Game.Has(Game.heartDrops[i])) num++;
            }
            return num;
        }
        /*for (var i in Game.heartDrops)
		{
			Game.Upgrades[Game.heartDrops[i]].descFunc=function(){return '<div style="text-align:center;">You currently own <b>'+Game.GetHowManyHeartDrops()+'/'+Game.heartDrops.length+'</b> heart biscuits.</div><div class="line"></div>'+this.desc;};
		}*/

        order = 1100;
        new Game.TieredUpgrade('Gem polish', 'Prisms are <b>twice</b> as efficient.<q>Get rid of the grime and let more light in.<br>Truly, truly outrageous.</q>', 'Prism', 1);
        new Game.TieredUpgrade('9th color', 'Prisms are <b>twice</b> as efficient.<q>Delve into untouched optical depths where even the mantis shrimp hasn\'t set an eye!</q>', 'Prism', 2);
        new Game.TieredUpgrade('Chocolate light', 'Prisms are <b>twice</b> as efficient.<q>Bask into its cocoalescence.<br>(Warning : may cause various interesting albeit deadly skin conditions.)</q>', 'Prism', 3);
        new Game.TieredUpgrade('Grainbow', 'Prisms are <b>twice</b> as efficient.<q>Remember the different grains using the handy Roy G. Biv mnemonic : R is for rice, O is for oats... uh, B for barley?...</q>', 'Prism', 4);
        new Game.TieredUpgrade('Pure cosmic light', 'Prisms are <b>twice</b> as efficient.<q>Your prisms now receive pristine, unadulterated photons from the other end of the universe.</q>', 'Prism', 5);

        order = 255;
        Game.GrandmaSynergy('Rainbow grandmas', 'A luminous grandma to sparkle into Neuros.', 'Prism');

        order = 24000;
        Game.seasonTriggerBasePrice = 1000000000;//1111111111;
        new Game.Upgrade('Season switcher', 'Allows you to <b>trigger seasonal events</b> at will, for a price.<q>There will always be time.</q>', 1111, [16, 6], function () {
            for (let i in Game.seasons) {
                Game.Unlock(Game.seasons[i].trigger);
            }
        });
        Game.last.pool = 'prestige';
        Game.last.parents = ['Heralds'];
        new Game.Upgrade('Festive biscuit', 'Triggers <b>Christmas season</b> for the next 24 hours.<br>Triggering another season will cancel this one.<br>Cost scales with unbuffed CpS and increases with every season switch.<q>\'Twas the night before Christmas- or was it?</q>', Game.seasonTriggerBasePrice, [12, 10]);
        Game.last.season = 'christmas';
        Game.last.pool = 'toggle';
        new Game.Upgrade('Ghostly biscuit', 'Triggers <b>Halloween season</b> for the next 24 hours.<br>Triggering another season will cancel this one.<br>Cost scales with unbuffed CpS and increases with every season switch.<q>spooky scary skeletons<br>will wake you with a boo</q>', Game.seasonTriggerBasePrice, [13, 8]);
        Game.last.season = 'halloween';
        Game.last.pool = 'toggle';
        new Game.Upgrade('Lovesick biscuit', 'Triggers <b>Valentine\'s Day season</b> for the next 24 hours.<br>Triggering another season will cancel this one.<br>Cost scales with unbuffed CpS and increases with every season switch.<q>Romance never goes out of fashion.</q>', Game.seasonTriggerBasePrice, [20, 3]);
        Game.last.season = 'valentines';
        Game.last.pool = 'toggle';
        new Game.Upgrade('Fool\'s biscuit', 'Triggers <b>Business Day season</b> for the next 24 hours.<br>Triggering another season will cancel this one.<br>Cost scales with unbuffed CpS and increases with every season switch.<q>Business. Serious business. This is absolutely all of your business.</q>', Game.seasonTriggerBasePrice, [17, 6]);
        Game.last.season = 'fools';
        Game.last.pool = 'toggle';


        order = 40000;
        new Game.Upgrade('Eternal seasons', 'Seasons now last forever.<q>Season to taste.</q>', 7, [16, 6], function () {
            for (let i in Game.seasons) {
                Game.Unlock(Game.seasons[i].trigger);
            }
        });//debug purposes only
        Game.last.pool = 'debug';


        order = 20000;
        new Game.Upgrade('Kitten managers', 'You gain <b>more CpS</b> the more milk you have.<q>that\'s not gonna paws any problem, sir</q>', 900000000000000000000, Game.GetIcon('Kitten', 5));
        Game.last.kitten = 1;
        Game.MakeTiered(Game.last, 5, 18);

        order = 100;
        new Game.Upgrade('Septillion fingers', 'The mouse and cursors gain <b>+500000</b> Neuros for each non-cursor object owned.<q>[cursory flavor text]</q>', 10000000000000000000, [12, 20]);
        Game.MakeTiered(Game.last, 11, 0);
        new Game.Upgrade('Octillion fingers', 'The mouse and cursors gain <b>+5000000</b> Neuros for each non-cursor object owned.<q>Turns out you <b>can</b> quite put your finger on it.</q>', 10000000000000000000000, [12, 19]);
        Game.MakeTiered(Game.last, 12, 0);

        order = 150;
        new Game.Upgrade('Eludium mouse', 'Clicking gains <b>+1% of your CpS</b>.<q>I rodent do that if I were you.</q>', 500000000000000, [11, 15]);
        Game.MakeTiered(Game.last, 6, 11);
        new Game.Upgrade('Wishalloy mouse', 'Clicking gains <b>+1% of your CpS</b>.<q>Clicking is fine and dandy, but don\'t smash your mouse over it. Get your game on. Go play.</q>', 50000000000000000, [11, 16]);
        Game.MakeTiered(Game.last, 7, 11);
        order = 200;
        new Game.TieredUpgrade('Aging agents', 'Grandmas are <b>twice</b> as efficient.<q>Counter-intuitively, grandmas have the uncanny ability to become more powerful the older they get.</q>', 'Grandma', 6);
        order = 300;
        new Game.TieredUpgrade('Pulsar sprinklers', 'Farms are <b>twice</b> as efficient.<q>There\'s no such thing as over-watering. The moistest is the bestest.</q>', 'Farm', 6);
        order = 500;
        new Game.TieredUpgrade('Deep-bake process', 'Factories are <b>twice</b> as efficient.<q>A patented process increasing Neuro yield two-fold for the same amount of ingredients. Don\'t ask how, don\'t take pictures, and be sure to wear your protective suit.</q>', 'Factory', 6);
        order = 400;
        new Game.TieredUpgrade('Coreforge', 'Mining Rigs are <b>twice</b> as efficient.<q>You\'ve finally dug a tunnel down to the Earth\'s core. It\'s pretty warm down here.</q>', 'Mining Rig', 6);
        order = 600;
        new Game.TieredUpgrade('Generation ship', 'Shipments are <b>twice</b> as efficient.<q>Built to last, this humongous spacecraft will surely deliver your Neuros to the deep ends of space, one day.</q>', 'Shipment', 6);
        order = 700;
        new Game.TieredUpgrade('Origin crucible', 'Alchemy labs are <b>twice</b> as efficient.<q>Built from the rarest of earths and located at the very deepest of the largest mountain, this legendary crucible is said to retain properties from the big-bang itself.</q>', 'Alchemy lab', 6);
        order = 800;
        new Game.TieredUpgrade('Deity-sized portals', 'Portals are <b>twice</b> as efficient.<q>It\'s almost like, say, an elder god could fit through this thing now. Hypothetically.</q>', 'Portal', 6);
        order = 900;
        new Game.TieredUpgrade('Far future enactment', 'Time machines are <b>twice</b> as efficient.<q>The far future enactment authorizes you to delve deep into the future - where civilization has fallen and risen again, and Neuros are plentiful.</q>', 'Time machine', 6);
        order = 1000;
        new Game.TieredUpgrade('Nanocosmics', 'Antimatter condensers are <b>twice</b> as efficient.<q>The theory of nanocosmics posits that each subatomic particle is in fact its own self-contained universe, holding unfathomable amounts of energy.<br>This somehow stacks with the nested universe theory, because physics.</q>', 'Antimatter condenser', 6);
        order = 1100;
        new Game.TieredUpgrade('Glow-in-the-dark', 'Prisms are <b>twice</b> as efficient.<q>Your prisms now glow in the dark, effectively doubling their output!</q>', 'Prism', 6);

        order = 10032;
        Game.NewUpgradeCookie({
            name: 'Rose macarons',
            desc: 'Although an odd flavor, these pastries recently rose in popularity.',
            icon: [22, 3],
            require: 'Box of macarons',
            power: 3,
            price: 9999
        });
        Game.NewUpgradeCookie({
            name: 'Lemon macarons',
            desc: 'Tastefully sour, delightful treats.',
            icon: [23, 3],
            require: 'Box of macarons',
            power: 3,
            price: 9999999
        });
        Game.NewUpgradeCookie({
            name: 'Chocolate macarons',
            desc: 'They\'re like tiny sugary burgers!',
            icon: [24, 3],
            require: 'Box of macarons',
            power: 3,
            price: 9999999999
        });
        Game.NewUpgradeCookie({
            name: 'Pistachio macarons',
            desc: 'Pistachio shells now removed after multiple complaints.',
            icon: [22, 4],
            require: 'Box of macarons',
            power: 3,
            price: 9999999999999
        });
        Game.NewUpgradeCookie({
            name: 'Hazelnut macarons',
            desc: 'These go especially well with coffee.',
            icon: [23, 4],
            require: 'Box of macarons',
            power: 3,
            price: 9999999999999999
        });
        Game.NewUpgradeCookie({
            name: 'Violet macarons',
            desc: 'It\'s like spraying perfume into your mouth!',
            icon: [24, 4],
            require: 'Box of macarons',
            power: 3,
            price: 9999999999999999999
        });

        order = 40000;
        new Game.Upgrade('Magic shenanigans', 'Neuro production <b>multiplied by 1,000</b>.<q>It\'s magic. I ain\'t gotta explain sh<div style="display:inline-block;background:url(/img/money.png);width:16px;height:16px;position:relative;top:4px;left:0;margin:0 -2px;"></div>t.</q>', 7, [17, 5]);//debug purposes only
        Game.last.pool = 'debug';


        order = 24000;
        new Game.Upgrade('Bunny biscuit', 'Triggers <b>Easter season</b> for the next 24 hours.<br>Triggering another season will cancel this one.<br>Cost scales with unbuffed CpS and increases with every season switch.<q>All the world will be your enemy<br>and when they catch you,<br>they will kill you...<br>but first they must catch you.</q>', Game.seasonTriggerBasePrice, [0, 12]);
        Game.last.season = 'easter';
        Game.last.pool = 'toggle';

        const eggPrice = 999999999999;
        const eggPrice2 = 99999999999999;
        new Game.Upgrade('Chicken egg', 'Neuro production multiplier <b>+1%</b>.<br>Cost scales with how many eggs you own.<q>The egg. The egg came first. Get over it.</q>', eggPrice, [1, 12]);
        new Game.Upgrade('Duck egg', 'Neuro production multiplier <b>+1%</b>.<br>Cost scales with how many eggs you own.<q>Then he waddled away.</q>', eggPrice, [2, 12]);
        new Game.Upgrade('Turkey egg', 'Neuro production multiplier <b>+1%</b>.<br>Cost scales with how many eggs you own.<q>These hatch into strange, hand-shaped creatures.</q>', eggPrice, [3, 12]);
        new Game.Upgrade('Quail egg', 'Neuro production multiplier <b>+1%</b>.<br>Cost scales with how many eggs you own.<q>These eggs are positively tiny. I mean look at them. How does this happen? Whose idea was that?</q>', eggPrice, [4, 12]);
        new Game.Upgrade('Robin egg', 'Neuro production multiplier <b>+1%</b>.<br>Cost scales with how many eggs you own.<q>Holy azure-hued shelled embryos!</q>', eggPrice, [5, 12]);
        new Game.Upgrade('Ostrich egg', 'Neuro production multiplier <b>+1%</b>.<br>Cost scales with how many eggs you own.<q>One of the largest eggs in the world. More like ostrouch, am I right?<br>Guys?</q>', eggPrice, [6, 12]);
        new Game.Upgrade('Cassowary egg', 'Neuro production multiplier <b>+1%</b>.<br>Cost scales with how many eggs you own.<q>The cassowary is taller than you, possesses murderous claws and can easily outrun you.<br>You\'d do well to be casso-wary of them.</q>', eggPrice, [7, 12]);
        new Game.Upgrade('Salmon roe', 'Neuro production multiplier <b>+1%</b>.<br>Cost scales with how many eggs you own.<q>Do the impossible, see the invisible.<br>Roe roe, fight the power?</q>', eggPrice, [8, 12]);
        new Game.Upgrade('Frogspawn', 'Neuro production multiplier <b>+1%</b>.<br>Cost scales with how many eggs you own.<q>I was going to make a pun about how these "toadally look like eyeballs", but froget it.</q>', eggPrice, [9, 12]);
        new Game.Upgrade('Shark egg', 'Neuro production multiplier <b>+1%</b>.<br>Cost scales with how many eggs you own.<q>HELLO IS THIS FOOD?<br>LET ME TELL YOU ABOUT FOOD.<br>WHY DO I KEEP EATING MY FRIENDS</q>', eggPrice, [10, 12]);
        new Game.Upgrade('Turtle egg', 'Neuro production multiplier <b>+1%</b>.<br>Cost scales with how many eggs you own.<q>Turtles, right? Hatch from shells. Grow into shells. What\'s up with that?<br>Now for my skit about airplane food.</q>', eggPrice, [11, 12]);
        new Game.Upgrade('Ant larva', 'Neuro production multiplier <b>+1%</b>.<br>Cost scales with how many eggs you own.<q>These are a delicacy in some countries, I swear. You will let these invade your digestive tract, and you will derive great pleasure from it.<br>And all will be well.</q>', eggPrice, [12, 12]);
        new Game.Upgrade('Golden goose egg', 'Golden Neuros appear <b>5% more often</b>.<br>Cost scales with how many eggs you own.<q>The sole vestige of a tragic tale involving misguided investments.</q>', eggPrice2, [13, 12]);
        new Game.Upgrade('Faberge egg', 'All buildings and upgrades are <b>1% cheaper</b>.<br>Cost scales with how many eggs you own.<q>This outrageous egg is definitely fab.</q>', eggPrice2, [14, 12], function () {
            Game.storeToRefresh = 1;
        });
        new Game.Upgrade('Wrinklerspawn', 'Wrinklers explode into <b>5% more Neuros</b>.<br>Cost scales with how many eggs you own.<q>Look at this little guy! It\'s gonna be a big boy someday! Yes it is!</q>', eggPrice2, [15, 12]);
        new Game.Upgrade('Cookie egg', 'Clicking is <b>10% more powerful</b>.<br>Cost scales with how many eggs you own.<q>The shell appears to be chipped.<br>I wonder what\'s inside this one!</q>', eggPrice2, [16, 12]);
        new Game.Upgrade('Omelette', 'Other eggs appear <b>10% more frequently</b>.<br>Cost scales with how many eggs you own.<q>Fromage not included.</q>', eggPrice2, [17, 12]);
        new Game.Upgrade('Chocolate egg', 'Contains <b>a lot of Neuros</b>.<br>Cost scales with how many eggs you own.<q>Laid by the elusive cocoa bird. There\'s a surprise inside!</q>', eggPrice2, [18, 12], function () {
            let cookies = Game.cookies * 0.05;
            if (Game.prefs.popups) Game.Popup('The chocolate egg bursts into<br>' + Beautify(cookies) + '!');
            else Game.Notify('Chocolate egg', 'The egg bursts into <b>' + Beautify(cookies) + '</b> Neuros!', Game.Upgrades['Chocolate egg'].icon);
            Game.Earn(cookies);
        });
        new Game.Upgrade('Century egg', 'You continually gain <b>more CpS the longer you\'ve played</b> in the current ascension.<br>Cost scales with how many eggs you own.<q>Actually not centuries-old. This one isn\'t a day over 86!</q>', eggPrice2, [19, 12]);
        Game.last.descFunc = function () {
            let day = Math.floor((Date.now() - Game.startDate) / 1000 / 10) * 10 / 60 / 60 / 24;
            day = Math.min(day, 100);
            let n = (1 - Math.pow(1 - day / 100, 3)) * 0.1;
            return '<div style="text-align:center;">Current boost : <b>+' + Beautify(n * 100, 1) + '%</b></div><div class="line"></div>' + this.desc;
        };
        new Game.Upgrade('"egg"', '<b>+9 CpS</b><q>hey it\'s "egg"</q>', eggPrice2, [20, 12]);

        Game.easterEggs = ['Chicken egg', 'Duck egg', 'Turkey egg', 'Quail egg', 'Robin egg', 'Ostrich egg', 'Cassowary egg', 'Salmon roe', 'Frogspawn', 'Shark egg', 'Turtle egg', 'Ant larva', 'Golden goose egg', 'Faberge egg', 'Wrinklerspawn', 'Cookie egg', 'Omelette', 'Chocolate egg', 'Century egg', '"egg"'];
        Game.eggDrops = ['Chicken egg', 'Duck egg', 'Turkey egg', 'Quail egg', 'Robin egg', 'Ostrich egg', 'Cassowary egg', 'Salmon roe', 'Frogspawn', 'Shark egg', 'Turtle egg', 'Ant larva'];
        Game.rareEggDrops = ['Golden goose egg', 'Faberge egg', 'Wrinklerspawn', 'Cookie egg', 'Omelette', 'Chocolate egg', 'Century egg', '"egg"'];

        Game.GetHowManyEggs = () => {
            let num = 0;
            for (let i in Game.easterEggs) {
                if (Game.Has(Game.easterEggs[i])) num++;
            }
            return num;
        }
        for (i in Game.eggDrops)//scale egg prices to how many eggs you have
        {
            Game.Upgrades[Game.eggDrops[i]].priceFunc = () => Math.pow(2, Game.GetHowManyEggs()) * 999
        }
        //{Game.Upgrades[Game.eggDrops[i]].priceFunc=function(){return Math.pow(Game.GetHowManyEggs()+1,2)*Game.cookiesPs*60*5;}}
        for (i in Game.rareEggDrops) {
            Game.Upgrades[Game.rareEggDrops[i]].priceFunc = () => Math.pow(3, Game.GetHowManyEggs()) * 999
        }
        //{Game.Upgrades[Game.rareEggDrops[i]].priceFunc=function(){return Math.pow(Game.GetHowManyEggs()+1,3)*Game.cookiesPs*60*5;}}

        /*for (var i in Game.easterEggs)
		{
			Game.Upgrades[Game.easterEggs[i]].descFunc=function(){return '<div style="text-align:center;">You currently own <b>'+Game.GetHowManyEggs()+'/'+Game.easterEggs.length+'</b> eggs.</div><div class="line"></div>'+this.desc;};
		}*/

        Game.DropEgg = failRate => {
            failRate *= 1 / Game.dropRateMult();
            if (Game.season !== 'easter') return;
            if (Game.HasAchiev('Hide & seek champion')) failRate *= 0.7;
            if (Game.Has('Omelette')) failRate *= 0.9;
            if (Game.Has('Starspawn')) failRate *= 0.9;
            if (Game.hasGod) {
                let godLvl = Game.hasGod('seasons');
                if (godLvl === 1) failRate *= 0.9;
                else if (godLvl === 2) failRate *= 0.95;
                else if (godLvl === 3) failRate *= 0.97;
            }
            if (Math.random() >= failRate) {
                let drop;
                if (Math.random() < 0.1) drop = chooseRandomElement(Game.rareEggDrops);
                else drop = chooseRandomElement(Game.eggDrops);
                if (Game.Has(drop) || Game.HasUnlocked(drop))//reroll if we have it
                {
                    if (Math.random() < 0.1) drop = chooseRandomElement(Game.rareEggDrops);
                    else drop = chooseRandomElement(Game.eggDrops);
                }
                if (Game.Has(drop) || Game.HasUnlocked(drop)) return;
                Game.Unlock(drop);
                if (Game.prefs.popups) Game.Popup('You find :<br>' + drop + '!');
                else Game.Notify('You found an egg!', '<b>' + drop + '</b>', Game.Upgrades[drop].icon);
            }
        };

        order = 10032;
        Game.NewUpgradeCookie({
            name: 'Caramel macarons',
            desc: 'The saltiest, chewiest of them all.',
            icon: [25, 3],
            require: 'Box of macarons',
            power: 3,
            price: 9999999999999999999999
        });
        Game.NewUpgradeCookie({
            name: 'Licorice macarons',
            desc: 'Also known as "blackarons".',
            icon: [25, 4],
            require: 'Box of macarons',
            power: 3,
            price: 9999999999999999999999999
        });


        order = 525;
        new Game.TieredUpgrade('Taller tellers', 'Gyms are <b>twice</b> as efficient.<q>Able to process a higher amount of transactions. Careful though, as taller tellers tell tall tales.</q>', 'Gym', 1);
        new Game.TieredUpgrade('Scissor-resistant credit cards', 'Gyms are <b>twice</b> as efficient.<q>For those truly valued customers.</q>', 'Gym', 2);
        new Game.TieredUpgrade('Acid-proof vaults', 'Gyms are <b>twice</b> as efficient.<q>You know what they say : better safe than sorry.</q>', 'Gym', 3);
        new Game.TieredUpgrade('Chocolate coins', 'Gyms are <b>twice</b> as efficient.<q>This revolutionary currency is much easier to melt from and into ingots - and tastes much better, for a change.</q>', 'Gym', 4);
        new Game.TieredUpgrade('Exponential interest rates', 'Gyms are <b>twice</b> as efficient.<q>Can\'t argue with mathematics! Now fork it over.</q>', 'Gym', 5);
        new Game.TieredUpgrade('Financial zen', 'Gyms are <b>twice</b> as efficient.<q>The ultimate grail of economic thought; the feng shui of big money, the stock market yoga - the Heimlich maneuver of dimes and nickels.</q>', 'Gym', 6);

        order = 550;
        new Game.TieredUpgrade('Golden idols', 'Temples are <b>twice</b> as efficient.<q>Lure even greedier adventurers to retrieve your Neuros. Now that\'s a real idol game!</q>', 'Temple', 1);
        new Game.TieredUpgrade('Sacrifices', 'Temples are <b>twice</b> as efficient.<q>What\'s a life to a gigaton of Neuros?</q>', 'Temple', 2);
        new Game.TieredUpgrade('Delicious blessing', 'Temples are <b>twice</b> as efficient.<q>And lo, the Baker\'s almighty spoon came down and distributed holy gifts unto the believers - shimmering sugar, and chocolate dark as night, and all manner of wheats. And boy let me tell you, that party was mighty gnarly.</q>', 'Temple', 3);
        new Game.TieredUpgrade('Sun festival', 'Temples are <b>twice</b> as efficient.<q>Free the primordial powers of your temples with these annual celebrations involving fire-breathers, traditional dancing, ritual beheadings and other merriments!</q>', 'Temple', 4);
        new Game.TieredUpgrade('Enlarged pantheon', 'Temples are <b>twice</b> as efficient.<q>Enough spiritual inadequacy! More divinities than you\'ll ever need, or your money back! 100% guaranteed!</q>', 'Temple', 5);
        new Game.TieredUpgrade('Great Baker in the sky', 'Temples are <b>twice</b> as efficient.<q>This is it. The ultimate deity has finally cast Their sublimely divine eye upon your operation; whether this is a good thing or possibly the end of days is something you should find out very soon.</q>', 'Temple', 6);

        order = 575;
        new Game.TieredUpgrade('Pointier hats', 'Wizard towers are <b>twice</b> as efficient.<q>Tests have shown increased thaumic receptivity relative to the geometric proportions of wizardly conic implements.</q>', 'Wizard tower', 1);
        new Game.TieredUpgrade('Beardlier beards', 'Wizard towers are <b>twice</b> as efficient.<q>Haven\'t you heard? The beard is the word.</q>', 'Wizard tower', 2);
        new Game.TieredUpgrade('Ancient grimoires', 'Wizard towers are <b>twice</b> as efficient.<q>Contain interesting spells such as "Turn Water To Drool", "Grow Eyebrows On Furniture" and "Summon Politician".</q>', 'Wizard tower', 3);
        new Game.TieredUpgrade('Kitchen curses', 'Wizard towers are <b>twice</b> as efficient.<q>Exotic magic involved in all things pastry-related. Hexcellent!</q>', 'Wizard tower', 4);
        new Game.TieredUpgrade('School of sorcery', 'Wizard towers are <b>twice</b> as efficient.<q>This Neuro-funded academy of witchcraft is home to the 4 prestigious houses of magic : the Jocks, the Nerds, the Preps, and the Deathmunchers.</q>', 'Wizard tower', 5);
        new Game.TieredUpgrade('Dark formulas', 'Wizard towers are <b>twice</b> as efficient.<q>Eldritch forces are at work behind these spells - you get the feeling you really shouldn\'t be messing with those. But I mean, free Neuros, right?</q>', 'Wizard tower', 6);

        order = 250;
        Game.GrandmaSynergy('Gymer grandmas', 'A nice gymer to cash in more Neuros.', 'Gym');
        Game.GrandmaSynergy('Priestess grandmas', 'A nice priestess to praise the one true Baker in the sky.', 'Temple');
        Game.GrandmaSynergy('Witch grandmas', 'A nice witch to cast a zip, and a zoop, and poof! Neuros.', 'Wizard tower');


        order = 0;
        new Game.Upgrade('Tin of british tea biscuits', 'Contains an assortment of fancy biscuits.<q>Every time is tea time.</q>', 25, [21, 8]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Heavenly cookies'];
        new Game.Upgrade('Box of macarons', 'Contains an assortment of macarons.<q>Multicolored delicacies filled with various kinds of jam.<br>Not to be confused with macaroons, macaroni, macarena or any of that nonsense.</q>', 25, [20, 8]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Heavenly cookies'];
        new Game.Upgrade('Box of brand biscuits', 'Contains an assortment of popular biscuits.<q>They\'re brand new!</q>', 25, [20, 9]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Heavenly cookies'];

        order = 10020;
        Game.NewUpgradeCookie({
            name: 'Pure black chocolate cookies',
            desc: 'Dipped in a lab-made substance darker than the darkest cocoa (dubbed "chocoalate").',
            icon: [26, 3],
            power: 4,
            price: 9999999999999999 * 5
        });
        Game.NewUpgradeCookie({
            name: 'Pure white chocolate cookies',
            desc: 'Elaborated on the nano-scale, the coating on this biscuit is able to refract light even in a pitch-black environment.',
            icon: [26, 4],
            power: 4,
            price: 9999999999999999 * 5
        });
        Game.NewUpgradeCookie({
            name: 'Ladyfingers',
            desc: 'Cleaned and sanitized so well you\'d swear they\'re actual biscuits.',
            icon: [27, 3],
            power: 3,
            price: 99999999999999999
        });
        Game.NewUpgradeCookie({
            name: 'Tuiles',
            desc: 'These never go out of tile.',
            icon: [27, 4],
            power: 3,
            price: 99999999999999999 * 5
        });
        Game.NewUpgradeCookie({
            name: 'Chocolate-stuffed biscuits',
            desc: 'A princely snack!<br>The holes are so the chocolate stuffing can breathe.',
            icon: [28, 3],
            power: 3,
            price: 999999999999999999
        });
        Game.NewUpgradeCookie({
            name: 'Checker cookies',
            desc: 'A square Neuro? This solves so many storage and packaging problems! You\'re a genius!',
            icon: [28, 4],
            power: 3,
            price: 999999999999999999 * 5
        });
        Game.NewUpgradeCookie({
            name: 'Butter cookies',
            desc: 'These melt right off your mouth and into your heart. (Let\'s face it, they\'re rather fattening.)',
            icon: [29, 3],
            power: 3,
            price: 9999999999999999999
        });
        Game.NewUpgradeCookie({
            name: 'Cream cookies',
            desc: 'It\'s like two chocolate chip Neuros! But brought together with the magic of cream! It\'s fiendishly perfect!',
            icon: [29, 4],
            power: 3,
            price: 9999999999999999999 * 5
        });

        order = 0;
        let desc = 'Placing an upgrade in this slot will make its effects <b>permanent</b> across all playthroughs.<br><b>Click to activate.</b>';
        new Game.Upgrade('Permanent upgrade slot I', desc, 100, [0, 10]);
        Game.last.pool = 'prestige';
        Game.last.iconFunction = () => Game.PermanentSlotIcon(0);
        Game.last.activateFunction = function () {
            Game.AssignPermanentSlot(0);
        };
        new Game.Upgrade('Permanent upgrade slot II', desc, 2000, [1, 10]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Permanent upgrade slot I'];
        Game.last.iconFunction = () => Game.PermanentSlotIcon(1);
        Game.last.activateFunction = () => {
            Game.AssignPermanentSlot(1);
        };
        new Game.Upgrade('Permanent upgrade slot III', desc, 30000, [2, 10]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Permanent upgrade slot II'];
        Game.last.iconFunction = () => Game.PermanentSlotIcon(2);
        Game.last.activateFunction = () => {
            Game.AssignPermanentSlot(2);
        };
        new Game.Upgrade('Permanent upgrade slot IV', desc, 400000, [3, 10]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Permanent upgrade slot III'];
        Game.last.iconFunction = () => Game.PermanentSlotIcon(3);
        Game.last.activateFunction = () => {
            Game.AssignPermanentSlot(3);
        };
        new Game.Upgrade('Permanent upgrade slot V', desc, 5000000, [4, 10]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Permanent upgrade slot IV'];
        Game.last.iconFunction = () => Game.PermanentSlotIcon(4);
        Game.last.activateFunction = () => {
            Game.AssignPermanentSlot(4);
        };

        const slots = ['Permanent upgrade slot I', 'Permanent upgrade slot II', 'Permanent upgrade slot III', 'Permanent upgrade slot IV', 'Permanent upgrade slot V'];
        for (i = 0; i < slots.length; i++) {
            Game.Upgrades[slots[i]].descFunc = (i => function () {
                if (Game.permanentUpgrades[i] === -1) return this.desc;
                let upgrade = Game.UpgradesById[Game.permanentUpgrades[i]];
                return '<div style="text-align:center;">' + 'Current : <div class="icon" style="vertical-align:middle;display:inline-block;' + (upgrade.icon[2] ? 'background-image:url(' + upgrade.icon[2] + ');' : '') + 'background-position:' + (-upgrade.icon[0] * 48) + 'px ' + (-upgrade.icon[1] * 48) + 'px;transform:scale(0.5);margin:-16px;"></div> <b>' + upgrade.name + '</b><div class="line"></div></div>' + this.desc;
            })(i);
        }

        Game.PermanentSlotIcon = slot => {
            if (Game.permanentUpgrades[slot] === -1) return [slot, 10];
            return Game.UpgradesById[Game.permanentUpgrades[slot]].icon;
        }
        Game.AssignPermanentSlot = slot => {
            let me;
            let i;
            PlaySound('snd/tick.mp3');
            Game.tooltip.hide();
            let list = [];
            for (i in Game.Upgrades) {
                me = Game.Upgrades[i];
                if (me.bought && me.unlocked && !me.noPerm && (me.pool === '' || me.pool === 'cookie')) {
                    let fail = 0;
                    for (let ii in Game.permanentUpgrades) {
                        if (Game.permanentUpgrades[ii] === me.id) fail = 1;
                    }//check if not already in another permaslot
                    if (!fail) list.push(me);
                }
            }

            function sortMap(a, b) {
                if (a.order > b.order) return 1;
                else if (a.order < b.order) return -1;
                else return 0;
            }
            list.sort(sortMap);

            let upgrades = '';
            for (i in list) {
                me = list[i];
                upgrades += Game.crate(me, '', 'PlaySound(\'snd/tick.mp3\');Game.PutUpgradeInPermanentSlot(' + me.id + ',' + slot + ');', 'upgradeForPermanent' + me.id);
            }
            let upgrade = Game.permanentUpgrades[slot];
            Game.SelectingPermanentUpgrade = upgrade;
            Game.Prompt('<h3>Pick an upgrade to make permanent</h3>' +

                '<div class="line"></div><div style="margin:4px auto;clear:both;width:120px;"><div class="crate upgrade enabled" style="background-position:' + (-slot * 48) + 'px ' + (-10 * 48) + 'px;"></div><div id="upgradeToSlotNone" class="crate upgrade enabled" style="background-position:' + (-0 * 48) + 'px ' + (-7 * 48) + 'px;display:' + (upgrade !== -1 ? 'none' : 'block') + ';"></div><div id="upgradeToSlotWrap" style="float:left;display:' + (upgrade === -1 ? 'none' : 'block') + ';">' + (Game.crate(Game.UpgradesById[upgrade === -1 ? 0 : upgrade], '', '', 'upgradeToSlot')) + '</div></div>' +
                '<div class="block crateBox" style="overflow-y:scroll;float:left;clear:left;width:317px;padding:0;height:250px;">' + upgrades + '</div>' +
                '<div class="block" style="float:right;width:152px;clear:right;height:234px;">Here are all the upgrades you\'ve purchased last playthrough.<div class="line"></div>Pick one to permanently gain its effects!<div class="line"></div>You can reassign this slot anytime you ascend.</div>'
                , [['Confirm', 'Game.permanentUpgrades[' + slot + ']=Game.SelectingPermanentUpgrade;Game.BuildAscendTree();Game.ClosePrompt();'], 'Cancel'], 0, 'widePrompt');
        }
        Game.SelectingPermanentUpgrade = -1;
        Game.PutUpgradeInPermanentSlot = (upgrade) => {
            Game.SelectingPermanentUpgrade = upgrade;
            elementByID('upgradeToSlotWrap').innerHTML = '';
            elementByID('upgradeToSlotWrap').style.display = (upgrade === -1 ? 'none' : 'block');
            elementByID('upgradeToSlotNone').style.display = (upgrade !== -1 ? 'none' : 'block');
            elementByID('upgradeToSlotWrap').innerHTML = (Game.crate(Game.UpgradesById[upgrade === -1 ? 0 : upgrade], '', '', 'upgradeToSlot'));
        }

        new Game.Upgrade('Starspawn', 'Eggs drop <b>10%</b> more often.<br>Golden Neuros appear <b>2%</b> more often during Easter.', 111111, [0, 12]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Season switcher'];
        new Game.Upgrade('Starsnow', 'Christmas Neuros drop <b>5%</b> more often.<br>Reindeer appear <b>5%</b> more often.', 111111, [12, 9]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Season switcher'];
        new Game.Upgrade('Starterror', 'Spooky Neuros drop <b>10%</b> more often.<br>Golden Neuros appear <b>2%</b> more often during Halloween.', 111111, [13, 8]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Season switcher'];
        new Game.Upgrade('Starlove', 'Heart Neuros are <b>50%</b> more powerful.<br>Golden Neuros appear <b>2%</b> more often during Valentines.', 111111, [20, 3]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Season switcher'];
        new Game.Upgrade('Startrade', 'Golden Neuros appear <b>5%</b> more often during Business day.', 111111, [17, 6]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Season switcher'];

        const angelPriceFactor = 7;
        desc = (percent, total) => 'You gain another <b>+' + percent + '%</b> of your regular CpS while the game is closed, for a total of <b>' + total + '%</b>.';
        new Game.Upgrade('Angels', desc(10, 15) + '<q>Lowest-ranking at the first sphere of pastry heaven, angels are tasked with delivering new recipes to the mortals they deem worthy.</q>', Math.pow(angelPriceFactor, 1), [0, 11]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Twin Gates of Transcendence'];
        new Game.Upgrade('Archangels', desc(10, 25) + '<q>Members of the first sphere of pastry heaven, archangels are responsible for the smooth functioning of the world\'s largest bakeries.</q>', Math.pow(angelPriceFactor, 2), [1, 11]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Angels'];
        new Game.Upgrade('Virtues', desc(10, 35) + '<q>Found at the second sphere of pastry heaven, virtues make use of their heavenly strength to push and drag the stars of the cosmos.</q>', Math.pow(angelPriceFactor, 3), [2, 11]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Archangels'];
        new Game.Upgrade('Dominions', desc(10, 45) + '<q>Ruling over the second sphere of pastry heaven, dominions hold a managerial position and are in charge of accounting and regulating schedules.</q>', Math.pow(angelPriceFactor, 4), [3, 11]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Virtues'];
        new Game.Upgrade('Cherubim', desc(10, 55) + '<q>Sieging at the first sphere of pastry heaven, the four-faced cherubim serve as heavenly bouncers and bodyguards.</q>', Math.pow(angelPriceFactor, 5), [4, 11]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Dominions'];
        new Game.Upgrade('Seraphim', desc(10, 65) + '<q>Leading the first sphere of pastry heaven, seraphim possess ultimate knowledge of everything pertaining to baking.</q>', Math.pow(angelPriceFactor, 6), [5, 11]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Cherubim'];
        new Game.Upgrade('God', desc(10, 75) + '<q>Like Santa, but less fun.</q>', Math.pow(angelPriceFactor, 7), [6, 11]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Seraphim'];

        new Game.Upgrade('Twin Gates of Transcendence', 'You now <b>keep making Neuros while the game is closed</b>, at the rate of <b>5%</b> of your regular CpS and up to <b>1 hour</b> after the game is closed.<br>(Beyond 1 hour, this is reduced by a further 90% - your rate goes down to <b>0.5%</b> of your CpS.)<q>This is one occasion you\'re always underdressed for. Don\'t worry, just rush in past the bouncer and pretend you know people.</q>', 1, [15, 11]);
        Game.last.pool = 'prestige';

        new Game.Upgrade('Heavenly luck', 'Golden Neuros appear <b>5%</b> more often.<q>Someone up there likes you.</q>', 77, [22, 6]);
        Game.last.pool = 'prestige';
        new Game.Upgrade('Lasting fortune', 'Golden Neuros effects last <b>10%</b> longer.<q>This isn\'t your average everyday luck. This is... advanced luck.</q>', 777, [23, 6]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Heavenly luck'];
        new Game.Upgrade('Decisive fate', 'Golden Neuros stay <b>5%</b> longer.<q>Life just got a bit more intense.</q>', 7777, [10, 14]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Lasting fortune'];

        new Game.Upgrade('Divine discount', 'Buildings are <b>1% cheaper</b>.<q>Someone special deserves a special price.</q>', 99999, [21, 7]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Decisive fate'];
        new Game.Upgrade('Divine sales', 'Upgrades are <b>1% cheaper</b>.<q>Everything must go!</q>', 99999, [18, 7]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Decisive fate'];
        new Game.Upgrade('Divine bakeries', 'Neuro upgrades are <b>5 times cheaper</b>.<q>They sure know what they\'re doing.</q>', 399999, [17, 7]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Divine sales', 'Divine discount'];

        new Game.Upgrade('Starter kit', 'You start with <b>10 cursors</b>.<q>This can come in handy.</q>', 50, [0, 14]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Tin of british tea biscuits', 'Box of macarons', 'Box of brand biscuits', 'Tin of butter cookies'];
        new Game.Upgrade('Starter kitchen', 'You start with <b>5 grandmas</b>.<q>Where did these come from?</q>', 5000, [1, 14]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Starter kit'];
        new Game.Upgrade('Halo gloves', 'Clicks are <b>10% more powerful</b>.<q>Smite that Neuro.</q>', 55555, [22, 7]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Starter kit'];

        new Game.Upgrade('Kitten angels', 'You gain <b>more CpS</b> the more milk you have.<q>All cats go to heaven.</q>', 9000, [23, 7]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Dominions'];
        Game.last.kitten = 1;

        new Game.Upgrade('Unholy bait', 'Wrinklers appear <b>5 times</b> as fast.<q>No wrinkler can resist the scent of worm biscuits.</q>', 44444, [15, 12]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Starter kitchen'];
        new Game.Upgrade('Sacrilegious corruption', 'Wrinklers regurgitate <b>5%</b> more Neuros.<q>Unique in the animal kingdom, the wrinkler digestive tract is able to withstand an incredible degree of dilation - provided you prod them appropriately.</q>', 444444, [19, 8]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Unholy bait'];


        order = 200;
        new Game.TieredUpgrade('Xtreme walkers', 'Grandmas are <b>twice</b> as efficient.<q>Complete with flame decals and a little horn that goes "toot".</q>', 'Grandma', 7);
        order = 300;
        new Game.TieredUpgrade('Fudge fungus', 'Farms are <b>twice</b> as efficient.<q>A sugary parasite whose tendrils help Neuro growth.<br>Please do not breathe in the spores. In case of spore ingestion, seek medical help within the next 36 seconds.</q>', 'Farm', 7);
        order = 400;
        new Game.TieredUpgrade('Planetsplitters', 'Mining Rigs are <b>twice</b> as efficient.<q>These new state-of-the-art excavators have been tested on Merula, Globort and Flwanza VI, among other distant planets which have been curiously quiet lately.</q>', 'Mining Rig', 7);
        order = 500;
        new Game.TieredUpgrade('Cyborg workforce', 'Factories are <b>twice</b> as efficient.<q>Semi-synthetic organisms don\'t slack off, don\'t unionize, and have 20% shorter lunch breaks, making them ideal labor fodder.</q>', 'Factory', 7);
        order = 525;
        new Game.TieredUpgrade('Way of the wallet', 'Gyms are <b>twice</b> as efficient.<q>This new monetary school of thought is all the rage on the gyming scene; follow its precepts and you may just profit from it.</q>', 'Gym', 7);
        order = 550;
        new Game.TieredUpgrade('Creation myth', 'Temples are <b>twice</b> as efficient.<q>Stories have been circulating about the origins of the very first Neuro that was ever baked; tales of how it all began, in the Dough beyond time and the Ovens of destiny.</q>', 'Temple', 7);
        order = 575;
        new Game.TieredUpgrade('Cookiemancy', 'Wizard towers are <b>twice</b> as efficient.<q>There it is; the perfected school of baking magic. From summoning chips to hexing nuts, there is not a single part of Neuro-making that hasn\'t been improved tenfold by magic tricks.</q>', 'Wizard tower', 7);
        order = 600;
        new Game.TieredUpgrade('Dyson sphere', 'Shipments are <b>twice</b> as efficient.<q>You\'ve found a way to apply your knowledge of cosmic technology to slightly more local endeavors; this gigantic sphere of meta-materials, wrapping the solar system, is sure to kick your baking abilities up a notch.</q>', 'Shipment', 7);
        order = 700;
        new Game.TieredUpgrade('Theory of atomic fluidity', 'Alchemy labs are <b>twice</b> as efficient.<q>Pushing alchemy to its most extreme limits, you find that everything is transmutable into anything else - lead to gold, mercury to water; more importantly, you realize that anything can -and should- be converted to Neuros.</q>', 'Alchemy lab', 7);
        order = 800;
        new Game.TieredUpgrade('End of times back-up plan', 'Portals are <b>twice</b> as efficient.<q>Just in case, alright?</q>', 'Portal', 7);
        order = 900;
        new Game.TieredUpgrade('Great loop hypothesis', 'Time machines are <b>twice</b> as efficient.<q>What if our universe is just one instance of an infinite cycle? What if, before and after it, stretched infinite amounts of the same universe, themselves containing infinite amounts of Neuros?</q>', 'Time machine', 7);
        order = 1000;
        new Game.TieredUpgrade('The Pulse', 'Antimatter condensers are <b>twice</b> as efficient.<q>You\'ve tapped into the very pulse of the cosmos, a timeless rhythm along which every material and antimaterial thing beats in unison. This, somehow, means more Neuros.</q>', 'Antimatter condenser', 7);
        order = 1100;
        new Game.TieredUpgrade('Lux sanctorum', 'Prisms are <b>twice</b> as efficient.<q>Your prism attendants have become increasingly mesmerized with something in the light - or maybe something beyond it; beyond us all, perhaps?</q>', 'Prism', 7);


        order = 200;
        new Game.TieredUpgrade('The Unbridling', 'Grandmas are <b>twice</b> as efficient.<q>It might be a classic tale of bad parenting, but let\'s see where grandma is going with this.</q>', 'Grandma', 8);
        order = 300;
        new Game.TieredUpgrade('Wheat triffids', 'Farms are <b>twice</b> as efficient.<q>Taking care of crops is so much easier when your plants can just walk about and help around the farm.<br>Do not pet. Do not feed. Do not attempt to converse with.</q>', 'Farm', 8);
        order = 400;
        new Game.TieredUpgrade('Canola oil wells', 'Mining Rigs are <b>twice</b> as efficient.<q>A previously untapped resource, canola oil permeates the underground olifers which grant it its particular taste and lucrative properties.</q>', 'Mining Rig', 8);
        order = 500;
        new Game.TieredUpgrade('78-hour days', 'Factories are <b>twice</b> as efficient.<q>Why didn\'t we think of this earlier?</q>', 'Factory', 8);
        order = 525;
        new Game.TieredUpgrade('The stuff rationale', 'Gyms are <b>twice</b> as efficient.<q>If not now, when? If not it, what? If not things... stuff?</q>', 'Gym', 8);
        order = 550;
        new Game.TieredUpgrade('Theocracy', 'Temples are <b>twice</b> as efficient.<q>You\'ve turned your Neuro empire into a perfect theocracy, gathering the adoration of zillions of followers from every corner of the universe.<br>Don\'t let it go to your head.</q>', 'Temple', 8);
        order = 575;
        new Game.TieredUpgrade('Rabbit trick', 'Wizard towers are <b>twice</b> as efficient.<q>Using nothing more than a fancy top hat, your wizards have found a way to simultaneously curb rabbit population and produce heaps of extra Neuros for basically free!<br>Resulting Neuros may or may not be fit for vegans.</q>', 'Wizard tower', 8);
        order = 600;
        new Game.TieredUpgrade('The final frontier', 'Shipments are <b>twice</b> as efficient.<q>It\'s been a long road, getting from there to here. It\'s all worth it though - the sights are lovely and the oil prices slightly more reasonable.</q>', 'Shipment', 8);
        order = 700;
        new Game.TieredUpgrade('Beige goo', 'Alchemy labs are <b>twice</b> as efficient.<q>Well now you\'ve done it. Good job. Very nice. That\'s 3 galaxies you\'ve just converted into Neuros. Good thing you can hop from universe to universe.</q>', 'Alchemy lab', 8);
        order = 800;
        new Game.TieredUpgrade('Maddening chants', 'Portals are <b>twice</b> as efficient.<q>A popular verse goes like so : "jau\'hn madden jau\'hn madden aeiouaeiouaeiou brbrbrbrbrbrbr"</q>', 'Portal', 8);
        order = 900;
        new Game.TieredUpgrade('Cookietopian moments of maybe', 'Time machines are <b>twice</b> as efficient.<q>Reminiscing how things could have been, should have been, will have been.</q>', 'Time machine', 8);
        order = 1000;
        new Game.TieredUpgrade('Some other super-tiny fundamental particle? Probably?', 'Antimatter condensers are <b>twice</b> as efficient.<q>When even the universe is running out of ideas, that\'s when you know you\'re nearing the end.</q>', 'Antimatter condenser', 8);
        order = 1100;
        new Game.TieredUpgrade('Reverse shadows', 'Prisms are <b>twice</b> as efficient.<q>Oh man, this is really messing with your eyes.</q>', 'Prism', 8);


        order = 20000;
        new Game.Upgrade('Kitten accountants', 'You gain <b>more CpS</b> the more milk you have.<q>business going great, sir</q>', 900000000000000000000000, Game.GetIcon('Kitten', 6));
        Game.last.kitten = 1;
        Game.MakeTiered(Game.last, 6, 18);
        new Game.Upgrade('Kitten specialists', 'You gain <b>more CpS</b> the more milk you have.<q>optimeowzing your workflow like whoah, sir</q>', 900000000000000000000000000, Game.GetIcon('Kitten', 7));
        Game.last.kitten = 1;
        Game.MakeTiered(Game.last, 7, 18);
        new Game.Upgrade('Kitten experts', 'You gain <b>more CpS</b> the more milk you have.<q>10 years expurrrtise in the Neuro business, sir</q>', 900000000000000000000000000000, Game.GetIcon('Kitten', 8));
        Game.last.kitten = 1;
        Game.MakeTiered(Game.last, 8, 18);

        new Game.Upgrade('How to bake your dragon', 'Allows you to purchase a <b>crumbly egg</b> once you have earned 1 million Neuros.<q>A tome full of helpful tips such as "oh god, stay away from it", "why did we buy this thing, it\'s not even house-broken" and "groom twice a week in the direction of the scales".</q>', 9, [22, 12]);
        Game.last.pool = 'prestige';

        order = 25100;
        new Game.Upgrade('A crumbly egg', 'Unlocks the <b>Neuro dragon egg</b>.<q>Thank you for adopting this robust, fun-loving Neuro dragon! It will bring you years of joy and entertainment.<br>Keep in a dry and cool place, and away from other house pets. Subscription to home insurance is strongly advised.</q>', 25, [21, 12]);

        new Game.Upgrade('Chimera', 'Synergy upgrades are <b>2% cheaper</b>.<br>You gain another <b>+5%</b> of your regular CpS while the game is closed.<br>You retain optimal Neuro production while the game is closed for <b>2 more days</b>.<q>More than the sum of its parts.</q>', Math.pow(angelPriceFactor, 9), [24, 7]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['God', 'Lucifer', 'Synergies Vol. II'];

        new Game.Upgrade('Tin of butter cookies', 'Contains an assortment of rich butter Neuros.<q>Five varieties of danish Neuros.<br>Complete with little paper cups.</q>', 25, [21, 9]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Heavenly cookies'];

        new Game.Upgrade('Golden switch', 'Unlocks the <b>golden switch</b>, which passively boosts your CpS by 50% but disables golden Neuros.<q>Less clicking, more idling.</q>', 999, [21, 10]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Heavenly luck'];

        new Game.Upgrade('Classic spirit selection', 'Unlocks the <b>rum selector</b>, letting you pick which rum is displayed under your Neuro.<br>Comes with a variety of basic flavors.<q>Arrr.</q>', 9, [1, 8]);
        Game.last.pool = 'prestige';
        Game.last.parents = [];

        new Game.Upgrade('Fanciful spirit selection', 'Contains more exotic flavors for your Rum Selector.<q>Hangovers for only the strongest of heads.</q>', 1000000, [9, 7]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Classic spirit selection'];


        order = 10300;
        Game.NewUpgradeCookie({
            name: 'Dragon cookie',
            desc: 'Imbued with the vigor and vitality of a full-grown Neuro dragon, this mystical Neuro will embolden your empire for the generations to come.',
            icon: [10, 25],
            power: 5,
            price: 9999999999999999 * 7,
            locked: 1
        });


        order = 40000;
        new Game.Upgrade('Golden switch [off]', 'Turning this on will give you a passive <b>+50% CpS</b>, but prevents golden Neuros from spawning.<br>Cost is equal to 1 hour of production.', 1000000, [20, 10]);
        Game.last.pool = 'toggle';
        Game.last.toggleInto = 'Golden switch [on]';
        Game.last.priceFunc = () => Game.cookiesPs * 60 * 60

        function func2() {
            if (Game.Has('Residual luck')) {
                let bonus = 0;
                let upgrades = Game.goldenCookieUpgrades;
                for (let i in upgrades) {
                    if (Game.Has(upgrades[i])) bonus++;
                }
                return '<div style="text-align:center;">' + Game.listTinyOwnedUpgrades(Game.goldenCookieUpgrades) + '<br><br>The effective boost is <b>+' + Beautify(Math.round(50 + bonus * 10)) + '%</b><br>thanks to residual luck<br>and your <b>' + bonus + '</b> golden Neuro upgrade' + (bonus === 1 ? '' : 's') + '.</div><div class="line"></div>' + this.desc;
            }
            return this.desc;
        }

        Game.last.descFunc = func2;

        new Game.Upgrade('Golden switch [on]', 'The switch is currently giving you a passive <b>+50% CpS</b>; it also prevents golden Neuros from spawning.<br>Turning it off will revert those effects.<br>Cost is equal to 1 hour of production.', 1000000, [21, 10]);
        Game.last.pool = 'toggle';
        Game.last.toggleInto = 'Golden switch [off]';
        Game.last.priceFunc = () => Game.cookiesPs * 60 * 60
        Game.last.descFunc = func2;

        order = 50000;
        new Game.Upgrade('Rum Selector', 'Lets you pick what flavor of rum to display.', 0, [1, 8]);
        Game.last.descFunc = function () {
            const choice = this.choicesFunction()[Game.milkType];
            return '<div style="text-align:center;">Current : <div class="icon" style="vertical-align:middle;display:inline-block;' + (choice.icon[2] ? 'background-image:url(' + choice.icon[2] + ');' : '') + 'background-position:' + (-choice.icon[0] * 48) + 'px ' + (-choice.icon[1] * 48) + 'px;transform:scale(0.5);margin:-16px;"></div> <b>' + choice.name + '</b></div><div class="line"></div>' + this.desc;
        };

        Game.last.pool = 'toggle';
        Game.last.choicesFunction = () => {
            let choices = [];
            choices[0] = {name: 'Alcoholic', icon: [0, 7]};
            choices[1] = {name: 'Plain Rum', icon: [1, 8]};
            choices[2] = {name: 'Chocolate Rum', icon: [2, 8]};
            choices[3] = {name: 'Raspberry Rum', icon: [3, 8]};
            choices[4] = {name: 'Orange Rum', icon: [4, 8]};
            choices[5] = {name: 'Caramel Rum', icon: [5, 8]};
            choices[6] = {name: 'Banana Rum', icon: [6, 8]};
            choices[7] = {name: 'Lime Rum', icon: [7, 8]};
            choices[8] = {name: 'Blueberry Rum', icon: [8, 8]};
            choices[9] = {name: 'Strawberry Rum', icon: [9, 8]};
            choices[10] = {name: 'Vanilla Rum', icon: [10, 8]};

            if (Game.Has('Fanciful spirit selection')) {
                choices[11] = {name: 'Zebra milk', icon: [10, 7]};
                choices[12] = {name: 'Cosmic milk', icon: [9, 7]};
                choices[13] = {name: 'Flaming milk', icon: [8, 7]};
                choices[14] = {name: 'Sanguine milk', icon: [7, 7]};
                choices[15] = {name: 'Midas milk', icon: [6, 7]};
                choices[16] = {name: 'Midnight milk', icon: [5, 7]};
                choices[17] = {name: 'Green inferno milk', icon: [4, 7]};
                choices[18] = {name: 'Frostfire milk', icon: [3, 7]};

                choices[24] = {name: 'Soy milk', icon: [27, 23]};
            }

            choices[19] = {name: 'Honey Rum', icon: [21, 23]};
            choices[20] = {name: 'Caffeinated Rum', icon: [22, 23]};
            choices[21] = {name: 'Tea Rum', icon: [23, 23]};
            choices[22] = {name: 'Coconut Rum', icon: [24, 23]};
            choices[23] = {name: 'Cherry Rum', icon: [25, 23]};

            choices[25] = {name: 'Spicy Rum', icon: [26, 23]};
            choices[26] = {name: 'Maple Rum', icon: [28, 23]};

            choices[27] = {name: 'Valentines Rum', icon: [26, 23, 'img/modIcons.png']}; //i gotta remove this at some point man

            choices[Game.milkType].selected = 1;
            return choices;
        }
        Game.last.choicesPick = id => {
            Game.milkType = id;
        }

        //modtags

        Game.MilksByChoice = {
            0: {pic: 'milkWave'},		//Stock
            1: {pic: 'milkPlain'},		//Stock
            2: {pic: 'milkChocolate'},	//Stock
            3: {pic: 'milkRaspberry'},	//Stock
            4: {pic: 'milkOrange'},		//Stock
            5: {pic: 'milkCaramel'},		//Stock
            6: {pic: 'milkBanana'},		//Stock
            7: {pic: 'milkLime'},			//Stock
            8: {pic: 'milkBlueberry'},	//Stock
            9: {pic: 'milkStrawberry'},	//Stock
            10: {pic: 'milkVanilla'},		//Stock
            11: {pic: 'milkZebra'},		//Stock
            12: {pic: 'milkStars'},		//Stock
            13: {pic: 'milkFire'},		//Stock
            14: {pic: 'milkBlood'},		//Stock
            15: {pic: 'milkGold'},		//Stock
            16: {pic: 'milkBlack'},		//Stock
            17: {pic: 'milkGreenFire'},	//Stock
            18: {pic: 'milkBlueFire'},	//Stock
            19: {pic: 'milkHoney'},		//Stock
            20: {pic: 'milkCoffee'},		//added
            21: {pic: 'milkTea'},			//added
            22: {pic: 'milkCoconut'},		//added
            23: {pic: 'milkCherry'},		//added
            24: {pic: 'milkSoy'},			//added
            25: {pic: 'milkSpiced'},		//added
            26: {pic: 'milkMaple'},		//added

            27: {pic: 'milkValentines'},		//Custom, actually Valentines Rum (name is just from testing) (Man i still don't know if i'll remove this)
        };


        order = 10300;
        Game.NewUpgradeCookie({
            name: 'Milk chocolate butter biscuit',
            desc: 'Rewarded for owning 100 of everything.<br>It bears the engraving of a fine entrepreneur.',
            icon: [27, 8],
            power: 10,
            price: 999999999999999999999,
            locked: 1
        });
        Game.NewUpgradeCookie({
            name: 'Dark chocolate butter biscuit',
            desc: 'Rewarded for owning 150 of everything.<br>It is adorned with the image of an experienced Neuro tycoon.',
            icon: [27, 9],
            power: 10,
            price: 999999999999999999999999,
            locked: 1
        });
        Game.NewUpgradeCookie({
            name: 'White chocolate butter biscuit',
            desc: 'Rewarded for owning 200 of everything.<br>The chocolate is chiseled to depict a masterful pastry magnate.',
            icon: [28, 9],
            power: 10,
            price: 999999999999999999999999999,
            locked: 1
        });
        Game.NewUpgradeCookie({
            name: 'Ruby chocolate butter biscuit',
            desc: 'Rewarded for owning 250 of everything.<br>Covered in a rare red chocolate, this biscuit is etched to represent the face of a Neuro industrialist gone mad with power.',
            icon: [28, 8],
            power: 10,
            price: 999999999999999999999999999999,
            locked: 1
        });

        order = 10020;
        Game.NewUpgradeCookie({
            name: 'Gingersnaps',
            desc: 'Neuros with a soul. Probably.',
            icon: [29, 10],
            power: 4,
            price: 99999999999999999999
        });
        Game.NewUpgradeCookie({
            name: 'Cinnamon cookies',
            desc: 'The secret is in the patented swirly glazing.',
            icon: [23, 8],
            power: 4,
            price: 99999999999999999999 * 5
        });
        Game.NewUpgradeCookie({
            name: 'Vanity cookies',
            desc: 'One tiny candied fruit sits atop this decadent Neuro.',
            icon: [22, 8],
            power: 4,
            price: 999999999999999999999
        });
        Game.NewUpgradeCookie({
            name: 'Cigars',
            desc: 'Close, but no match for those extravagant Neuro straws they serve in coffee shops these days.',
            icon: [25, 8],
            power: 4,
            price: 999999999999999999999 * 5
        });
        Game.NewUpgradeCookie({
            name: 'Pinwheel cookies',
            desc: 'Bringing you the dizzying combination of brown flavor and beige taste!',
            icon: [22, 10],
            power: 4,
            price: 9999999999999999999999
        });
        Game.NewUpgradeCookie({
            name: 'Fudge squares',
            desc: 'Not exactly Neuros, but you won\'t care once you\'ve tasted one of these.<br>They\'re so good, it\'s fudged-up!',
            icon: [24, 8],
            power: 4,
            price: 9999999999999999999999 * 5
        });

        order = 10030;
        Game.NewUpgradeCookie({
            name: 'Digits',
            desc: 'Three flavors, zero phalanges.',
            icon: [26, 8],
            require: 'Box of brand biscuits',
            power: 2,
            price: 999999999999999 * 5
        });

        order = 10030;
        Game.NewUpgradeCookie({
            name: 'Butter horseshoes',
            desc: 'It would behoove you to not overindulge in these.',
            icon: [22, 9],
            require: 'Tin of butter cookies',
            power: 4,
            price: 99999999999999999999999
        });
        Game.NewUpgradeCookie({
            name: 'Butter pucks',
            desc: 'Lord, what fools these mortals be!<br>(This is kind of a hokey reference.)',
            icon: [23, 9],
            require: 'Tin of butter cookies',
            power: 4,
            price: 99999999999999999999999 * 5
        });
        Game.NewUpgradeCookie({
            name: 'Butter knots',
            desc: 'Look, you can call these pretzels if you want, but you\'d just be fooling yourself, wouldn\'t you?',
            icon: [24, 9],
            require: 'Tin of butter cookies',
            power: 4,
            price: 999999999999999999999999
        });
        Game.NewUpgradeCookie({
            name: 'Butter slabs',
            desc: 'Nothing butter than a slab to the face.',
            icon: [25, 9],
            require: 'Tin of butter cookies',
            power: 4,
            price: 999999999999999999999999 * 5
        });
        Game.NewUpgradeCookie({
            name: 'Butter swirls',
            desc: 'These are equal parts sugar, butter, and warm fuzzy feelings - all of which cause millions of deaths everyday.',
            icon: [26, 9],
            require: 'Tin of butter cookies',
            power: 4,
            price: 9999999999999999999999999
        });

        order = 10020;
        Game.NewUpgradeCookie({
            name: 'Shortbread biscuits',
            desc: 'These rich butter Neuros are neither short, nor bread. What a country!',
            icon: [23, 10],
            power: 4,
            price: 99999999999999999999999
        });
        Game.NewUpgradeCookie({
            name: 'Millionaires\' shortbreads',
            desc: 'Three thought-provoking layers of creamy chocolate, hard-working caramel and crumbly biscuit in a poignant commentary of class struggle.',
            icon: [24, 10],
            power: 4,
            price: 99999999999999999999999 * 5
        });
        Game.NewUpgradeCookie({
            name: 'Caramel cookies',
            desc: 'The polymerized carbohydrates adorning these Neuros are sure to stick to your teeth for quite a while.',
            icon: [25, 10],
            power: 4,
            price: 999999999999999999999999
        });


        desc = totalHours => {
            let hours = totalHours % 24;
            let days = Math.floor(totalHours / 24);
            let str = hours + (hours === 1 ? ' hour' : ' hours');
            if (days > 0) str = days + (days === 1 ? ' day' : ' days') + ' and ' + str;
            return 'You retain optimal cookie production while the game is closed for twice as long, for a total of <b>' + str + '</b>.';
        };
        new Game.Upgrade('Belphegor', desc(2) + '<q>A demon of shortcuts and laziness, Belphegor commands machines to do work in his stead.</q>', Math.pow(angelPriceFactor, 1), [7, 11]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Twin Gates of Transcendence'];
        new Game.Upgrade('Mammon', desc(4) + '<q>The demonic embodiment of wealth, Mammon requests a tithe of blood and gold from all his worshippers.</q>', Math.pow(angelPriceFactor, 2), [8, 11]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Belphegor'];
        new Game.Upgrade('Abaddon', desc(8) + '<q>Master of overindulgence, Abaddon governs the wrinkler brood and inspires their insatiability.</q>', Math.pow(angelPriceFactor, 3), [9, 11]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Mammon'];
        new Game.Upgrade('Satan', desc(16) + '<q>The counterpoint to everything righteous, this demon represents the nefarious influence of deceit and temptation.</q>', Math.pow(angelPriceFactor, 4), [10, 11]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Abaddon'];
        new Game.Upgrade('Asmodeus', desc(32) + '<q>This demon with three monstrous heads draws his power from the all-consuming desire for Neuros and all things sweet.</q>', Math.pow(angelPriceFactor, 5), [11, 11]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Satan'];
        new Game.Upgrade('Beelzebub', desc(64) + '<q>The festering incarnation of blight and disease, Beelzebub rules over the vast armies of pastry inferno.</q>', Math.pow(angelPriceFactor, 6), [12, 11]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Asmodeus'];
        new Game.Upgrade('Lucifer', desc(128) + '<q>Also known as the Lightbringer, this infernal prince\'s tremendous ego caused him to be cast down from pastry heaven.</q>', Math.pow(angelPriceFactor, 7), [13, 11]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Beelzebub'];

        new Game.Upgrade('Golden cookie alert sound', 'Unlocks the <b>golden Neuro sound selector</b>, which lets you pick whether golden Neuros emit a sound when appearing or not.<q>A sound decision.</q>', 9999, [28, 6]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Decisive fate', 'Golden switch'];

        order = 49900;
        new Game.Upgrade('Golden cookie sound selector', 'Lets you change the sound golden Neuros make when they spawn.', 0, [28, 6]);
        Game.last.descFunc = function () {
            let choice = this.choicesFunction()[Game.chimeType];
            return '<div style="text-align:center;">Current : <div class="icon" style="vertical-align:middle;display:inline-block;' + (choice.icon[2] ? 'background-image:url(' + icon[2] + ');' : '') + 'background-position:' + (-choice.icon[0] * 48) + 'px ' + (-choice.icon[1] * 48) + 'px;transform:scale(0.5);margin:-16px;"></div> <b>' + choice.name + '</b></div><div class="line"></div>' + this.desc;
        };

        Game.last.pool = 'toggle';
        Game.last.choicesFunction = () => {
            let choices = [];
            choices[0] = {name: 'No sound', icon: [0, 7]};
            choices[1] = {name: 'Chime', icon: [22, 6]};

            choices[Game.chimeType].selected = 1;
            return choices;
        }
        Game.last.choicesPick = id => {
            Game.chimeType = id;
        }


        new Game.Upgrade('Basic wallpaper assortment', 'Unlocks the <b>background selector</b>, letting you select the game\'s background.<br>Comes with a variety of basic flavors.<q>Prioritizing aesthetics over crucial utilitarian upgrades? Color me impressed.</q>', 99, [29, 5]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Classic spirit selection'];

        new Game.Upgrade('Legacy', 'This is the first heavenly upgrade; it unlocks the <b>Heavenly chips</b> system.<div class="line"></div>Each time you ascend, the Neuros you made in your past life are turned into <b>heavenly chips</b> and <b>prestige</b>.<div class="line"></div><b>Heavenly chips</b> can be spent on a variety of permanent transcendental upgrades.<div class="line"></div>Your <b>prestige level</b> also gives you a permanent <b>+1% CpS</b> per level.<q>We\'ve all been waiting for you.</q>', 1, [21, 6]);
        Game.last.pool = 'prestige';
        Game.last.parents = [];

        new Game.Upgrade('Elder spice', 'You can attract <b>2 more wrinklers</b>.<q>The Neuro your Neuro could smell like.</q>', 444444, [19, 8]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Unholy bait'];

        new Game.Upgrade('Residual luck', 'While the golden switch is on, you gain an additional <b>+10% CpS</b> per golden Neuro upgrade owned.<q>Fortune comes in many flavors.</q>', 99999, [27, 6]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Golden switch'];

        order = 150;
        new Game.Upgrade('Fantasteel mouse', 'Clicking gains <b>+1% of your CpS</b>.<q>You could be clicking using your touchpad and we\'d be none the wiser.</q>', 5000000000000000000, [11, 17]);
        Game.MakeTiered(Game.last, 8, 11);
        new Game.Upgrade('Nevercrack mouse', 'Clicking gains <b>+1% of your CpS</b>.<q>How much beefier can you make a mouse until it\'s considered a rat?</q>', 500000000000000000000, [11, 18]);
        Game.MakeTiered(Game.last, 9, 11);


        new Game.Upgrade('Five-finger discount', 'All upgrades are <b>1% cheaper per 100 cursors</b>.<q>Stick it to the man.</q>', 555555, [28, 7], function () {
            Game.upgradesToRebuild = 1;
        });
        Game.last.pool = 'prestige';
        Game.last.parents = ['Halo gloves', 'Abaddon'];


        order = 5000;
        Game.SynergyUpgrade('Future almanacs', '<q>Lets you predict optimal planting times. It\'s crazy what time travel can do!</q>', 'Farm', 'Time machine', 'synergy1');
        Game.SynergyUpgrade('Rain prayer', '<q>A deeply spiritual ceremonial involving complicated dance moves and high-tech cloud-busting lasers.</q>', 'Farm', 'Temple', 'synergy2');

        Game.SynergyUpgrade('Seismic magic', '<q>Surprise earthquakes are an old favorite of wizardly frat houses.</q>', 'Mining Rig', 'Wizard tower', 'synergy1');
        Game.SynergyUpgrade('Asteroid mining', '<q>As per the <span>19</span>74 United Cosmic Convention, comets, moons, and inhabited planetoids are no longer legally excavatable.<br>But hey, a space bribe goes a long way.</q>', 'Mining Rig', 'Shipment', 'synergy2');

        Game.SynergyUpgrade('Quantum electronics', '<q>Your machines won\'t even be sure if they\'re on or off!</q>', 'Factory', 'Antimatter condenser', 'synergy1');
        Game.SynergyUpgrade('Temporal overclocking', '<q>Introduce more quickitude in your system for increased speedation of fastness.</q>', 'Factory', 'Time machine', 'synergy2');

        Game.SynergyUpgrade('Contracts from beyond', '<q>Make sure to read the fine print!</q>', 'Gym', 'Portal', 'synergy1');
        Game.SynergyUpgrade('Printing presses', '<q>Fake bills so real, they\'re almost worth the ink they\'re printed with.</q>', 'Gym', 'Factory', 'synergy2');

        Game.SynergyUpgrade('Paganism', '<q>Some deities are better left unworshipped.</q>', 'Temple', 'Portal', 'synergy1');
        Game.SynergyUpgrade('God particle', '<q>Turns out God is much tinier than we thought, I guess.</q>', 'Temple', 'Antimatter condenser', 'synergy2');

        Game.SynergyUpgrade('Arcane knowledge', '<q>Some things were never meant to be known - only mildly speculated.</q>', 'Wizard tower', 'Alchemy lab', 'synergy1');
        Game.SynergyUpgrade('Magical botany', '<q>Already known in some reactionary newspapers as "the wizard\'s GMOs".</q>', 'Wizard tower', 'Farm', 'synergy2');

        Game.SynergyUpgrade('Fossil fuels', '<q>Somehow better than plutonium for powering rockets.<br>Extracted from the fuels of ancient, fossilized civilizations.</q>', 'Shipment', 'Mining Rig', 'synergy1');
        Game.SynergyUpgrade('Shipyards', '<q>Where carpentry, blind luck, and asbestos insulation unite to produce the most dazzling spaceships on the planet.</q>', 'Shipment', 'Factory', 'synergy2');

        Game.SynergyUpgrade('Primordial ores', '<q>Only when refining the purest metals will you extract the sweetest sap of the earth.</q>', 'Alchemy lab', 'Mining Rig', 'synergy1');
        Game.SynergyUpgrade('Gold fund', '<q>If gold is the backbone of the economy, Neuros, surely, are its hip joints.</q>', 'Alchemy lab', 'Gym', 'synergy2');

        Game.SynergyUpgrade('Infernal crops', '<q>Sprinkle regularly with FIRE.</q>', 'Portal', 'Farm', 'synergy1');
        Game.SynergyUpgrade('Abysmal glimmer', '<q>Someone, or something, is staring back at you.<br>Perhaps at all of us.</q>', 'Portal', 'Prism', 'synergy2');

        Game.SynergyUpgrade('Relativistic parsec-skipping', '<q>People will tell you this isn\'t physically possible.<br>These are people you don\'t want on your ship.</q>', 'Time machine', 'Shipment', 'synergy1');
        Game.SynergyUpgrade('Primeval glow', '<q>From unending times, an ancient light still shines, impossibly pure and fragile in its old age.</q>', 'Time machine', 'Prism', 'synergy2');

        Game.SynergyUpgrade('Extra physics funding', '<q>Time to put your money where your particle colliders are.</q>', 'Antimatter condenser', 'Gym', 'synergy1');
        Game.SynergyUpgrade('Chemical proficiency', '<q>Discover exciting new elements, such as Fleshmeltium, Inert Shampoo Byproduct #17 and Carbon++!</q>', 'Antimatter condenser', 'Alchemy lab', 'synergy2');

        Game.SynergyUpgrade('Light magic', '<q>Actually not to be taken lightly! No, I\'m serious. 178 people died last year. You don\'t mess around with magic.</q>', 'Prism', 'Wizard tower', 'synergy1');
        Game.SynergyUpgrade('Mystical energies', '<q>Something beckons from within the light. It is warm, comforting, and apparently the cause for several kinds of exotic skin cancers.</q>', 'Prism', 'Temple', 'synergy2');


        new Game.Upgrade('Synergies Vol. I', 'Unlocks a new tier of upgrades that affect <b>2 buildings at the same time</b>.<br>Synergies appear once you have <b>15</b> of both buildings.<q>The many beats the few.</q>', 222222, [10, 20]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Satan', 'Dominions'];
        new Game.Upgrade('Synergies Vol. II', 'Unlocks a new tier of upgrades that affect <b>2 buildings at the same time</b>.<br>Synergies appear once you have <b>75</b> of both buildings.<q>The several beats the many.</q>', 2222222, [10, 29]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Beelzebub', 'Seraphim', 'Synergies Vol. I'];

        new Game.Upgrade('Heavenly cookies', 'Neuro production multiplier <b>+10% permanently</b>.<q>Baked with heavenly chips. An otherwordly flavor that transcends time and space.</q>', 3, [25, 12]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Legacy'];
        Game.last.power = 10;
        Game.last.pseudoCookie = true;
        new Game.Upgrade('Wrinkly cookies', 'Neuro production multiplier <b>+10% permanently</b>.<q>The result of regular Neuros left to age out for countless eons in a place where time and space are meaningless.</q>', 6666666, [26, 12]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Sacrilegious corruption', 'Elder spice'];
        Game.last.power = 10;
        Game.last.pseudoCookie = true;
        new Game.Upgrade('Distilled essence of redoubled luck', 'Golden Neuros (and all other things that spawn, such as reindeer) have <b>1% chance of being doubled</b>.<q>Tastes glittery. The empty phial makes for a great pencil holder.</q>', 7777777, [27, 12]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Divine bakeries', 'Residual luck'];

        order = 40000;
        new Game.Upgrade('Occult obstruction', 'Neuro production <b>reduced to 0</b>.<q>If symptoms persist, consult a doctor.</q>', 7, [15, 5]);//debug purposes only
        Game.last.pool = 'debug';
        new Game.Upgrade('Glucose-charged air', 'Sugar lumps coalesce <b>a whole lot faster</b>.<q>Don\'t breathe too much or you\'ll get diabetes!</q>', 7, [29, 16]);//debug purposes only
        Game.last.pool = 'debug';

        order = 10300;
        Game.NewUpgradeCookie({
            name: 'Lavender chocolate butter biscuit',
            desc: 'Rewarded for owning 300 of everything.<br>This subtly-flavored biscuit represents the accomplishments of decades of top-secret research. The molded design on the chocolate resembles a well-known entrepreneur who gave their all to the ancient path of baking.',
            icon: [26, 10],
            power: 10,
            price: 999999999999999999999999999999999,
            locked: 1
        });

        order = 10030;
        Game.NewUpgradeCookie({
            name: 'Lombardia cookies',
            desc: 'These come from those farms with the really good memory.',
            icon: [23, 13],
            require: 'Box of brand biscuits',
            power: 3,
            price: 999999999999999999999 * 5
        });
        Game.NewUpgradeCookie({
            name: 'Bastenaken cookies',
            desc: 'French Neuros made of delicious cinnamon and candy sugar. These do not contain Nuts!',
            icon: [24, 13],
            require: 'Box of brand biscuits',
            power: 3,
            price: 999999999999999999999 * 5
        });

        order = 10020;
        Game.NewUpgradeCookie({
            name: 'Pecan sandies',
            desc: 'Stick a nut on a Neuro and call it a day! Name your band after it! Whatever!',
            icon: [25, 13],
            power: 4,
            price: 999999999999999999999999 * 5
        });
        Game.NewUpgradeCookie({
            name: 'Moravian spice cookies',
            desc: 'Popular for being the world\'s moravianest Neuros.',
            icon: [26, 13],
            power: 4,
            price: 9999999999999999999999999
        });
        Game.NewUpgradeCookie({
            name: 'Anzac biscuits',
            desc: 'Army biscuits from a bakery down under, containing no eggs but yes oats.',
            icon: [27, 13],
            power: 4,
            price: 9999999999999999999999999 * 5
        });
        Game.NewUpgradeCookie({
            name: 'Buttercakes',
            desc: 'Glistening with cholesterol, these Neuros moistly straddle the line between the legal definition of a Neuro and just a straight-up stick of butter.',
            icon: [29, 13],
            power: 4,
            price: 99999999999999999999999999
        });
        Game.NewUpgradeCookie({
            name: 'Ice cream sandwiches',
            desc: 'In an alternate universe, "ice cream sandwich" designates an ice cream cone filled with bacon, lettuce, and tomatoes. Maybe some sprinkles too.',
            icon: [28, 13],
            power: 4,
            price: 99999999999999999999999999 * 5
        });

        new Game.Upgrade('Stevia Caelestis', 'Sugar lumps ripen <b>an hour sooner</b>.<q>A plant of supernatural sweetness grown by angels in heavenly gardens.</q>', 100000000, [25, 15]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Wrinkly cookies'];
        new Game.Upgrade('Diabetica Daemonicus', 'Sugar lumps mature <b>an hour sooner</b>.<q>A malevolent, if delicious herb that is said to grow on the cliffs of the darkest abyss of the underworld.</q>', 300000000, [26, 15]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Stevia Caelestis', 'Lucifer'];
        new Game.Upgrade('Sucralosia Inutilis', 'Bifurcated sugar lumps appear <b>5% more often</b> and are <b>5% more likely</b> to drop 2 lumps.<q>A rare berry of uninteresting flavor that is as elusive as its uses are limited; only sought-after by the most avid collectors with too much wealth on their hands.</q>', 1000000000, [27, 15]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Diabetica Daemonicus'];

        //note : these showIf functions stop working beyond 10 quadrillion prestige level, due to loss in precision; the solution, of course, is to make sure 10 quadrillion is not an attainable prestige level
        new Game.Upgrade('Lucky digit', '<b>+1%</b> prestige level effect on CpS.<br><b>+1%</b> golden Neuro effect duration.<br><b>+1%</b> golden Neuro lifespan.<q>This upgrade is a bit shy and only appears when your prestige level ends in 7.</q>', 777, [24, 15]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Heavenly luck'];
        Game.last.showIf = () => (Math.ceil(Game.prestige) % 10 === 7);
        new Game.Upgrade('Lucky number', '<b>+1%</b> prestige level effect on CpS.<br><b>+1%</b> golden Neuro effect duration.<br><b>+1%</b> golden Neuro lifespan.<q>This upgrade is a reclusive hermit and only appears when your prestige level ends in 777.</q>', 77777, [24, 15]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Lucky digit', 'Lasting fortune'];
        Game.last.showIf = () => (Math.ceil(Game.prestige) % 1000 === 777);
        new Game.Upgrade('Lucky payout', '<b>+1%</b> prestige level effect on CpS.<br><b>+1%</b> golden Neuro effect duration.<br><b>+1%</b> golden Neuro lifespan.<q>This upgrade took an oath of complete seclusion from the rest of the world and only appears when your prestige level ends in 777777.</q>', 77777777, [24, 15]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Lucky number', 'Decisive fate'];
        Game.last.showIf = () => (Math.ceil(Game.prestige) % 1000000 === 777777);

        order = 50000;
        new Game.Upgrade('Background selector', 'Lets you pick which wallpaper to display.', 0, [29, 5]);
        Game.last.descFunc = function () {
            let choice = this.choicesFunction()[Game.bgType];
            return '<div style="text-align:center;">Current : <div class="icon" style="vertical-align:middle;display:inline-block;' + (choice.icon[2] ? 'background-image:url(' + choice.icon[2] + ');' : '') + 'background-position:' + (-choice.icon[0] * 48) + 'px ' + (-choice.icon[1] * 48) + 'px;transform:scale(0.5);margin:-16px;"></div> <b>' + choice.name + '</b></div><div class="line"></div>' + this.desc;
        };

        Game.last.pool = 'toggle';
        Game.last.choicesFunction = () => {
            let choices = [];
            choices[0] = {name: 'Automatic', icon: [0, 7]};
            choices[1] = {name: 'Blue', icon: [21, 21]};
            choices[2] = {name: 'Red', icon: [22, 21]};
            choices[3] = {name: 'White', icon: [23, 21]};
            choices[4] = {name: 'Black', icon: [24, 21]};
            choices[5] = {name: 'Gold', icon: [25, 21]};
            choices[6] = {name: 'Grandmas', icon: [26, 21]};
            choices[7] = {name: 'Displeased grandmas', icon: [27, 21]};
            choices[8] = {name: 'Angered grandmas', icon: [28, 21]};
            choices[9] = {name: 'Money', icon: [29, 21]};
            choices[Game.bgType].selected = 1;
            return choices;
        }
        Game.last.choicesPick = id => {
            Game.bgType = id;
        }

        Game.BGsByChoice = {
            0: {pic: 'bgBlue'},
            1: {pic: 'bgBlue'},
            2: {pic: 'bgRed'},
            3: {pic: 'bgWhite'},
            4: {pic: 'bgBlack'},
            5: {pic: 'bgGold'},
            6: {pic: 'grandmas1'},
            7: {pic: 'grandmas2'},
            8: {pic: 'grandmas3'},
            9: {pic: 'bgMoney'},
        };

        order = 255;
        Game.GrandmaSynergy('Lucky grandmas', 'A fortunate grandma that always seems to find more Neuros.', 'Wheel of fortune');

        order = 1200;
        new Game.TieredUpgrade('Your lucky cookie', 'Wheel of fortunes are <b>twice</b> as efficient.<q>This is the first Neuro you\'ve ever baked. It holds a deep sentimental value and, after all this time, an interesting smell.</q>', 'Wheel of fortune', 1);
        new Game.TieredUpgrade('"All Bets Are Off" magic coin', 'Wheel of fortunes are <b>twice</b> as efficient.<q>A coin that always lands on the other side when flipped. Not heads, not tails, not the edge. The <i>other side</i>.</q>', 'Wheel of fortune', 2);
        new Game.TieredUpgrade('Winning lottery ticket', 'Wheel of fortunes are <b>twice</b> as efficient.<q>What lottery? THE lottery, that\'s what lottery! Only lottery that matters!</q>', 'Wheel of fortune', 3);
        new Game.TieredUpgrade('Four-leaf clover field', 'Wheel of fortunes are <b>twice</b> as efficient.<q>No giant monsters here, just a whole lot of lucky grass.</q>', 'Wheel of fortune', 4);
        new Game.TieredUpgrade('A recipe book about books', 'Wheel of fortunes are <b>twice</b> as efficient.<q>Tip the scales in your favor with 28 creative new ways to cook the books.</q>', 'Wheel of fortune', 5);
        new Game.TieredUpgrade('Leprechaun village', 'Wheel of fortunes are <b>twice</b> as efficient.<q>You\'ve finally become accepted among the local leprechauns, who lend you their mythical luck as a sign of friendship (as well as some rather foul-tasting tea).</q>', 'Wheel of fortune', 6);
        new Game.TieredUpgrade('Improbability drive', 'Wheel of fortunes are <b>twice</b> as efficient.<q>A strange engine that turns statistics on their head. Recommended by the Grandmother\'s Guide to the Bakery.</q>', 'Wheel of fortune', 7);
        new Game.TieredUpgrade('Antisuperstistronics', 'Wheel of fortunes are <b>twice</b> as efficient.<q>An exciting new field of research that makes unlucky things lucky. No mirror unbroken, no ladder unwalked under!</q>', 'Wheel of fortune', 8);

        order = 5000;
        Game.SynergyUpgrade('Gemmed talismans', '<q>Good-luck charms covered in ancient and excruciatingly rare crystals. A must have for job interviews!</q>', 'Wheel of fortune', 'Mining Rig', 'synergy1');

        order = 20000;
        new Game.Upgrade('Kitten consultants', 'You gain <b>more CpS</b> the more milk you have.<q>glad to be overpaid to work with you, sir</q>', 900000000000000000000000000000000, Game.GetIcon('Kitten', 9));
        Game.last.kitten = 1;
        Game.MakeTiered(Game.last, 9, 18);

        order = 99999;
        const years = Math.floor((Date.now() - new Date(2013, 7, 8)) / (1000 * 60 * 60 * 24 * 365));
        //only updates on page load
        //may behave strangely on leap years
        Game.NewUpgradeCookie({
            name: 'Birthday cookie',
            desc: '-',
            icon: [22, 13],
            power: years,
            price: 99999999999999999999999999999
        });
        Game.last.baseDesc = 'Neuro production multiplier <b>+1%</b> for every year Neuro Clicker has existed (currently : <b>+' + Beautify(years) + '%</b>).<q>Thank you for playing Neuro Clicker!<br>-Orteil</q>';
        Game.last.desc = BeautifyInText(Game.last.baseDesc);


        order = 150;
        new Game.Upgrade('Armythril mouse', 'Clicking gains <b>+1% of your CpS</b>.<q>This one takes about 53 people to push it around and another 48 to jump down on the button and trigger a click. You could say it\'s got some heft to it.</q>', 50000000000000000000000, [11, 19]);
        Game.MakeTiered(Game.last, 10, 11);

        order = 200;
        new Game.TieredUpgrade('Reverse dementia', 'Grandmas are <b>twice</b> as efficient.<q>Extremely unsettling, and somehow even worse than the regular kind.</q>', 'Grandma', 9);
        order = 300;
        new Game.TieredUpgrade('Humane pesticides', 'Farms are <b>twice</b> as efficient.<q>Made by people, for people, from people and ready to unleash some righteous scorching pain on those pesky insects that so deserve it.</q>', 'Farm', 9);
        order = 400;
        new Game.TieredUpgrade('Mole people', 'Mining Rigs are <b>twice</b> as efficient.<q>Engineered from real human beings within your very labs, these sturdy little folks have a knack for finding the tastiest underground minerals in conditions that more expensive machinery probably wouldn\'t survive.</q>', 'Mining Rig', 9);
        order = 500;
        new Game.TieredUpgrade('Machine learning', 'Factories are <b>twice</b> as efficient.<q>You figured you might get better productivity if you actually told your workers to learn how to work the machines. Sometimes, it\'s the little things...</q>', 'Factory', 9);
        order = 525;
        new Game.TieredUpgrade('Edible money', 'Gyms are <b>twice</b> as efficient.<q>It\'s really quite simple; you make all currency too delicious not to eat, solving world hunger and inflation in one fell swoop!</q>', 'Gym', 9);
        order = 550;
        new Game.TieredUpgrade('Sick rap prayers', 'Temples are <b>twice</b> as efficient.<q>With their ill beat and radical rhymes, these way-hip religious tunes are sure to get all the youngins who thought they were 2 cool 4 church back on the pews and praying for more! Wicked!</q>', 'Temple', 9);
        order = 575;
        new Game.TieredUpgrade('Deluxe tailored wands', 'Wizard towers are <b>twice</b> as efficient.<q>In this age of science, most skillful wand-makers are now long gone; but thankfully - not all those wanders are lost.</q>', 'Wizard tower', 9);
        order = 600;
        new Game.TieredUpgrade('Autopilot', 'Shipments are <b>twice</b> as efficient.<q>Your ships are now fitted with completely robotic crews! It\'s crazy how much money you save when you don\'t have to compensate the families of those lost in space.</q>', 'Shipment', 9);
        order = 700;
        new Game.TieredUpgrade('The advent of chemistry', 'Alchemy labs are <b>twice</b> as efficient.<q>You know what? That whole alchemy nonsense was a load of baseless rubbish. Dear god, what were you thinking?</q>', 'Alchemy lab', 9);
        order = 800;
        new Game.TieredUpgrade('The real world', 'Portals are <b>twice</b> as efficient.<q>It turns out that our universe is actually the twisted dimension of another, saner plane of reality. Time to hop on over there and loot the place!</q>', 'Portal', 9);
        order = 900;
        new Game.TieredUpgrade('Second seconds', 'Time machines are <b>twice</b> as efficient.<q>That\'s twice as many seconds in the same amount of time! What a deal! Also, what in god\'s name!</q>', 'Time machine', 9);
        order = 1000;
        new Game.TieredUpgrade('Quantum comb', 'Antimatter condensers are <b>twice</b> as efficient.<q>Quantum entanglement is one of those things that are so annoying to explain that we might honestly be better off without it. This is finally possible thanks to the quantum comb!</q>', 'Antimatter condenser', 9);
        order = 1100;
        new Game.TieredUpgrade('Crystal mirrors', 'Prisms are <b>twice</b> as efficient.<q>Designed to filter more light back into your prisms, reaching levels of brightness that reality itself had never planned for.</q>', 'Prism', 9);
        order = 1200;
        new Game.TieredUpgrade('Bunnypedes', 'Wheel of fortunes are <b>twice</b> as efficient.<q>You\'ve taken to breeding rabbits with hundreds of paws, which makes them intrinsically very lucky and thus a very handy (if very disturbing) pet.</q>', 'Wheel of fortune', 9);

        order = 20000;
        new Game.Upgrade('Kitten assistants to the regional manager', 'You gain <b>more CpS</b> the more milk you have.<q>nothing stresses meowt... except having to seek the approval of my inferiors, sir</q>', 900000000000000000000000000000000000, Game.GetIcon('Kitten', 10));
        Game.last.kitten = 1;
        Game.MakeTiered(Game.last, 10, 18);

        order = 5000;
        Game.SynergyUpgrade('Charm quarks', '<q>They\'re after your lucky quarks!</q>', 'Wheel of fortune', 'Antimatter condenser', 'synergy2');


        order = 10020;
        Game.NewUpgradeCookie({
            name: 'Pink biscuits',
            desc: 'One of the oldest Neuros. Traditionally dipped in champagne to soften it, because the French will use any opportunity to drink.',
            icon: [21, 16],
            power: 4,
            price: 999999999999999999999999999
        });
        Game.NewUpgradeCookie({
            name: 'Whole-grain cookies',
            desc: 'Covered in seeds and other earthy-looking debris. Really going for that "5-second rule" look.',
            icon: [22, 16],
            power: 4,
            price: 999999999999999999999999999 * 5
        });
        Game.NewUpgradeCookie({
            name: 'Candy cookies',
            desc: 'These melt in your hands just a little bit.',
            icon: [23, 16],
            power: 4,
            price: 9999999999999999999999999999
        });
        Game.NewUpgradeCookie({
            name: 'Big chip cookies',
            desc: 'You are in awe at the size of these chips. Absolute units.',
            icon: [24, 16],
            power: 4,
            price: 9999999999999999999999999999 * 5
        });
        Game.NewUpgradeCookie({
            name: 'One chip cookies',
            desc: 'You get one.',
            icon: [25, 16],
            power: 1,
            price: 99999999999999999999999999999
        });


        new Game.Upgrade('Sugar baking', 'Each unspent sugar lump (up to 100) gives <b>+1% CpS</b>.<div class="warning">Note : this means that spending sugar lumps will decrease your CpS until they grow back.</div><q>To bake with the sugary essence of eons themselves, you must first learn to take your sweet time.</q>', 200000000, [21, 17]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Stevia Caelestis'];
        new Game.Upgrade('Sugar craving', 'Once an ascension, you may use the "Sugar frenzy" switch to <b>triple your CpS</b> for 1 hour, at the cost of <b>1 sugar lump</b>.<q>Just a little kick to sweeten the deal.</q>', 400000000, [22, 17]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Sugar baking'];
        new Game.Upgrade('Sugar aging process', 'Each grandma (up to 600) makes sugar lumps ripen <b>6 seconds</b> sooner.<q>Aren\'t they just the sweetest?</q>', 600000000, [23, 17]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Sugar craving', 'Diabetica Daemonicus'];

        order = 40050;
        new Game.Upgrade('Sugar frenzy', 'Activating this will <b>triple your CpS</b> for 1 hour, at the cost of <b>1 sugar lump</b>.<br>May only be used once per ascension.', 0, [22, 17]);
        Game.last.priceLumps = 1;
        Game.last.pool = 'toggle';
        Game.last.toggleInto = 0;
        Game.last.canBuyFunc = () => Game.lumps >= 1;
        Game.last.clickFunction = Game.spendLump(1, 'activate the sugar frenzy', () => {
            Game.Upgrades['Sugar frenzy'].buy(1);
            Game.gainBuff('sugar frenzy', 60 * 60, 3);
            if (Game.prefs.popups) Game.Popup('Sugar frenzy activated!');
            else Game.Notify('Sugar frenzy!', 'CpS x3 for 1 hour!', [29, 14]);
        });

        order = 10020;
        Game.NewUpgradeCookie({
            name: 'Sprinkles cookies',
            desc: 'A bit of festive decorating helps hide the fact that this might be one of the blandest Neuros you\'ve ever tasted.',
            icon: [21, 14],
            power: 4,
            price: 99999999999999999999999999999 * 5
        });
        Game.NewUpgradeCookie({
            name: 'Peanut butter blossoms',
            desc: 'Topped with a scrumptious chocolate squirt, which is something we really wish we didn\'t just write.',
            icon: [22, 14],
            power: 4,
            price: 999999999999999999999999999999
        });
        Game.NewUpgradeCookie({
            name: 'No-bake cookies',
            desc: 'You have no idea how these mysterious oven-less treats came to be or how they hold their shape. You\'re thinking either elephant glue or cold fusion.',
            icon: [21, 15],
            power: 4,
            price: 999999999999999999999999999999 * 5
        });
        Game.NewUpgradeCookie({
            name: 'Florentines',
            desc: 'These make up for being the fruitcake of Neuros by at least having the decency to feature chocolate.',
            icon: [26, 16],
            power: 4,
            price: 9999999999999999999999999999999
        });
        Game.NewUpgradeCookie({
            name: 'Chocolate crinkles',
            desc: 'Non-denominational Neuros to celebrate year-round deliciousness, and certainly not Christmas or some other nonsense.',
            icon: [22, 15],
            power: 4,
            price: 9999999999999999999999999999999 * 5
        });
        Game.NewUpgradeCookie({
            name: 'Maple cookies',
            desc: 'Made with syrup from a land where milk comes in bags, instead of spontaneously pooling at the bottom of your screen depending on your achievements.',
            icon: [21, 13],
            power: 4,
            price: 99999999999999999999999999999999
        });


        order = 40000;
        new Game.Upgrade('Turbo-charged soil', 'Garden plants grow every second.<br>Garden seeds are free to plant.<br>You can switch soils at any time.<q>It\'s got electrolytes!</q>', 7, [2, 16]);//debug purposes only
        Game.last.buyFunction = () => {
            if (Game.Objects['Farm'].minigameLoaded) {
                Game.Objects['Farm'].minigame.computeStepT();
            }
        }
        Game.last.pool = 'debug';

        order = 150;
        new Game.Upgrade('Technobsidian mouse', 'Clicking gains <b>+1% of your CpS</b>.<q>A highly advanced mouse of a sophisticated design. Only one thing on its mind : to click.</q>', 5000000000000000000000000, [11, 28]);
        Game.MakeTiered(Game.last, 11, 11);
        new Game.Upgrade('Plasmarble mouse', 'Clicking gains <b>+1% of your CpS</b>.<q>A shifting blur in the corner of your eye, this mouse can trigger a flurry of clicks when grazed by even the slightest breeze.</q>', 500000000000000000000000000, [11, 30]);
        Game.MakeTiered(Game.last, 12, 11);

        order = 20000;
        new Game.Upgrade('Kitten marketeers', 'You gain <b>more CpS</b> the more milk you have.<q>no such thing as a saturated markit, sir</q>', 900000000000000000000000000000000000000, Game.GetIcon('Kitten', 11));
        Game.last.kitten = 1;
        Game.MakeTiered(Game.last, 11, 18);

        order = 10030;
        Game.NewUpgradeCookie({
            name: 'Festivity loops',
            desc: 'These garish biscuits are a perfect fit for children\'s birthday parties or the funerals of strange, eccentric billionaires.',
            icon: [25, 17],
            require: 'Box of brand biscuits',
            power: 2,
            price: 999999999999999 * 5
        });

        order = 10020;
        Game.NewUpgradeCookie({
            name: 'Persian rice cookies',
            desc: 'Rose water and poppy seeds are the secret ingredients of these small, butter-free Neuros.',
            icon: [28, 15],
            power: 4,
            price: 99999999999999999999999999999999 * 5
        });
        Game.NewUpgradeCookie({
            name: 'Norwegian cookies',
            desc: 'A flat butter Neuro with a sliver of candied cherry on top. It is said that these illustrate the bleakness of scandinavian existentialism.',
            icon: [22, 20],
            power: 4,
            price: 999999999999999999999999999999999
        });
        Game.NewUpgradeCookie({
            name: 'Crispy rice cookies',
            desc: 'Fun to make at home! Store-bought Neuros are obsolete! Topple the system! There\'s marshmallows in these! Destroy capitalism!',
            icon: [23, 20],
            power: 4,
            price: 999999999999999999999999999999999 * 5
        });
        Game.NewUpgradeCookie({
            name: 'Ube cookies',
            desc: 'The tint is obtained by the use of purple yams. According to color symbolism, these Neuros are either noble, holy, or supervillains.',
            icon: [24, 17],
            power: 4,
            price: 9999999999999999999999999999999999
        });
        Game.NewUpgradeCookie({
            name: 'Butterscotch cookies',
            desc: 'The butterscotch chips are just the right amount of sticky, and make you feel like you\'re eating candy.',
            icon: [24, 20],
            power: 4,
            price: 9999999999999999999999999999999999 * 5
        });
        Game.NewUpgradeCookie({
            name: 'Speculaas',
            desc: 'These crunchy, almost obnoxiously cinnamony Neuros are a source of dutch pride. About the origin of the name, one can only speculate.',
            icon: [21, 20],
            power: 4,
            price: 99999999999999999999999999999999999
        });

        order = 10200;
        Game.NewUpgradeCookie({
            name: 'Elderwort biscuits',
            desc: '-',
            icon: [22, 25],
            power: 2,
            price: 60 * 2,
            locked: 1
        });
        Game.last.baseDesc = 'Neuro production multiplier <b>+2%</b>.<br>Grandma production multiplier <b>+2%</b>.<br>Dropped by elderwort plants.<q>They taste incredibly stale, even when baked fresh.</q>';
        Game.NewUpgradeCookie({name: 'Bakeberry cookies', desc: '-', icon: [23, 25], power: 2, price: 60, locked: 1});
        Game.last.baseDesc = 'Neuro production multiplier <b>+2%</b>.<br>Dropped by bakeberry plants.<q>Really good dipped in hot chocolate.</q>';
        Game.NewUpgradeCookie({
            name: 'Duketater cookies',
            desc: '-',
            icon: [24, 25],
            power: 10,
            price: 60 * 3,
            locked: 1
        });
        Game.last.baseDesc = 'Neuro production multiplier <b>+10%</b>.<br>Dropped by duketater plants.<q>Fragrant and mealy, with a slight yellow aftertaste.</q>';
        Game.NewUpgradeCookie({
            name: 'Green yeast digestives',
            desc: '-',
            icon: [25, 25],
            power: 0,
            price: 60 * 3,
            locked: 1
        });
        Game.last.baseDesc = '<b>+1%</b> golden Neuro gains and effect duration.<br><b>+1%</b> golden Neuro frequency.<br><b>+3%</b> random drops.<br>Dropped by green rot plants.<q>These are tastier than you\'d expect, but not by much.</q>';

        order = 23000;
        new Game.Upgrade('Fern tea', 'You gain <b>+3%</b> of your regular CpS while the game is closed <small>(provided you have the Twin Gates of Transcendence heavenly upgrade)</small>.<br>Dropped by drowsyfern plants.<q>A chemically complex natural beverage, this soothing concoction has been used by mathematicians to solve equations in their sleep.</q>', 60, [26, 25]);
        new Game.Upgrade('Ichor syrup', 'You gain <b>+7%</b> of your regular CpS while the game is closed <small>(provided you have the Twin Gates of Transcendence heavenly upgrade)</small>.<br>Sugar lumps mature <b>7 minutes</b> sooner.<br>Dropped by ichorpuff plants.<q>Tastes like candy. The smell is another story.</q>', 60 * 2, [27, 25]);

        order = 10200;
        Game.NewUpgradeCookie({name: 'Wheat slims', desc: '-', icon: [28, 25], power: 1, price: 30, locked: 1});
        Game.last.baseDesc = 'Neuro production multiplier <b>+1%</b>.<br>Dropped by baker\'s wheat plants.<q>The only reason you\'d consider these to be Neuros is because you feel slightly sorry for them.</q>';

        const gardenDrops = ['Elderwort biscuits', 'Bakeberry cookies', 'Duketater cookies', 'Green yeast digestives', 'Fern tea', 'Ichor syrup', 'Wheat slims'];
        for (i in gardenDrops)//scale by CpS
        {
            let it = Game.Upgrades[gardenDrops[i]];
            it.priceFunc = (cost => () => cost * Game.cookiesPs * 60)(it.basePrice);
            it.baseDesc = it.baseDesc.replace('<q>', '<br>Cost scales with CpS.<q>');
            it.desc = BeautifyInText(it.baseDesc);
            it.lasting = true;
        }


        order = 10300;
        Game.NewUpgradeCookie({
            name: 'Synthetic chocolate green honey butter biscuit',
            desc: 'Rewarded for owning 350 of everything.<br>The recipe for this butter biscuit was once the sole heritage of an ancient mountain monastery. Its flavor is so refined that only a slab of lab-made chocolate specifically engineered to be completely tasteless could complement it.<br>Also it\'s got your face on it.',
            icon: [24, 26],
            power: 10,
            price: 999999999999999999999999999999999999,
            locked: 1
        });
        Game.NewUpgradeCookie({
            name: 'Royal raspberry chocolate butter biscuit',
            desc: 'Rewarded for owning 400 of everything.<br>Once reserved for the megalomaniac elite, this unique strain of fruity chocolate has a flavor and texture unlike any other. Whether its exorbitant worth is improved or lessened by the presence of your likeness on it still remains to be seen.',
            icon: [25, 26],
            power: 10,
            price: 999999999999999999999999999999999999999,
            locked: 1
        });
        Game.NewUpgradeCookie({
            name: 'Ultra-concentrated high-energy chocolate butter biscuit',
            desc: 'Rewarded for owning 450 of everything.<br>Infused with the power of several hydrogen bombs through a process that left most nuclear engineers and shareholders perplexed. Currently at the center of some rather heated United Nations meetings. Going in more detail about this chocolate would violate several state secrets, but we\'ll just add that someone\'s bust seems to be pictured on it. Perhaps yours?',
            icon: [26, 26],
            power: 10,
            price: 999999999999999999999999999999999999999999,
            locked: 1
        });


        order = 200;
        new Game.TieredUpgrade('Timeproof hair dyes', 'Grandmas are <b>twice</b> as efficient.<q>Why do they always have those strange wispy pink dos? What do they know about candy floss that we don\'t?</q>', 'Grandma', 10);
        order = 300;
        new Game.TieredUpgrade('Barnstars', 'Farms are <b>twice</b> as efficient.<q>Ah, yes. These help quite a bit. Somehow.</q>', 'Farm', 10);
        order = 400;
        new Game.TieredUpgrade('Mining Rig canaries', 'Mining Rigs are <b>twice</b> as efficient.<q>These aren\'t used for anything freaky! The miners just enjoy having a pet or two down there.</q>', 'Mining Rig', 10);
        order = 500;
        new Game.TieredUpgrade('Brownie point system', 'Factories are <b>twice</b> as efficient.<q>Oh, these are lovely! You can now reward your factory employees for good behavior, such as working overtime or snitching on coworkers. 58 brownie points gets you a little picture of a brownie, and 178 of those pictures gets you an actual brownie piece for you to do with as you please! Infantilizing? Maybe. Oodles of fun? You betcha!</q>', 'Factory', 10);
        order = 525;
        new Game.TieredUpgrade('Grand supercycles', 'Gyms are <b>twice</b> as efficient.<q>We let the public think these are complicated financial terms when really we\'re just rewarding the gymers with snazzy bicycles for a job well done. It\'s only natural after you built those fancy gold swimming pools for them, where they can take a dip and catch Kondratiev waves.</q>', 'Gym', 10);
        order = 550;
        new Game.TieredUpgrade('Psalm-reading', 'Temples are <b>twice</b> as efficient.<q>A theologically dubious and possibly blasphemous blend of fortune-telling and scripture studies.</q>', 'Temple', 10);
        order = 575;
        new Game.TieredUpgrade('Immobile spellcasting', 'Wizard towers are <b>twice</b> as efficient.<q>Wizards who master this skill can now cast spells without having to hop and skip and gesticulate embarrassingly, which is much sneakier and honestly quite a relief.</q>', 'Wizard tower', 10);
        order = 600;
        new Game.TieredUpgrade('Restaurants at the end of the universe', 'Shipments are <b>twice</b> as efficient.<q>Since the universe is spatially infinite, and therefore can be construed to have infinite ends, you\'ve opened an infinite chain of restaurants where your space truckers can rest and partake in some home-brand Neuro-based meals.</q>', 'Shipment', 10);
        order = 700;
        new Game.TieredUpgrade('On second thought', 'Alchemy labs are <b>twice</b> as efficient.<q>Disregard that last upgrade, alchemy is where it\'s at! Your eggheads just found a way to transmute children\'s nightmares into rare metals!</q>', 'Alchemy lab', 10);
        order = 800;
        new Game.TieredUpgrade('Dimensional garbage gulper', 'Portals are <b>twice</b> as efficient.<q>So we\'ve been looking for a place to dispose of all the refuse that\'s been accumulating since we started baking - burnt Neuros, failed experiments, unruly workers - and well, we figured rather than sell it to poor countries like we\'ve been doing, we could just dump it in some alternate trash dimension where it\'s not gonna bother anybody! Probably!</q>', 'Portal', 10);
        order = 900;
        new Game.TieredUpgrade('Additional clock hands', 'Time machines are <b>twice</b> as efficient.<q>It seemed like a silly idea at first, but it turns out these have the strange ability to twist time in interesting new ways.</q>', 'Time machine', 10);
        order = 1000;
        new Game.TieredUpgrade('Baking Nobel prize', 'Antimatter condensers are <b>twice</b> as efficient.<q>What better way to sponsor scientific growth than to motivate those smarmy nerds with a meaningless award! What\'s more, each prize comes with a fine print lifelong exclusive contract to come work for you (or else)!</q>', 'Antimatter condenser', 10);
        order = 1100;
        new Game.TieredUpgrade('Reverse theory of light', 'Prisms are <b>twice</b> as efficient.<q>A whole new world of physics opens up when you decide that antiphotons are real and posit that light is merely a void in shadow.</q>', 'Prism', 10);
        order = 1200;
        new Game.TieredUpgrade('Revised probabilistics', 'Wheel of fortunes are <b>twice</b> as efficient.<q>Either something happens or it doesn\'t. That\'s a 50% chance! This suddenly makes a lot of unlikely things very possible.</q>', 'Wheel of fortune', 10);

        order = 20000;
        new Game.Upgrade('Kitten analysts', 'You gain <b>more CpS</b> the more milk you have.<q>based on purrent return-on-investment meowdels we should be able to affurd to pay our empawyees somewhere around next century, sir</q>', 900000000000000000000000000000000000000000, Game.GetIcon('Kitten', 12));
        Game.last.kitten = 1;
        Game.MakeTiered(Game.last, 12, 18);


        new Game.Upgrade('Eye of the wrinkler', 'Mouse over a wrinkler to see how many Neuros are in its stomach.<q>Just a wrinkler and its will to survive.<br>Hangin\' tough, stayin\' hungry.</q>', 99999999, [27, 26]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Wrinkly cookies'];

        new Game.Upgrade('Inspired checklist', 'Unlocks the <b>Buy all</b> feature, which lets you instantly purchase every upgrade in your store (starting from the cheapest one).<br>Also unlocks the <b>Vault</b>, a store section where you can place upgrades you do not wish to auto-buy.<q>Snazzy grandma accessories? Check. Transdimensional abominations? Check. A bunch of eggs for some reason? Check. Machine that goes "ping"? Check and check.</q>', 900000, [28, 26]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Persistent memory', 'Permanent upgrade slot IV'];

        order = 10300;
        Game.NewUpgradeCookie({
            name: 'Pure pitch-black chocolate butter biscuit',
            desc: 'Rewarded for owning 500 of everything.<br>This chocolate is so pure and so flawless that it has no color of its own, instead taking on the appearance of whatever is around it. You\'re a bit surprised to notice that this one isn\'t stamped with your effigy, as its surface is perfectly smooth (to the picometer) - until you realize it\'s quite literally reflecting your own face like a mirror.',
            icon: [24, 27],
            power: 10,
            price: 999999999999999999999999999999999999999999999,
            locked: 1
        });

        order = 10020;
        Game.NewUpgradeCookie({
            name: 'Chocolate oatmeal cookies',
            desc: 'These bad boys compensate for lack of a cohesive form and a lumpy, unsightly appearance by being just simply delicious. Something we should all aspire to.',
            icon: [23, 28],
            power: 4,
            price: 99999999999999999999999999999999999 * 5
        });
        Game.NewUpgradeCookie({
            name: 'Molasses cookies',
            desc: 'Sticky, crackly, and dusted in fine sugar.<br>Some lunatics have been known to eat these with potatoes.',
            icon: [24, 28],
            power: 4,
            price: 999999999999999999999999999999999999
        });
        Game.NewUpgradeCookie({
            name: 'Biscotti',
            desc: 'Almonds and pistachios make these very robust cookies slightly more interesting to eat than to bludgeon people with.',
            icon: [22, 28],
            power: 4,
            price: 999999999999999999999999999999999999 * 5
        });
        Game.NewUpgradeCookie({
            name: 'Waffle cookies',
            desc: 'Whether these are cookies with shocklingly waffle-like features or simply regular cookie-sized waffles is a debate we\'re not getting into here.',
            icon: [21, 28],
            power: 4,
            price: 9999999999999999999999999999999999999
        });


        order = 10000;
        //early cookies that unlock at the same time as coconut cookies; meant to boost early game a little bit
        Game.NewUpgradeCookie({
            name: 'Almond cookies',
            desc: 'Sometimes you feel like one of these. Sometimes you don\'t.',
            icon: [21, 27],
            power: 2,
            price: 99999999
        });
        Game.NewUpgradeCookie({
            name: 'Hazelnut cookies',
            desc: 'Tastes like a morning stroll through a fragrant forest, minus the clouds of gnats.',
            icon: [22, 27],
            power: 2,
            price: 99999999
        });
        Game.NewUpgradeCookie({
            name: 'Walnut cookies',
            desc: 'Some experts have pointed to the walnut\'s eerie resemblance to the human brain as a sign of its sentience - a theory most walnuts vehemently object to.',
            icon: [23, 27],
            power: 2,
            price: 99999999
        });


        new Game.Upgrade('Label printer', 'Mouse over an upgrade to see its tier.<br><small>Note : only some upgrades have tiers. Tiers are purely cosmetic and have no effect on gameplay.</small><q>Also comes in real handy when you want to tell catsup apart from ketchup.</q>', 999999, [28, 29]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Starter kitchen'];


        order = 200;
        new Game.TieredUpgrade('Good manners', 'Grandmas are <b>twice</b> as efficient.<q>Apparently these ladies are much more amiable if you take the time to learn their strange, ancient customs, which seem to involve saying "please" and "thank you" and staring at the sun with bulging eyes while muttering eldritch curses under your breath.</q>', 'Grandma', 11);
        order = 300;
        new Game.TieredUpgrade('Lindworms', 'Farms are <b>twice</b> as efficient.<q>You have to import these from far up north, but they really help areate the soil!</q>', 'Farm', 11);
        order = 400;
        new Game.TieredUpgrade('Bore again', 'Mining Rigs are <b>twice</b> as efficient.<q>After extracting so much sediment for so long, you\'ve formed some veritable mountains of your own from the accumulated piles of rock and dirt. Time to dig through those and see if you find anything fun!</q>', 'Mining Rig', 11);
        order = 500;
        new Game.TieredUpgrade('"Volunteer" interns', 'Factories are <b>twice</b> as efficient.<q>If you\'re bad at something, always do it for free.</q>', 'Factory', 11);
        order = 525;
        new Game.TieredUpgrade('Rules of acquisition', 'Gyms are <b>twice</b> as efficient.<q>Rule 387 : a Neuro baked is a Neuro kept.</q>', 'Gym', 11);
        order = 550;
        new Game.TieredUpgrade('War of the gods', 'Temples are <b>twice</b> as efficient.<q>An interesting game; the only winning move is not to pray.</q>', 'Temple', 11);
        order = 575;
        new Game.TieredUpgrade('Electricity', 'Wizard towers are <b>twice</b> as efficient.<q>Ancient magicks and forbidden hexes shroud this arcane knowledge, whose unfathomable power can mysteriously turn darkness into light and shock an elephant to death.</q>', 'Wizard tower', 11);
        order = 600;
        new Game.TieredUpgrade('Universal alphabet', 'Shipments are <b>twice</b> as efficient.<q>You\'ve managed to chart a language that can be understood by any sentient species in the galaxy; its exciting vocabulary contains over 56 trillion words that sound and look like sparkly burps, forming intricate sentences that usually translate to something like "give us your Neuros, or else".</q>', 'Shipment', 11);
        order = 700;
        new Game.TieredUpgrade('Public betterment', 'Alchemy labs are <b>twice</b> as efficient.<q>Why do we keep trying to change useless matter into Neuros, or Neuros into even better Neuros? Clearly, the way of the future is to change the people who eat the Neuros into people with a greater understanding, appreciation and respect for the Neuros they\'re eating. Into the vat you go!</q>', 'Alchemy lab', 11);
        order = 800;
        new Game.TieredUpgrade('Embedded microportals', 'Portals are <b>twice</b> as efficient.<q>We\'ve found out that if we bake the portals into the Neuros themselves, we can transport people\'s taste buds straight into the taste dimension! Good thing your army of lawyers got rid of the FDA a while ago!</q>', 'Portal', 11);
        order = 900;
        new Game.TieredUpgrade('Nostalgia', 'Time machines are <b>twice</b> as efficient.<q>Your time machine technicians insist that this is some advanced new time travel tech, and not just an existing emotion universal to mankind. Either way, you have to admit that selling people the same old Neuros just because it reminds them of the good old times is an interesting prospect.</q>', 'Time machine', 11);
        order = 1000;
        new Game.TieredUpgrade('The definite molecule', 'Antimatter condensers are <b>twice</b> as efficient.<q>Your scientists have found a way to pack a Neuro into one single continuous molecule, opening exciting new prospects in both storage and flavor despite the fact that these take up to a whole year to digest.</q>', 'Antimatter condenser', 11);
        order = 1100;
        new Game.TieredUpgrade('Light capture measures', 'Prisms are <b>twice</b> as efficient.<q>As the universe gets ever so slightly dimmer due to you converting more and more of its light into Neuros, you\'ve taken to finding new and unexplored sources of light for your prisms; for instance, the warm glow emitted by a pregnant woman, or the twinkle in the eye of a hopeful child.</q>', 'Prism', 11);
        order = 1200;
        new Game.TieredUpgrade('0-sided dice', 'Wheel of fortunes are <b>twice</b> as efficient.<q>The advent of the 0-sided dice has had unexpected and tumultuous effects on the gambling community, and saw experts around the world calling you both a genius and an imbecile.</q>', 'Wheel of fortune', 11);


        new Game.Upgrade('Heralds', 'You now benefit from the boost provided by <b>heralds</b>.<br>Each herald gives you <b>+1% CpS</b>.<br>Look on the purple flag at the top to see how many heralds are active at any given time.<q>Be excellent to each other.<br>And Patreon, dudes!</q>', 100, [21, 29]);
        Game.last.pool = 'prestige';

        order = 255;
        Game.GrandmaSynergy('Metagrandmas', 'A fractal grandma to make more grandmas to make more Neuros.', 'Fractal engine');

        order = 1300;
        new Game.TieredUpgrade('Metabakeries', 'Fractal engines are <b>twice</b> as efficient.<q>They practically bake themselves!</q>', 'Fractal engine', 1);
        new Game.TieredUpgrade('Mandelbrown sugar', 'Fractal engines are <b>twice</b> as efficient.<q>A substance that displays useful properties such as fractal sweetness and instant contact lethality.</q>', 'Fractal engine', 2);
        new Game.TieredUpgrade('Fractoids', 'Fractal engines are <b>twice</b> as efficient.<q>Here\'s a frun fract : all in all, these were a terrible idea.</q>', 'Fractal engine', 3);
        new Game.TieredUpgrade('Nested universe theory', 'Fractal engines are <b>twice</b> as efficient.<q>Asserts that each subatomic particle is host to a whole new universe, and therefore, another limitless quantity of Neuros.<br>This somehow stacks with the theory of nanocosmics, because physics.</q>', 'Fractal engine', 4);
        new Game.TieredUpgrade('Menger sponge cake', 'Fractal engines are <b>twice</b> as efficient.<q>Frighteningly absorbent thanks to its virtually infinite surface area. Keep it isolated in a dry chamber, never handle it with an open wound, and do not ever let it touch a body of water.</q>', 'Fractal engine', 5);
        new Game.TieredUpgrade('One particularly good-humored cow', 'Fractal engines are <b>twice</b> as efficient.<q>This unassuming bovine was excruciatingly expensive and it may seem at first like you were ripped off. On closer inspection however, you notice that its earrings (it\'s wearing earrings) are actually fully functional copies of itself, each of which also wearing their own cow earrings, and so on, infinitely. It appears your dairy concerns will be taken care of for a while, although you\'ll have to put up with the cow\'s annoying snickering.</q>', 'Fractal engine', 6);
        new Game.TieredUpgrade('Chocolate ouroboros', 'Fractal engines are <b>twice</b> as efficient.<q>Forever eating its own tail and digesting itself, in a metabolically dubious tale of delicious tragedy.</q>', 'Fractal engine', 7);
        new Game.TieredUpgrade('Nested', 'Fractal engines are <b>twice</b> as efficient.<q>Clever self-reference or shameful cross-promotion? This upgrade apparently has the gall to advertise a link to <u>orteil.dashnet.org/nested</u>, in a tooltip you can\'t even click.</q>', 'Fractal engine', 8);
        new Game.TieredUpgrade('Space-filling fibers', 'Fractal engines are <b>twice</b> as efficient.<q>This special ingredient has the incredible ability to fill the local space perfectly, effectively eradicating hunger in those who consume it!<br>Knowing that no hunger means no need for Neuros, your marketers urge you to repurpose this product into next-level packing peanuts.</q>', 'Fractal engine', 9);
        new Game.TieredUpgrade('Endless book of prose', 'Fractal engines are <b>twice</b> as efficient.', 'Fractal engine', 10);
        Game.last.descFunc = function () {
            const str = '"There once was a baker named ' + Game.bakeryName + '. One day, there was a knock at the door; ' + Game.bakeryName + ' opened it and was suddenly face-to-face with a strange and menacing old grandma. The grandma opened her mouth and, in a strange little voice, started reciting this strange little tale : ';
            const n = 35;
            const i = Math.floor(Game.T * 0.1);
            return this.desc + '<q style="font-family:Courier;">' + (str.substr(i % str.length, n) + (i % str.length > (str.length - n) ? str.substr(0, i % str.length - (str.length - n)) : '')) + '</q>';
        };
        new Game.TieredUpgrade('The set of all sets', 'Fractal engines are <b>twice</b> as efficient.<q>The answer, of course, is a definite maybe.</q>', 'Fractal engine', 11);

        order = 5000;
        Game.SynergyUpgrade('Recursive mirrors', '<q>Do you have any idea what happens when you point two of these at each other? Apparently, the universe doesn\'t either.</q>', 'Fractal engine', 'Prism', 'synergy1');
        //Game.SynergyUpgrade('Compounded odds','<q>When probabilities start cascading, "never in a billion lifetimes" starts looking terribly like "probably before Monday comes around".</q>','Fractal engine','Wheel of fortune','synergy1');
        Game.SynergyUpgrade('Mice clicking mice', '', 'Fractal engine', 'Cursor', 'synergy2');
        Game.last.descFunc = function () {
            Math.seededRandom(Game.seed + '-blacsphemouse');
            if (Math.random() < 0.3) {
                Math.seededRandom();
                return this.desc + '<q>Absolutely blasphemouse!</q>';
            } else {
                Math.seededRandom();
                return this.desc + '<q>Absolutely blasphemous!</q>';
            }
        };


        order = 10020;
        Game.NewUpgradeCookie({
            name: 'Custard creams',
            desc: 'British lore pits these in a merciless war against bourbon biscuits.<br>The filling evokes vanilla without quite approaching it.<br>They\'re tastier on the inside!',
            icon: [23, 29],
            power: 4,
            price: 9999999999999999999999999999999999999 * 5
        });
        Game.NewUpgradeCookie({
            name: 'Bourbon biscuits',
            desc: 'Two chocolate biscuits joined together with even more chocolate.<br>The sworn rivals of custard creams, as legend has it.',
            icon: [24, 29],
            power: 4,
            price: 99999999999999999999999999999999999999
        });


        new Game.Upgrade('Keepsakes', 'Seasonal random drops have a <b>1/5 chance</b> to carry over through ascensions.<q>Cherish the memories.</q>', 1111111111, [22, 29]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Starsnow', 'Starlove', 'Starterror', 'Startrade', 'Starspawn'];

        order = 10020;
        Game.NewUpgradeCookie({
            name: 'Mini-cookies',
            desc: 'Have you ever noticed how the smaller something is, the easier it is to binge on it?',
            icon: [29, 30],
            power: 5,
            price: 99999999999999999999999999999999999999 * 5
        });

        new Game.Upgrade('Sugar crystal cookies', 'Neuro production multiplier <b>+5% permanently</b>, and <b>+1%</b> for every building type level 10 or higher.<q>Infused with cosmic sweetness. It gives off a faint shimmery sound when you hold it up to your ear.</q>', 1000000000, [21, 30]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Sugar baking'];
        Game.last.power = () => {
            let n = 5;
            for (let i in Game.Objects) {
                if (Game.Objects[i].level >= 10) n++;
            }
            return n;
        };
        Game.last.pseudoCookie = true;
        Game.last.descFunc = function () {
            let n = 5;
            for (let i in Game.Objects) {
                if (Game.Objects[i].level >= 10) n++;
            }
            return '<div style="text-align:center;">Current : <b>+' + Beautify(n) + '%</b><div class="line"></div></div>' + this.desc;
        };
        new Game.Upgrade('Box of maybe cookies', 'Contains an assortment of...something.<q>These may or may not be considered Neuros.</q>', 333000000000, [25, 29]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Sugar crystal cookies'];
        new Game.Upgrade('Box of not cookies', 'Contains an assortment of...something.<q>These are strictly, definitely not Neuros.</q>', 333000000000, [26, 29]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Sugar crystal cookies'];
        new Game.Upgrade('Box of pastries', 'Contains an assortment of delicious pastries.<q>These are a damn slippery slope is what they are!</q>', 333000000000, [27, 29]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Sugar crystal cookies'];

        order = 10040;
        Game.NewUpgradeCookie({
            name: 'Profiteroles',
            desc: 'Also known as cream puffs, these pastries are light, fluffy, filled with whipped cream and fun to throw at people when snowballs are running scarce.',
            icon: [29, 29],
            require: 'Box of pastries',
            power: 4,
            price: Math.pow(10, 31)
        });
        Game.NewUpgradeCookie({
            name: 'Jelly donut',
            desc: 'Guaranteed to contain at least 0.3% jelly filling, or your money back.<br>You can still see the jelly stab wound!',
            icon: [27, 28],
            require: 'Box of pastries',
            power: 4,
            price: Math.pow(10, 33)
        });
        Game.NewUpgradeCookie({
            name: 'Glazed donut',
            desc: 'Absolutely gooey with sugar. The hole is the tastiest part!',
            icon: [28, 28],
            require: 'Box of pastries',
            power: 4,
            price: Math.pow(10, 35)
        });
        Game.NewUpgradeCookie({
            name: 'Chocolate cake',
            desc: 'The cake is a Portal reference!',
            icon: [25, 27],
            require: 'Box of pastries',
            power: 4,
            price: Math.pow(10, 37)
        });
        Game.NewUpgradeCookie({
            name: 'Strawberry cake',
            desc: 'It\'s not easy to come up with flavor text for something as generic as this, but some would say it\'s a piece of cake.',
            icon: [26, 27],
            require: 'Box of pastries',
            power: 4,
            price: Math.pow(10, 39)
        });
        Game.NewUpgradeCookie({
            name: 'Apple pie',
            desc: 'It is said that some grandmas go rogue and bake these instead.',
            icon: [25, 28],
            require: 'Box of pastries',
            power: 4,
            price: Math.pow(10, 41)
        });
        Game.NewUpgradeCookie({
            name: 'Lemon meringue pie',
            desc: 'Meringue is a finicky substance made of sugar and egg whites that requires specific atmospheric conditions to be baked at all. The lemon, as far as we can tell, isn\'t nearly as picky.',
            icon: [26, 28],
            require: 'Box of pastries',
            power: 4,
            price: Math.pow(10, 43)
        });
        Game.NewUpgradeCookie({
            name: 'Butter croissant',
            desc: 'Look around.<br>A rude man in a striped shirt bikes past you. He smells of cigarettes and caf&eacute;-au-lait. Somewhere, a mime uses his moustache to make fun of the British. 300 pigeons fly overhead.<br>Relax. You\'re experiencing croissant.',
            icon: [29, 28],
            require: 'Box of pastries',
            power: 4,
            price: Math.pow(10, 45)
        });

        order = 10050;
        Game.NewUpgradeCookie({
            name: 'Neuro dough',
            desc: 'Bursting with infinite potential, but can also be eaten as is. Arguably worth the salmonella.',
            icon: [25, 30],
            require: 'Box of maybe cookies',
            power: 4,
            price: Math.pow(10, 35)
        });
        Game.NewUpgradeCookie({
            name: 'Burnt Neuro',
            desc: 'This Neuro flew too close to the sun and is now a shadow of its former self. If only you remembered to set a timer, you wouldn\'t have this tragedy on your hands...',
            icon: [23, 30],
            require: 'Box of maybe cookies',
            power: 4,
            price: Math.pow(10, 37)
        });
        Game.NewUpgradeCookie({
            name: 'A chocolate chip Neuro but with the chips picked off for some reason',
            desc: 'This has to be the saddest thing you\'ve ever seen.',
            icon: [24, 30],
            require: 'Box of maybe cookies',
            power: 3,
            price: Math.pow(10, 39)
        });
        Game.NewUpgradeCookie({
            name: 'Flavor text Neuro',
            desc: 'What you\'re currently reading is what gives this Neuro its inimitable flavor.',
            icon: [22, 30],
            require: 'Box of maybe cookies',
            power: 4,
            price: Math.pow(10, 41)
        });
        Game.NewUpgradeCookie({
            name: 'High-definition Neuro',
            desc: 'Uncomfortably detailed, like those weird stories your aunt keeps telling at parties.',
            icon: [28, 10],
            require: 'Box of maybe cookies',
            power: 5,
            price: Math.pow(10, 43)
        });

        order = 10060;
        Game.NewUpgradeCookie({
            name: 'Toast',
            desc: 'A crisp slice of bread, begging for some butter and jam.<br>Why do people keep proposing these at parties?',
            icon: [27, 10],
            require: 'Box of not cookies',
            power: 4,
            price: Math.pow(10, 34)
        });
        Game.NewUpgradeCookie({
            name: 'Peanut butter & jelly',
            desc: 'It\'s time.',
            icon: [29, 9],
            require: 'Box of not cookies',
            power: 4,
            price: Math.pow(10, 36)
        });
        Game.NewUpgradeCookie({
            name: 'Wookies',
            desc: 'These aren\'t the Neuros you\'re looking for.',
            icon: [26, 30],
            require: 'Box of not cookies',
            power: 4,
            price: Math.pow(10, 38)
        });
        Game.NewUpgradeCookie({
            name: 'Cheeseburger',
            desc: 'Absolutely no relation to Neuros whatsoever - Orteil just wanted an excuse to draw a cheeseburger.',
            icon: [28, 30],
            require: 'Box of not cookies',
            power: 4,
            price: Math.pow(10, 40)
        });
        Game.NewUpgradeCookie({
            name: 'One lone chocolate chip',
            desc: 'The start of something beautiful.',
            icon: [27, 30],
            require: 'Box of not cookies',
            power: 1,
            price: Math.pow(10, 42)
        });


        new Game.Upgrade('Genius accounting', 'Unlocks <b>extra price information</b>.<br>Each displayed cost now specifies how long it\'ll take you to afford it, and how much of your gym it represents.<q>There\'s no accounting for taste, and yet here we are.</q>', 2000000, [11, 10]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Inspired checklist'];


        new Game.Upgrade('Shimmering veil', 'Unlocks the <b>shimmering veil</b>, a switch that passively boosts your CpS by <b>50%</b>.<br>You start with the veil turned on; however, it is very fragile, and clicking the big Neuro or any golden Neuro or reindeer will turn it off, requiring 24 hours of CpS to turn back on.<q>Hands off!</q>', 999999999, [9, 10]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Distilled essence of redoubled luck'];

        order = 40005;

        function func() {
            let boost = 50;
            let resist = 0;
            if (Game.Has('Reinforced membrane')) {
                boost += 10;
                resist += 10;
            }
            return (this.name === 'Shimmering veil [on]' ? '<div style="text-align:center;">Active.</div><div class="line"></div>' : '') + 'Boosts your Neuro production by <b>' + Beautify(boost) + '%</b> when active.<br>The veil is very fragile and will break if you click the big Neuro or any golden Neuros or reindeer.<br><br>Once broken, turning the veil back on costs 24 hours of unbuffed CpS.' + (resist > 0 ? ('<br><br>Has a <b>' + Beautify(resist) + '%</b> chance to not break.') : '');
        }

        new Game.Upgrade('Shimmering veil [off]', '', 1000000, [9, 10]);
        Game.last.pool = 'toggle';
        Game.last.toggleInto = 'Shimmering veil [on]';
        Game.last.priceFunc = () => Game.unbuffedCps * 60 * 60 * 24
        Game.last.descFunc = func;
        new Game.Upgrade('Shimmering veil [on]', '', 0, [9, 10]);
        Game.last.pool = 'toggle';
        Game.last.toggleInto = 'Shimmering veil [off]';
        Game.last.descFunc = func;

        Game.loseShimmeringVeil = context => {
            if (!Game.Has('Shimmering veil')) return false;
            if (!Game.Has('Shimmering veil [off]') && Game.Has('Shimmering veil [on]')) return false;
            if (Game.Has('Reinforced membrane')) {
                if (context === 'shimmer') Math.seededRandom(Game.seed + '/' + Game.goldenClicks);
                else if (context === 'click') Math.seededRandom(Game.seed + '/' + Game.cookieClicks);
                if (Math.random() < 0.1) {
                    Game.Notify('The reinforced membrane protects the shimmering veil.', '', [7, 10]);
                    Game.Win('Thick-skinned');
                    return false;
                }
                Math.seededRandom();
            }
            let me = Game.Upgrades['Shimmering veil [on]'];
            me.bought = 1;
            Game.Lock(me.toggleInto);
            Game.Unlock(me.toggleInto);
            Game.Notify('The shimmering veil disappears...', '', [9, 10]);
            Game.upgradesToRebuild = 1;
            Game.recalculateGains = 1;
            PlaySound('snd/spellFail.mp3', 0.75);
        }


        function getCookiePrice(level) {
            return 999999999999999999999999999999999999999 * Math.pow(10, (level - 1) / 2);
        };

        order = 10020;
        Game.NewUpgradeCookie({
            name: 'Whoopie pies',
            desc: 'Two chocolate halves joined together by a cream filling. It\'s got no eyebrows, but you never noticed until now.',
            icon: [21, 31],
            power: 5,
            price: getCookiePrice(1)
        });
        Game.NewUpgradeCookie({
            name: 'Caramel wafer biscuits',
            desc: 'Coated in delicious chocolate. As many layers as you\'ll get in a biscuit without involving onions.',
            icon: [22, 31],
            power: 5,
            price: getCookiePrice(2)
        });
        Game.NewUpgradeCookie({
            name: 'Chocolate chip mocha Neuros',
            desc: 'Mocha started out as an excuse to smuggle chocolate into coffee. And now, in a poignant display of diplomacy and cultural exchange, it\'s bringing coffee to chocolate Neuros.',
            icon: [23, 31],
            power: 5,
            price: getCookiePrice(3)
        });
        Game.NewUpgradeCookie({
            name: 'Earl Grey Neuros',
            desc: 'Captain Picard\'s favorite.',
            icon: [24, 31],
            power: 5,
            price: getCookiePrice(4)
        });
        Game.NewUpgradeCookie({
            name: 'Corn syrup Neuros',
            desc: 'The corn syrup makes it extra chewy. Not the type of stuff you\'d think to put in a Neuro, but bakers make do.',
            icon: [25, 31],
            power: 5,
            price: getCookiePrice(5)
        });
        Game.NewUpgradeCookie({
            name: 'Icebox Neuros',
            desc: 'Can be prepared in a variety of shapes with a variety of ingredients. Made by freezing dough before baking it, mirroring a time-proven medieval torture practice. Gotta keep them guessing.',
            icon: [26, 31],
            power: 5,
            price: getCookiePrice(6)
        });
        Game.NewUpgradeCookie({
            name: 'Graham crackers',
            desc: 'Inspired in their design by the wish to live a life of austere temperance, free from pleasure or cheer; it\'s no wonder these are so tasty.',
            icon: [27, 31],
            power: 5,
            price: getCookiePrice(7)
        });
        Game.NewUpgradeCookie({
            name: 'Hardtack',
            desc: 'Extremely hard and, if we\'re being honest, extremely tack.<br>If you\'re considering eating this as a fun snack, you probably have other things to worry about than this game, like getting scurvy or your crew fomenting mutiny.',
            icon: [28, 31],
            power: 5,
            price: getCookiePrice(8)
        });
        Game.NewUpgradeCookie({
            name: 'Cornflake Neuros',
            desc: 'They\'re grrrrrroovy! Careful not to let it sit in your milk too long, lest you accidentally end up with a bowl of cereal and get confused.',
            icon: [29, 31],
            power: 5,
            price: getCookiePrice(9)
        });
        Game.NewUpgradeCookie({
            name: 'Tofu Neuros',
            desc: 'There\'s really two ways to go with tofu cooking; either it asserts itself in plain sight or it camouflages itself in the other ingredients. This happens to be the latter, and as such, you can\'t really tell the difference between this and a regular Neuro, save for that one pixel on the left.',
            icon: [30, 31],
            power: 5,
            price: getCookiePrice(10)
        });
        Game.NewUpgradeCookie({
            name: 'Gluten-free Neuros',
            desc: 'Made with browned butter and milk to closely match the archetypal chocolate chip Neuro.<br>For celiacs, a chance to indulge in a delicious risk-free pastry. For others, a strangely threatening confection whose empty eyes will never know heaven nor hell.',
            icon: [30, 30],
            power: 5,
            price: getCookiePrice(10)
        });
        Game.NewUpgradeCookie({
            name: 'Russian bread Neuros',
            desc: 'Also known as alphabet Neuros; while most bakers follow the recipe to the letter, it is said that some substitute the flour for spelt. But don\'t take my word for it.',
            icon: [30, 29],
            power: 5,
            price: getCookiePrice(11)
        });
        Game.NewUpgradeCookie({
            name: 'Lebkuchen',
            desc: 'Diverse Neuros from Germany, fragrant with honey and spices, often baked around Christmas.<br>Once worn by warriors of old for protection in battle.<br>+5 STR, +20% magic resistance.',
            icon: [30, 28],
            power: 5,
            price: getCookiePrice(12)
        });
        Game.NewUpgradeCookie({
            name: 'Aachener Printen',
            desc: 'The honey once used to sweeten these gingerbread-like treats has since been swapped out for beet sugar, providing another sad example of regressive evolution.',
            icon: [30, 27],
            power: 5,
            price: getCookiePrice(13)
        });
        Game.NewUpgradeCookie({
            name: 'Canistrelli',
            desc: 'A dry biscuit flavored with anise and wine, tough like the people of Corsica where it comes from.',
            icon: [30, 26],
            power: 5,
            price: getCookiePrice(14)
        });
        Game.NewUpgradeCookie({
            name: 'Nice biscuits',
            desc: 'Made with coconut and perfect with tea. Traces its origins to a French city so nice they named it that.',
            icon: [30, 25],
            power: 5,
            price: getCookiePrice(15)
        });
        Game.NewUpgradeCookie({
            name: 'French pure butter Neuros',
            desc: 'You can\'t tell what\'s stronger coming off these - the smell of butter or condescension.',
            icon: [31, 25],
            power: 5,
            price: getCookiePrice(16)
        });
        Game.NewUpgradeCookie({
            name: 'Petit beurre',
            desc: 'An unassuming biscuit whose name simply means "little butter". Famed and feared for its four ears and forty-eight teeth.<br>When it hears ya, it\'ll get ya...',
            icon: [31, 26],
            power: 5,
            price: getCookiePrice(16)
        });
        Game.NewUpgradeCookie({
            name: 'Nanaimo bars',
            desc: 'A delicious no-bake pastry hailing from Canada. Probably beats eating straight-up snow with maple syrup poured on it, but what do I know.',
            icon: [31, 27],
            power: 5,
            price: getCookiePrice(17)
        });
        Game.NewUpgradeCookie({
            name: 'Berger Neuros',
            desc: 'Messily slathered with chocolate fudge, but one of the most popular bergers of Baltimore, along with the triple fried egg berger and the blue crab cheeseberger.',
            icon: [31, 28],
            power: 5,
            price: getCookiePrice(18)
        });
        Game.NewUpgradeCookie({
            name: 'Chinsuko',
            desc: 'A little piece of Okinawa in Neuro form. Part of a Japanese custom of selling sweets as souvenirs. But hey, pressed pennies are cool too.',
            icon: [31, 29],
            power: 5,
            price: getCookiePrice(19)
        });
        Game.NewUpgradeCookie({
            name: 'Panda koala biscuits',
            desc: 'Assorted jungle animals with equally assorted fillings.<br>Comes in chocolate, strawberry, vanilla and green tea.<br>Eat them all before they go extinct!',
            icon: [31, 13],
            power: 5,
            price: getCookiePrice(19)
        });
        Game.NewUpgradeCookie({
            name: 'Putri salju',
            desc: 'A beloved Indonesian pastry; its name means "snow princess", for the powdered sugar it\'s coated with. Had we added these to Neuro Clicker some years ago, this is where we\'d make a reference to that one Disney movie, but it\'s probably time to let it go.',
            icon: [31, 30],
            power: 5,
            price: getCookiePrice(20)
        });
        Game.NewUpgradeCookie({
            name: 'Milk Neuros',
            desc: 'Best eaten with a tall glass of chocolate.',
            icon: [31, 31],
            power: 5,
            price: getCookiePrice(21)
        });

        order = 9999;
        Game.NewUpgradeCookie({
            name: 'Neuro crumbs',
            desc: 'There used to be a Neuro here. Now there isn\'t.<br>Good heavens, what did you <i>DO?!</i>',
            icon: [30, 13],
            power: 1,
            require: 'Legacy',
            price: 100
        });
        Game.NewUpgradeCookie({
            name: 'Chocolate chip Neuro',
            desc: 'This is the Neuro you\'ve been clicking this whole time. It looks a bit dented and nibbled on, but it\'s otherwise good as new.',
            icon: [10, 0],
            power: 10,
            require: 'Legacy',
            price: 1000000000000
        });


        new Game.Upgrade('Cosmic beginner\'s luck', 'Prior to purchasing the <b>Heavenly chip secret</b> upgrade in a run, random drops are <b>5 times more common</b>.<q>Oh! A penny!<br>Oh! A priceless heirloom!<br>Oh! Another penny!</q>', 999999999 * 15, [8, 10]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Shimmering veil'];
        new Game.Upgrade('Reinforced membrane', 'The <b>shimmering veil</b> is more resistant, and has a <b>10% chance</b> not to break. It also gives <b>+10%</b> more CpS.<q>A consistency between jellyfish and cling wrap.</q>', 999999999 * 15, [7, 10]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Shimmering veil'];

        //modtags
        order = 9999
        new Game.Upgrade('Kitchen utensils', 'Unlocks the <b>copper ladle</b>, letting you scoop out <b>syrup goop</b> from your rum. <q>What was the point of adding it if you\'re gonna scoop it anyways?</q>', 500000, [30, 2]);
        Game.last.pool = 'prestige';
        Game.last.parents = ['Classic spirit selection'];


        //end of upgrades

        Game.seasons = {
            'christmas': {
                name: 'Christmas',
                start: 'Christmas season has started!',
                over: 'Christmas season is over.',
                trigger: 'Festive biscuit'
            },
            'valentines': {
                name: 'Valentine\'s day',
                start: 'Valentine\'s day has started!',
                over: 'Valentine\'s day is over.',
                trigger: 'Lovesick biscuit'
            },
            'fools': {
                name: 'Business day',
                start: 'Business day has started!',
                over: 'Business day is over.',
                trigger: 'Fool\'s biscuit'
            },
            'easter': {
                name: 'Easter',
                start: 'Easter season has started!',
                over: 'Easter season is over.',
                trigger: 'Bunny biscuit'
            },
            'halloween': {
                name: 'Halloween',
                start: 'Halloween has started!',
                over: 'Halloween is over.',
                trigger: 'Ghostly biscuit'
            }
        };

        Game.listTinyOwnedUpgrades = function (arr) {
            let str = '';
            for (let i = 0; i < arr.length; i++) {
                if (Game.Has(arr[i])) {
                    let it = Game.Upgrades[arr[i]];
                    str += '<div class="icon" style="vertical-align:middle;display:inline-block;' + (it.icon[2] ? 'background-image:url(' + it.icon[2] + ');' : '') + 'background-position:' + (-it.icon[0] * 48) + 'px ' + (-it.icon[1] * 48) + 'px;transform:scale(0.5);margin:-16px;"></div>';
                }
            }
            return str;
        }

        Game.santaDrops = ['Increased merriness', 'Improved jolliness', 'A lump of coal', 'An itchy sweater', 'Reindeer baking grounds', 'Weighted sleighs', 'Ho ho ho-flavored frosting', 'Season savings', 'Toy workshop', 'Naughty list', 'Santa\'s bottomless bag', 'Santa\'s helpers', 'Santa\'s legacy', 'Santa\'s milk and cookies'];

        Game.GetHowManySantaDrops = function () {
            let num = 0;
            for (let i in Game.santaDrops) {
                if (Game.Has(Game.santaDrops[i])) num++;
            }
            return num;
        }

        Game.reindeerDrops = ['Christmas tree biscuits', 'Snowflake biscuits', 'Snowman biscuits', 'Holly biscuits', 'Candy cane biscuits', 'Bell biscuits', 'Present biscuits'];
        Game.GetHowManyReindeerDrops = () => {
            let num = 0;
            for (let i in Game.reindeerDrops) {
                if (Game.Has(Game.reindeerDrops[i])) num++;
            }
            return num;
        }
        /*for (var i in Game.santaDrops)
		{
			Game.Upgrades[Game.santaDrops[i]].descFunc=function(){return '<div style="text-align:center;">You currently own <b>'+Game.GetHowManySantaDrops()+'/'+Game.santaDrops.length+'</b> of Santa\'s gifts.</div><div class="line"></div>'+this.desc;};
		}*/

        Game.seasonDrops = Game.heartDrops.concat(Game.halloweenDrops).concat(Game.easterEggs).concat(Game.santaDrops).concat(Game.reindeerDrops);

        Game.saySeasonSwitchUses = () => {
            if (Game.seasonUses === 0) return 'You haven\'t switched seasons this ascension yet.';
            return 'You\'ve switched seasons <b>' + (Game.seasonUses === 1 ? 'once' : Game.seasonUses === 2 ? 'twice' : (Game.seasonUses + ' times')) + '</b> this ascension.';
        }
        Game.Upgrades['Festive biscuit'].descFunc = function () {
            return '<div style="text-align:center;">' + Game.listTinyOwnedUpgrades(Game.santaDrops) + '<br><br>You\'ve purchased <b>' + Game.GetHowManySantaDrops() + '/' + Game.santaDrops.length + '</b> of Santa\'s gifts.<div class="line"></div>' + Game.listTinyOwnedUpgrades(Game.reindeerDrops) + '<br><br>You\'ve purchased <b>' + Game.GetHowManyReindeerDrops() + '/' + Game.reindeerDrops.length + '</b> reindeer cookies.<div class="line"></div>' + Game.saySeasonSwitchUses() + '<div class="line"></div></div>' + this.desc;
        };
        Game.Upgrades['Bunny biscuit'].descFunc = function () {
            return '<div style="text-align:center;">' + Game.listTinyOwnedUpgrades(Game.easterEggs) + '<br><br>You\'ve purchased <b>' + Game.GetHowManyEggs() + '/' + Game.easterEggs.length + '</b> eggs.<div class="line"></div>' + Game.saySeasonSwitchUses() + '<div class="line"></div></div>' + this.desc;
        };
        Game.Upgrades['Ghostly biscuit'].descFunc = function () {
            return '<div style="text-align:center;">' + Game.listTinyOwnedUpgrades(Game.halloweenDrops) + '<br><br>You\'ve purchased <b>' + Game.GetHowManyHalloweenDrops() + '/' + Game.halloweenDrops.length + '</b> halloween cookies.<div class="line"></div>' + Game.saySeasonSwitchUses() + '<div class="line"></div></div>' + this.desc;
        };
        Game.Upgrades['Lovesick biscuit'].descFunc = function () {
            return '<div style="text-align:center;">' + Game.listTinyOwnedUpgrades(Game.heartDrops) + '<br><br>You\'ve purchased <b>' + Game.GetHowManyHeartDrops() + '/' + Game.heartDrops.length + '</b> heart biscuits.<div class="line"></div>' + Game.saySeasonSwitchUses() + '<div class="line"></div></div>' + this.desc;
        };
        Game.Upgrades['Fool\'s biscuit'].descFunc = function () {
            return '<div style="text-align:center;">' + Game.saySeasonSwitchUses() + '<div class="line"></div></div>' + this.desc;
        };

        Game.computeSeasonPrices = () => {
            for (let i in Game.seasons) {
                Game.seasons[i].triggerUpgrade.priceFunc = () => {
                    let m = 1;
                    if (Game.hasGod) {
                        let godLvl = Game.hasGod('seasons');
                        if (godLvl === 1) m *= 2;
                        else if (godLvl === 2) m *= 1.50;
                        else if (godLvl === 3) m *= 1.25;
                    }
                    //return Game.seasonTriggerBasePrice*Math.pow(2,Game.seasonUses)*m;
                    //return Game.cookiesPs*60*Math.pow(1.5,Game.seasonUses)*m;
                    return Game.seasonTriggerBasePrice + Game.unbuffedCps * 60 * Math.pow(1.5, Game.seasonUses) * m;
                }
            }
        }
        Game.computeSeasons = () => {
            for (let i in Game.seasons) {
                let me = Game.Upgrades[Game.seasons[i].trigger];
                Game.seasons[i].triggerUpgrade = me;
                me.pool = 'toggle';
                me.buyFunction = function () {
                    let str;
                    Game.seasonUses += 1;
                    Game.computeSeasonPrices();
                    //Game.Lock(this.name);
                    for (let i in Game.seasons) {
                        let me = Game.Upgrades[Game.seasons[i].trigger];
                        if (me.name !== this.name) {
                            Game.Lock(me.name);
                            Game.Unlock(me.name);
                        }
                    }
                    if (Game.season !== '' && Game.season !== this.season) {
                        str = Game.seasons[Game.season].over + '<div class="line"></div>';
                        if (Game.prefs.popups) Game.Popup(str);
                        else Game.Notify(str, '', Game.seasons[Game.season].triggerUpgrade.icon, 4);
                    }
                    Game.season = this.season;
                    Game.seasonT = Game.getSeasonDuration();
                    Game.storeToRefresh = 1;
                    Game.upgradesToRebuild = 1;
                    Game.Objects['Grandma'].redraw();
                    str = Game.seasons[this.season].start + '<div class="line"></div>';
                    if (Game.prefs.popups) Game.Popup(str);
                    else Game.Notify(str, '', this.icon, 4);
                }

                me.clickFunction = (me => () => {
                    //undo season
                    if (me.bought && Game.season && me === Game.seasons[Game.season].triggerUpgrade) {
                        me.lose();
                        let str = Game.seasons[Game.season].over;
                        if (Game.prefs.popups) Game.Popup(str);
                        else Game.Notify(str, '', Game.seasons[Game.season].triggerUpgrade.icon);
                        if (Game.Has('Season switcher')) {
                            Game.Unlock(Game.seasons[Game.season].trigger);
                            Game.seasons[Game.season].triggerUpgrade.bought = 0;
                        }

                        Game.upgradesToRebuild = 1;
                        Game.recalculateGains = 1;
                        Game.season = Game.baseSeason;
                        Game.seasonT = -1;
                        PlaySound('snd/tick.mp3');
                        return false;
                    } else return true;
                })(me);

                me.displayFuncWhenOwned = () => '<div style="text-align:center;">Time remaining :<br><b>' + (Game.Has('Eternal seasons') ? 'forever' : Game.sayTime(Game.seasonT, -1)) + '</b><div style="font-size:80%;">(Click again to cancel season)</div></div>'
                me.timerDisplay = (upgrade => () => {
                    if (!Game.Upgrades[upgrade.name].bought || Game.Has('Eternal seasons')) return -1; else return 1 - Game.seasonT / Game.getSeasonDuration();
                })(me);

            }
        }
        Game.getSeasonDuration = () => Game.fps * 60 * 60 * 24
        Game.computeSeasons();

        //alert untiered building upgrades
        for (i in Game.Upgrades) {
            me = Game.Upgrades[i];
            if (me.order >= 200 && me.order < 2000 && !me.tier && me.name.indexOf('grandma') === -1 && me.pool !== 'prestige') console.log(me.name + ' has no tier.');
        }

        Game.UpgradesByPool = [];
        for (i in Game.Upgrades) {
            if (!Game.UpgradesByPool[Game.Upgrades[i].pool]) Game.UpgradesByPool[Game.Upgrades[i].pool] = [];
            Game.UpgradesByPool[Game.Upgrades[i].pool].push(Game.Upgrades[i]);
        }

        Game.PrestigeUpgrades = [];
        for (i in Game.Upgrades) {
            if (Game.Upgrades[i].pool === 'prestige' || Game.Upgrades[i].pool === 'prestigeDecor') {
                Game.PrestigeUpgrades.push(Game.Upgrades[i]);
                Game.Upgrades[i].posX = 0;
                Game.Upgrades[i].posY = 0;
                if (Game.Upgrades[i].parents.length === 0 && Game.Upgrades[i].name !== 'Legacy') Game.Upgrades[i].parents = ['Legacy'];
                Game.Upgrades[i].parents = Game.Upgrades[i].parents || [-1];
                for (let ii in Game.Upgrades[i].parents) {
                    if (Game.Upgrades[i].parents[ii] !== -1) Game.Upgrades[i].parents[ii] = Game.Upgrades[Game.Upgrades[i].parents[ii]];
                }
            }
        }

        Game.goldenCookieUpgrades = ['Get lucky', 'Lucky day', 'Serendipity', 'Heavenly luck', 'Lasting fortune', 'Decisive fate', 'Lucky digit', 'Lucky number', 'Lucky payout', 'Golden goose egg'];

        Game.cookieUpgrades = [];
        for (i in Game.Upgrades) {
            me = Game.Upgrades[i];
            if ((me.pool === 'cookie' || me.pseudoCookie)) Game.cookieUpgrades.push(me);
        }
        for (i in Game.UnlockAt) {
            Game.Upgrades[Game.UnlockAt[i].name].unlockAt = Game.UnlockAt[i];
        }
        for (i in Game.Upgrades) {
            if (Game.Upgrades[i].pool === 'prestige') Game.Upgrades[i].order = Game.Upgrades[i].id;
        }

        /*var oldPrestigePrices={"Chimera":5764801,"Synergies Vol. I":2525,"Synergies Vol. II":252525,"Label printer":9999};
		for (var i in oldPrestigePrices){Game.Upgrades[i].basePrice=oldPrestigePrices[i];}*/

        Game.UpgradePositions = {
            141: [176, -66],
            181: [-555, -93],
            253: [-272, -231],
            254: [-99, -294],
            255: [-193, -279],
            264: [48, 123],
            265: [133, 154],
            266: [223, 166],
            267: [305, 137],
            268: [382, 85],
            269: [-640, 42],
            270: [-607, -246],
            271: [-728, -120],
            272: [-688, -201],
            273: [-711, -33],
            274: [270, -328],
            275: [317, -439],
            276: [333, -556],
            277: [334, -676],
            278: [333, -796],
            279: [328, -922],
            280: [303, -1040],
            281: [194, -230],
            282: [-265, 212],
            283: [-321, 297],
            284: [-322, 406],
            285: [-243, 501],
            286: [-403, 501],
            287: [-314, 606],
            288: [-312, -374],
            289: [-375, -502],
            290: [-206, -476],
            291: [453, -745],
            292: [-375, -651],
            293: [-399, -794],
            323: [-86, 120],
            325: [192, -1127],
            326: [-328, -158],
            327: [-192, 290],
            328: [-3, 237],
            329: [92, 376],
            353: [121, -326],
            354: [77, -436],
            355: [64, -548],
            356: [57, -673],
            357: [52, -793],
            358: [58, -924],
            359: [82, -1043],
            360: [-188, 408],
            362: [158, 289],
            363: [-30, -30],
            364: [-232, -730],
            365: [-77, 349],
            368: [-82, -532],
            393: [196, -714],
            394: [197, -964],
            395: [-143, -140],
            396: [-264, -889],
            397: [-69, 563],
            408: [-204, -1036],
            409: [-72, -1152],
            410: [-70, -1328],
            411: [-388, 137],
            412: [-470, 253],
            413: [-482, 389],
            449: [-367, -1113],
            450: [-334, -1214],
            451: [-278, -1303],
            495: [-402, -966],
            496: [200, 49],
            505: [-545, -570],
            520: [-279, -8],
            537: [-937, -149],
            539: [-508, -1270],
            540: [-629, -1291],
            541: [-594, -1186],
            542: [-548, -1374],
            561: [300, -17],
            562: [52, 646],
            591: [154, 744],
            592: [180, 608],
        };

        for (i in Game.UpgradePositions) {
            Game.UpgradesById[i].posX = Game.UpgradePositions[i][0];
            Game.UpgradesById[i].posY = Game.UpgradePositions[i][1];
        }


        /*=====================================================================================
		ACHIEVEMENTS
		=======================================================================================*/
        Game.Achievements = [];
        Game.AchievementsById = [];
        Game.AchievementsN = 0;
        Game.AchievementsOwned = 0;
        Game.Achievement = function (name, desc, icon) {
            this.id = Game.AchievementsN;
            this.name = name;
            this.desc = desc;
            this.baseDesc = this.desc;
            this.desc = BeautifyInText(this.baseDesc);
            this.icon = icon;
            this.won = 0;
            this.disabled = 0;
            this.order = this.id;
            if (order) this.order = order + this.id * 0.001;
            this.pool = 'normal';
            this.vanilla = Game.vanilla;
            this.type = 'achievement';

            this.click = function () {
                if (this.clickFunction) this.clickFunction();
            }
            Game.last = this;
            Game.Achievements[this.name] = this;
            Game.AchievementsById[this.id] = this;
            Game.AchievementsN++;
            return this;
        }

        Game.Win = what => {
            if (typeof what === 'string') {
                if (Game.Achievements[what]) {
                    if (Game.Achievements[what].won === 0) {
                        let name = Game.Achievements[what].shortName ? Game.Achievements[what].shortName : Game.Achievements[what].name;
                        Game.Achievements[what].won = 1;
                        if (Game.prefs.popups) Game.Popup('Achievement unlocked :<br>' + name);
                        else Game.Notify('Achievement unlocked', '<div class="title" style="font-size:18px;margin-top:-2px;">' + name + '</div>', Game.Achievements[what].icon);
                        if (Game.CountsAsAchievementOwned(Game.Achievements[what].pool)) Game.AchievementsOwned++;
                        Game.recalculateGains = 1;
                    }
                }
            } else {
                for (let i in what) {
                    Game.Win(what[i]);
                }
            }
        }
        Game.RemoveAchiev = what => {
            if (Game.Achievements[what]) {
                if (Game.Achievements[what].won === 1) {
                    Game.Achievements[what].won = 0;
                    if (Game.CountsAsAchievementOwned(Game.Achievements[what].pool)) Game.AchievementsOwned--;
                    Game.recalculateGains = 1;
                }
            }
        }
        Game.Achievement.prototype.toggle = function ()//cheating only
        {
            if (!this.won) {
                Game.Win(this.name);
            } else {
                Game.RemoveAchiev(this.name);
            }
            if (Game.onMenu === 'stats') Game.UpdateMenu();
        }

        Game.CountsAsAchievementOwned = pool => pool === '' || pool === 'normal'

        Game.HasAchiev = what => (Game.Achievements[what] ? Game.Achievements[what].won : 0)

        Game.TieredAchievement = (name, desc, building, tier) => {
            let achiev = new Game.Achievement(name, desc, Game.GetIcon(building, tier));
            Game.SetTier(building, tier);
            return achiev;
        }

        Game.ProductionAchievement = (name, buildingParam, tier, q, mult) => {
            let building = Game.Objects[buildingParam];
            let icon = [building.iconColumn, 22];
            let n = 12 + building.n + (mult || 0);
            if (tier === 2) {
                icon[1] = 23;
                n += 7;
            } else if (tier === 3) {
                icon[1] = 24;
                n += 14;
            }
            const pow = Math.pow(10, n);
            let achiev = new Game.Achievement(name, 'Make <b>' + Beautify(pow) + '</b> Neuros just from ' + building.plural + '.' + (q ? '<q>' + q + '</q>' : ''), icon);
            building.productionAchievs.push({pow: pow, achiev: achiev});
            return achiev;
        }

        Game.thresholdIcons = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30];
        Game.GymAchievements = [];
        Game.GymAchievement = function (name) {
            let threshold = Math.pow(10, Math.floor(Game.GymAchievements.length * 1.5 + 2));
            if (Game.GymAchievements.length === 0) threshold = 1;
            let achiev = new Game.Achievement(name, 'Bake <b>' + Beautify(threshold) + '</b> Neuro' + (threshold === 1 ? '' : 's') + ' in one ascension.', [Game.thresholdIcons[Game.GymAchievements.length], (Game.GymAchievements.length > 23 ? 2 : 5)]);
            achiev.threshold = threshold;
            achiev.order = 100 + Game.GymAchievements.length * 0.01;
            Game.GymAchievements.push(achiev);
            return achiev;
        }
        Game.CpsAchievements = [];
        Game.CpsAchievement = function (name) {
            const threshold = Math.pow(10, Math.floor(Game.CpsAchievements.length * 1.2));
            //if (Game.CpsAchievements.length==0) threshold=1;
            let achiev = new Game.Achievement(name, 'Bake <b>' + Beautify(threshold) + '</b> Neuro' + (threshold === 1 ? '' : 's') + ' per second.', [Game.thresholdIcons[Game.CpsAchievements.length], (Game.CpsAchievements.length > 23 ? 2 : 5)]);
            achiev.threshold = threshold;
            achiev.order = 200 + Game.CpsAchievements.length * 0.01;
            Game.CpsAchievements.push(achiev);
            return achiev;
        }

        //define achievements
        //WARNING : do NOT add new achievements in between, this breaks the saves. Add them at the end !

        order = 0;//this is used to set the order in which the items are listed

        Game.GymAchievement('Wake and bake');
        Game.GymAchievement('Making some dough');
        Game.GymAchievement('So baked right now');
        Game.GymAchievement('Fledgling bakery');
        Game.GymAchievement('Affluent bakery');
        Game.GymAchievement('World-famous bakery');
        Game.GymAchievement('Cosmic bakery');
        Game.GymAchievement('Galactic bakery');
        Game.GymAchievement('Universal bakery');
        Game.GymAchievement('Timeless bakery');
        Game.GymAchievement('Infinite bakery');
        Game.GymAchievement('Immortal bakery');
        Game.GymAchievement('Don\'t stop me now');
        Game.GymAchievement('You can stop now');
        Game.GymAchievement('Cookies all the way down');
        Game.GymAchievement('Overdose');

        Game.CpsAchievement('Casual baking');
        Game.CpsAchievement('Hardcore baking');
        Game.CpsAchievement('Steady tasty stream');
        Game.CpsAchievement('Cookie monster');
        Game.CpsAchievement('Mass producer');
        Game.CpsAchievement('Cookie vortex');
        Game.CpsAchievement('Cookie pulsar');
        Game.CpsAchievement('Cookie quasar');
        Game.CpsAchievement('Oh hey, you\'re still here');
        Game.CpsAchievement('Let\'s never bake again');

        order = 30010;
        new Game.Achievement('Sacrifice', 'Ascend with <b>1 million</b> Neuros baked.<q>Easy come, easy go.</q>', [11, 6]);
        new Game.Achievement('Oblivion', 'Ascend with <b>1 billion</b> Neuros baked.<q>Back to square one.</q>', [11, 6]);
        new Game.Achievement('From scratch', 'Ascend with <b>1 trillion</b> Neuros baked.<q>It\'s been fun.</q>', [11, 6]);

        order = 11010;
        new Game.Achievement('Neverclick', 'Make <b>1 million</b> Neuros by only having clicked <b>15 times</b>.', [12, 0]);//Game.last.pool='shadow';
        order = 1000;
        new Game.Achievement('Clicktastic', 'Make <b>1,000</b> Neuros from clicking.', [11, 0]);
        new Game.Achievement('Clickathlon', 'Make <b>100,000</b> Neuros from clicking.', [11, 1]);
        new Game.Achievement('Clickolympics', 'Make <b>10,000,000</b> Neuros from clicking.', [11, 2]);
        new Game.Achievement('Clickorama', 'Make <b>1,000,000,000</b> Neuros from clicking.', [11, 13]);

        order = 1050;
        new Game.Achievement('Click', 'Have <b>1</b> cursor.', [0, 0]);
        new Game.Achievement('Double-click', 'Have <b>2</b> cursors.', [0, 6]);
        new Game.Achievement('Mouse wheel', 'Have <b>50</b> cursors.', [1, 6]);
        new Game.Achievement('Of Mice and Men', 'Have <b>100</b> cursors.', [0, 1]);
        new Game.Achievement('The Digital', 'Have <b>200</b> cursors.', [0, 2]);

        order = 1100;
        new Game.Achievement('Just wrong', 'Sell a grandma.<q>I thought you loved me.</q>', [10, 9]);
        Game.TieredAchievement('Grandma\'s cookies', 'Have <b>1</b> grandma.', 'Grandma', 1);
        Game.TieredAchievement('Sloppy kisses', 'Have <b>50</b> grandmas.', 'Grandma', 2);
        Game.TieredAchievement('Retirement home', 'Have <b>100</b> grandmas.', 'Grandma', 3);

        order = 1200;
        Game.TieredAchievement('My first farm', 'Have <b>1</b> farm.', 'Farm', 1);
        Game.TieredAchievement('Reap what you sow', 'Have <b>50</b> farms.', 'Farm', 2);
        Game.TieredAchievement('Farm ill', 'Have <b>100</b> farms.', 'Farm', 3);

        order = 1400;
        Game.TieredAchievement('Production chain', 'Have <b>1</b> factory.', 'Factory', 1);
        Game.TieredAchievement('Industrial revolution', 'Have <b>50</b> factories.', 'Factory', 2);
        Game.TieredAchievement('Global warming', 'Have <b>100</b> factories.', 'Factory', 3);

        order = 1300;
        Game.TieredAchievement('You know the drill', 'Have <b>1</b> mine.', 'Mining Rig', 1);
        Game.TieredAchievement('Excavation site', 'Have <b>50</b> mines.', 'Mining Rig', 2);
        Game.TieredAchievement('Hollow the planet', 'Have <b>100</b> mines.', 'Mining Rig', 3);

        order = 1500;
        Game.TieredAchievement('Expedition', 'Have <b>1</b> shipment.', 'Shipment', 1);
        Game.TieredAchievement('Galactic highway', 'Have <b>50</b> shipments.', 'Shipment', 2);
        Game.TieredAchievement('Far far away', 'Have <b>100</b> shipments.', 'Shipment', 3);

        order = 1600;
        Game.TieredAchievement('Transmutation', 'Have <b>1</b> alchemy lab.', 'Alchemy lab', 1);
        Game.TieredAchievement('Transmogrification', 'Have <b>50</b> alchemy labs.', 'Alchemy lab', 2);
        Game.TieredAchievement('Gold member', 'Have <b>100</b> alchemy labs.', 'Alchemy lab', 3);

        order = 1700;
        Game.TieredAchievement('A whole new world', 'Have <b>1</b> portal.', 'Portal', 1);
        Game.TieredAchievement('Now you\'re thinking', 'Have <b>50</b> portals.', 'Portal', 2);
        Game.TieredAchievement('Dimensional shift', 'Have <b>100</b> portals.', 'Portal', 3);

        order = 1800;
        Game.TieredAchievement('Time warp', 'Have <b>1</b> time machine.', 'Time machine', 1);
        Game.TieredAchievement('Alternate timeline', 'Have <b>50</b> time machines.', 'Time machine', 2);
        Game.TieredAchievement('Rewriting history', 'Have <b>100</b> time machines.', 'Time machine', 3);


        order = 7000;
        new Game.Achievement('One with everything', 'Have <b>at least 1</b> of every building.', [2, 7]);
        new Game.Achievement('Mathematician', 'Have at least <b>1 of the most expensive object, 2 of the second-most expensive, 4 of the next</b> and so on (capped at 128).', [23, 12]);
        new Game.Achievement('Base 10', 'Have at least <b>10 of the most expensive object, 20 of the second-most expensive, 30 of the next</b> and so on.', [23, 12]);

        order = 10000;
        new Game.Achievement('Golden cookie', 'Click a <b>golden Neuro</b>.', [10, 14]);
        new Game.Achievement('Lucky cookie', 'Click <b>7 golden Neuros</b>.', [22, 6]);
        new Game.Achievement('A stroke of luck', 'Click <b>27 golden Neuros</b>.', [23, 6]);

        order = 30200;
        new Game.Achievement('Cheated cookies taste awful', 'Hack in some Neuros.', [10, 6]);
        Game.last.pool = 'shadow';
        order = 11010;
        new Game.Achievement('Uncanny clicker', 'Click really, really fast.<q>Well I\'ll be!</q>', [12, 0]);

        order = 5000;
        new Game.Achievement('Builder', 'Own <b>100</b> buildings.', [2, 6]);
        new Game.Achievement('Architect', 'Own <b>500</b> buildings.', [3, 6]);
        order = 6000;
        new Game.Achievement('Enhancer', 'Purchase <b>20</b> upgrades.', [9, 0]);
        new Game.Achievement('Augmenter', 'Purchase <b>50</b> upgrades.', [9, 1]);

        order = 11000;
        new Game.Achievement('Cookie-dunker', 'Dunk the Neuro.<q>You did it!</q>', [1, 8]);

        order = 10000;
        new Game.Achievement('Fortune', 'Click <b>77 golden Neuros</b>.<q>You should really go to bed.</q>', [24, 6]);
        order = 31000;
        new Game.Achievement('True Neverclick', 'Make <b>1 million</b> Neuros with <b>no</b> Neuro clicks.<q>This kinda defeats the whole purpose, doesn\'t it?</q>', [12, 0]);
        Game.last.pool = 'shadow';

        order = 20000;
        new Game.Achievement('Elder nap', 'Appease the grandmatriarchs at least <b>once</b>.<q>we<br>are<br>eternal</q>', [8, 9]);
        new Game.Achievement('Elder slumber', 'Appease the grandmatriarchs at least <b>5 times</b>.<q>our mind<br>outlives<br>the universe</q>', [8, 9]);

        order = 1150;
        new Game.Achievement('Elder', 'Own at least <b>7</b> grandma types.', [10, 9]);

        order = 20000;
        new Game.Achievement('Elder calm', 'Declare a covenant with the grandmatriarchs.<q>we<br>have<br>fed</q>', [8, 9]);

        order = 5000;
        new Game.Achievement('Engineer', 'Own <b>1000</b> buildings.', [4, 6]);

        order = 10000;
        new Game.Achievement('Leprechaun', 'Click <b>777 golden Neuros</b>.', [25, 6]);
        new Game.Achievement('Black cat\'s paw', 'Click <b>7777 golden Neuros</b>.', [26, 6]);

        order = 30050;
        new Game.Achievement('Nihilism', 'Ascend with <b>1 quadrillion</b> Neuros baked.<q>There are many things<br>that need to be erased</q>', [11, 7]);

        order = 1900;
        Game.TieredAchievement('Antibatter', 'Have <b>1</b> antimatter condenser.', 'Antimatter condenser', 1);
        Game.TieredAchievement('Quirky quarks', 'Have <b>50</b> antimatter condensers.', 'Antimatter condenser', 2);
        Game.TieredAchievement('It does matter!', 'Have <b>100</b> antimatter condensers.', 'Antimatter condenser', 3);

        order = 6000;
        new Game.Achievement('Upgrader', 'Purchase <b>100</b> upgrades.', [9, 2]);

        order = 7000;
        new Game.Achievement('Centennial', 'Have at least <b>100 of everything</b>.', [6, 6]);

        order = 30500;
        new Game.Achievement('Hardcore', 'Get to <b>1 billion</b> Neuros baked with <b>no upgrades purchased</b>.', [12, 6]);//Game.last.pool='shadow';

        order = 30600;
        new Game.Achievement('Speed baking I', 'Get to <b>1 million</b> Neuros baked in <b>35 minutes</b>.', [12, 5]);
        Game.last.pool = 'shadow';
        new Game.Achievement('Speed baking II', 'Get to <b>1 million</b> Neuros baked in <b>25 minutes</b>.', [13, 5]);
        Game.last.pool = 'shadow';
        new Game.Achievement('Speed baking III', 'Get to <b>1 million</b> Neuros baked in <b>15 minutes</b>.', [14, 5]);
        Game.last.pool = 'shadow';


        order = 61000;
        new Game.Achievement('Getting even with the oven', 'Defeat the <b>Sentient Furnace</b> in the factory dungeons.', [12, 7]);
        Game.last.pool = 'dungeon';
        new Game.Achievement('Now this is pod-smashing', 'Defeat the <b>Ascended Baking Pod</b> in the factory dungeons.', [12, 7]);
        Game.last.pool = 'dungeon';
        new Game.Achievement('Chirped out', 'Find and defeat <b>Chirpy</b>, the dysfunctionning alarm bot.', [13, 7]);
        Game.last.pool = 'dungeon';
        new Game.Achievement('Follow the white rabbit', 'Find and defeat the elusive <b>sugar bunny</b>.', [14, 7]);
        Game.last.pool = 'dungeon';

        order = 1000;
        new Game.Achievement('Clickasmic', 'Make <b>100,000,000,000</b> Neuros from clicking.', [11, 14]);

        order = 1100;
        Game.TieredAchievement('Friend of the ancients', 'Have <b>150</b> grandmas.', 'Grandma', 4);
        Game.TieredAchievement('Ruler of the ancients', 'Have <b>200</b> grandmas.', 'Grandma', 5);

        order = 32000;
        new Game.Achievement('Wholesome', 'Unlock <b>100%</b> of your heavenly chips power.', [15, 7]);

        order = 33000;
        new Game.Achievement('Just plain lucky', 'You have <b>1 chance in 500,000</b> every second of earning this achievement.', [15, 6]);
        Game.last.pool = 'shadow';

        order = 21000;
        new Game.Achievement('Itchscratcher', 'Burst <b>1 wrinkler</b>.', [19, 8]);
        new Game.Achievement('Wrinklesquisher', 'Burst <b>50 wrinklers</b>.', [19, 8]);
        new Game.Achievement('Moistburster', 'Burst <b>200 wrinklers</b>.', [19, 8]);

        order = 22000;
        new Game.Achievement('Spooky cookies', 'Unlock <b>every Halloween-themed Neuro</b>.<div class="line"></div>Owning this achievement makes Halloween-themed Neuros drop more frequently in future playthroughs.', [12, 8]);

        order = 22100;
        new Game.Achievement('Coming to town', 'Reach <b>Santa\'s 7th form</b>.', [18, 9]);
        new Game.Achievement('All hail Santa', 'Reach <b>Santa\'s final form</b>.', [19, 10]);
        new Game.Achievement('Let it snow', 'Unlock <b>every Christmas-themed Neuro</b>.<div class="line"></div>Owning this achievement makes Christmas-themed Neuros drop more frequently in future playthroughs.', [19, 9]);
        new Game.Achievement('Oh deer', 'Pop <b>1 reindeer</b>.', [12, 9]);
        new Game.Achievement('Sleigh of hand', 'Pop <b>50 reindeer</b>.', [12, 9]);
        new Game.Achievement('Reindeer sleigher', 'Pop <b>200 reindeer</b>.', [12, 9]);

        order = 1200;
        Game.TieredAchievement('Perfected agriculture', 'Have <b>150</b> farms.', 'Farm', 4);
        order = 1400;
        Game.TieredAchievement('Ultimate automation', 'Have <b>150</b> factories.', 'Factory', 4);
        order = 1300;
        Game.TieredAchievement('Can you dig it', 'Have <b>150</b> mines.', 'Mining Rig', 4);
        order = 1500;
        Game.TieredAchievement('Type II civilization', 'Have <b>150</b> shipments.', 'Shipment', 4);
        order = 1600;
        Game.TieredAchievement('Gild wars', 'Have <b>150</b> alchemy labs.', 'Alchemy lab', 4);
        order = 1700;
        Game.TieredAchievement('Brain-split', 'Have <b>150</b> portals.', 'Portal', 4);
        order = 1800;
        Game.TieredAchievement('Time duke', 'Have <b>150</b> time machines.', 'Time machine', 4);
        order = 1900;
        Game.TieredAchievement('Molecular maestro', 'Have <b>150</b> antimatter condensers.', 'Antimatter condenser', 4);

        order = 2000;
        Game.TieredAchievement('Lone photon', 'Have <b>1</b> prism.', 'Prism', 1);
        Game.TieredAchievement('Dazzling glimmer', 'Have <b>50</b> prisms.', 'Prism', 2);
        Game.TieredAchievement('Blinding flash', 'Have <b>100</b> prisms.', 'Prism', 3);
        Game.TieredAchievement('Unending glow', 'Have <b>150</b> prisms.', 'Prism', 4);

        order = 5000;
        new Game.Achievement('Lord of Constructs', 'Own <b>2000</b> buildings.<q>He saw the vast plains stretching ahead of him, and he said : let there be civilization.</q>', [5, 6]);
        order = 6000;
        new Game.Achievement('Lord of Progress', 'Purchase <b>200</b> upgrades.<q>One can always do better. But should you?</q>', [9, 14]);
        order = 7002;
        new Game.Achievement('Bicentennial', 'Have at least <b>200 of everything</b>.<q>You crazy person.</q>', [8, 6]);

        order = 22300;
        new Game.Achievement('Lovely cookies', 'Unlock <b>every Valentine-themed Neuro</b>.', [20, 3]);

        order = 7001;
        new Game.Achievement('Centennial and a half', 'Have at least <b>150 of everything</b>.', [7, 6]);

        order = 11000;
        new Game.Achievement('Tiny cookie', 'Click the tiny Neuro.<q>These aren\'t the Neuros<br>you\'re clicking for.</q>', [0, 5]);

        order = 400000;
        new Game.Achievement('You win a cookie', 'This is for baking 10 trillion Neuros and making it on the local news.<q>We\'re all so proud of you.</q>', [10, 0]);

        order = 1070;
        Game.ProductionAchievement('Click delegator', 'Cursor', 1, 0, 7);
        order = 1120;
        Game.ProductionAchievement('Gushing grannies', 'Grandma', 1, 0, 6);
        order = 1220;
        Game.ProductionAchievement('I hate manure', 'Farm', 1);
        order = 1320;
        Game.ProductionAchievement('Never dig down', 'Mining Rig', 1);
        order = 1420;
        Game.ProductionAchievement('The incredible machine', 'Factory', 1);
        order = 1520;
        Game.ProductionAchievement('And beyond', 'Shipment', 1);
        order = 1620;
        Game.ProductionAchievement('Magnum Opus', 'Alchemy lab', 1);
        order = 1720;
        Game.ProductionAchievement('With strange eons', 'Portal', 1);
        order = 1820;
        Game.ProductionAchievement('Spacetime jigamaroo', 'Time machine', 1);
        order = 1920;
        Game.ProductionAchievement('Supermassive', 'Antimatter condenser', 1);
        order = 2020;
        Game.ProductionAchievement('Praise the sun', 'Prism', 1);


        order = 1000;
        new Game.Achievement('Clickageddon', 'Make <b>10,000,000,000,000</b> Neuros from clicking.', [11, 15]);
        new Game.Achievement('Clicknarok', 'Make <b>1,000,000,000,000,000</b> Neuros from clicking.', [11, 16]);

        order = 1050;
        new Game.Achievement('Extreme polydactyly', 'Have <b>300</b> cursors.', [0, 13]);
        new Game.Achievement('Dr. T', 'Have <b>400</b> cursors.', [0, 14]);

        order = 1100;
        Game.TieredAchievement('The old never bothered me anyway', 'Have <b>250</b> grandmas.', 'Grandma', 6);
        order = 1200;
        Game.TieredAchievement('Homegrown', 'Have <b>200</b> farms.', 'Farm', 5);
        order = 1400;
        Game.TieredAchievement('Technocracy', 'Have <b>200</b> factories.', 'Factory', 5);
        order = 1300;
        Game.TieredAchievement('The center of the Earth', 'Have <b>200</b> mines.', 'Mining Rig', 5);
        order = 1500;
        Game.TieredAchievement('We come in peace', 'Have <b>200</b> shipments.', 'Shipment', 5);
        order = 1600;
        Game.TieredAchievement('The secrets of the universe', 'Have <b>200</b> alchemy labs.', 'Alchemy lab', 5);
        order = 1700;
        Game.TieredAchievement('Realm of the Mad God', 'Have <b>200</b> portals.', 'Portal', 5);
        order = 1800;
        Game.TieredAchievement('Forever and ever', 'Have <b>200</b> time machines.', 'Time machine', 5);
        order = 1900;
        Game.TieredAchievement('Walk the planck', 'Have <b>200</b> antimatter condensers.', 'Antimatter condenser', 5);
        order = 2000;
        Game.TieredAchievement('Rise and shine', 'Have <b>200</b> prisms.', 'Prism', 5);

        order = 30200;
        new Game.Achievement('God complex', 'Name yourself <b>Orteil</b>.<div class="warning">Note : usurpers incur a -1% CpS penalty until they rename themselves something else.</div><q>But that\'s not you, is it?</q>', [17, 5]);
        Game.last.pool = 'shadow';
        new Game.Achievement('Third-party', 'Use an <b>add-on</b>.<q>Some find vanilla to be the most boring flavor.</q>', [16, 5]);
        Game.last.pool = 'shadow';//if you're making a mod, add a Game.Win('Third-party') somewhere in there!

        order = 30050;
        new Game.Achievement('Dematerialize', 'Ascend with <b>1 quintillion</b> Neuros baked.<q>Presto!<br>...where\'d the Neuros go?</q>', [11, 7]);
        new Game.Achievement('Nil zero zilch', 'Ascend with <b>1 sextillion</b> Neuros baked.<q>To summarize : really not very much at all.</q>', [11, 7]);
        new Game.Achievement('Transcendence', 'Ascend with <b>1 septillion</b> Neuros baked.<q>Your Neuros are now on a higher plane of being.</q>', [11, 8]);
        new Game.Achievement('Obliterate', 'Ascend with <b>1 octillion</b> Neuros baked.<q>Resistance is futile, albeit entertaining.</q>', [11, 8]);
        new Game.Achievement('Negative void', 'Ascend with <b>1 nonillion</b> Neuros baked.<q>You now have so few Neuros that it\'s almost like you have a negative amount of them.</q>', [11, 8]);

        order = 22400;
        new Game.Achievement('The hunt is on', 'Unlock <b>1 egg</b>.', [1, 12]);
        new Game.Achievement('Egging on', 'Unlock <b>7 eggs</b>.', [4, 12]);
        new Game.Achievement('Mass Easteria', 'Unlock <b>14 eggs</b>.', [7, 12]);
        new Game.Achievement('Hide & seek champion', 'Unlock <b>all the eggs</b>.<div class="line"></div>Owning this achievement makes eggs drop more frequently in future playthroughs.', [13, 12]);

        order = 11000;
        new Game.Achievement('What\'s in a name', 'Give your bakery a name.', [15, 9]);


        order = 1425;
        Game.TieredAchievement('Pretty penny', 'Have <b>1</b> gym.', 'Gym', 1);
        Game.TieredAchievement('Fit the bill', 'Have <b>50</b> gyms.', 'Gym', 2);
        Game.TieredAchievement('A loan in the dark', 'Have <b>100</b> gyms.', 'Gym', 3);
        Game.TieredAchievement('Need for greed', 'Have <b>150</b> gyms.', 'Gym', 4);
        Game.TieredAchievement('It\'s the economy, stupid', 'Have <b>200</b> gyms.', 'Gym', 5);
        order = 1450;
        Game.TieredAchievement('Your time to shrine', 'Have <b>1</b> temple.', 'Temple', 1);
        Game.TieredAchievement('Shady sect', 'Have <b>50</b> temples.', 'Temple', 2);
        Game.TieredAchievement('New-age cult', 'Have <b>100</b> temples.', 'Temple', 3);
        Game.TieredAchievement('Organized religion', 'Have <b>150</b> temples.', 'Temple', 4);
        Game.TieredAchievement('Fanaticism', 'Have <b>200</b> temples.', 'Temple', 5);
        order = 1475;
        Game.TieredAchievement('Bewitched', 'Have <b>1</b> wizard tower.', 'Wizard tower', 1);
        Game.TieredAchievement('The sorcerer\'s apprentice', 'Have <b>50</b> wizard towers.', 'Wizard tower', 2);
        Game.TieredAchievement('Charms and enchantments', 'Have <b>100</b> wizard towers.', 'Wizard tower', 3);
        Game.TieredAchievement('Curses and maledictions', 'Have <b>150</b> wizard towers.', 'Wizard tower', 4);
        Game.TieredAchievement('Magic kingdom', 'Have <b>200</b> wizard towers.', 'Wizard tower', 5);

        order = 1445;
        Game.ProductionAchievement('Vested interest', 'Gym', 1);
        order = 1470;
        Game.ProductionAchievement('New world order', 'Temple', 1);
        order = 1495;
        Game.ProductionAchievement('Hocus pocus', 'Wizard tower', 1);


        order = 1070;
        Game.ProductionAchievement('Finger clickin\' good', 'Cursor', 2, 0, 7);
        order = 1120;
        Game.ProductionAchievement('Panic at the bingo', 'Grandma', 2, 0, 6);
        order = 1220;
        Game.ProductionAchievement('Rake in the dough', 'Farm', 2);
        order = 1320;
        Game.ProductionAchievement('Quarry on', 'Mining Rig', 2);
        order = 1420;
        Game.ProductionAchievement('Yes I love technology', 'Factory', 2);
        order = 1445;
        Game.ProductionAchievement('Paid in full', 'Gym', 2);
        order = 1470;
        Game.ProductionAchievement('Church of Cookiology', 'Temple', 2);
        order = 1495;
        Game.ProductionAchievement('Too many rabbits, not enough hats', 'Wizard tower', 2);
        order = 1520;
        Game.ProductionAchievement('The most precious cargo', 'Shipment', 2);
        order = 1620;
        Game.ProductionAchievement('The Aureate', 'Alchemy lab', 2);
        order = 1720;
        Game.ProductionAchievement('Ever more hideous', 'Portal', 2);
        order = 1820;
        Game.ProductionAchievement('Be kind, rewind', 'Time machine', 2);
        order = 1920;
        Game.ProductionAchievement('Infinitesimal', 'Antimatter condenser', 2);
        order = 2020;
        Game.ProductionAchievement('A still more glorious dawn', 'Prism', 2);

        order = 30000;
        new Game.Achievement('Rebirth', 'Ascend at least once.', [21, 6]);

        order = 11000;
        new Game.Achievement('Here you go', 'Click this achievement\'s slot.<q>All you had to do was ask.</q>', [1, 7]);
        Game.last.clickFunction = () => {
            if (!Game.HasAchiev('Here you go')) {
                PlaySound('snd/tick.mp3');
                Game.Win('Here you go');
            }
        };

        order = 30000;
        new Game.Achievement('Resurrection', 'Ascend <b>10 times</b>.', [21, 6]);
        new Game.Achievement('Reincarnation', 'Ascend <b>100 times</b>.', [21, 6]);
        new Game.Achievement('Endless cycle', 'Ascend <b>1000 times</b>.<q>Oh hey, it\'s you again.</q>', [2, 7]);
        Game.last.pool = 'shadow';


        order = 1100;
        Game.TieredAchievement('The agemaster', 'Have <b>300</b> grandmas.', 'Grandma', 7);
        Game.TieredAchievement('To oldly go', 'Have <b>350</b> grandmas.', 'Grandma', 8);

        order = 1200;
        Game.TieredAchievement('Gardener extraordinaire', 'Have <b>250</b> farms.', 'Farm', 6);
        order = 1300;
        Game.TieredAchievement('Tectonic ambassador', 'Have <b>250</b> mines.', 'Mining Rig', 6);
        order = 1400;
        Game.TieredAchievement('Rise of the machines', 'Have <b>250</b> factories.', 'Factory', 6);
        order = 1425;
        Game.TieredAchievement('Acquire currency', 'Have <b>250</b> gyms.', 'Gym', 6);
        order = 1450;
        Game.TieredAchievement('Zealotry', 'Have <b>250</b> temples.', 'Temple', 6);
        order = 1475;
        Game.TieredAchievement('The wizarding world', 'Have <b>250</b> wizard towers.', 'Wizard tower', 6);
        order = 1500;
        Game.TieredAchievement('Parsec-masher', 'Have <b>250</b> shipments.', 'Shipment', 6);
        order = 1600;
        Game.TieredAchievement('The work of a lifetime', 'Have <b>250</b> alchemy labs.', 'Alchemy lab', 6);
        order = 1700;
        Game.TieredAchievement('A place lost in time', 'Have <b>250</b> portals.', 'Portal', 6);
        order = 1800;
        Game.TieredAchievement('Heat death', 'Have <b>250</b> time machines.', 'Time machine', 6);
        order = 1900;
        Game.TieredAchievement('Microcosm', 'Have <b>250</b> antimatter condensers.', 'Antimatter condenser', 6);
        order = 2000;
        Game.TieredAchievement('Bright future', 'Have <b>250</b> prisms.', 'Prism', 6);

        order = 25000;
        new Game.Achievement('Here be dragon', 'Complete your <b>dragon\'s training</b>.', [21, 12]);

        Game.GymAchievement('How?');
        Game.GymAchievement('The land of milk and cookies');
        Game.GymAchievement('He who controls the cookies controls the universe');
        Game.last.baseDesc += '<q>The milk must flow!</q>';
        Game.last.desc = BeautifyInText(Game.last.baseDesc);
        Game.GymAchievement('Tonight on Hoarders');
        Game.GymAchievement('Are you gonna eat all that?');
        Game.GymAchievement('We\'re gonna need a bigger bakery');
        Game.GymAchievement('In the mouth of madness');
        Game.last.baseDesc += '<q>A Neuro is just what we tell each other it is.</q>';
        Game.last.desc = BeautifyInText(Game.last.baseDesc);
        Game.GymAchievement('Brought to you by the letter <div style="display:inline-block;background:url(/img/money.png);width:16px;height:16px;"></div>');


        Game.CpsAchievement('A world filled with cookies');
        Game.CpsAchievement('When this baby hits ' + Beautify(10000000000000 * 60 * 60) + ' cookies per hour');
        Game.CpsAchievement('Fast and delicious');
        Game.CpsAchievement('Cookiehertz : a really, really tasty hertz');
        Game.last.baseDesc += '<q>Tastier than a hertz donut, anyway.</q>';
        Game.last.desc = BeautifyInText(Game.last.baseDesc);
        Game.CpsAchievement('Woops, you solved world hunger');
        Game.CpsAchievement('Turbopuns');
        Game.last.baseDesc += '<q>Mother Nature will be like "slowwwww dowwwwwn".</q>';
        Game.last.desc = BeautifyInText(Game.last.baseDesc);
        Game.CpsAchievement('Faster menner');
        Game.CpsAchievement('And yet you\'re still hungry');
        Game.CpsAchievement('The Abakening');
        Game.CpsAchievement('I have a secret recipe for chicken nuggets that I\'m not supposed to tell anybody because it\'s my secret recipe but I\'ll tell you anyway it\'s not that hard you just need some chicken nuggets and a frying pan first you take one nugget and then you catch it in the palm of your hand and then when you open your hand the nugget is gone so what you do then is you put another nugget in the frying pan and then you close your eyes and you imagine that the first nugget is in your hand and you open your hand and the nugget is gone so the frying pan is now empty of nuggets so then you open your hand again and a new nugget appears and you close your hand again and the nugget is gone so you open your hand again and again and a new nugget appears and you close your hand again and again and the nuggets keep appearing and you just keep opening and closing your hands and the frying pan keeps getting emptier and emptier and eventually the nuggets are gone');//Game.last.shortName='There\'s really no hard limit to how long these achievement names can be and to be quite honest I\'m [...]';
        Game.CpsAchievement('Fast');
        Game.last.baseDesc += '<q>Wow!</q>';
        Game.last.desc = BeautifyInText(Game.last.baseDesc);

        order = 7002;
        new Game.Achievement('Bicentennial and a half', 'Have at least <b>250 of everything</b>.<q>Keep on truckin\'.</q>', [9, 6]);

        order = 11000;
        new Game.Achievement('Tabloid addiction', 'Click on the news ticker <b>50 times</b>.<q>Page 6 : Mad individual clicks on picture of pastry in a futile attempt to escape boredom!<br>Also page 6 : British parliament ate my baby!</q>', [27, 7]);

        order = 1000;
        new Game.Achievement('Clickastrophe', 'Make <b>100,000,000,000,000,000</b> Neuros from clicking.', [11, 17]);
        new Game.Achievement('Clickataclysm', 'Make <b>10,000,000,000,000,000,000</b> Neuros from clicking.', [11, 18]);

        order = 1050;
        new Game.Achievement('Thumbs, phalanges, metacarpals', 'Have <b>500</b> cursors.<q>& KNUCKLES</q>', [0, 15]);

        order = 6000;
        new Game.Achievement('Polymath', 'Own <b>300</b> upgrades and <b>3000</b> buildings.<q>Excellence doesn\'t happen overnight - it usually takes a good couple days.</q>', [29, 7]);

        order = 6005;
        new Game.Achievement('The elder scrolls', 'Own a combined <b>777</b> grandmas and cursors.<q>Let me guess. Someone stole your Neuro.</q>', [10, 9]);

        order = 30050;
        new Game.Achievement('To crumbs, you say?', 'Ascend with <b>1 decillion</b> Neuros baked.<q>Very well then.</q>', [29, 6]);

        order = 1200;
        Game.TieredAchievement('Seedy business', 'Have <b>300</b> farms.', 'Farm', 7);
        order = 1300;
        Game.TieredAchievement('Freak fracking', 'Have <b>300</b> mines.', 'Mining Rig', 7);
        order = 1400;
        Game.TieredAchievement('Modern times', 'Have <b>300</b> factories.', 'Factory', 7);
        order = 1425;
        Game.TieredAchievement('The nerve of war', 'Have <b>300</b> gyms.', 'Gym', 7);
        order = 1450;
        Game.TieredAchievement('Wololo', 'Have <b>300</b> temples.', 'Temple', 7);
        order = 1475;
        Game.TieredAchievement('And now for my next trick, I\'ll need a volunteer from the audience', 'Have <b>300</b> wizard towers.', 'Wizard tower', 7);
        order = 1500;
        Game.TieredAchievement('It\'s not delivery', 'Have <b>300</b> shipments.', 'Shipment', 7);
        order = 1600;
        Game.TieredAchievement('Gold, Jerry! Gold!', 'Have <b>300</b> alchemy labs.', 'Alchemy lab', 7);
        order = 1700;
        Game.TieredAchievement('Forbidden zone', 'Have <b>300</b> portals.', 'Portal', 7);
        order = 1800;
        Game.TieredAchievement('cookie clicker forever and forever a hundred years cookie clicker, all day long forever, forever a hundred times, over and over cookie clicker adventures dot com', 'Have <b>300</b> time machines.', 'Time machine', 7);
        order = 1900;
        Game.TieredAchievement('Scientists baffled everywhere', 'Have <b>300</b> antimatter condensers.', 'Antimatter condenser', 7);
        order = 2000;
        Game.TieredAchievement('Harmony of the spheres', 'Have <b>300</b> prisms.', 'Prism', 7);

        order = 35000;
        new Game.Achievement('Last Chance to See', 'Burst the near-extinct <b>shiny wrinkler</b>.<q>You monster!</q>', [24, 12]);
        Game.last.pool = 'shadow';

        order = 10000;
        new Game.Achievement('Early bird', 'Click a golden Neuro <b>less than 1 second after it spawns</b>.', [10, 14]);
        new Game.Achievement('Fading luck', 'Click a golden Neuro <b>less than 1 second before it dies</b>.', [10, 14]);

        order = 22100;
        new Game.Achievement('Eldeer', 'Pop a reindeer <b>during an elder frenzy</b>.', [12, 9]);

        order = 21100;
        new Game.Achievement('Dude, sweet', 'Harvest <b>7 coalescing sugar lumps</b>.', [24, 14]);
        new Game.Achievement('Sugar rush', 'Harvest <b>30 coalescing sugar lumps</b>.', [26, 14]);
        new Game.Achievement('Year\'s worth of cavities', 'Harvest <b>365 coalescing sugar lumps</b>.<q>My lumps my lumps my lumps.</q>', [29, 14]);
        new Game.Achievement('Hand-picked', 'Successfully harvest a coalescing sugar lump before it\'s ripe.', [28, 14]);
        new Game.Achievement('Sugar sugar', 'Harvest a <b>bifurcated sugar lump</b>.', [29, 15]);
        new Game.Achievement('All-natural cane sugar', 'Harvest a <b>golden sugar lump</b>.', [29, 16]);
        Game.last.pool = 'shadow';
        new Game.Achievement('Sweetmeats', 'Harvest a <b>meaty sugar lump</b>.', [29, 17]);

        order = 7002;
        new Game.Achievement('Tricentennial', 'Have at least <b>300 of everything</b>.<q>Can\'t stop, won\'t stop. Probably should stop, though.</q>', [29, 12]);

        Game.CpsAchievement('Knead for speed');
        Game.last.baseDesc += '<q>How did we not make that one yet?</q>';
        Game.last.desc = BeautifyInText(Game.last.baseDesc);
        Game.CpsAchievement('Well the cookies start coming and they don\'t stop coming');
        Game.last.baseDesc += '<q>Didn\'t make sense not to click for fun.</q>';
        Game.last.desc = BeautifyInText(Game.last.baseDesc);
        Game.CpsAchievement('I don\'t know if you\'ve noticed but we made all these icons centered again');
        Game.CpsAchievement('The proof of the cookie is in the baking');
        Game.last.baseDesc += '<q>How can you have any Neuros if you don\'t bake your dough?</q>';
        Game.last.desc = BeautifyInText(Game.last.baseDesc);
        Game.CpsAchievement('If it\'s worth doing, it\'s worth overdoing');

        Game.GymAchievement('The dreams in which I\'m baking are the best I\'ve ever had');
        Game.GymAchievement('Set for life');

        order = 1200;
        Game.TieredAchievement('You and the beanstalk', 'Have <b>350</b> farms.', 'Farm', 8);
        order = 1300;
        Game.TieredAchievement('Romancing the stone', 'Have <b>350</b> mines.', 'Mining Rig', 8);
        order = 1400;
        Game.TieredAchievement('Ex machina', 'Have <b>350</b> factories.', 'Factory', 8);
        order = 1425;
        Game.TieredAchievement('And I need it now', 'Have <b>350</b> gyms.', 'Gym', 8);
        order = 1450;
        Game.TieredAchievement('Pray on the weak', 'Have <b>350</b> temples.', 'Temple', 8);
        order = 1475;
        Game.TieredAchievement('It\'s a kind of magic', 'Have <b>350</b> wizard towers.', 'Wizard tower', 8);
        order = 1500;
        Game.TieredAchievement('Make it so', 'Have <b>350</b> shipments.', 'Shipment', 8);
        order = 1600;
        Game.TieredAchievement('All that glitters is gold', 'Have <b>350</b> alchemy labs.', 'Alchemy lab', 8);
        order = 1700;
        Game.TieredAchievement('H̸̷͓̳̳̯̟͕̟͍͍̣͡ḛ̢̦̰̺̮̝͖͖̘̪͉͘͡ ̠̦͕̤̪̝̥̰̠̫̖̣͙̬͘ͅC̨̦̺̩̲̥͉̭͚̜̻̝̣̼͙̮̯̪o̴̡͇̘͎̞̲͇̦̲͞͡m̸̩̺̝̣̹̱͚̬̥̫̳̼̞̘̯͘ͅẹ͇̺̜́̕͢s̶̙̟̱̥̮̯̰̦͓͇͖͖̝͘͘͞', 'Have <b>350</b> portals.', 'Portal', 8);
        order = 1800;
        Game.TieredAchievement('Way back then', 'Have <b>350</b> time machines.', 'Time machine', 8);
        order = 1900;
        Game.TieredAchievement('Exotic matter', 'Have <b>350</b> antimatter condensers.', 'Antimatter condenser', 8);
        order = 2000;
        Game.TieredAchievement('At the end of the tunnel', 'Have <b>350</b> prisms.', 'Prism', 8);


        order = 1070;
        Game.ProductionAchievement('Click (starring Adam Sandler)', 'Cursor', 3, 0, 7);
        order = 1120;
        Game.ProductionAchievement('Frantiquities', 'Grandma', 3, 0, 6);
        order = 1220;
        Game.ProductionAchievement('Overgrowth', 'Farm', 3);
        order = 1320;
        Game.ProductionAchievement('Sedimentalism', 'Mining Rig', 3);
        order = 1420;
        Game.ProductionAchievement('Labor of love', 'Factory', 3);
        order = 1445;
        Game.ProductionAchievement('Reverse funnel system', 'Gym', 3);
        order = 1470;
        Game.ProductionAchievement('Thus spoke you', 'Temple', 3);
        order = 1495;
        Game.ProductionAchievement('Manafest destiny', 'Wizard tower', 3);
        order = 1520;
        Game.ProductionAchievement('Neither snow nor rain nor heat nor gloom of night', 'Shipment', 3);
        order = 1620;
        Game.ProductionAchievement('I\'ve got the Midas touch', 'Alchemy lab', 3);
        order = 1720;
        Game.ProductionAchievement('Which eternal lie', 'Portal', 3);
        order = 1820;
        Game.ProductionAchievement('D&eacute;j&agrave; vu', 'Time machine', 3);
        order = 1920;
        Game.ProductionAchievement('Powers of Ten', 'Antimatter condenser', 3);
        order = 2020;
        Game.ProductionAchievement('Now the dark days are gone', 'Prism', 3);

        order = 1070;
        new Game.Achievement('Freaky jazz hands', 'Reach level <b>10</b> cursors.', [0, 26]);
        Game.Objects['Cursor'].levelAchiev10 = Game.last;
        order = 1120;
        new Game.Achievement('Methuselah', 'Reach level <b>10</b> grandmas.', [1, 26]);
        Game.Objects['Grandma'].levelAchiev10 = Game.last;
        order = 1220;
        new Game.Achievement('Huge tracts of land', 'Reach level <b>10</b> farms.', [2, 26]);
        Game.Objects['Farm'].levelAchiev10 = Game.last;
        order = 1320;
        new Game.Achievement('D-d-d-d-deeper', 'Reach level <b>10</b> mines.', [3, 26]);
        Game.Objects['Mining Rig'].levelAchiev10 = Game.last;
        order = 1420;
        new Game.Achievement('Patently genius', 'Reach level <b>10</b> factories.', [4, 26]);
        Game.Objects['Factory'].levelAchiev10 = Game.last;
        order = 1445;
        new Game.Achievement('A capital idea', 'Reach level <b>10</b> gyms.', [15, 26]);
        Game.Objects['Gym'].levelAchiev10 = Game.last;
        order = 1470;
        new Game.Achievement('It belongs in a bakery', 'Reach level <b>10</b> temples.', [16, 26]);
        Game.Objects['Temple'].levelAchiev10 = Game.last;
        order = 1495;
        new Game.Achievement('Motormouth', 'Reach level <b>10</b> wizard towers.', [17, 26]);
        Game.Objects['Wizard tower'].levelAchiev10 = Game.last;
        order = 1520;
        new Game.Achievement('Been there done that', 'Reach level <b>10</b> shipments.', [5, 26]);
        Game.Objects['Shipment'].levelAchiev10 = Game.last;
        order = 1620;
        new Game.Achievement('Phlogisticated substances', 'Reach level <b>10</b> alchemy labs.', [6, 26]);
        Game.Objects['Alchemy lab'].levelAchiev10 = Game.last;
        order = 1720;
        new Game.Achievement('Bizarro world', 'Reach level <b>10</b> portals.', [7, 26]);
        Game.Objects['Portal'].levelAchiev10 = Game.last;
        order = 1820;
        new Game.Achievement('The long now', 'Reach level <b>10</b> time machines.', [8, 26]);
        Game.Objects['Time machine'].levelAchiev10 = Game.last;
        order = 1920;
        new Game.Achievement('Chubby hadrons', 'Reach level <b>10</b> antimatter condensers.', [13, 26]);
        Game.Objects['Antimatter condenser'].levelAchiev10 = Game.last;
        order = 2020;
        new Game.Achievement('Palettable', 'Reach level <b>10</b> prisms.', [14, 26]);
        Game.Objects['Prism'].levelAchiev10 = Game.last;

        order = 61470;
        order = 61495;
        new Game.Achievement('Bibbidi-bobbidi-boo', 'Cast <b>9</b> spells.', [21, 11]);
        new Game.Achievement('I\'m the wiz', 'Cast <b>99</b> spells.', [22, 11]);
        new Game.Achievement('A wizard is you', 'Cast <b>999</b> spells.<q>I\'m a what?</q>', [29, 11]);

        order = 10000;
        new Game.Achievement('Four-leaf cookie', 'Have <b>4</b> golden Neuros simultaneously.<q>Fairly rare, considering Neuros don\'t even have leaves.</q>', [27, 6]);
        Game.last.pool = 'shadow';

        order = 2100;
        Game.TieredAchievement('Lucked out', 'Have <b>1</b> wheel of fortune.', 'Wheel of fortune', 1);
        Game.TieredAchievement('What are the odds', 'Have <b>50</b> wheels of fortune.', 'Wheel of fortune', 2);
        Game.TieredAchievement('Grandma needs a new pair of shoes', 'Have <b>100</b> wheels of fortune.', 'Wheel of fortune', 3);
        Game.TieredAchievement('Million to one shot, doc', 'Have <b>150</b> wheels of fortune.', 'Wheel of fortune', 4);
        Game.TieredAchievement('As luck would have it', 'Have <b>200</b> wheels of fortune.', 'Wheel of fortune', 5);
        Game.TieredAchievement('Ever in your favor', 'Have <b>250</b> wheels of fortune.', 'Wheel of fortune', 6);
        Game.TieredAchievement('Be a lady', 'Have <b>300</b> wheels of fortune.', 'Wheel of fortune', 7);
        Game.TieredAchievement('Dicey business', 'Have <b>350</b> wheels of fortune.', 'Wheel of fortune', 8);

        order = 2120;
        Game.ProductionAchievement('Fingers crossed', 'Wheel of fortune', 1);
        Game.ProductionAchievement('Just a statistic', 'Wheel of fortune', 2);
        Game.ProductionAchievement('Murphy\'s wild guess', 'Wheel of fortune', 3);

        new Game.Achievement('Let\'s leaf it at that', 'Reach level <b>10</b> wheels of fortune.', [19, 26]);
        Game.Objects['Wheel of fortune'].levelAchiev10 = Game.last;

        order = 1000;
        new Game.Achievement('The ultimate clickdown', 'Make <b>1,000,000,000,000,000,000,000</b> Neuros from clicking.<q>(of ultimate destiny.)</q>', [11, 19]);


        order = 1100;
        Game.TieredAchievement('Aged well', 'Have <b>400</b> grandmas.', 'Grandma', 9);
        Game.TieredAchievement('101st birthday', 'Have <b>450</b> grandmas.', 'Grandma', 10);
        Game.TieredAchievement('Defense of the ancients', 'Have <b>500</b> grandmas.', 'Grandma', 11);
        order = 1200;
        Game.TieredAchievement('Harvest moon', 'Have <b>400</b> farms.', 'Farm', 9);
        order = 1300;
        Game.TieredAchievement('Mining Rig?', 'Have <b>400</b> mines.', 'Mining Rig', 9);
        order = 1400;
        Game.TieredAchievement('In full gear', 'Have <b>400</b> factories.', 'Factory', 9);
        order = 1425;
        Game.TieredAchievement('Treacle tart economics', 'Have <b>400</b> gyms.', 'Gym', 9);
        order = 1450;
        Game.TieredAchievement('Holy cookies, grandma!', 'Have <b>400</b> temples.', 'Temple', 9);
        order = 1475;
        Game.TieredAchievement('The Prestige', 'Have <b>400</b> wizard towers.<q>(Unrelated to the Neuro Clicker feature of the same name.)</q>', 'Wizard tower', 9);
        order = 1500;
        Game.TieredAchievement('That\'s just peanuts to space', 'Have <b>400</b> shipments.', 'Shipment', 9);
        order = 1600;
        Game.TieredAchievement('Worth its weight in lead', 'Have <b>400</b> alchemy labs.', 'Alchemy lab', 9);
        order = 1700;
        Game.TieredAchievement('What happens in the vortex stays in the vortex', 'Have <b>400</b> portals.', 'Portal', 9);
        order = 1800;
        Game.TieredAchievement('Invited to yesterday\'s party', 'Have <b>400</b> time machines.', 'Time machine', 9);
        order = 1900;
        Game.TieredAchievement('Downsizing', 'Have <b>400</b> antimatter condensers.', 'Antimatter condenser', 9);//the trailer got me really hyped up but i've read some pretty bad reviews. is it watchable ? is it worth seeing ? i don't mind matt damon
        order = 2000;
        Game.TieredAchievement('My eyes', 'Have <b>400</b> prisms.', 'Prism', 9);
        order = 2100;
        Game.TieredAchievement('Maybe a chance in hell, actually', 'Have <b>400</b> wheels of fortune.', 'Wheel of fortune', 9);

        order = 1200;
        Game.TieredAchievement('Make like a tree', 'Have <b>450</b> farms.', 'Farm', 10);
        order = 1300;
        Game.TieredAchievement('Cave story', 'Have <b>450</b> mines.', 'Mining Rig', 10);
        order = 1400;
        Game.TieredAchievement('In-cog-neato', 'Have <b>450</b> factories.', 'Factory', 10);
        order = 1425;
        Game.TieredAchievement('Save your breath because that\'s all you\'ve got left', 'Have <b>450</b> gyms.', 'Gym', 10);
        order = 1450;
        Game.TieredAchievement('Vengeful and almighty', 'Have <b>450</b> temples.', 'Temple', 10);
        order = 1475;
        Game.TieredAchievement('Spell it out for you', 'Have <b>450</b> wizard towers.', 'Wizard tower', 10);
        order = 1500;
        Game.TieredAchievement('Space space space space space', 'Have <b>450</b> shipments.<q>It\'s too far away...</q>', 'Shipment', 10);
        order = 1600;
        Game.TieredAchievement('Don\'t get used to yourself, you\'re gonna have to change', 'Have <b>450</b> alchemy labs.', 'Alchemy lab', 10);
        order = 1700;
        Game.TieredAchievement('Objects in the mirror dimension are closer than they appear', 'Have <b>450</b> portals.', 'Portal', 10);
        order = 1800;
        Game.TieredAchievement('Groundhog day', 'Have <b>450</b> time machines.', 'Time machine', 10);
        order = 1900;
        Game.TieredAchievement('A matter of perspective', 'Have <b>450</b> antimatter condensers.', 'Antimatter condenser', 10);
        order = 2000;
        Game.TieredAchievement('Optical illusion', 'Have <b>450</b> prisms.', 'Prism', 10);
        order = 2100;
        Game.TieredAchievement('Jackpot', 'Have <b>450</b> wheels of fortune.', 'Wheel of fortune', 10);

        order = 36000;
        new Game.Achievement('So much to do so much to see', 'Manage a Neuro legacy for <b>at least a year</b>.<q>Thank you so much for playing Neuro Clicker!</q>', [23, 11]);
        Game.last.pool = 'shadow';


        Game.CpsAchievement('Running with scissors');
        Game.CpsAchievement('Rarefied air');
        Game.CpsAchievement('Push it to the limit');
        Game.CpsAchievement('Green cookies sleep furiously');

        Game.GymAchievement('Panic! at Nabisco');
        Game.GymAchievement('Bursting at the seams');
        Game.GymAchievement('Just about full');
        Game.GymAchievement('Hungry for more');

        order = 1000;
        new Game.Achievement('All the other kids with the pumped up clicks', 'Make <b>100,000,000,000,000,000,000,000</b> Neuros from clicking.', [11, 28]);
        new Game.Achievement('One...more...click...', 'Make <b>10,000,000,000,000,000,000,000,000</b> Neuros from clicking.', [11, 30]);

        order = 61515;
        new Game.Achievement('Botany enthusiast', 'Harvest <b>100</b> mature garden plants.', [26, 20]);
        new Game.Achievement('Green, aching thumb', 'Harvest <b>1000</b> mature garden plants.', [27, 20]);
        new Game.Achievement('In the garden of Eden (baby)', 'Fill every tile of the biggest garden plot with plants.<q>Isn\'t tending to those precious little plants just so rock and/or roll?</q>', [28, 20]);

        new Game.Achievement('Keeper of the conservatory', 'Unlock every garden seed.', [25, 20]);
        new Game.Achievement('Seedless to nay', 'Convert a complete seed log into sugar lumps by sacrificing your garden to the sugar hornets.<div class="line"></div>Owning this achievement makes seeds <b>5% cheaper</b>, plants mature <b>5% sooner</b>, and plant upgrades drop <b>5% more</b>.', [29, 20]);

        order = 30050;
        new Game.Achievement('You get nothing', 'Ascend with <b>1 undecillion</b> Neuros baked.<q>Good day sir!</q>', [29, 6]);
        new Game.Achievement('Humble rebeginnings', 'Ascend with <b>1 duodecillion</b> Neuros baked.<q>Started from the bottom, now we\'re here.</q>', [29, 6]);
        new Game.Achievement('The end of the world', 'Ascend with <b>1 tredecillion</b> Neuros baked.<q>(as we know it)</q>', [21, 25]);
        new Game.Achievement('Oh, you\'re back', 'Ascend with <b>1 quattuordecillion</b> Neuros baked.<q>Missed us?</q>', [21, 25]);
        new Game.Achievement('Lazarus', 'Ascend with <b>1 quindecillion</b> Neuros baked.<q>Try, try again.</q>', [21, 25]);


        Game.CpsAchievement('Leisurely pace');
        Game.CpsAchievement('Hypersonic');

        Game.GymAchievement('Feed me, Orteil');
        Game.GymAchievement('And then what?');

        order = 7002;
        new Game.Achievement('Tricentennial and a half', 'Have at least <b>350 of everything</b>.<q>(it\'s free real estate)</q>', [21, 26]);
        new Game.Achievement('Quadricentennial', 'Have at least <b>400 of everything</b>.<q>You\'ve had to do horrible things to get this far.<br>Horrible... horrible things.</q>', [22, 26]);
        new Game.Achievement('Quadricentennial and a half', 'Have at least <b>450 of everything</b>.<q>At this point, you might just be compensating for something.</q>', [23, 26]);

        new Game.Achievement('Quincentennial', 'Have at least <b>500 of everything</b>.<q>Some people would say you\'re halfway there.<br>We do not care for those people and their reckless sense of unchecked optimism.</q>', [29, 25]);


        order = 21100;
        new Game.Achievement('Maillard reaction', 'Harvest a <b>caramelized sugar lump</b>.', [29, 27]);

        order = 30250;
        new Game.Achievement('When the Neuros ascend just right', 'Ascend with exactly <b>1,000,000,000,000 Neuros</b>.', [25, 7]);
        Game.last.pool = 'shadow';//this achievement is shadow because it is only achievable through blind luck or reading external guides; this may change in the future


        order = 1050;
        new Game.Achievement('With her finger and her thumb', 'Have <b>600</b> cursors.', [0, 16]);

        order = 1100;
        Game.TieredAchievement('But wait \'til you get older', 'Have <b>550</b> grandmas.', 'Grandma', 12);
        order = 1200;
        Game.TieredAchievement('Sharpest tool in the shed', 'Have <b>500</b> farms.', 'Farm', 11);
        order = 1300;
        Game.TieredAchievement('Hey now, you\'re a rock', 'Have <b>500</b> mines.', 'Mining Rig', 11);
        order = 1400;
        Game.TieredAchievement('Break the mold', 'Have <b>500</b> factories.', 'Factory', 11);
        order = 1425;
        Game.TieredAchievement('Get the show on, get paid', 'Have <b>500</b> gyms.', 'Gym', 11);
        order = 1450;
        Game.TieredAchievement('My world\'s on fire, how about yours', 'Have <b>500</b> temples.', 'Temple', 11);
        order = 1475;
        Game.TieredAchievement('The meteor men beg to differ', 'Have <b>500</b> wizard towers.', 'Wizard tower', 11);
        order = 1500;
        Game.TieredAchievement('Only shooting stars', 'Have <b>500</b> shipments.', 'Shipment', 11);
        order = 1600;
        Game.TieredAchievement('We could all use a little change', 'Have <b>500</b> alchemy labs.', 'Alchemy lab', 11);//"all that glitters is gold" was already an achievement
        order = 1700;
        Game.TieredAchievement('Your brain gets smart but your head gets dumb', 'Have <b>500</b> portals.', 'Portal', 11);
        order = 1800;
        Game.TieredAchievement('The years start coming', 'Have <b>500</b> time machines.', 'Time machine', 11);
        order = 1900;
        Game.TieredAchievement('What a concept', 'Have <b>500</b> antimatter condensers.', 'Antimatter condenser', 11);
        order = 2000;
        Game.TieredAchievement('You\'ll never shine if you don\'t glow', 'Have <b>500</b> prisms.', 'Prism', 11);
        order = 2100;
        Game.TieredAchievement('You\'ll never know if you don\'t go', 'Have <b>500</b> wheels of fortune.', 'Wheel of fortune', 11);

        order = 2200;
        Game.TieredAchievement('Self-contained', 'Have <b>1</b> fractal engine.', 'Fractal engine', 1);
        Game.TieredAchievement('Threw you for a loop', 'Have <b>50</b> fractal engines.', 'Fractal engine', 2);
        Game.TieredAchievement('The sum of its parts', 'Have <b>100</b> fractal engines.', 'Fractal engine', 3);
        Game.TieredAchievement('Bears repeating', 'Have <b>150</b> fractal engines.<q>Where did these come from?</q>', 'Fractal engine', 4);
        Game.TieredAchievement('More of the same', 'Have <b>200</b> fractal engines.', 'Fractal engine', 5);
        Game.TieredAchievement('Last recurse', 'Have <b>250</b> fractal engines.', 'Fractal engine', 6);
        Game.TieredAchievement('Out of one, many', 'Have <b>300</b> fractal engines.', 'Fractal engine', 7);
        Game.TieredAchievement('An example of recursion', 'Have <b>350</b> fractal engines.', 'Fractal engine', 8);
        Game.TieredAchievement('For more information on this achievement, please refer to its title', 'Have <b>400</b> fractal engines.', 'Fractal engine', 9);
        Game.TieredAchievement('I\'m so meta, even this achievement', 'Have <b>450</b> fractal engines.', 'Fractal engine', 10);
        Game.TieredAchievement('Never get bored', 'Have <b>500</b> fractal engines.', 'Fractal engine', 11);

        order = 2220;
        Game.ProductionAchievement('The needs of the many', 'Fractal engine', 1);
        Game.ProductionAchievement('Eating its own', 'Fractal engine', 2);
        Game.ProductionAchievement('We must go deeper', 'Fractal engine', 3);

        new Game.Achievement('Sierpinski rhomboids', 'Reach level <b>10</b> fractal engines.', [20, 26]);
        Game.Objects['Fractal engine'].levelAchiev10 = Game.last;

        Game.CpsAchievement('Gotta go fast');
        Game.GymAchievement('I think it\'s safe to say you\'ve got it made');

        order = 6000;
        new Game.Achievement('Renaissance baker', 'Own <b>400</b> upgrades and <b>4000</b> buildings.<q>If you have seen further, it is by standing on the shoulders of giants - a mysterious species of towering humanoids until now thought long-extinct.</q>', [10, 10]);

        order = 1150;
        new Game.Achievement('Veteran', 'Own at least <b>14</b> grandma types.<q>14\'s a crowd!</q>', [10, 9]);

        order = 10000;
        new Game.Achievement('Thick-skinned', 'Have your <b>reinforced membrane</b> protect the <b>shimmering veil</b>.', [7, 10]);
        //end of achievements

        /*=====================================================================================
		BUFFS
		=======================================================================================*/

        Game.buffs = [];//buffs currently in effect by name
        Game.buffsN = 0;
        Game.buffsL = elementByID('buffs');
        Game.gainBuff = (type, time, arg1, arg2, arg3) => {
            type = Game.buffTypesByName[type];
            let obj = type.func(time, arg1, arg2, arg3);
            obj.type = type;
            obj.arg1 = arg1;
            obj.arg2 = arg2;
            obj.arg3 = arg3;

            let buff = {
                visible: true,
                time: 0,
                name: '???',
                desc: '',
                icon: [0, 0]
            };
            if (Game.buffs[obj.name])//if there is already a buff in effect with this name
            {
                buff = Game.buffs[obj.name];
                if (obj.max) buff.time = Math.max(obj.time, buff.time);//new duration is max of old and new
                if (obj.add) buff.time += obj.time;//new duration is old + new
                if (!obj.max && !obj.add) buff.time = obj.time;//new duration is set to new
                buff.maxTime = buff.time;
            } else//create new buff
            {
                for (let i in obj)//paste parameters onto buff
                {
                    buff[i] = obj[i];
                }
                buff.maxTime = buff.time;
                Game.buffs[buff.name] = buff;
                buff.id = Game.buffsN;

                //create dom
                Game.buffsL.innerHTML = Game.buffsL.innerHTML + '<div id="buff' + buff.id + '" class="crate enabled buff" ' + (buff.desc ? Game.getTooltip(
                    '<div class="prompt" style="min-width:200px;text-align:center;font-size:11px;margin:8px 0;"><h3>' + buff.name + '</h3><div class="line"></div>' + buff.desc + '</div>'
                    , 'left', true) : '') + ' style="opacity:1;float:none;display:block;' + (buff.icon[2] ? 'background-image:url(' + buff.icon[2] + ');' : '') + 'background-position:' + (-buff.icon[0] * 48) + 'px ' + (-buff.icon[1] * 48) + 'px;"></div>';

                buff.l = elementByID('buff' + buff.id);

                Game.buffsN++;
            }
            Game.recalculateGains = 1;
            Game.storeToRefresh = 1;
            return buff;
        }
        Game.hasBuff = what => {
            if (!Game.buffs[what]) return 0; else return Game.buffs[what];
        }
        Game.updateBuffs = () => {
            for (let i in Game.buffs) {
                let buff = Game.buffs[i];

                if (buff.time >= 0) {
                    if (!elementByID('buffPieTimer' + buff.id)) elementByID('buff' + buff.id).innerHTML = elementByID('buff' + buff.id).innerHTML + '<div class="pieTimer" id="buffPieTimer' + buff.id + '"></div>';
                    let T = 1 - (buff.time / buff.maxTime);
                    T = (T * 144) % 144;
                    elementByID('buffPieTimer' + buff.id).style.backgroundPosition = (-Math.floor(T % 18)) * 48 + 'px ' + (-Math.floor(T / 18)) * 48 + 'px';
                }
                buff.time--;
                if (buff.time <= 0) {
                    if (Game.onCrate === elementByID('buff' + buff.id)) Game.tooltip.hide();
                    if (buff.onDie) buff.onDie();
                    Game.buffsL.removeChild(elementByID('buff' + buff.id));
                    if (Game.buffs[buff.name]) {
                        Game.buffs[buff.name] = 0;
                        delete Game.buffs[buff.name];
                    }
                    Game.recalculateGains = 1;
                    Game.storeToRefresh = 1;
                }
            }
        }
        Game.killBuff = what => {
            if (Game.buffs[what]) {
                Game.buffs[what].time = 0;/*Game.buffs[what]=0;*/
            }
        }
        Game.killBuffs = () => {
            Game.buffsL.innerHTML = '';
            Game.buffs = [];
            Game.recalculateGains = 1;
            Game.storeToRefresh = 1;
        }


        Game.buffTypes = [];//buff archetypes; only buffs declared from these can be saved and loaded
        Game.buffTypesByName = [];
        Game.buffTypesN = 0;
        Game.buffType = function (name, func) {
            this.name = name;
            this.func = func;//this is a function that returns a buff object; it takes a "time" argument in seconds, and 3 more optional arguments at most, which will be saved and loaded as floats
            this.id = Game.buffTypesN;
            this.vanilla = Game.vanilla;
            Game.buffTypesByName[this.name] = this;
            Game.buffTypes[Game.buffTypesN] = this;
            Game.buffTypesN++;
        }

        /*
		basic buff parameters :
			name:'Kitten rain',
			desc:'It\'s raining kittens!',
			icon:[0,0],
			time:30*Game.fps
		other parameters :
			visible:false - will hide the buff from the buff list
			add:true - if this buff already exists, add the new duration to the old one
			max:true - if this buff already exists, set the new duration to the max of either
			onDie:function(){} - function will execute when the buff runs out
			power:3 - used by some buffs
			multCpS:3 - buff multiplies CpS by this amount
			multClick:3 - buff multiplies click power by this amount
		*/

        //base buffs
        new Game.buffType('frenzy', (time, pow) => ({
            name: 'Frenzy',
            desc: 'Neuro production x' + pow + ' for ' + Game.sayTime(time * Game.fps, -1) + '!',
            icon: [10, 14],
            time: time * Game.fps,
            add: true,
            multCpS: pow,
            aura: 1
        }));
        new Game.buffType('blood frenzy', (time, pow) => ({
            name: 'Elder frenzy',
            desc: 'Neuro production x' + pow + ' for ' + Game.sayTime(time * Game.fps, -1) + '!',
            icon: [29, 6],
            time: time * Game.fps,
            add: true,
            multCpS: pow,
            aura: 1
        }));
        new Game.buffType('clot', (time, pow) => ({
            name: 'Clot',
            desc: 'Neuro production halved for ' + Game.sayTime(time * Game.fps, -1) + '!',
            icon: [15, 5],
            time: time * Game.fps,
            add: true,
            multCpS: pow,
            aura: 2
        }));
        new Game.buffType('dragon harvest', (time, pow) => ({
            name: 'Dragon Harvest',
            desc: 'Neuro production x' + pow + ' for ' + Game.sayTime(time * Game.fps, -1) + '!',
            icon: [10, 25],
            time: time * Game.fps,
            add: true,
            multCpS: pow,
            aura: 1
        }));
        new Game.buffType('everything must go', (time, pow) => ({
            name: 'Everything must go',
            desc: 'All buildings are ' + pow + '% cheaper for ' + Game.sayTime(time * Game.fps, -1) + '!',
            icon: [17, 6],
            time: time * Game.fps,
            add: true,
            power: pow,
            aura: 1
        }));
        new Game.buffType('cursed finger', (time, pow) => ({
            name: 'Cursed finger',
            desc: 'Neuro production halted for ' + Game.sayTime(time * Game.fps, -1) + ',<br>but each click is worth ' + Game.sayTime(time * Game.fps, -1) + ' of CpS.',
            icon: [12, 17],
            time: time * Game.fps,
            add: true,
            power: pow,
            multCpS: 0,
            aura: 1
        }));
        new Game.buffType('click frenzy', (time, pow) => ({
            name: 'Click frenzy',
            desc: 'Clicking power x' + pow + ' for ' + Game.sayTime(time * Game.fps, -1) + '!',
            icon: [0, 14],
            time: time * Game.fps,
            add: true,
            multClick: pow,
            aura: 1
        }));
        new Game.buffType('dragonflight', (time, pow) => ({
            name: 'Dragonflight',
            desc: 'Clicking power x' + pow + ' for ' + Game.sayTime(time * Game.fps, -1) + '!',
            icon: [0, 25],
            time: time * Game.fps,
            add: true,
            multClick: pow,
            aura: 1
        }));
        new Game.buffType('Neuro storm', (time, pow) => ({
            name: 'Neuro storm',
            desc: 'Neuros everywhere!',
            icon: [22, 6],
            time: time * Game.fps,
            add: true,
            power: pow,
            aura: 1
        }));
        new Game.buffType('building buff', (time, pow, building) => {
            let obj = Game.ObjectsById[building];
            return {
                name: Game.goldenCookieBuildingBuffs[obj.name][0],
                desc: 'Your ' + obj.amount + ' ' + obj.plural + ' are boosting your CpS!<br>Neuro production +' + (Math.ceil(pow * 100 - 100)) + '% for ' + Game.sayTime(time * Game.fps, -1) + '!',
                icon: [obj.iconColumn, 14],
                time: time * Game.fps,
                add: true,
                multCpS: pow,
                aura: 1
            };
        });
        new Game.buffType('building debuff', (time, pow, building) => {
            let obj = Game.ObjectsById[building];
            return {
                name: Game.goldenCookieBuildingBuffs[obj.name][1],
                desc: 'Your ' + obj.amount + ' ' + obj.plural + ' are rusting your CpS!<br>Neuro production ' + (Math.ceil(pow * 100 - 100)) + '% slower for ' + Game.sayTime(time * Game.fps, -1) + '!',
                icon: [obj.iconColumn, 15],
                time: time * Game.fps,
                add: true,
                multCpS: 1 / pow,
                aura: 2
            };
        });
        new Game.buffType('sugar blessing', time => ({
            name: 'Sugar blessing',
            desc: 'You find 10% more golden Neuros for the next ' + Game.sayTime(time * Game.fps, -1) + '.',
            icon: [29, 16],
            time: time * Game.fps,
            //add:true
        }));
        new Game.buffType('haggler luck', (time, pow) => ({
            name: 'Haggler\'s luck',
            desc: 'All upgrades are ' + pow + '% cheaper for ' + Game.sayTime(time * Game.fps, -1) + '!',
            icon: [25, 11],
            time: time * Game.fps,
            power: pow,
            max: true
        }));
        new Game.buffType('haggler misery', (time, pow) => ({
            name: 'Haggler\'s misery',
            desc: 'All upgrades are ' + pow + '% pricier for ' + Game.sayTime(time * Game.fps, -1) + '!',
            icon: [25, 11],
            time: time * Game.fps,
            power: pow,
            max: true
        }));
        new Game.buffType('pixie luck', (time, pow) => ({
            name: 'Crafty pixies',
            desc: 'All buildings are ' + pow + '% cheaper for ' + Game.sayTime(time * Game.fps, -1) + '!',
            icon: [26, 11],
            time: time * Game.fps,
            power: pow,
            max: true
        }));
        new Game.buffType('pixie misery', (time, pow) => ({
            name: 'Nasty goblins',
            desc: 'All buildings are ' + pow + '% pricier for ' + Game.sayTime(time * Game.fps, -1) + '!',
            icon: [26, 11],
            time: time * Game.fps,
            power: pow,
            max: true
        }));
        new Game.buffType('magic adept', (time, pow) => ({
            name: 'Magic adept',
            desc: 'Spells backfire ' + pow + ' times less for ' + Game.sayTime(time * Game.fps, -1) + '.',
            icon: [29, 11],
            time: time * Game.fps,
            power: pow,
            max: true
        }));
        new Game.buffType('magic inept', (time, pow) => ({
            name: 'Magic inept',
            desc: 'Spells backfire ' + pow + ' times more for ' + Game.sayTime(time * Game.fps, -1) + '.',
            icon: [29, 11],
            time: time * Game.fps,
            power: pow,
            max: true
        }));
        new Game.buffType('devastation', (time, pow) => ({
            name: 'Devastation',
            desc: 'Clicking power +' + Math.floor(pow * 100 - 100) + '% for ' + Game.sayTime(time * Game.fps, -1) + '!',
            icon: [23, 18],
            time: time * Game.fps,
            multClick: pow,
            aura: 1,
            max: true
        }));
        new Game.buffType('sugar frenzy', (time, pow) => ({
            name: 'Sugar frenzy',
            desc: 'Neuro production x' + pow + ' for ' + Game.sayTime(time * Game.fps, -1) + '!',
            icon: [29, 14],
            time: time * Game.fps,
            add: true,
            multCpS: pow,
            aura: 0
        }));

        //end of buffs


        BeautifyAll();
        Game.vanilla = 0;//everything we create beyond this will not be saved in the default save


        for (i in Game.customCreate) {
            Game.customCreate[i]();
        }


        /*=====================================================================================
		GRANDMAPOCALYPSE
		=======================================================================================*/
        Game.UpdateGrandmapocalypse = () => {
            if (Game.Has('Elder Covenant') || Game.Objects['Grandma'].amount === 0) Game.elderWrath = 0;
            else if (Game.pledgeT > 0)//if the pledge is active, lower it
            {
                Game.pledgeT--;
                if (Game.pledgeT === 0)//did we reach 0? make the pledge purchasable again
                {
                    Game.Lock('Elder Pledge');
                    Game.Unlock('Elder Pledge');
                    Game.elderWrath = 1;
                }
            } else {
                if (Game.Has('One mind') && Game.elderWrath === 0) {
                    Game.elderWrath = 1;
                }
                if (Math.random() < 0.001 && Game.elderWrath < Game.Has('One mind') + Game.Has('Communal brainsweep') + Game.Has('Elder Pact')) {
                    Game.elderWrath++;//have we already pledged? make the elder wrath shift between different stages
                }
                if (Game.Has('Elder Pact') && Game.Upgrades['Elder Pledge'].unlocked === 0) {
                    Game.Lock('Elder Pledge');
                    Game.Unlock('Elder Pledge');
                }
            }
            Game.elderWrathD += ((Game.elderWrath + 1) - Game.elderWrathD) * 0.001;//slowly fade to the target wrath state

            if (Game.elderWrath !== Game.elderWrathOld) Game.storeToRefresh = 1;

            Game.elderWrathOld = Game.elderWrath;

            Game.UpdateWrinklers();
        }

        //wrinklers

        function inRect(x, y, rect) {
            //find out if the point x,y is in the rotated rectangle rect{w,h,r,o} (width,height,rotation in radians,y-origin) (needs to be normalized)
            //I found this somewhere online I guess
            let dx = x + Math.sin(-rect.r) * (-(rect.h / 2 - rect.o)),
                dy = y + Math.cos(-rect.r) * (-(rect.h / 2 - rect.o));
            let h1 = Math.sqrt(dx * dx + dy * dy);
            let currA = Math.atan2(dy, dx);
            let newA = currA - rect.r;
            let x2 = Math.cos(newA) * h1;
            let y2 = Math.sin(newA) * h1;
            return x2 > -0.5 * rect.w && x2 < 0.5 * rect.w && y2 > -0.5 * rect.h && y2 < 0.5 * rect.h;

        }

        Game.wrinklerHP = 2.1;
        Game.wrinklers = [];
        for (i = 0; i < 12; i++) {
            Game.wrinklers.push({
                id: parseInt(i),
                close: 0,
                sucked: 0,
                phase: 0,
                x: 0,
                y: 0,
                r: 0,
                hurt: 0,
                hp: Game.wrinklerHP,
                selected: 0,
                type: 0
            });
        }
        Game.getWrinklersMax = () => {
            let n = 10;
            if (Game.Has('Elder spice')) n += 2;
            return n;
        }
        Game.ResetWrinklers = () => {
            for (let i in Game.wrinklers) {
                Game.wrinklers[i] = {
                    id: parseInt(i),
                    close: 0,
                    sucked: 0,
                    phase: 0,
                    x: 0,
                    y: 0,
                    r: 0,
                    hurt: 0,
                    hp: Game.wrinklerHP,
                    type: 0
                };
            }
        }
        Game.CollectWrinklers = () => {
            for (let i in Game.wrinklers) {
                Game.wrinklers[i].hp = 0;
            }
        }
        Game.wrinklerSquishSound = Math.floor(Math.random() * 4) + 1;
        Game.playWrinklerSquishSound = () => {
            PlaySound('/snd/squish' + (Game.wrinklerSquishSound) + '.mp3', 0.5);
            Game.wrinklerSquishSound += Math.floor(Math.random() * 1.5) + 1;
            if (Game.wrinklerSquishSound > 4) Game.wrinklerSquishSound -= 4;
        }
        Game.SpawnWrinkler = me => {
            if (!me) {
                let i;
                let max = Game.getWrinklersMax();
                let n = 0;
                for (i in Game.wrinklers) {
                    if (Game.wrinklers[i].phase > 0) n++;
                }
                for (i in Game.wrinklers) {
                    let it = Game.wrinklers[i];
                    if (it.phase === 0 && Game.elderWrath > 0 && n < max && it.id < max) {
                        me = it;
                        break;
                    }
                }
            }
            if (!me) return false;
            me.phase = 1;
            me.hp = Game.wrinklerHP;
            me.type = 0;
            if (Math.random() < 0.0001) me.type = 1;//shiny wrinkler
            return me;
        }
        Game.PopRandomWrinkler = () => {
            let wrinklers = [];
            for (let i in Game.wrinklers) {
                if (Game.wrinklers[i].phase > 0 && Game.wrinklers[i].hp > 0) wrinklers.push(Game.wrinklers[i]);
            }
            if (wrinklers.length > 0) {
                let me = chooseRandomElement(wrinklers);
                me.hp = -10;
                return me;
            }
            return false;
        }
        Game.UpdateWrinklers = () => {
            let part;
            let ii;
            let x;
            let y;
            let godLvl;
            let i;
            let xBase = 0;
            let yBase = 0;
            let onWrinkler = 0;
            if (Game.LeftBackground) {
                xBase = Game.cookieOriginX;
                yBase = Game.cookieOriginY;
            }
            const max = Game.getWrinklersMax();
            let n = 0;
            for (i in Game.wrinklers) {
                if (Game.wrinklers[i].phase > 0) n++;
            }
            for (i in Game.wrinklers) {
                let me = Game.wrinklers[i];
                if (me.phase === 0 && Game.elderWrath > 0 && n < max && me.id < max) {
                    let chance = 0.00001 * Game.elderWrath;
                    chance *= Game.eff('wrinklerSpawn');
                    if (Game.Has('Unholy bait')) chance *= 5;
                    if (Game.hasGod) {
                        godLvl = Game.hasGod('scorn');
                        if (godLvl === 1) chance *= 2.5;
                        else if (godLvl === 2) chance *= 2;
                        else if (godLvl === 3) chance *= 1.5;
                    }
                    if (Game.Has('Wrinkler doormat')) chance = 0.1;
                    if (Math.random() < chance)//respawn
                    {
                        Game.SpawnWrinkler(me);
                    }
                }
                if (me.phase > 0) {
                    if (me.close < 1) me.close += (1 / Game.fps) / 10;
                    if (me.close > 1) me.close = 1;
                } else me.close = 0;
                if (me.close === 1 && me.phase === 1) {
                    me.phase = 2;
                    Game.recalculateGains = 1;
                }
                if (me.phase === 2) {
                    me.sucked += (((Game.cookiesPs / Game.fps) * Game.cpsSucked));//suck the cookies
                }
                if (me.phase > 0) {
                    if (me.type === 0) {
                        if (me.hp < Game.wrinklerHP) me.hp += 0.04;
                        me.hp = Math.min(Game.wrinklerHP, me.hp);
                    } else if (me.type === 1) {
                        if (me.hp < Game.wrinklerHP * 3) me.hp += 0.04;
                        me.hp = Math.min(Game.wrinklerHP * 3, me.hp);
                    }
                    let d = 128 * (2 - me.close);//*Game.BigCookieSize;
                    if (Game.prefs.fancy) d += Math.cos(Game.T * 0.05 + parseInt(me.id)) * 4;
                    me.r = (me.id / max) * 360;
                    if (Game.prefs.fancy) me.r += Math.sin(Game.T * 0.05 + parseInt(me.id)) * 4;
                    me.x = xBase + (Math.sin(me.r * Math.PI / 180) * d);
                    me.y = yBase + (Math.cos(me.r * Math.PI / 180) * d);
                    if (Game.prefs.fancy) me.r += Math.sin(Game.T * 0.09 + parseInt(me.id)) * 4;
                    const rect = {w: 100, h: 200, r: (-me.r) * Math.PI / 180, o: 10};
                    if (Math.random() < 0.01) me.hurt = Math.max(me.hurt, Math.random());
                    if (Game.T % 5 === 0 && Game.CanClick) {
                        if (Game.LeftBackground && Game.mouseX < Game.LeftBackground.canvas.width && inRect(Game.mouseX - me.x, Game.mouseY - me.y, rect)) me.selected = 1; else me.selected = 0;
                    }
                    if (me.selected && onWrinkler === 0 && Game.CanClick) {
                        me.hurt = Math.max(me.hurt, 0.25);
                        //me.close*=0.99;
                        if (Game.Click && Game.lastClickedEl === elementByID('backgroundLeftCanvas')) {
                            if (Game.keys[17] && Game.sesame) {
                                me.type = !me.type;
                                PlaySound('/snd/shimmerClick.mp3');
                            }//ctrl-click on a wrinkler in god mode to toggle its shininess
                            else {
                                Game.playWrinklerSquishSound();
                                me.hurt = 1;
                                me.hp -= 0.75;
                                if (Game.prefs.particles && !(me.hp <= 0.5 && me.phase > 0)) {
                                    x = me.x + (Math.sin(me.r * Math.PI / 180) * 90);
                                    y = me.y + (Math.cos(me.r * Math.PI / 180) * 90);
                                    for (ii = 0; ii < 3; ii++) {
                                        //Game.particleAdd(x+Math.random()*50-25,y+Math.random()*50-25,Math.random()*4-2,Math.random()*-2-2,1,1,2,'wrinklerBits.png');
                                        part = Game.particleAdd(x, y, Math.random() * 4 - 2, Math.random() * -2 - 2, 1, 1, 2, me.type === 1 ? 'shinyWrinklerBits.png' : 'wrinklerBits.png');
                                        part.r = -me.r;
                                    }
                                }
                            }
                            Game.Click = 0;
                        }
                        onWrinkler = 1;
                    }
                }

                if (me.hurt > 0) {
                    me.hurt -= 5 / Game.fps;
                    //me.close-=me.hurt*0.05;
                    //me.x+=Math.random()*2-1;
                    //me.y+=Math.random()*2-1;
                    me.r += (Math.sin(Game.T * 1) * me.hurt) * 18;//Math.random()*2-1;
                }
                if (me.hp <= 0.5 && me.phase > 0) {
                    Game.playWrinklerSquishSound();
                    PlaySound('/snd/pop' + Math.floor(Math.random() * 3 + 1) + '.mp3', 0.75);
                    Game.wrinklersPopped++;
                    Game.recalculateGains = 1;
                    me.phase = 0;
                    me.close = 0;
                    me.hurt = 0;
                    me.hp = 3;
                    let toSuck = 1.1;
                    if (Game.Has('Sacrilegious corruption')) toSuck *= 1.05;
                    if (me.type === 1) toSuck *= 3;//shiny wrinklers are an elusive, profitable breed
                    me.sucked *= toSuck;//cookie dough does weird things inside wrinkler digestive tracts
                    if (Game.Has('Wrinklerspawn')) me.sucked *= 1.05;
                    if (Game.hasGod) {
                        godLvl = Game.hasGod('scorn');
                        if (godLvl === 1) me.sucked *= 1.15;
                        else if (godLvl === 2) me.sucked *= 1.1;
                        else if (godLvl === 3) me.sucked *= 1.05;
                    }
                    if (me.sucked > 0.5) {
                        if (Game.prefs.popups) Game.Popup('Exploded a ' + (me.type === 1 ? 'shiny ' : '') + 'wrinkler : found ' + Beautify(me.sucked) + ' Neuros!');
                        else Game.Notify('Exploded a ' + (me.type === 1 ? 'shiny ' : '') + 'wrinkler', 'Found <b>' + Beautify(me.sucked) + '</b> Neuros!', [19, 8], 6);
                        Game.Popup('<div style="font-size:80%;">+' + Beautify(me.sucked) + ' Neuros</div>', Game.mouseX, Game.mouseY);

                        if (Game.season === 'halloween') {
                            //if (Math.random()<(Game.HasAchiev('Spooky cookies')?0.2:0.05))//halloween cookie drops
                            let failRate = 0.95;
                            if (Game.HasAchiev('Spooky cookies')) failRate = 0.8;
                            if (Game.Has('Starterror')) failRate *= 0.9;
                            failRate *= 1 / Game.dropRateMult();
                            if (Game.hasGod) {
                                godLvl = Game.hasGod('seasons');
                                if (godLvl === 1) failRate *= 0.9;
                                else if (godLvl === 2) failRate *= 0.95;
                                else if (godLvl === 3) failRate *= 0.97;
                            }
                            if (me.type === 1) failRate *= 0.9;
                            if (Math.random() > failRate)//halloween cookie drops
                            {
                                const cookie = chooseRandomElement(['Skull cookies', 'Ghost cookies', 'Bat cookies', 'Slime cookies', 'Pumpkin cookies', 'Eyeball cookies', 'Spider cookies']);
                                if (!Game.HasUnlocked(cookie) && !Game.Has(cookie)) {
                                    Game.Unlock(cookie);
                                    if (Game.prefs.popups) Game.Popup('Found : ' + cookie + '!');
                                    else Game.Notify(cookie, 'You also found <b>' + cookie + '</b>!', Game.Upgrades[cookie].icon);
                                }
                            }
                        }
                        Game.DropEgg(0.98);
                    }
                    if (me.type === 1) Game.Win('Last Chance to See');
                    Game.Earn(me.sucked);
                    /*if (Game.prefs.particles)
					{
						var x=me.x+(Math.sin(me.r*Math.PI/180)*100);
						var y=me.y+(Math.cos(me.r*Math.PI/180)*100);
						for (var ii=0;ii<6;ii++)
						{
							Game.particleAdd(x+Math.random()*50-25,y+Math.random()*50-25,Math.random()*4-2,Math.random()*-2-2,1,1,2,'wrinklerBits.png');
						}
					}*/
                    if (Game.prefs.particles) {
                        x = me.x + (Math.sin(me.r * Math.PI / 180) * 90);
                        y = me.y + (Math.cos(me.r * Math.PI / 180) * 90);
                        if (me.sucked > 0) {
                            for (ii = 0; ii < 5; ii++) {
                                Game.particleAdd(Game.mouseX, Game.mouseY, Math.random() * 4 - 2, Math.random() * -2 - 2, Math.random() * 0.5 + 0.75, 1.5, 2);
                            }
                        }
                        for (ii = 0; ii < 8; ii++) {
                            part = Game.particleAdd(x, y, Math.random() * 4 - 2, Math.random() * -2 - 2, 1, 1, 2, me.type === 1 ? 'shinyWrinklerBits.png' : 'wrinklerBits.png');
                            part.r = -me.r;
                        }
                    }
                    me.sucked = 0;
                }
            }
            if (onWrinkler) {
                Game.mousePointer = 1;
            }
        }
        Game.DrawWrinklers = function () {
            let ctx = Game.LeftBackground;
            let selected = 0;
            for (let i in Game.wrinklers) {
                let me = Game.wrinklers[i];
                if (me.phase > 0) {
                    ctx.globalAlpha = me.close;
                    ctx.save();
                    ctx.translate(me.x, me.y);
                    ctx.rotate(-(me.r) * Math.PI / 180);
                    //var s=Math.min(1,me.sucked/(Game.cookiesPs*60))*0.75+0.25;//scale wrinklers as they eat
                    //ctx.scale(Math.pow(s,1.5)*1.25,s);
                    //ctx.fillRect(-50,-10,100,200);
                    if (me.type === 1) ctx.drawImage(Pic('shinyWrinkler.png'), -50, -10);
                    else if (Game.season === 'christmas') ctx.drawImage(Pic('winterWrinkler.png'), -50, -10);
                    else ctx.drawImage(Pic('wrinkler.png'), -50, -10);
                    //ctx.fillText(me.id+' : '+me.sucked,0,0);
                    if (me.type === 1 && Math.random() < 0.3 && Game.prefs.particles)//sparkle
                    {
                        ctx.globalAlpha = Math.random() * 0.65 + 0.1;
                        const s = Math.random() * 30 + 5;
                        ctx.globalCompositeOperation = 'lighter';
                        ctx.drawImage(Pic('glint.jpg'), -s / 2 + Math.random() * 50 - 25, -s / 2 + Math.random() * 200, s, s);
                    }
                    ctx.restore();

                    if (me.phase === 2 && Math.random() < 0.03 && Game.prefs.particles) {
                        Game.particleAdd(me.x, me.y, Math.random() * 4 - 2, Math.random() * -2 - 2, Math.random() * 0.5 + 0.5, 1, 2);
                    }

                    if (me.selected) selected = me;
                }
            }
            if (selected && Game.Has('Eye of the wrinkler')) {
                let x = Game.cookieOriginX;
                let y = Game.cookieOriginY;
                ctx.font = '14px Merriweather';
                ctx.textAlign = 'center';
                const width = Math.max(ctx.measureText('Swallowed :').width, ctx.measureText(Beautify(selected.sucked)).width);
                ctx.fillStyle = '#000';
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 8;
                ctx.globalAlpha = 0.5;
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(Math.floor(selected.x), Math.floor(selected.y));
                ctx.stroke();
                ctx.fillRect(x - width / 2 - 8 - 14, y - 23, width + 16 + 28, 38);
                ctx.globalAlpha = 1;
                ctx.fillStyle = '#fff';
                ctx.fillText('Swallowed :', x + 14, y - 8);
                ctx.fillText(Beautify(selected.sucked), x + 14, y + 8);
                ctx.drawImage(Pic('icons.png'), 27 * 48, 26 * 48, 48, 48, x - width / 2 - 8 - 22, y - 4 - 24, 48, 48);
            }
        }
        Game.SaveWrinklers = () => {
            let amount = 0;
            let amountShinies = 0;
            let number = 0;
            let shinies = 0;
            for (let i in Game.wrinklers) {
                if (Game.wrinklers[i].sucked > 0.5) {
                    number++;
                    if (Game.wrinklers[i].type === 1) {
                        shinies++;
                        amountShinies += Game.wrinklers[i].sucked;
                    } else amount += Game.wrinklers[i].sucked;
                }
            }
            return {amount: amount, number: number, shinies: shinies, amountShinies: amountShinies};
        }
        Game.LoadWrinklers = (amount, number, shinies, amountShinies) => {
            if (number > 0 && (amount > 0 || amountShinies > 0)) {
                const fullNumber = number - shinies;
                const fullNumberShinies = shinies;
                for (let i in Game.wrinklers) {
                    if (number > 0) {
                        Game.wrinklers[i].phase = 2;
                        Game.wrinklers[i].close = 1;
                        Game.wrinklers[i].hp = 3;
                        if (shinies > 0) {
                            Game.wrinklers[i].type = 1;
                            Game.wrinklers[i].sucked = amountShinies / fullNumberShinies;
                            shinies--;
                        } else Game.wrinklers[i].sucked = amount / fullNumber;
                        number--;
                    }//respawn
                }
            }
        }

        /*=====================================================================================
		SPECIAL THINGS AND STUFF
		=======================================================================================*/


        Game.specialTab = '';
        Game.specialTabHovered = '';
        Game.specialTabs = [];

        Game.UpdateSpecial = () => {
            Game.specialTabs = [];
            if (Game.Has('A festive hat')) Game.specialTabs.push('santa');
            if (Game.Has('A crumbly egg')) Game.specialTabs.push('dragon');
            if (Game.specialTabs.length === 0) {
                Game.ToggleSpecialMenu(0);
                return;
            }

            if (Game.LeftBackground) {
                Game.specialTabHovered = '';
                let len = Game.specialTabs.length;
                if (len === 0) return;
                let y = Game.LeftBackground.canvas.height - 24 - 48 * len;
                for (let i in Game.specialTabs) {
                    let selected = 0;
                    if (Game.specialTab === Game.specialTabs[i]) selected = 1;
                    let x = 24;
                    let s = 1;
                    if (selected) {
                        s = 2;
                        x += 24;
                    }

                    if (Math.abs(Game.mouseX - x) <= 24 * s && Math.abs(Game.mouseY - y) <= 24 * s) {
                        Game.specialTabHovered = Game.specialTabs[i];
                        Game.mousePointer = 1;
                        Game.CanClick = 0;
                        if (Game.Click) {
                            if (Game.specialTab !== Game.specialTabs[i]) {
                                Game.specialTab = Game.specialTabs[i];
                                Game.ToggleSpecialMenu(1);
                                PlaySound('snd/press.mp3');
                            } else {
                                Game.ToggleSpecialMenu(0);
                                PlaySound('snd/press.mp3');
                            }
                            //PlaySound('snd/tick.mp3');
                        }
                    }

                    y += 48;
                }
            }
        }

        Game.santaLevels = ['Festive test tube', 'Festive ornament', 'Festive wreath', 'Festive tree', 'Festive present', 'Festive elf fetus', 'Elf toddler', 'Elfling', 'Young elf', 'Bulky elf', 'Nick', 'Santa Claus', 'Elder Santa', 'True Santa', 'Final Claus'];
        for (i in Game.santaDrops)//scale christmas upgrade prices with santa level
        {
            Game.Upgrades[Game.santaDrops[i]].priceFunc = () => Math.pow(3, Game.santaLevel) * 2525
        }


        Game.UpgradeSanta = () => {
            const moni = Math.pow(Game.santaLevel + 1, Game.santaLevel + 1);
            if (Game.cookies > moni && Game.santaLevel < 14) {
                PlaySound('snd/shimmerClick.mp3');

                Game.Spend(moni);
                Game.santaLevel = (Game.santaLevel + 1) % 15;
                if (Game.santaLevel === 14) {
                    Game.Unlock('Santa\'s dominion');
                    if (Game.prefs.popups) Game.Popup('You are granted<br>Santa\'s dominion.');
                    else Game.Notify('You are granted Santa\'s dominion.', '', Game.Upgrades['Santa\'s dominion'].icon);
                }
                let drops = [];
                for (let i in Game.santaDrops) {
                    if (!Game.HasUnlocked(Game.santaDrops[i])) drops.push(Game.santaDrops[i]);
                }
                let drop = chooseRandomElement(drops);
                if (drop) {
                    Game.Unlock(drop);
                    if (Game.prefs.popups) Game.Popup('You find a present which contains...<br>' + drop + '!');
                    else Game.Notify('Found a present!', 'You find a present which contains...<br><b>' + drop + '</b>!', Game.Upgrades[drop].icon);
                }

                Game.ToggleSpecialMenu(1);

                if (elementByID('specialPic')) {
                    let rect = elementByID('specialPic').getBoundingClientRect();
                    Game.SparkleAt((rect.left + rect.right) / 2, (rect.top + rect.bottom) / 2);
                }

                if (Game.santaLevel >= 6) Game.Win('Coming to town');
                if (Game.santaLevel >= 14) Game.Win('All hail Santa');
                Game.recalculateGains = 1;
                Game.upgradesToRebuild = 1;
            }
        }

        Game.dragonLevels = [
            {
                name: 'Dragon egg', action: 'Chip it', pic: 0,
                cost: () => Game.cookies >= 1000000,
                buy: () => {
                    Game.Spend(1000000);
                },
                costStr: () => Beautify(1000000) + ' cookies'
            },
            {
                name: 'Dragon egg', action: 'Chip it', pic: 1,
                cost: () => Game.cookies >= 1000000 * 2,
                buy: () => {
                    Game.Spend(1000000 * 2);
                },
                costStr: () => Beautify(1000000 * 2) + ' cookies'
            },
            {
                name: 'Dragon egg', action: 'Chip it', pic: 2,
                cost: () => Game.cookies >= 1000000 * 4,
                buy: () => {
                    Game.Spend(1000000 * 4);
                },
                costStr: () => Beautify(1000000 * 4) + ' cookies'
            },
            {
                name: 'Shivering dragon egg', action: 'Hatch it', pic: 3,
                cost: () => Game.cookies >= 1000000 * 8,
                buy: () => {
                    Game.Spend(1000000 * 8);
                },
                costStr: () => Beautify(1000000 * 8) + ' cookies'
            },
            {
                name: 'Krumblor, Neuro hatchling',
                action: 'Train Breath of Milk<br><small>Aura : kittens are 5% more effective</small>',
                pic: 4,
                cost: () => Game.cookies >= 1000000 * 16,
                buy: () => {
                    Game.Spend(1000000 * 16);
                },
                costStr: () => Beautify(1000000 * 16) + ' cookies'
            },
            {
                name: 'Krumblor, Neuro hatchling',
                action: 'Train Dragon Cursor<br><small>Aura : clicking is 5% more effective</small>',
                pic: 4,
                cost: () => Game.Objects['Cursor'].amount >= 100,
                buy: () => {
                    Game.Objects['Cursor'].sacrifice(100);
                },
                costStr: () => '100 cursors'
            },
            {
                name: 'Krumblor, Neuro hatchling',
                action: 'Train Elder Battalion<br><small>Aura : grandmas gain +1% CpS for every non-grandma building</small>',
                pic: 4,
                cost: () => Game.Objects['Grandma'].amount >= 100,
                buy: () => {
                    Game.Objects['Grandma'].sacrifice(100);
                },
                costStr: () => '100 grandmas'
            },
            {
                name: 'Krumblor, Neuro hatchling',
                action: 'Train Reaper of Fields<br><small>Aura : golden Neuros may trigger a Dragon Harvest</small>',
                pic: 4,
                cost: () => Game.Objects['Farm'].amount >= 100,
                buy: () => {
                    Game.Objects['Farm'].sacrifice(100);
                },
                costStr: () => '100 farms'
            },
            {
                name: 'Krumblor, Neuro dragon',
                action: 'Train Earth Shatterer<br><small>Aura : buildings sell back for 50% instead of 25%</small>',
                pic: 5,
                cost: () => Game.Objects['Mining Rig'].amount >= 100,
                buy: () => {
                    Game.Objects['Mining Rig'].sacrifice(100);
                },
                costStr: () => '100 mines'
            },
            {
                name: 'Krumblor, Neuro dragon',
                action: 'Train Master of the Armory<br><small>Aura : all upgrades are 2% cheaper</small>',
                pic: 5,
                cost: () => Game.Objects['Factory'].amount >= 100,
                buy: () => {
                    Game.Objects['Factory'].sacrifice(100);
                },
                costStr: () => '100 factories'
            },
            {
                name: 'Krumblor, Neuro dragon',
                action: 'Train Fierce Hoarder<br><small>Aura : all buildings are 2% cheaper</small>',
                pic: 5,
                cost: () => Game.Objects['Gym'].amount >= 100,
                buy: () => {
                    Game.Objects['Gym'].sacrifice(100);
                },
                costStr: () => '100 gyms'
            },
            {
                name: 'Krumblor, Neuro dragon',
                action: 'Train Dragon God<br><small>Aura : prestige CpS bonus +5%</small>',
                pic: 5,
                cost: () => Game.Objects['Temple'].amount >= 100,
                buy: () => {
                    Game.Objects['Temple'].sacrifice(100);
                },
                costStr: () => '100 temples'
            },
            {
                name: 'Krumblor, Neuro dragon',
                action: 'Train Arcane Aura<br><small>Aura : golden Neuros appear 5% more often</small>',
                pic: 5,
                cost: () => Game.Objects['Wizard tower'].amount >= 100,
                buy: () => {
                    Game.Objects['Wizard tower'].sacrifice(100);
                },
                costStr: () => '100 wizard towers'
            },
            {
                name: 'Krumblor, Neuro dragon',
                action: 'Train Dragonflight<br><small>Aura : golden Neuros may trigger a Dragonflight</small>',
                pic: 5,
                cost: () => Game.Objects['Shipment'].amount >= 100,
                buy: () => {
                    Game.Objects['Shipment'].sacrifice(100);
                },
                costStr: () => '100 shipments'
            },
            {
                name: 'Krumblor, Neuro dragon',
                action: 'Train Ancestral Metamorphosis<br><small>Aura : golden Neuros give 10% more Neuros</small>',
                pic: 5,
                cost: () => Game.Objects['Alchemy lab'].amount >= 100,
                buy: () => {
                    Game.Objects['Alchemy lab'].sacrifice(100);
                },
                costStr: () => '100 alchemy labs'
            },
            {
                name: 'Krumblor, Neuro dragon',
                action: 'Train Unholy Dominion<br><small>Aura : wrath Neuros give 10% more Neuros</small>',
                pic: 5,
                cost: () => Game.Objects['Portal'].amount >= 100,
                buy: () => {
                    Game.Objects['Portal'].sacrifice(100);
                },
                costStr: () => '100 portals'
            },
            {
                name: 'Krumblor, Neuro dragon',
                action: 'Train Epoch Manipulator<br><small>Aura : golden Neuro effects last 5% longer</small>',
                pic: 5,
                cost: () => Game.Objects['Time machine'].amount >= 100,
                buy: () => {
                    Game.Objects['Time machine'].sacrifice(100);
                },
                costStr: () => '100 time machines'
            },
            {
                name: 'Krumblor, Neuro dragon',
                action: 'Train Mind Over Matter<br><small>Aura : +25% random drops</small>',
                pic: 5,
                cost: () => Game.Objects['Antimatter condenser'].amount >= 100,
                buy: () => {
                    Game.Objects['Antimatter condenser'].sacrifice(100);
                },
                costStr: () => '100 antimatter condensers'
            },
            {
                name: 'Krumblor, Neuro dragon',
                action: 'Train Radiant Appetite<br><small>Aura : all Neuro production multiplied by 2</small>',
                pic: 5,
                cost: () => Game.Objects['Prism'].amount >= 100,
                buy: () => {
                    Game.Objects['Prism'].sacrifice(100);
                },
                costStr: () => '100 prisms'
            },
            {
                name: 'Krumblor, Neuro dragon',
                action: 'Train Dragon\'s Fortune<br><small>Aura : +123% CpS per golden Neuro on-screen</small>',
                pic: 5,
                cost: () => Game.Objects['Wheel of fortune'].amount >= 100,
                buy: () => {
                    Game.Objects['Wheel of fortune'].sacrifice(100);
                },
                costStr: () => '100 wheels of fortune'
            },
            {
                name: 'Krumblor, Neuro dragon',
                action: 'Train Dragon\'s Curve<br><small>Aura : sugar lumps grow 5% faster, 50% weirder</small>',
                pic: 5,
                cost: () => Game.Objects['Fractal engine'].amount >= 100,
                buy: () => {
                    Game.Objects['Fractal engine'].sacrifice(100);
                },
                costStr: () => '100 fractal engines'
            },
            {
                name: 'Krumblor, Neuro dragon', action: 'Bake dragon cookie<br><small>Delicious!</small>', pic: 6,
                cost: () => {
                    let fail = 0;
                    for (let i in Game.Objects) {
                        if (Game.Objects[i].amount < 50) fail = 1;
                    }
                    return (fail === 0);
                },
                buy: () => {
                    for (let i in Game.Objects) {
                        Game.Objects[i].sacrifice(50);
                    }
                    Game.Unlock('Dragon cookie');
                },
                costStr: () => '50 of every building'
            },
            {
                name: 'Krumblor, Neuro dragon',
                action: 'Train secondary aura<br><small>Lets you use two dragon auras simultaneously</small>',
                pic: 7,
                cost: () => {
                    let fail = 0;
                    for (let i in Game.Objects) {
                        if (Game.Objects[i].amount < 200) fail = 1;
                    }
                    return (fail === 0);
                },
                buy: () => {
                    for (let i in Game.Objects) {
                        Game.Objects[i].sacrifice(200);
                    }
                },
                costStr: () => '200 of every building'
            },
            {name: 'Krumblor, Neuro dragon', action: 'Your dragon is fully trained.', pic: 8}
        ];

        Game.dragonAuras = {
            0: {name: 'No aura', pic: [0, 7], desc: 'Select an aura from those your dragon knows.'},
            1: {name: 'Breath of Milk', pic: [18, 25], desc: 'Kittens are <b>5%</b> more effective.'},
            2: {name: 'Dragon Cursor', pic: [0, 25], desc: 'Clicking is <b>5%</b> more effective.'},
            3: {
                name: 'Elder Battalion',
                pic: [1, 25],
                desc: 'Grandmas gain <b>+1% CpS</b> for every non-grandma building.'
            },
            4: {name: 'Reaper of Fields', pic: [2, 25], desc: 'Golden Neuros may trigger a <b>Dragon Harvest</b>.'},
            5: {name: 'Earth Shatterer', pic: [3, 25], desc: 'Buildings sell back for <b>50%</b> instead of 25%.'},
            6: {name: 'Master of the Armory', pic: [4, 25], desc: 'All upgrades are <b>2%</b> cheaper.'},
            7: {name: 'Fierce Hoarder', pic: [15, 25], desc: 'All buildings are <b>2%</b> cheaper.'},
            8: {name: 'Dragon God', pic: [16, 25], desc: 'Prestige CpS bonus <b>+5%</b>.'},
            9: {name: 'Arcane Aura', pic: [17, 25], desc: 'Golden Neuros appear <b>+5%</b> more often.'},
            10: {name: 'Dragonflight', pic: [5, 25], desc: 'Golden Neuros may trigger a <b>Dragonflight</b>.'},
            11: {name: 'Ancestral Metamorphosis', pic: [6, 25], desc: 'Golden Neuros give <b>10%</b> more Neuros.'},
            12: {name: 'Unholy Dominion', pic: [7, 25], desc: 'Wrath Neuros give <b>10%</b> more Neuros.'},
            13: {name: 'Epoch Manipulator', pic: [8, 25], desc: 'Golden Neuros last <b>5%</b> longer.'},
            14: {name: 'Mind Over Matter', pic: [13, 25], desc: 'Random drops are <b>25% more common</b>.'},
            15: {name: 'Radiant Appetite', pic: [14, 25], desc: 'All Neuro production <b>multiplied by 2</b>.'},
            16: {
                name: 'Dragon\'s Fortune',
                pic: [19, 25],
                desc: '<b>+123% CpS</b> per golden Neuro on-screen, multiplicative.'
            },
            17: {
                name: 'Dragon\'s Curve',
                pic: [20, 25],
                desc: '<b>+5% sugar lump growth</b> and sugar lumps are <b>twice as likely</b> to be unusual.'
            },
        };

        Game.hasAura = what => Game.dragonAuras[Game.dragonAura].name === what || Game.dragonAuras[Game.dragonAura2].name === what

        Game.SelectDragonAura = (slot, update) => {
            let i;
            let currentAura;
            let otherAura;
            if (slot === 0) currentAura = Game.dragonAura; else currentAura = Game.dragonAura2;
            if (slot === 0) otherAura = Game.dragonAura2; else otherAura = Game.dragonAura;
            if (!update) Game.SelectingDragonAura = currentAura;

            let str = '';
            for (i in Game.dragonAuras) {
                if (Game.dragonLevel >= parseInt(i) + 4) {
                    let icon = Game.dragonAuras[i].pic;
                    if (i === 0 || i !== otherAura) str += '<div class="crate enabled' + (i === Game.SelectingDragonAura ? ' highlighted' : '') + '" style="opacity:1;float:none;display:inline-block;' + (icon[2] ? 'background-image:url(' + icon[2] + ');' : '') + 'background-position:' + (-icon[0] * 48) + 'px ' + (-icon[1] * 48) + 'px;" ' + Game.clickStr + '="PlaySound(\'snd/tick.mp3\');Game.SetDragonAura(' + i + ',' + slot + ');" onMouseOut="Game.DescribeDragonAura(' + Game.SelectingDragonAura + ');" onMouseOver="Game.DescribeDragonAura(' + i + ');"' +
                        '></div>';
                }
            }

            let highestBuilding = 0;
            for (i in Game.Objects) {
                if (Game.Objects[i].amount > 0) highestBuilding = Game.Objects[i];
            }

            Game.Prompt('<h3>Set your dragon\'s ' + (slot === 1 ? 'secondary ' : '') + 'aura</h3>' +
                '<div class="line"></div>' +
                '<div id="dragonAuraInfo" style="min-height:60px;"></div>' +
                '<div style="text-align:center;">' + str + '</div>' +
                '<div class="line"></div>' +
                '<div style="text-align:center;margin-bottom:8px;">' + (highestBuilding === 0 ? 'Switching your aura is <b>free</b> because you own no buildings.' : 'The cost of switching your aura is <b>1 ' + highestBuilding.name + '</b>.<br>This will affect your CpS!') + '</div>'
                , [['Confirm', (slot === 0 ? 'Game.dragonAura' : 'Game.dragonAura2') + '=Game.SelectingDragonAura;' + (highestBuilding === 0 || currentAura === Game.SelectingDragonAura ? '' : 'Game.ObjectsById[' + highestBuilding.id + '].sacrifice(1);') + 'Game.ToggleSpecialMenu(1);Game.ClosePrompt();'], 'Cancel'], 0, 'widePrompt');
            Game.DescribeDragonAura(Game.SelectingDragonAura);
        }
        Game.SelectingDragonAura = -1;
        Game.SetDragonAura = (aura, slot) => {
            Game.SelectingDragonAura = aura;
            Game.SelectDragonAura(slot, 1);
        }
        Game.DescribeDragonAura = aura => {
            elementByID('dragonAuraInfo').innerHTML =
                '<div style="min-width:200px;text-align:center;"><h4>' + Game.dragonAuras[aura].name + '</h4>' +
                '<div class="line"></div>' +
                Game.dragonAuras[aura].desc +
                '</div>';
        }

        Game.UpgradeDragon = () => {
            if (Game.dragonLevel < Game.dragonLevels.length - 1 && Game.dragonLevels[Game.dragonLevel].cost()) {
                PlaySound('/snd/shimmerClick.mp3');
                Game.dragonLevels[Game.dragonLevel].buy();
                Game.dragonLevel = (Game.dragonLevel + 1) % Game.dragonLevels.length;

                if (Game.dragonLevel >= Game.dragonLevels.length - 1) Game.Win('Here be dragon');
                Game.ToggleSpecialMenu(1);
                if (elementByID('specialPic')) {
                    const rect = elementByID('specialPic').getBoundingClientRect();
                    Game.SparkleAt((rect.left + rect.right) / 2, (rect.top + rect.bottom) / 2);
                }
                Game.recalculateGains = 1;
                Game.upgradesToRebuild = 1;
            }
        }

        Game.ToggleSpecialMenu = on => {
            let icon;
            if (on) {
                let pic;
                let frame;
                if (Game.specialTab === 'santa') {
                    pic = 'santa.png';
                    frame = Game.santaLevel;
                } else if (Game.specialTab === 'dragon') {
                    pic = 'dragon.png?v=' + Game.version;
                    frame = Game.dragonLevels[Game.dragonLevel].pic;
                } else {
                    pic = 'dragon.png?v=' + Game.version;
                    frame = 4;
                }

                let str = '<div id="specialPic" style="position:absolute;left:-16px;top:-64px;width:96px;height:96px;background:url(/img/' + pic + ');background-position:' + (-frame * 96) + 'px 0px;filter:drop-shadow(0px 3px 2px #000);-webkit-filter:drop-shadow(0px 3px 2px #000);"></div>';
                str += '<div class="close" onclick="PlaySound(\'/snd/press.mp3\');Game.ToggleSpecialMenu(0);">x</div>';

                if (Game.specialTab === 'santa') {
                    const moni = Math.pow(Game.santaLevel + 1, Game.santaLevel + 1);

                    str += '<h3>' + Game.santaLevels[Game.santaLevel] + '</h3>';
                    if (Game.santaLevel < 14) {
                        str += '<div class="line"></div>' +
                            '<div class="optionBox" style="margin-bottom:0;"><a class="option framed large title" ' + Game.clickStr + '="Game.UpgradeSanta();">' +
                            '<div style="display:table-cell;vertical-align:middle;">Evolve</div>' +
                            '<div style="display:table-cell;vertical-align:middle;padding:4px 12px;">|</div>' +
                            '<div style="display:table-cell;vertical-align:middle;font-size:65%;">cost :<div' + (Game.cookies > moni ? '' : ' style="color:#777;"') + '>' + Beautify(Math.pow(Game.santaLevel + 1, Game.santaLevel + 1)) + ' ' + (Game.santaLevel > 0 ? 'cookies' : 'cookie') + '</div></div>' +
                            '</a></div>';
                    }
                } else if (Game.specialTab === 'dragon') {
                    let level = Game.dragonLevels[Game.dragonLevel];

                    str += '<h3>' + level.name + '</h3>';

                    if (Game.dragonLevel >= 5) {
                        icon = Game.dragonAuras[Game.dragonAura].pic;
                        str += '<div class="crate enabled" style="opacity:1;position:absolute;right:18px;top:-58px;' + (icon[2] ? 'background-image:url(' + icon[2] + ');' : '') + 'background-position:' + (-icon[0] * 48) + 'px ' + (-icon[1] * 48) + 'px;" ' + Game.clickStr + '="PlaySound(\'snd/tick.mp3\');Game.SelectDragonAura(0);" ' + Game.getTooltip(
                                '<div style="min-width:200px;text-align:center;"><h4>' + Game.dragonAuras[Game.dragonAura].name + '</h4>' +
                                '<div class="line"></div>' +
                                Game.dragonAuras[Game.dragonAura].desc +
                                '</div>'
                                , 'top') +
                            '></div>';
                    }
                    if (Game.dragonLevel >= 23) {
                        icon = Game.dragonAuras[Game.dragonAura2].pic;
                        str += '<div class="crate enabled" style="opacity:1;position:absolute;right:80px;top:-58px;' + (icon[2] ? 'background-image:url(' + icon[2] + ');' : '') + 'background-position:' + (-icon[0] * 48) + 'px ' + (-icon[1] * 48) + 'px;" ' + Game.clickStr + '="PlaySound(\'snd/tick.mp3\');Game.SelectDragonAura(1);" ' + Game.getTooltip(
                                '<div style="min-width:200px;text-align:center;"><h4>' + Game.dragonAuras[Game.dragonAura2].name + '</h4>' +
                                '<div class="line"></div>' +
                                Game.dragonAuras[Game.dragonAura2].desc +
                                '</div>'
                                , 'top') +
                            '></div>';
                    }

                    if (Game.dragonLevel < Game.dragonLevels.length - 1) {
                        str += '<div class="line"></div>' +
                            '<div class="optionBox" style="margin-bottom:0;"><a class="option framed large title" ' + Game.clickStr + '="Game.UpgradeDragon();">' +
                            '<div style="display:table-cell;vertical-align:middle;">' + level.action + '</div>' +
                            '<div style="display:table-cell;vertical-align:middle;padding:4px 12px;">|</div>' +
                            '<div style="display:table-cell;vertical-align:middle;font-size:65%;">sacrifice<div' + (level.cost() ? '' : ' style="color:#777;"') + '>' + level.costStr() + '</div></div>' +
                            '</a></div>';
                    } else {
                        str += '<div class="line"></div>' +
                            '<div style="text-align:center;margin-bottom:4px;">' + level.action + '</div>';
                    }
                }

                elementByID('specialPopup').innerHTML = str;

                elementByID('specialPopup').className = 'framed prompt onScreen';
            } else {
                if (Game.specialTab !== '') {
                    Game.specialTab = '';
                    elementByID('specialPopup').className = 'framed prompt offScreen';
                    setTimeout(() => {
                        if (Game.specialTab === '') {/*l('specialPopup').style.display='none';*/
                            elementByID('specialPopup').innerHTML = '';
                        }
                    }, 1000 * 0.2);
                }
            }
        }
        Game.DrawSpecial = () => {
            const len = Game.specialTabs.length;
            if (len === 0) return;
            Game.LeftBackground.globalAlpha = 1;
            let y = Game.LeftBackground.canvas.height - 24 - 48 * len;
            let tabI = 0;

            for (let i in Game.specialTabs) {
                let selected = 0;
                let hovered = 0;
                if (Game.specialTab === Game.specialTabs[i]) selected = 1;
                if (Game.specialTabHovered === Game.specialTabs[i]) hovered = 1;
                let x = 24;
                let s = 1;
                let pic = '';
                let frame = 0;
                if (hovered) {
                    s = 1;
                    x = 24;
                }
                if (selected) {
                    s = 1;
                    x = 48;
                }

                if (Game.specialTabs[i] === 'santa') {
                    pic = 'santa.png';
                    frame = Game.santaLevel;
                } else if (Game.specialTabs[i] === 'dragon') {
                    pic = 'dragon.png?v=' + Game.version;
                    frame = Game.dragonLevels[Game.dragonLevel].pic;
                } else {
                    pic = 'dragon.png?v=' + Game.version;
                    frame = 4;
                }

                if (hovered || selected) {
                    let ss = s * 64;
                    let r = Math.floor((Game.T * 0.5) % 360);
                    Game.LeftBackground.save();
                    Game.LeftBackground.translate(x, y);
                    if (Game.prefs.fancy) Game.LeftBackground.rotate((r / 360) * Math.PI * 2);
                    Game.LeftBackground.globalAlpha = 0.75;
                    Game.LeftBackground.drawImage(Pic('shine.png'), -ss / 2, -ss / 2, ss, ss);
                    Game.LeftBackground.restore();
                }

                if (Game.prefs.fancy) Game.LeftBackground.drawImage(Pic(pic), 96 * frame, 0, 96, 96, (x + (selected ? 0 : Math.sin(Game.T * 0.2 + tabI) * 3) - 24 * s), (y - (selected ? 6 : Math.abs(Math.cos(Game.T * 0.2 + tabI)) * 6) - 24 * s), 48 * s, 48 * s);
                else Game.LeftBackground.drawImage(Pic(pic), 96 * frame, 0, 96, 96, (x - 24 * s), (y - 24 * s), 48 * s, 48 * s);

                tabI++;
                y += 48;
            }

        }

        /*=====================================================================================
		VISUAL EFFECTS
		=======================================================================================*/

        Game.Milks = [
            {name: 'Rank I - Plain Rum', pic: 'milkPlain', icon: [1, 8]},
            {name: 'Rank II - Chocolate Rum', pic: 'milkChocolate', icon: [2, 8]},
            {name: 'Rank III - Raspberry Rum', pic: 'milkRaspberry', icon: [3, 8]},
            {name: 'Rank IV - Orange Rum', pic: 'milkOrange', icon: [4, 8]},
            {name: 'Rank V - Caramel Rum', pic: 'milkCaramel', icon: [5, 8]},
            {name: 'Rank VI - Banana Rum', pic: 'milkBanana', icon: [6, 8]},
            {name: 'Rank VII - Lime Rum', pic: 'milkLime', icon: [7, 8]},
            {name: 'Rank VIII - Blueberry Rum', pic: 'milkBlueberry', icon: [8, 8]},
            {name: 'Rank IX - Strawberry Rum', pic: 'milkStrawberry', icon: [9, 8]},
            {name: 'Rank X - Vanilla Rum', pic: 'milkVanilla', icon: [10, 8]},
            {name: 'Rank XI - Honey Rum', pic: 'milkHoney', icon: [21, 23]},
            {name: 'Rank XII - Coffee Rum', pic: 'milkCoffee', icon: [22, 23]},
            {name: 'Rank XIII - Rum with a spot of Tea', pic: 'milkTea', icon: [23, 23]},
            {name: 'Rank XIV - Coconut Rum', pic: 'milkCoconut', icon: [24, 23]},
            {name: 'Rank XV - Cherry Rum', pic: 'milkCherry', icon: [25, 23]},
            {name: 'Rank XVI - Spicy Rum', pic: 'milkSpiced', icon: [26, 23]},
            {name: 'Rank XVII - Maple Rum', pic: 'milkMaple', icon: [28, 23]},
            {name: 'Valentines Rum', pic: 'milkValentines', icon: [26, 23, 'img/modIcons.png']}, //the fact that the picture is still named goat milk... i guess Xoda is no better than Orteil //Haha fixed it --Xoda
        ];
        Game.Milk = Game.Milks[0];

        Game.mousePointer = 0;//when 1, draw the mouse as a pointer on the left screen

        Game.cookieOriginX = 0;
        Game.cookieOriginY = 0;
        Game.DrawBackground = () => {

            let me;
            let y2;
            let x2;
            let n;
            let d;
            let a;
            let amount;
            let ii;
            let pic;
            let s;
            let y;
            let x;
            let w;
            Timer.clean();
            //background
            if (!Game.Background)//init some stuff
            {
                Game.Background = elementByID('backgroundCanvas').getContext('2d');
                Game.Background.canvas.width = Game.Background.canvas.parentNode.offsetWidth;
                Game.Background.canvas.height = Game.Background.canvas.parentNode.offsetHeight;
                Game.LeftBackground = elementByID('backgroundLeftCanvas').getContext('2d');
                Game.LeftBackground.canvas.width = Game.LeftBackground.canvas.parentNode.offsetWidth;
                Game.LeftBackground.canvas.height = Game.LeftBackground.canvas.parentNode.offsetHeight;
                //preload ascend animation bits so they show up instantly
                Game.LeftBackground.globalAlpha = 0;
                Game.LeftBackground.drawImage(Pic('brokenCookie.png'), 0, 0);
                Game.LeftBackground.drawImage(Pic('brokenCookieHalo.png'), 0, 0);
                Game.LeftBackground.drawImage(Pic('starbg.jpg'), 0, 0);

                window.addEventListener('resize', function (event) {
                    Game.Background.canvas.width = Game.Background.canvas.parentNode.offsetWidth;
                    Game.Background.canvas.height = Game.Background.canvas.parentNode.offsetHeight;
                    Game.LeftBackground.canvas.width = Game.LeftBackground.canvas.parentNode.offsetWidth;
                    Game.LeftBackground.canvas.height = Game.LeftBackground.canvas.parentNode.offsetHeight;
                });
            }

            let ctx = Game.LeftBackground;

            if (Game.OnAscend) {
                Timer.clean();
                //starry background on ascend screen
                w = Game.Background.canvas.width;
                let h = Game.Background.canvas.height;
                let b = Game.ascendl.getBoundingClientRect();
                x = (b.left + b.right) / 2;
                y = (b.top + b.bottom) / 2;
                Game.Background.globalAlpha = 0.5;
                s = 1 * Game.AscendZoom * (1 + Math.cos(Game.T * 0.0027) * 0.05);
                Game.Background.fillPattern(Pic('starbg.jpg'), 0, 0, w, h, 1024 * s, 1024 * s, x + Game.AscendOffX * 0.25 * s, y + Game.AscendOffY * 0.25 * s);
                Timer.track('star layer 1');
                if (Game.prefs.fancy) {
                    //additional star layer
                    Game.Background.globalAlpha = 0.5 * (0.5 + Math.sin(Game.T * 0.02) * 0.3);
                    s = 2 * Game.AscendZoom * (1 + Math.sin(Game.T * 0.002) * 0.07);
                    //Game.Background.globalCompositeOperation='lighter';
                    Game.Background.fillPattern(Pic('starbg.jpg'), 0, 0, w, h, 1024 * s, 1024 * s, x + Game.AscendOffX * 0.25 * s, y + Game.AscendOffY * 0.25 * s);
                    //Game.Background.globalCompositeOperation='source-over';
                    Timer.track('star layer 2');

                    x = x + Game.AscendOffX * Game.AscendZoom;
                    y = y + Game.AscendOffY * Game.AscendZoom;
                    //wispy nebula around the center
                    Game.Background.save();
                    Game.Background.globalAlpha = 0.5;
                    Game.Background.translate(x, y);
                    Game.Background.globalCompositeOperation = 'lighter';
                    Game.Background.rotate(Game.T * 0.001);
                    s = (600 + 150 * Math.sin(Game.T * 0.007)) * Game.AscendZoom;
                    Game.Background.drawImage(Pic('heavenRing1.jpg'), -s / 2, -s / 2, s, s);
                    Game.Background.rotate(-Game.T * 0.0017);
                    s = (600 + 150 * Math.sin(Game.T * 0.0037)) * Game.AscendZoom;
                    Game.Background.drawImage(Pic('heavenRing2.jpg'), -s / 2, -s / 2, s, s);
                    Game.Background.restore();
                    Timer.track('nebula');
                }
            } else {

                let i;
                let goodBuff = 0;
                let badBuff = 0;
                for (i in Game.buffs) {
                    if (Game.buffs[i].aura === 1) goodBuff = 1;
                    if (Game.buffs[i].aura === 2) badBuff = 1;
                }

                if (Game.drawT % 5 === 0) {
                    Game.defaultBg = 'bgBlue';
                    Game.bgR = 0;

                    if (Game.season === 'fools') Game.defaultBg = 'bgMoney';
                    if (Game.elderWrathD < 1) {
                        Game.bgR = 0;
                        Game.bg = Game.defaultBg;
                        Game.bgFade = Game.defaultBg;
                    } else if (Game.elderWrathD >= 1 && Game.elderWrathD < 2) {
                        Game.bgR = (Game.elderWrathD - 1);
                        Game.bg = Game.defaultBg;
                        Game.bgFade = 'grandmas1';
                    } else if (Game.elderWrathD >= 2 && Game.elderWrathD < 3) {
                        Game.bgR = (Game.elderWrathD - 2);
                        Game.bg = 'grandmas1';
                        Game.bgFade = 'grandmas2';
                    } else if (Game.elderWrathD >= 3)// && Game.elderWrathD<4)
                    {
                        Game.bgR = (Game.elderWrathD - 3);
                        Game.bg = 'grandmas2';
                        Game.bgFade = 'grandmas3';
                    }

                    if (Game.bgType !== 0 && Game.ascensionMode !== 1) {
                        Game.bgR = 0;
                        Game.bg = Game.BGsByChoice[Game.bgType].pic;
                        Game.bgFade = Game.bg;
                    }

                    Game.Background.fillPattern(Pic(Game.bg + '.jpg'), 0, 0, Game.Background.canvas.width, Game.Background.canvas.height, 512, 512, 0, 0);
                    if (Game.bgR > 0) {
                        Game.Background.globalAlpha = Game.bgR;
                        Game.Background.fillPattern(Pic(Game.bgFade + '.jpg'), 0, 0, Game.Background.canvas.width, Game.Background.canvas.height, 512, 512, 0, 0);
                    }
                    Game.Background.globalAlpha = 1;
                    Game.Background.drawImage(Pic('shadedBordersSoft.png'), 0, 0, Game.Background.canvas.width, Game.Background.canvas.height);

                }
                Timer.track('window background');

                //clear
                ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
                /*if (Game.AscendTimer<Game.AscendBreakpoint) ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);
				else
				{
					ctx.globalAlpha=0.05;
					ctx.fillStyle='#000';
					ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);
					ctx.globalAlpha=1;
					OldCanvasDrawImage.apply(ctx,[ctx.canvas,Math.random()*4-2,Math.random()*4-2-4]);
					ctx.globalAlpha=1;
				}*/
                Timer.clean();

                let showDragon = 0;
                if (Game.hasBuff('Dragonflight') || Game.hasBuff('Dragon Harvest')) showDragon = 1;

                Game.cookieOriginX = Math.floor(ctx.canvas.width / 2);
                Game.cookieOriginY = Math.floor(ctx.canvas.height * 0.4);

                if (Game.AscendTimer === 0) {
                    if (Game.prefs.particles) {
                        //falling cookies
                        pic = '';
                        let opacity = 1;
                        if (Game.elderWrathD <= 1.5) {
                            if (Game.cookiesPs >= 1000) pic = 'cookieShower3.png';
                            else if (Game.cookiesPs >= 500) pic = 'cookieShower2.png';
                            else if (Game.cookiesPs >= 50) pic = 'cookieShower1.png';
                            else pic = '';
                        }
                        if (pic !== '') {
                            if (Game.elderWrathD >= 1) opacity = 1 - ((Math.min(Game.elderWrathD, 1.5) - 1) / 0.5);
                            ctx.globalAlpha = opacity;
                            y = (Math.floor(Game.T * 2) % 512);
                            ctx.fillPattern(Pic(pic), 0, 0, ctx.canvas.width, ctx.canvas.height + 512, 512, 512, 0, y);
                            ctx.globalAlpha = 1;
                        }
                        //snow
                        if (Game.season === 'christmas') {
                            y = (Math.floor(Game.T * 2.5) % 512);
                            ctx.globalAlpha = 0.75;
                            ctx.globalCompositeOperation = 'lighter';
                            ctx.fillPattern(Pic('snow2.jpg'), 0, 0, ctx.canvas.width, ctx.canvas.height + 512, 512, 512, 0, y);
                            ctx.globalCompositeOperation = 'source-over';
                            ctx.globalAlpha = 1;
                        }
                        //hearts
                        if (Game.season === 'valentines') {
                            y = (Math.floor(Game.T * 2.5) % 512);
                            ctx.globalAlpha = 1;
                            ctx.fillPattern(Pic('heartStorm.png'), 0, 0, ctx.canvas.width, ctx.canvas.height + 512, 512, 512, 0, y);
                            ctx.globalAlpha = 1;
                        }
                        Timer.track('left background');

                        Game.particlesDraw(0);
                        ctx.globalAlpha = 1;
                        Timer.track('particles');

                        //big cookie shine
                        s = 512;

                        x = Game.cookieOriginX;
                        y = Game.cookieOriginY;

                        const r = Math.floor((Game.T * 0.5) % 360);
                        ctx.save();
                        ctx.translate(x, y);
                        ctx.rotate((r / 360) * Math.PI * 2);
                        let alphaMult = 1;
                        if (Game.bgType === 2 || Game.bgType === 4) alphaMult = 0.5;
                        pic = 'shine.png';
                        if (goodBuff) {
                            pic = 'shineGold.png';
                            alphaMult = 1;
                        } else if (badBuff) {
                            pic = 'shineRed.png';
                            alphaMult = 1;
                        }
                        if (goodBuff && Game.prefs.fancy) ctx.globalCompositeOperation = 'lighter';
                        ctx.globalAlpha = 0.5 * alphaMult;
                        ctx.drawImage(Pic(pic), -s / 2, -s / 2, s, s);
                        ctx.rotate((-r * 2 / 360) * Math.PI * 2);
                        ctx.globalAlpha = 0.25 * alphaMult;
                        ctx.drawImage(Pic(pic), -s / 2, -s / 2, s, s);
                        ctx.restore();
                        Timer.track('shine');

                        if (Game.ReincarnateTimer > 0) {
                            ctx.globalAlpha = 1 - Game.ReincarnateTimer / Game.ReincarnateDuration;
                            ctx.fillStyle = '#000';
                            ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
                            ctx.globalAlpha = 1;
                        }

                        if (showDragon) {
                            //big dragon
                            s = 300 * 2 * (1 + Math.sin(Game.T * 0.013) * 0.1);
                            x = Game.cookieOriginX - s / 2;
                            y = Game.cookieOriginY - s / (1.4 + 0.2 * Math.sin(Game.T * 0.01));
                            ctx.drawImage(Pic('dragonBG.png'), x, y, s, s);
                        }

                        //big cookie
                        ctx.globalAlpha = 1;
                        s = 256 * Game.BigCookieSize;
                        x = Game.cookieOriginX;
                        y = Game.cookieOriginY;
                        ctx.save();
                        ctx.translate(x, y);
                        if (Game.season === 'easter') {
                            const nestW = 304 * 0.98 * Game.BigCookieSize;
                            const nestH = 161 * 0.98 * Game.BigCookieSize;
                            ctx.drawImage(Pic('nest.png'), -nestW / 2, -nestH / 2 + 130, nestW, nestH);
                        }
                        ctx.drawImage(Pic('perfectCookie.png'), -s / 2, -s / 2, s, s);
                        if (goodBuff && Game.prefs.particles)//sparkle
                        {
                            ctx.globalCompositeOperation = 'lighter';
                            for (i = 0; i < 1; i++) {
                                ctx.globalAlpha = Math.random() * 0.65 + 0.1;
                                let size = Math.random() * 30 + 5;
                                a = Math.random() * Math.PI * 2;
                                d = s * 0.9 * Math.random() / 2;
                                ctx.drawImage(Pic('glint.jpg'), -size / 2 + Math.sin(a) * d, -size / 2 + Math.cos(a) * d, size, size);
                            }
                        }
                        ctx.restore();
                        Timer.track('big cookie');
                    } else//no particles
                    {
                        //big cookie shine
                        s = 512;
                        x = Game.cookieOriginX - s / 2;
                        y = Game.cookieOriginY - s / 2;
                        ctx.globalAlpha = 0.5;
                        ctx.drawImage(Pic('shine.png'), x, y, s, s);

                        if (showDragon) {
                            //big dragon
                            s = 300 * 2 * (1 + Math.sin(Game.T * 0.013) * 0.1);
                            x = Game.cookieOriginX - s / 2;
                            y = Game.cookieOriginY - s / (1.4 + 0.2 * Math.sin(Game.T * 0.01));
                            ctx.drawImage(Pic('dragonBG.png'), x, y, s, s);
                        }

                        //big cookie
                        ctx.globalAlpha = 1;
                        s = 256 * Game.BigCookieSize;
                        x = Game.cookieOriginX - s / 2;
                        y = Game.cookieOriginY - s / 2;
                        ctx.drawImage(Pic('perfectCookie.png'), x, y, s, s);
                    }

                    //cursors
                    if (Game.prefs.cursors) {
                        ctx.save();
                        ctx.translate(Game.cookieOriginX, Game.cookieOriginY);
                        pic = Pic('cursor.png');
                        let fancy = Game.prefs.fancy;

                        if (showDragon) ctx.globalAlpha = 0.25;
                        amount = Game.Objects['Cursor'].amount;
                        //var spe=-1;
                        for (i = 0; i < amount; i++) {
                            n = Math.floor(i / 50);
                            //var a=((i+0.5*n)%50)/50;
                            w = 0;
                            if (fancy) w = (Math.sin(Game.T * 0.025 + (((i + n * 12) % 25) / 25) * Math.PI * 2));
                            if (w > 0.997) w = 1.5;
                            else if (w > 0.994) w = 0.5;
                            else w = 0;
                            w *= -4;
                            if (fancy) w += Math.sin((n + Game.T * 0.01) * Math.PI / 2) * 4;
                            x = 0;
                            y = (140/* *Game.BigCookieSize*/ + n * 16 + w) - 16;

                            let rot = 7.2;//(1/50)*360
                            if (i === 0 && fancy) rot -= Game.T * 0.1;
                            if (i % 50 === 0) rot += 7.2 / 2;
                            ctx.rotate((rot / 360) * Math.PI * 2);
                            ctx.drawImage(pic, 0, 0, 32, 32, x, y, 32, 32);
                            //ctx.drawImage(pic,32*(i==spe),0,32,32,x,y,32,32);

                            /*if (i==spe)
							{
								y+=16;
								x=Game.cookieOriginX+Math.sin(-((r-5)/360)*Math.PI*2)*y;
								y=Game.cookieOriginY+Math.cos(-((r-5)/360)*Math.PI*2)*y;
								if (Game.CanClick && ctx && Math.abs(Game.mouseX-x)<16 && Math.abs(Game.mouseY-y)<16) Game.mousePointer=1;
							}*/
                        }
                        ctx.restore();
                        Timer.track('cursors');
                    }
                } else {
                    let tBase = Math.max(0, (Game.AscendTimer - Game.AscendBreakpoint) / (Game.AscendDuration - Game.AscendBreakpoint));
                    //big crumbling cookie
                    //var t=(3*Math.pow(tBase,2)-2*Math.pow(tBase,3));//S curve
                    let t = Math.pow(tBase, 0.5);

                    let shake = 0;
                    if (Game.AscendTimer < Game.AscendBreakpoint) {
                        shake = Game.AscendTimer / Game.AscendBreakpoint;
                    }
                    //else {shake=1-t;}

                    ctx.globalAlpha = 1;

                    x = Game.cookieOriginX;
                    y = Game.cookieOriginY;

                    x += (Math.random() * 2 - 1) * 10 * shake;
                    y += (Math.random() * 2 - 1) * 10 * shake;

                    s = 1;
                    if (tBase > 0) {
                        ctx.save();
                        ctx.globalAlpha = 1 - Math.pow(t, 0.5);
                        ctx.translate(x, y);
                        ctx.globalCompositeOperation = 'lighter';
                        ctx.rotate(Game.T * 0.007);
                        s = 0.5 + Math.pow(tBase, 0.6);
                        let s2 = (600) * s;
                        ctx.drawImage(Pic('heavenRing1.jpg'), -s2 / 2, -s2 / 2, s2, s2);
                        ctx.rotate(-Game.T * 0.002);
                        s = 0.5 + Math.pow(1 - tBase, 0.4);
                        s2 = (600) * s;
                        ctx.drawImage(Pic('heavenRing2.jpg'), -s2 / 2, -s2 / 2, s2, s2);
                        ctx.restore();
                    }

                    s = 256;//*Game.BigCookieSize;

                    ctx.save();
                    ctx.translate(x, y);
                    ctx.rotate((t * (-0.1)) * Math.PI * 2);

                    const chunks = {0: 7, 1: 6, 2: 3, 3: 2, 4: 8, 5: 1, 6: 9, 7: 5, 8: 0, 9: 4};
                    s *= t / 2 + 1;
                    ctx.globalAlpha = 1 - t;
                    for (i = 0; i < 10; i++) {
                        d = (t) * (80 + ((i + 2) % 3) * 40);
                        x2 = (Math.random() * 2 - 1) * 5 * shake;
                        y2 = (Math.random() * 2 - 1) * 5 * shake;
                        ctx.drawImage(Pic('brokenCookie.png'), 256 * (chunks[i]), 0, 256, 256, -s / 2 + Math.sin(-(((chunks[i] + 4) % 10) / 10) * Math.PI * 2) * d + x2, -s / 2 + Math.cos(-(((chunks[i] + 4) % 10) / 10) * Math.PI * 2) * d + y2, s, s);
                    }
                    let brokenHalo = 1 - Math.min(t / (1 / 3), 1 / 3) * 3;
                    if (Game.AscendTimer < Game.AscendBreakpoint) brokenHalo = Game.AscendTimer / Game.AscendBreakpoint;
                    ctx.globalAlpha = brokenHalo;
                    ctx.drawImage(Pic('brokenCookieHalo.png'), -s / 1.3333, -s / 1.3333, s * 1.5, s * 1.5);

                    ctx.restore();

                    //flares
                    n = 9;
                    t = Game.AscendTimer / Game.AscendBreakpoint;
                    if (Game.AscendTimer < Game.AscendBreakpoint) {
                        ctx.save();
                        ctx.translate(x, y);
                        for (i = 0; i < n; i++) {
                            if (Math.floor(t / 3 * n * 3 + i * 2.7) % 2) {
                                const t2 = Math.pow((t / 3 * n * 3 + i * 2.7) % 1, 1.5);
                                ctx.globalAlpha = (1 - t) * (Game.drawT % 2 === 0 ? 0.5 : 1);
                                const sw = (1 - t2 * 0.5) * 96;
                                const sh = (0.5 + t2 * 1.5) * 96;
                                ctx.drawImage(Pic('shineSpoke.png'), -sw / 2, -sh - 32 - (1 - t2) * 256, sw, sh);
                            }
                            ctx.rotate(Math.PI * 2 / n);
                        }
                        ctx.restore();
                    }


                    //flash at breakpoint
                    if (tBase < 0.1 && tBase > 0) {
                        ctx.globalAlpha = 1 - tBase / 0.1;
                        ctx.fillStyle = '#fff';
                        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
                        ctx.globalAlpha = 1;
                    }
                    if (tBase > 0.8) {
                        ctx.globalAlpha = (tBase - 0.8) / 0.2;
                        ctx.fillStyle = '#000';
                        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
                        ctx.globalAlpha = 1;
                    }
                }

                //milk and milk accessories
                if (Game.prefs.milk) {
                    let width = ctx.canvas.width;
                    let height = ctx.canvas.height;
                    x = Math.floor((Game.T * 2 - (Game.milkH - Game.milkHd) * 2000 + 480 * 2) % 480);//Math.floor((Game.T*2+Math.sin(Game.T*0.1)*2+Math.sin(Game.T*0.03)*2-(Game.milkH-Game.milkHd)*2000+480*2)%480);
                    y = (Game.milkHd) * height;//(((Game.milkHd)*ctx.canvas.height)*(1+0.05*(Math.sin(Game.T*0.017)/2+0.5)));
                    a = 1;
                    if (Game.AscendTimer > 0) {
                        y *= 1 - Math.pow((Game.AscendTimer / Game.AscendBreakpoint), 2) * 2;
                        a *= 1 - Math.pow((Game.AscendTimer / Game.AscendBreakpoint), 2) * 2;
                    } else if (Game.ReincarnateTimer > 0) {
                        y *= 1 - Math.pow(1 - (Game.ReincarnateTimer / Game.ReincarnateDuration), 2) * 2;
                        a *= 1 - Math.pow(1 - (Game.ReincarnateTimer / Game.ReincarnateDuration), 2) * 2;
                    }

                    if (Game.TOYS) {
                        //golly
                        if (!Game.Toy) {
                            Game.toys = [];
                            Game.toysType = chooseRandomElement([1, 2]);
                            Game.Toy = function (x, y) {
                                this.id = Game.toys.length;
                                this.x = x;
                                this.y = y;
                                this.xd = Math.random() * 10 - 5;
                                this.yd = Math.random() * 10 - 5;
                                this.r = Math.random() * Math.PI * 2;
                                let v = Math.random();
                                let a = 0.5;
                                let b = 0.5;
                                if (v <= a) v = b - b * Math.pow(1 - v / a, 3); else v = b + (1 - b) * Math.pow((v - a) / (1 - a), 3);
                                this.s = (Game.toysType === 1 ? 64 : 48) * (0.1 + v * 1.9);
                                if (Game.toysType === 2) this.s = (this.id % 10 === 1) ? 96 : 48;
                                this.s = 0;
                                let cookies = [[10, 0]];
                                for (let i in Game.Upgrades) {
                                    let cookie = Game.Upgrades[i];
                                    if (cookie.bought > 0 && cookie.pool === 'cookie') cookies.push(cookie.icon);
                                }
                                this.icon = chooseRandomElement(cookies);
                                this.dragged = false;
                                this.l = document.createElement('div');
                                this.l.innerHTML = this.id;
                                this.l.style.cssText = 'cursor:pointer;border-radius:' + (this.s / 2) + 'px;opacity:0;width:' + this.s + 'px;height:' + this.s + 'px;background:#999;position:absolute;left:0px;top:0px;z-index:10000000;transform:translate(-1000px,-1000px);';
                                elementByID('sectionLeft').appendChild(this.l);
                                AddEvent(this.l, 'mousedown', function (what) {
                                    return function () {
                                        what.dragged = true;
                                    };
                                }(this));
                                AddEvent(this.l, 'mouseup', function (what) {
                                    return function () {
                                        what.dragged = false;
                                    };
                                }(this));
                                Game.toys.push(this);
                                return this;
                            }
                            for (i = 0; i < Math.floor(Math.random() * 15 + (Game.toysType === 1 ? 5 : 30)); i++) {
                                new Game.Toy(Math.random() * width, Math.random() * height * 0.3);
                            }
                        }
                        ctx.globalAlpha = 0.5;
                        for (i in Game.toys) {
                            me = Game.toys[i];
                            ctx.save();
                            ctx.translate(me.x, me.y);
                            ctx.rotate(me.r);
                            if (Game.toysType === 1) ctx.drawImage(Pic('smallCookies.png'), (me.id % 8) * 64, 0, 64, 64, -me.s / 2, -me.s / 2, me.s, me.s);
                            else ctx.drawImage(Pic('icons.png'), me.icon[0] * 48, me.icon[1] * 48, 48, 48, -me.s / 2, -me.s / 2, me.s, me.s);
                            ctx.restore();
                        }
                        ctx.globalAlpha = 1;
                        for (i in Game.toys) {
                            me = Game.toys[i];
                            //psst... not real physics
                            for (ii in Game.toys) {
                                let it = Game.toys[ii];
                                if (it.id !== me.id) {
                                    let x1 = me.x + me.xd;
                                    let y1 = me.y + me.yd;
                                    x2 = it.x + it.xd;
                                    y2 = it.y + it.yd;
                                    let dist = Math.sqrt(Math.pow((x1 - x2), 2) + Math.pow((y1 - y2), 2)) / (me.s / 2 + it.s / 2);
                                    if (dist < (Game.toysType === 1 ? 0.95 : 0.75)) {
                                        let angle = Math.atan2(y1 - y2, x1 - x2);
                                        let v1 = Math.sqrt(Math.pow((me.xd), 2) + Math.pow((me.yd), 2));
                                        let v2 = Math.sqrt(Math.pow((it.xd), 2) + Math.pow((it.yd), 2));
                                        let v = ((v1 + v2) / 2 + dist) * 0.75;
                                        let ratio = it.s / me.s;
                                        me.xd += Math.sin(-angle + Math.PI / 2) * v * (ratio);
                                        me.yd += Math.cos(-angle + Math.PI / 2) * v * (ratio);
                                        it.xd += Math.sin(-angle - Math.PI / 2) * v * (1 / ratio);
                                        it.yd += Math.cos(-angle - Math.PI / 2) * v * (1 / ratio);
                                        me.rd += (Math.random() - 0.5) * 0.1 * (ratio);
                                        it.rd += (Math.random() - 0.5) * 0.1 * (1 / ratio);
                                        me.rd *= Math.min(1, v);
                                        it.rd *= Math.min(1, v);
                                    }
                                }
                            }
                            if (me.y >= height - (Game.milkHd) * height + 8) {
                                me.xd *= 0.85;
                                me.yd *= 0.85;
                                me.rd *= 0.85;
                                me.yd -= 1;
                                me.xd += (Math.random() - 0.5) * 0.3;
                                me.yd += (Math.random() - 0.5) * 0.05;
                                me.rd += (Math.random() - 0.5) * 0.02;
                            } else {
                                me.xd *= 0.99;
                                me.rd *= 0.99;
                                me.yd += 1;
                            }
                            me.yd *= (Math.min(1, Math.abs(me.y - (height - (Game.milkHd) * height) / 16)));
                            me.rd += me.xd * 0.01 / (me.s / (Game.toysType === 1 ? 64 : 48));
                            if (me.x < me.s / 2 && me.xd < 0) me.xd = Math.max(0.1, -me.xd * 0.6); else if (me.x < me.s / 2) {
                                me.xd = 0;
                                me.x = me.s / 2;
                            }
                            if (me.x > width - me.s / 2 && me.xd > 0) me.xd = Math.min(-0.1, -me.xd * 0.6); else if (me.x > width - me.s / 2) {
                                me.xd = 0;
                                me.x = width - me.s / 2;
                            }
                            me.xd = Math.min(Math.max(me.xd, -30), 30);
                            me.yd = Math.min(Math.max(me.yd, -30), 30);
                            me.rd = Math.min(Math.max(me.rd, -0.5), 0.5);
                            me.x += me.xd;
                            me.y += me.yd;
                            me.r += me.rd;
                            me.r = me.r % (Math.PI * 2);
                            me.s += (me.st - me.s) * 0.5;
                            if (Game.toysType === 2 && !me.dragged && Math.random() < 0.003) me.st = chooseRandomElement([48, 48, 48, 48, 96]);
                            if (me.dragged) {
                                me.x = Game.mouseX;
                                me.y = Game.mouseY;
                                me.xd += ((Game.mouseX - Game.mouseX2) * 3 - me.xd) * 0.5;
                                me.yd += ((Game.mouseY - Game.mouseY2) * 3 - me.yd) * 0.5
                                me.l.style.transform = 'translate(' + (me.x - me.s / 2) + 'px,' + (me.y - me.s / 2) + 'px) scale(50)';
                            } else me.l.style.transform = 'translate(' + (me.x - me.s / 2) + 'px,' + (me.y - me.s / 2) + 'px)';
                            me.l.style.width = me.s + 'px';
                            me.l.style.height = me.s + 'px';
                            ctx.save();
                            ctx.translate(me.x, me.y);
                            ctx.rotate(me.r);
                            if (Game.toysType === 1) ctx.drawImage(Pic('smallCookies.png'), (me.id % 8) * 64, 0, 64, 64, -me.s / 2, -me.s / 2, me.s, me.s);
                            else ctx.drawImage(Pic('icons.png'), me.icon[0] * 48, me.icon[1] * 48, 48, 48, -me.s / 2, -me.s / 2, me.s, me.s);
                            ctx.restore();
                        }
                    }

                    pic = Game.Milk.pic;
                    if (Game.milkType !== 0 && Game.ascensionMode !== 1) pic = Game.MilksByChoice[Game.milkType].pic;
                    ctx.globalAlpha = 0.9 * a;
                    ctx.fillPattern(Pic(pic + '.png'), 0, height - y, width + 480, 1, 480, 480, x, 0);

                    ctx.fillStyle = '#000';
                    ctx.fillRect(0, height - y + 480, width, Math.max(0, (y - 480)));
                    ctx.globalAlpha = 1;

                    Timer.track('milk');
                }

                if (Game.AscendTimer > 0) {
                    ctx.drawImage(Pic('shadedBordersSoft.png'), 0, 0, ctx.canvas.width, ctx.canvas.height);
                }

                if (Game.AscendTimer === 0) {
                    Game.DrawWrinklers();
                    Timer.track('wrinklers');
                    Game.DrawSpecial();
                    Timer.track('evolvables');

                    Game.particlesDraw(2);
                    Timer.track('text particles');

                    //shiny border during frenzies etc
                    ctx.globalAlpha = 1;
                    let borders = 'shadedBordersSoft.png';
                    if (goodBuff) borders = 'shadedBordersGold.png';
                    else if (badBuff) borders = 'shadedBordersRed.png';
                    if (goodBuff && Game.prefs.fancy) ctx.globalCompositeOperation = 'lighter';
                    ctx.drawImage(Pic(borders), 0, 0, ctx.canvas.width, ctx.canvas.height);
                    if (goodBuff && Game.prefs.fancy) ctx.globalCompositeOperation = 'source-over';
                }
            }
        };


        /*=====================================================================================
		INITIALIZATION END; GAME READY TO LAUNCH
		=======================================================================================*/

        Game.killShimmers();

        //booooo
        Game.RuinTheFun = silent => {
            Game.popups = 0;
            Game.SetAllUpgrades(1);
            Game.SetAllAchievs(1);
            Game.popups = 0;
            Game.Earn(999999999999999999999999999999);
            Game.MaxSpecials();
            Game.nextResearch = 0;
            Game.researchT = -1;
            Game.upgradesToRebuild = 1;
            Game.recalculateGains = 1;
            Game.popups = 1;
            for (let i in Game.Objects) {
                let me = Game.Objects[i];
                if (me.minigame && me.minigame.onRuinTheFun) me.minigame.onRuinTheFun();
            }
            if (!silent) {
                if (Game.prefs.popups) Game.Popup('Thou doth ruineth the fun!');
                else Game.Notify('Thou doth ruineth the fun!', 'You\'re free. Free at last.', [11, 5]);
            }
            return 'You feel a bitter taste in your mouth...';
        }

        Game.SetAllUpgrades = on => {
            Game.popups = 0;
            const leftout = ['Magic shenanigans', 'Occult obstruction', 'Glucose-charged air'];
            for (let i in Game.Upgrades) {
                if (on && (Game.Upgrades[i].pool === 'toggle' || leftout.indexOf(Game.Upgrades[i].name) !== -1)) {
                } else if (on) Game.Upgrades[i].earn();
                else if (!on) Game.Upgrades[i].lose();
            }
            Game.upgradesToRebuild = 1;
            Game.recalculateGains = 1;
            Game.popups = 1;
        }
        Game.SetAllAchievs = on => {
            Game.popups = 0;
            for (let i in Game.Achievements) {
                if (on && Game.Achievements[i].pool !== 'dungeon') Game.Win(Game.Achievements[i].name);
                else if (!on) Game.RemoveAchiev(Game.Achievements[i].name);
            }
            Game.recalculateGains = 1;
            Game.popups = 1;
        }
        Game.GetAllDebugs = () => {
            Game.popups = 0;
            for (let i in Game.Upgrades) {
                if (Game.Upgrades[i].pool === 'debug') Game.Upgrades[i].earn();
            }
            Game.upgradesToRebuild = 1;
            Game.recalculateGains = 1;
            Game.popups = 1;
        }
        Game.MaxSpecials = () => {
            Game.dragonLevel = Game.dragonLevels.length - 1;
            Game.santaLevel = Game.santaLevels.length - 1;
        }

        Game.SesameReset = () => {
            let name = Game.bakeryName;
            Game.HardReset(2);
            Game.bakeryName = name;
            Game.bakeryNameRefresh();
            Game.Achievements['Cheated cookies taste awful'].won = 1;
        }

        Game.debugTimersOn = 0;
        Game.sesame = 0;
        Game.OpenSesame = () => {
            let str = '';
            str += '<div class="icon" style="position:absolute;left:-9px;top:-6px;background-position:' + (-10 * 48) + 'px ' + (-6 * 48) + 'px;"></div>';
            str += '<div style="position:absolute;left:0;top:0;z-index:10;font-size:10px;background:#000;padding:1px;" id="fpsCounter"></div>';

            str += '<div id="devConsoleContent">';
            str += '<div class="title" style="font-size:14px;margin:6px;">Dev tools</div>';

            str += '<a class="option neato" ' + Game.clickStr + '="Game.Ascend(1);">Ascend</a>';
            str += '<div class="line"></div>';
            str += '<a class="option neato" ' + Game.clickStr + '="Game.cookies*=10;Game.cookiesEarned*=10;">x10</a>';
            str += '<a class="option neato" ' + Game.clickStr + '="Game.cookies/=10;Game.cookiesEarned/=10;">/10</a><br>';
            str += '<a class="option neato" ' + Game.clickStr + '="Game.cookies*=1000;Game.cookiesEarned*=1000;">x1k</a>';
            str += '<a class="option neato" ' + Game.clickStr + '="Game.cookies/=1000;Game.cookiesEarned/=1000;">/1k</a><br>';
            str += '<a class="option neato" ' + Game.clickStr + '="for (var i in Game.Objects){Game.Objects[i].buy(100);}">Buy 100 of all</a>';//for (var n=0;n<100;n++){for (var i in Game.Objects){Game.Objects[i].buy(1);}}
            str += '<a class="option neato" ' + Game.clickStr + '="for (var i in Game.Objects){Game.Objects[i].sell(100);}">Sell 100 of all</a><br>';
            str += '<a class="option neato" ' + Game.clickStr + '="Game.gainLumps(10);">+10 lumps</a>';
            str += '<a class="option neato" ' + Game.clickStr + '="for (var i in Game.Objects){Game.Objects[i].level=0;Game.Objects[i].onMinigame=false;Game.Objects[i].refresh();}Game.recalculateGains=1;">Reset levels</a>';
            str += '<div class="line"></div>';
            str += '<a class="option warning" ' + Game.clickStr + '="Game.RuinTheFun(1);">Ruin The Fun</a>';
            str += '<a class="option warning" ' + Game.clickStr + '="Game.SesameReset();">Wipe</a>';
            str += '<a class="option neato" ' + Game.clickStr + '="Game.GetAllDebugs();">All debugs</a>';
            str += '<a class="option neato" ' + Game.clickStr + '="Game.debugTimersOn=!Game.debugTimersOn;Game.OpenSesame();">Timers ' + (Game.debugTimersOn ? 'On' : 'Off') + '</a><br>';
            str += '<a class="option neato" ' + Game.clickStr + '="Game.SetAllUpgrades(0);">No upgrades</a>';
            str += '<a class="option neato" ' + Game.clickStr + '="Game.SetAllUpgrades(1);">All upgrades</a><br>';
            str += '<a class="option neato" ' + Game.clickStr + '="Game.SetAllAchievs(0);">No achievs</a>';
            str += '<a class="option neato" ' + Game.clickStr + '="Game.SetAllAchievs(1);">All achievs</a><br>';
            str += '<a class="option neato" ' + Game.clickStr + '="Game.santaLevel=0;Game.dragonLevel=0;">Reset specials</a>';
            str += '<a class="option neato" ' + Game.clickStr + '="Game.MaxSpecials();">Max specials</a><br>';
            str += '<a class="option neato" ' + Game.clickStr + '="Game.lumpRefill=Date.now()-Game.getLumpRefillMax();">Reset refills</a>';
            str += '<a class="option neato" ' + Game.clickStr + '="Game.EditAscend();">' + (Game.DebuggingPrestige ? 'Exit Ascend Edit' : 'Ascend Edit') + '</a>';
            str += '<a class="option neato" ' + Game.clickStr + '="Game.DebugUpgradeCpS();">Debug upgrades CpS</a>';
            str += '<a class="option neato" ' + Game.clickStr + '="Game.seed=Game.makeSeed();">Re-seed</a>';
            str += '<a class="option neato" ' + Game.clickStr + '="Game.heralds=100;elementByID(\'heraldsAmount\').innerHTML=Game.heralds;Game.externalDataLoaded=true;Game.recalculateGains=1;">Max heralds</a>';
            str += '<div class="line"></div>';
            for (let i = 0; i < Game.goldenCookieChoices.length / 2; i++) {
                str += '<a class="option neato" ' + Game.clickStr + '="var newShimmer=new Game.shimmer(\'golden\');newShimmer.force=\'' + Game.goldenCookieChoices[i * 2 + 1] + '\';">' + Game.goldenCookieChoices[i * 2] + '</a>';
                //str+='<a class="option neato" '+Game.clickStr+'="Game.goldenCookie.force=\''+Game.goldenCookie.choices[i*2+1]+'\';Game.goldenCookie.spawn();">'+Game.goldenCookie.choices[i*2]+'</a>';
                //str+='<a class="option neato" '+Game.clickStr+'="Game.goldenCookie.click(0,\''+Game.goldenCookie.choices[i*2+1]+'\');">'+Game.goldenCookie.choices[i*2]+'</a>';
            }
            str += '</div>';

            elementByID('devConsole').innerHTML = str;

            if (!elementByID('fpsGraph')) {
                let div = document.createElement('canvas');
                div.id = 'fpsGraph';
                div.width = 128;
                div.height = 64;
                div.style.opacity = 0.5;
                div.style.pointerEvents = 'none';
                div.style.transformOrigin = '0% 0%';
                div.style.transform = 'scale(0.75)';
                //l('devConsole').appendChild(div);
                elementByID('devConsole').parentNode.insertBefore(div, elementByID('devConsole').nextSibling);
                Game.fpsGraph = div;
                Game.fpsGraphCtx = Game.fpsGraph.getContext('2d', {alpha: false});
                let ctx = Game.fpsGraphCtx;
                ctx.fillStyle = '#000';
                ctx.fillRect(0, 0, 128, 64);
            }

            elementByID('debug').style.display = 'block';
            Game.sesame = 1;
            Game.Achievements['Cheated cookies taste awful'].won = 1;
        }

        Game.EditAscend = () => {
            if (!Game.DebuggingPrestige) {
                Game.DebuggingPrestige = true;
                Game.AscendTimer = 0;
                Game.OnAscend = 1;
                Game.removeClass('ascendIntro');
                Game.addClass('ascending');
            } else {
                Game.DebuggingPrestige = false;
            }
            Game.BuildAscendTree();
            Game.OpenSesame();
        }

        //experimental debugging function that cycles through every owned upgrade, turns it off and on, and lists how much each upgrade is participating to CpS
        Game.debuggedUpgradeCpS = [];
        Game.debuggedUpgradeCpClick = [];
        Game.debugColors = ['#322', '#411', '#600', '#900', '#f30', '#f90', '#ff0', '#9f0', '#0f9', '#09f', '#90f'];
        Game.DebugUpgradeCpS = () => {
            Game.CalculateGains();
            Game.debuggedUpgradeCpS = [];
            Game.debuggedUpgradeCpClick = [];
            let CpS = Game.cookiesPs;
            let CpClick = Game.computedMouseCps;
            for (let i in Game.Upgrades) {
                let me = Game.Upgrades[i];
                if (me.bought) {
                    me.bought = 0;
                    Game.CalculateGains();
                    //Game.debuggedUpgradeCpS[me.name]=CpS-Game.cookiesPs;
                    Game.debuggedUpgradeCpS[me.name] = (CpS / (Game.cookiesPs || 1) - 1);
                    Game.debuggedUpgradeCpClick[me.name] = (CpClick / (Game.computedMouseCps || 1) - 1);
                    me.bought = 1;
                }
            }
            Game.CalculateGains();
        }


        for (i in Game.customInit) {
            Game.customInit[i]();
        }

        if (!Game.LoadSave()) {//try to load the save when we open the page. if this fails, try to brute-force it half a second later
            setTimeout(() => {
                let local = Game.localStorageGet(Game.SaveTo);
                Game.LoadSave(local);
            }, 500);
        }

        Game.ready = 1;
        setTimeout(() => {
            if (typeof showAds === 'undefined' && (!elementByID('detectAds') || elementByID('detectAds').clientHeight < 1)) Game.addClass('noAds');
        }, 500);
        elementByID('javascriptError').innerHTML = '';
        elementByID('javascriptError').style.display = 'none';
        Game.Loop();
        Game.Draw();
    }
    /*=====================================================================================
	LOGIC
	=======================================================================================*/
    Game.Logic = function () {
        let me;
        let str;
        let i;
        Game.bounds = Game.l.getBoundingClientRect();

        if (!Game.OnAscend && Game.AscendTimer === 0) {
            for (i in Game.Objects) {
                if (Game.Objects[i].eachFrame) Game.Objects[i].eachFrame();
            }
            Game.UpdateSpecial();
            Game.UpdateGrandmapocalypse();

            //these are kinda fun
            //if (Game.BigCookieState==2 && !Game.promptOn && Game.Scroll!=0) Game.ClickCookie();
            //if (Game.BigCookieState==1 && !Game.promptOn) Game.ClickCookie();

            //handle graphic stuff
            if (Game.prefs.wobbly) {
                if (Game.BigCookieState === 1) Game.BigCookieSizeT = 0.98;
                else if (Game.BigCookieState === 2) Game.BigCookieSizeT = 1.05;
                else Game.BigCookieSizeT = 1;
                Game.BigCookieSizeD += (Game.BigCookieSizeT - Game.BigCookieSize) * 0.75;
                Game.BigCookieSizeD *= 0.75;
                Game.BigCookieSize += Game.BigCookieSizeD;
                Game.BigCookieSize = Math.max(0.1, Game.BigCookieSize);
            } else {
                if (Game.BigCookieState === 1) Game.BigCookieSize += (0.98 - Game.BigCookieSize) * 0.5;
                else if (Game.BigCookieState === 2) Game.BigCookieSize += (1.05 - Game.BigCookieSize) * 0.5;
                else Game.BigCookieSize += (1 - Game.BigCookieSize) * 0.5;
            }
            Game.particlesUpdate();

            if (Game.mousePointer) elementByID('sectionLeft').style.cursor = 'pointer';
            else elementByID('sectionLeft').style.cursor = 'auto';
            Game.mousePointer = 0;

            //handle milk and milk accessories
            Game.milkProgress = Game.AchievementsOwned / 25;
            if (Game.milkProgress >= 0.5) Game.Unlock('Kitten helpers');
            if (Game.milkProgress >= 1) Game.Unlock('Kitten workers');
            if (Game.milkProgress >= 2) Game.Unlock('Kitten engineers');
            if (Game.milkProgress >= 3) Game.Unlock('Kitten overseers');
            if (Game.milkProgress >= 4) Game.Unlock('Kitten managers');
            if (Game.milkProgress >= 5) Game.Unlock('Kitten accountants');
            if (Game.milkProgress >= 6) Game.Unlock('Kitten specialists');
            if (Game.milkProgress >= 7) Game.Unlock('Kitten experts');
            if (Game.milkProgress >= 8) Game.Unlock('Kitten consultants');
            if (Game.milkProgress >= 9) Game.Unlock('Kitten assistants to the regional manager');
            if (Game.milkProgress >= 10) Game.Unlock('Kitten marketeers');
            if (Game.milkProgress >= 11) Game.Unlock('Kitten analysts');
            Game.milkH = Math.min(1, Game.milkProgress) * 0.35;
            Game.milkHd += (Game.milkH - Game.milkHd) * 0.02;

            Game.Milk = Game.Milks[Math.min(Math.floor(Game.milkProgress), Game.Milks.length - 1)];

            if (Game.season === 'valentines') Game.Milk = Game.Milks[Game.Milks.length - 1];

            if (Game.autoclickerDetected > 0) Game.autoclickerDetected--;

            //handle research
            if (Game.researchT > 0) {
                Game.researchT--;
            }
            if (Game.researchT === 0 && Game.nextResearch) {
                if (!Game.Has(Game.UpgradesById[Game.nextResearch].name)) {
                    Game.Unlock(Game.UpgradesById[Game.nextResearch].name);
                    if (Game.prefs.popups) Game.Popup('Researched : ' + Game.UpgradesById[Game.nextResearch].name);
                    else Game.Notify('Research complete', 'You have discovered : <b>' + Game.UpgradesById[Game.nextResearch].name + '</b>.', Game.UpgradesById[Game.nextResearch].icon);
                }
                Game.nextResearch = 0;
                Game.researchT = -1;
                Game.recalculateGains = 1;
            }
            //handle seasons
            if (Game.seasonT > 0) {
                Game.seasonT--;
            }
            if (Game.seasonT <= 0 && Game.season !== '' && Game.season !== Game.baseSeason && !Game.Has('Eternal seasons')) {
                str = Game.seasons[Game.season].over;
                if (Game.prefs.popups) Game.Popup(str);
                else Game.Notify(str, '', Game.seasons[Game.season].triggerUpgrade.icon);
                if (Game.Has('Season switcher')) {
                    Game.Unlock(Game.seasons[Game.season].trigger);
                    Game.seasons[Game.season].triggerUpgrade.bought = 0;
                }
                Game.season = Game.baseSeason;
                Game.seasonT = -1;
            }

            //press ctrl to bulk-buy 10, shift to bulk-buy 100
            if (!Game.promptOn) {
                if ((Game.keys[16] || Game.keys[17]) && !Game.buyBulkShortcut) {
                    Game.buyBulkOld = Game.buyBulk;
                    if (Game.keys[16]) Game.buyBulk = 100;
                    if (Game.keys[17]) Game.buyBulk = 10;
                    Game.buyBulkShortcut = 1;
                    Game.storeBulkButton(-1);
                }
            }
            if ((!Game.keys[16] && !Game.keys[17]) && Game.buyBulkShortcut)//release
            {
                Game.buyBulk = Game.buyBulkOld;
                Game.buyBulkShortcut = 0;
                Game.storeBulkButton(-1);
            }

            //handle cookies
            if (Game.recalculateGains) Game.CalculateGains();
            Game.Earn(Game.cookiesPs / Game.fps);//add cookies per second

            //grow lumps
            Game.doLumps();

            //minigames
            for (i in Game.Objects) {
                me = Game.Objects[i];
                if (Game.isMinigameReady(me) && me.minigame.logic && Game.ascensionMode !== 1) me.minigame.logic();
            }

            if (Game.specialTab !== '' && Game.T % (Game.fps * 3) === 0) Game.ToggleSpecialMenu(1);

            //wrinklers
            if (Game.cpsSucked > 0) {
                Game.Dissolve((Game.cookiesPs / Game.fps) * Game.cpsSucked);
                Game.cookiesSucked += ((Game.cookiesPs / Game.fps) * Game.cpsSucked);
                //should be using one of the following, but I'm not sure what I'm using this stat for anymore
                //Game.cookiesSucked=Game.wrinklers.reduce(function(s,w){return s+w.sucked;},0);
                //for (var i in Game.wrinklers) {Game.cookiesSucked+=Game.wrinklers[i].sucked;}
            }

            //var cps=Game.cookiesPs+Game.cookies*0.01;//exponential cookies
            //Game.Earn(cps/Game.fps);//add cookies per second

            for (i in Game.Objects) {
                me = Game.Objects[i];
                me.totalCookies += (me.storedTotalCps * Game.globalCpsMult) / Game.fps;
            }
            if (Game.cookies && Game.T % Math.ceil(Game.fps / Math.min(10, Game.cookiesPs)) === 0 && Game.prefs.particles) Game.particleAdd();//cookie shower

            if (Game.T % (Game.fps * 10) === 0) Game.recalculateGains = 1;//recalculate CpS every 10 seconds (for dynamic boosts such as Century egg)

            /*=====================================================================================
			UNLOCKING STUFF
			=======================================================================================*/
            if (Game.T % (Game.fps) === 0 && Math.random() < 1 / 500000) Game.Win('Just plain lucky');//1 chance in 500,000 every second achievement
            if (Game.T % (Game.fps * 5) === 0 && Game.ObjectsById.length > 0)//check some achievements and upgrades
            {
                if (isNaN(Game.cookies)) {
                    Game.cookies = 0;
                    Game.cookiesEarned = 0;
                    Game.recalculateGains = 1;
                }

                let timePlayed = new Date();
                timePlayed.setTime(Date.now() - Game.startDate);

                if (!Game.fullDate || (Date.now() - Game.fullDate) >= 365 * 24 * 60 * 60 * 1000) Game.Win('So much to do so much to see');

                if (Game.cookiesEarned >= 1000000 && (Game.ascensionMode === 1 || Game.resets === 0))//challenge run or hasn't ascended yet
                {
                    if (timePlayed <= 1000 * 60 * 35) Game.Win('Speed baking I');
                    if (timePlayed <= 1000 * 60 * 25) Game.Win('Speed baking II');
                    if (timePlayed <= 1000 * 60 * 15) Game.Win('Speed baking III');

                    if (Game.cookieClicks <= 15) Game.Win('Neverclick');
                    if (Game.cookieClicks <= 0) Game.Win('True Neverclick');
                    if (Game.cookiesEarned >= 1000000000 && Game.UpgradesOwned === 0) Game.Win('Hardcore');
                }

                for (i in Game.UnlockAt) {
                    let unlock = Game.UnlockAt[i];
                    if (Game.cookiesEarned >= unlock.cookies) {
                        let pass = 1;
                        if (unlock.require && !Game.Has(unlock.require) && !Game.HasAchiev(unlock.require)) pass = 0;
                        if (unlock.season && Game.season !== unlock.season) pass = 0;
                        if (pass) {
                            Game.Unlock(unlock.name);
                            Game.Win(unlock.name);
                        }
                    }
                }

                if (Game.Has('Golden switch')) Game.Unlock('Golden switch [off]');
                if (Game.Has('Shimmering veil') && !Game.Has('Shimmering veil [off]') && !Game.Has('Shimmering veil [on]')) {
                    Game.Unlock('Shimmering veil [on]');
                    Game.Upgrades['Shimmering veil [off]'].earn();
                }
                if (Game.Has('Sugar craving')) Game.Unlock('Sugar frenzy');
                if (Game.Has('Classic spirit selection')) Game.Unlock('Rum Selector');
                if (Game.Has('Basic wallpaper assortment')) Game.Unlock('Background selector');
                if (Game.Has('Golden cookie alert sound')) Game.Unlock('Golden cookie sound selector');

                if (Game.Has('Eternal heart biscuits')) Game.Win('Lovely cookies');
                if (Game.season === 'easter') {
                    let eggs = 0;
                    for (i in Game.easterEggs) {
                        if (Game.HasUnlocked(Game.easterEggs[i])) eggs++;
                    }
                    if (eggs >= 1) Game.Win('The hunt is on');
                    if (eggs >= 7) Game.Win('Egging on');
                    if (eggs >= 14) Game.Win('Mass Easteria');
                    if (eggs >= Game.easterEggs.length) Game.Win('Hide & seek champion');
                }

                if (Game.prestige > 0 && Game.ascensionMode !== 1) {
                    Game.Unlock('Heavenly chip secret');
                    if (Game.Has('Heavenly chip secret')) Game.Unlock('Heavenly Neuro stand');
                    if (Game.Has('Heavenly Neuro stand')) Game.Unlock('Heavenly bakery');
                    if (Game.Has('Heavenly bakery')) Game.Unlock('Heavenly confectionery');
                    if (Game.Has('Heavenly confectionery')) Game.Unlock('Heavenly key');

                    if (Game.Has('Heavenly key')) Game.Win('Wholesome');
                }

                for (i in Game.GymAchievements) {
                    if (Game.cookiesEarned >= Game.GymAchievements[i].threshold) Game.Win(Game.GymAchievements[i].name);
                }

                let buildingsOwned = 0;
                let mathematician = 1;
                let base10 = 1;
                let minAmount = 100000;
                for (i in Game.Objects) {
                    buildingsOwned += Game.Objects[i].amount;
                    minAmount = Math.min(Game.Objects[i].amount, minAmount);
                    if (!Game.HasAchiev('Mathematician')) {
                        if (Game.Objects[i].amount < Math.min(128, Math.pow(2, (Game.ObjectsById.length - Game.Objects[i].id) - 1))) mathematician = 0;
                    }
                    if (!Game.HasAchiev('Base 10')) {
                        if (Game.Objects[i].amount < (Game.ObjectsById.length - Game.Objects[i].id) * 10) base10 = 0;
                    }
                }
                if (minAmount >= 1) Game.Win('One with everything');
                if (mathematician === 1) Game.Win('Mathematician');
                if (base10 === 1) Game.Win('Base 10');
                if (minAmount >= 100) {
                    Game.Win('Centennial');
                    Game.Unlock('Milk chocolate butter biscuit');
                }
                if (minAmount >= 150) {
                    Game.Win('Centennial and a half');
                    Game.Unlock('Dark chocolate butter biscuit');
                }
                if (minAmount >= 200) {
                    Game.Win('Bicentennial');
                    Game.Unlock('White chocolate butter biscuit');
                }
                if (minAmount >= 250) {
                    Game.Win('Bicentennial and a half');
                    Game.Unlock('Ruby chocolate butter biscuit');
                }
                if (minAmount >= 300) {
                    Game.Win('Tricentennial');
                    Game.Unlock('Lavender chocolate butter biscuit');
                }
                if (minAmount >= 350) {
                    Game.Win('Tricentennial and a half');
                    Game.Unlock('Synthetic chocolate green honey butter biscuit');
                }
                if (minAmount >= 400) {
                    Game.Win('Quadricentennial');
                    Game.Unlock('Royal raspberry chocolate butter biscuit');
                }
                if (minAmount >= 450) {
                    Game.Win('Quadricentennial and a half');
                    Game.Unlock('Ultra-concentrated high-energy chocolate butter biscuit');
                }
                if (minAmount >= 500) {
                    Game.Win('Quincentennial');
                    Game.Unlock('Pure pitch-black chocolate butter biscuit');
                }

                if (Game.handmadeCookies >= 1000) {
                    Game.Win('Clicktastic');
                    Game.Unlock('Plastic mouse');
                }
                if (Game.handmadeCookies >= 100000) {
                    Game.Win('Clickathlon');
                    Game.Unlock('Iron mouse');
                }
                if (Game.handmadeCookies >= 10000000) {
                    Game.Win('Clickolympics');
                    Game.Unlock('Titanium mouse');
                }
                if (Game.handmadeCookies >= 1000000000) {
                    Game.Win('Clickorama');
                    Game.Unlock('Adamantium mouse');
                }
                if (Game.handmadeCookies >= 100000000000) {
                    Game.Win('Clickasmic');
                    Game.Unlock('Unobtainium mouse');
                }
                if (Game.handmadeCookies >= 10000000000000) {
                    Game.Win('Clickageddon');
                    Game.Unlock('Eludium mouse');
                }
                if (Game.handmadeCookies >= 1000000000000000) {
                    Game.Win('Clicknarok');
                    Game.Unlock('Wishalloy mouse');
                }
                if (Game.handmadeCookies >= 100000000000000000) {
                    Game.Win('Clickastrophe');
                    Game.Unlock('Fantasteel mouse');
                }
                if (Game.handmadeCookies >= 10000000000000000000) {
                    Game.Win('Clickataclysm');
                    Game.Unlock('Nevercrack mouse');
                }
                if (Game.handmadeCookies >= 1000000000000000000000) {
                    Game.Win('The ultimate clickdown');
                    Game.Unlock('Armythril mouse');
                }
                if (Game.handmadeCookies >= 100000000000000000000000) {
                    Game.Win('All the other kids with the pumped up clicks');
                    Game.Unlock('Technobsidian mouse');
                }
                if (Game.handmadeCookies >= 10000000000000000000000000) {
                    Game.Win('One...more...click...');
                    Game.Unlock('Plasmarble mouse');
                }

                if (Game.cookiesEarned < Game.cookies) Game.Win('Cheated cookies taste awful');

                if (Game.Has('Skull cookies') && Game.Has('Ghost cookies') && Game.Has('Bat cookies') && Game.Has('Slime cookies') && Game.Has('Pumpkin cookies') && Game.Has('Eyeball cookies') && Game.Has('Spider cookies')) Game.Win('Spooky cookies');
                if (Game.wrinklersPopped >= 1) Game.Win('Itchscratcher');
                if (Game.wrinklersPopped >= 50) Game.Win('Wrinklesquisher');
                if (Game.wrinklersPopped >= 200) Game.Win('Moistburster');

                if (Game.cookiesEarned >= 1000000 && Game.Has('How to bake your dragon')) Game.Unlock('A crumbly egg');

                if (Game.cookiesEarned >= 25 && Game.season === 'christmas') Game.Unlock('A festive hat');
                if (Game.Has('Christmas tree biscuits') && Game.Has('Snowflake biscuits') && Game.Has('Snowman biscuits') && Game.Has('Holly biscuits') && Game.Has('Candy cane biscuits') && Game.Has('Bell biscuits') && Game.Has('Present biscuits')) Game.Win('Let it snow');

                if (Game.reindeerClicked >= 1) Game.Win('Oh deer');
                if (Game.reindeerClicked >= 50) Game.Win('Sleigh of hand');
                if (Game.reindeerClicked >= 200) Game.Win('Reindeer sleigher');

                if (buildingsOwned >= 100) Game.Win('Builder');
                if (buildingsOwned >= 500) Game.Win('Architect');
                if (buildingsOwned >= 1000) Game.Win('Engineer');
                if (buildingsOwned >= 2000) Game.Win('Lord of Constructs');
                if (Game.UpgradesOwned >= 20) Game.Win('Enhancer');
                if (Game.UpgradesOwned >= 50) Game.Win('Augmenter');
                if (Game.UpgradesOwned >= 100) Game.Win('Upgrader');
                if (Game.UpgradesOwned >= 200) Game.Win('Lord of Progress');
                if (buildingsOwned >= 3000 && Game.UpgradesOwned >= 300) Game.Win('Polymath');
                if (buildingsOwned >= 4000 && Game.UpgradesOwned >= 400) Game.Win('Renaissance baker');

                if (Game.cookiesEarned >= 10000000000000 && !Game.HasAchiev('You win a cookie')) {
                    Game.Win('You win a cookie');
                    Game.Earn(1);
                }

                if (Game.shimmerTypes['golden'].n >= 4) Game.Win('Four-leaf cookie');

                let grandmas = 0;
                for (i in Game.GrandmaSynergies) {
                    if (Game.Has(Game.GrandmaSynergies[i])) grandmas++;
                }
                if (!Game.HasAchiev('Elder') && grandmas >= 7) Game.Win('Elder');
                if (!Game.HasAchiev('Veteran') && grandmas >= 14) Game.Win('Veteran');
                if (Game.Objects['Grandma'].amount >= 6 && !Game.Has('Bingo center/Research facility') && Game.HasAchiev('Elder')) Game.Unlock('Bingo center/Research facility');
                if (Game.pledges > 0) Game.Win('Elder nap');
                if (Game.pledges >= 5) Game.Win('Elder slumber');
                if (Game.pledges >= 10) Game.Unlock('Sacrificial rolling pins');
                if (Game.Objects['Cursor'].amount + Game.Objects['Grandma'].amount >= 777) Game.Win('The elder scrolls');

                for (i in Game.Objects) {
                    const it = Game.Objects[i];
                    for (let ii in it.productionAchievs) {
                        if (it.totalCookies >= it.productionAchievs[ii].pow) Game.Win(it.productionAchievs[ii].achiev.name);
                    }
                }

                if (!Game.HasAchiev('Cookie-dunker') && Game.LeftBackground && Game.milkProgress > 0.1 && (Game.LeftBackground.canvas.height * 0.4 + 256 / 2 - 16) > ((1 - Game.milkHd) * Game.LeftBackground.canvas.height)) Game.Win('Cookie-dunker');
                //&& l('bigCookie').getBoundingClientRect().bottom>l('milk').getBoundingClientRect().top+16 && Game.milkProgress>0.1) Game.Win('Cookie-dunker');

                for (i in Game.customChecks) {
                    Game.customChecks[i]();
                }
            }

            Game.cookiesd += (Game.cookies - Game.cookiesd) * 0.3;

            if (Game.storeToRefresh) Game.RefreshStore();
            if (Game.upgradesToRebuild) Game.RebuildUpgrades();

            Game.updateShimmers();
            Game.updateBuffs();

            Game.UpdateTicker();
        }

        if (Game.T % (Game.fps * 2) === 0) {
            let title = 'Neuro Clicker';
            if (Game.season === 'fools') title = 'Neuro Baker';
            document.title = (Game.OnAscend ? 'Ascending! ' : '') + Beautify(Game.cookies) + ' ' + (Game.cookies === 1 ? 'Neuro' : 'Neuros') + ' - ' + title;
        }
        if (Game.T % 15 === 0) {
            //written through the magic of "hope for the best" maths
            let chipsOwned = Game.HowMuchPrestige(Game.cookiesReset);
            let ascendNowToOwn = Math.floor(Game.HowMuchPrestige(Game.cookiesReset + Game.cookiesEarned));
            let ascendNowToGet = ascendNowToOwn - Math.floor(chipsOwned);
            let nextChipAt = Game.HowManyCookiesReset(Math.floor(chipsOwned + ascendNowToGet + 1)) - Game.HowManyCookiesReset(Math.floor(chipsOwned + ascendNowToGet));
            let cookiesToNext = Game.HowManyCookiesReset(ascendNowToOwn + 1) - (Game.cookiesEarned + Game.cookiesReset);
            let percent = 1 - (cookiesToNext / nextChipAt);

            //fill the tooltip under the Legacy tab
            let date = new Date();
            date.setTime(Date.now() - Game.startDate);
            let timeInSeconds = date.getTime() / 1000;
            const startDate = Game.sayTime(timeInSeconds * Game.fps, -1);

            str = '';
            str += 'You\'ve been on this run for <b>' + (startDate === '' ? 'not very long' : (startDate)) + '</b>.<br>';
            str += '<div class="line"></div>';
            if (Game.prestige > 0) {
                str += 'Your prestige level is currently <b>' + Beautify(Game.prestige) + '</b>.<br>(CpS +' + Beautify(Game.prestige) + '%)';
                str += '<div class="line"></div>';
            }
            if (ascendNowToGet < 1) str += 'Ascending now would grant you no prestige.';
            else if (ascendNowToGet < 2) str += 'Ascending now would grant you<br><b>1 prestige level</b> (+1% CpS)<br>and <b>1 heavenly chip</b> to spend.';
            else str += 'Ascending now would grant you<br><b>' + Beautify(ascendNowToGet) + ' prestige levels</b> (+' + Beautify(ascendNowToGet) + '% CpS)<br>and <b>' + Beautify(ascendNowToGet) + ' heavenly chips</b> to spend.';
            str += '<div class="line"></div>';
            str += 'You need <b>' + Beautify(cookiesToNext) + ' more Neuros</b> for the next level.<br>';
            elementByID('ascendTooltip').innerHTML = str;

            if (ascendNowToGet > 0)//show number saying how many chips you'd get resetting now
            {
                str = ascendNowToGet.toString();
                let str2 = '';
                for (i in str)//add commas
                {
                    if ((str.length - i) % 3 === 0 && i > 0) str2 += ',';
                    str2 += str[i];
                }
                Game.ascendNumber.innerHTML = '+' + str2;
                Game.ascendNumber.style.display = 'block';
            } else {
                Game.ascendNumber.style.display = 'none';
            }

            if (ascendNowToGet > Game.ascendMeterLevel || Game.ascendMeterPercentT < Game.ascendMeterPercent) {
                //reset the gauge and play a sound if we gained a potential level
                Game.ascendMeterPercent = 0;
                //PlaySound('snd/levelPrestige.mp3');//a bit too annoying
            }
            Game.ascendMeterLevel = ascendNowToGet;
            Game.ascendMeterPercentT = percent;//gauge that fills up as you near your next chip
            //if (Game.ascendMeterPercentT<Game.ascendMeterPercent) {Game.ascendMeterPercent=0;PlaySound('snd/levelPrestige.mp3',0.5);}
            //if (percent>=1) {Game.ascendMeter.className='';} else Game.ascendMeter.className='filling';
        }
        Game.ascendMeter.style.right = Math.floor(Math.max(0, 1 - Game.ascendMeterPercent) * 100) + 'px';
        Game.ascendMeterPercent += (Game.ascendMeterPercentT - Game.ascendMeterPercent) * 0.1;

        Game.NotesLogic();
        if (Game.mouseMoved || Game.Scroll || Game.tooltip.dynamic) Game.tooltip.update();

        if (Game.T % (Game.fps * 5) === 0 && !Game.mouseDown && (Game.onMenu === 'stats' || Game.onMenu === 'prefs')) Game.UpdateMenu();
        if (Game.T % (Game.fps) === 0) Game.UpdatePrompt();
        if (Game.AscendTimer > 0) Game.UpdateAscendIntro();
        if (Game.ReincarnateTimer > 0) Game.UpdateReincarnateIntro();
        if (Game.OnAscend) Game.UpdateAscend();

        for (i in Game.customLogic) {
            Game.customLogic[i]();
        }

        if (Game.sparklesT > 0) {
            Game.sparkles.style.backgroundPosition = -Math.floor((Game.sparklesFrames - Game.sparklesT + 1) * 128) + 'px 0px';
            Game.sparklesT--;
            if (Game.sparklesT === 1) Game.sparkles.style.display = 'none';
        }

        Game.Click = 0;
        Game.Scroll = 0;
        Game.mouseMoved = 0;
        Game.CanClick = 1;

        if ((Game.toSave || (Game.T % (Game.fps * 60) === 0 && Game.T > Game.fps * 10 && Game.prefs.autosave)) && !Game.OnAscend) {
            //check if we can save : no minigames are loading
            let canSave = true;
            for (i in Game.Objects) {
                me = Game.Objects[i];
                if (me.minigameLoading) {
                    canSave = false;
                    break;
                }
            }
            if (canSave) Game.WriteSave();
        }

        //every 30 minutes : get server data (ie. update notification, patreon data)
        if (Game.T % (Game.fps * 60 * 30) === 0 && Game.T > Game.fps * 10/* && Game.prefs.autoupdate*/) {
            Game.CheckUpdates();
            Game.GrabData();
        }

        Game.T++;
    }

    /*=====================================================================================
	DRAW
	=======================================================================================*/

    Game.Draw = function () {
        let price;
        let me;
        let i;
        Game.DrawBackground();
        Timer.track('end of background');

        if (!Game.OnAscend) {

            let unit = (Math.round(Game.cookiesd) === 1 ? ' Neuro' : ' Neuros');
            let str = Beautify(Math.round(Game.cookiesd));
            if (Game.cookiesd >= 1000000)//dirty padding
            {
                const spacePos = str.indexOf(' ');
                const dotPos = str.indexOf('.');
                let add = '';
                if (spacePos !== -1) {
                    if (dotPos === -1) add += '.000';
                    else {
                        if (spacePos - dotPos === 2) add += '00';
                        if (spacePos - dotPos === 3) add += '0';
                    }
                }
                str = [str.slice(0, spacePos), add, str.slice(spacePos)].join('');
            }
            if (str.length > 11 && !Game.mobile) unit = '<br>Neuros';
            str += unit;
            if (Game.prefs.monospace) str = '<span class="monospace">' + str + '</span>';
            str = str + '<div style="font-size:50%;"' + (Game.cpsSucked > 0 ? ' class="warning"' : '') + '>per second : ' + Beautify(Game.cookiesPs * (1 - Game.cpsSucked), 1) + '</div>';//display cookie amount
            elementByID('cookies').innerHTML = str;
            elementByID('compactCookies').innerHTML = str;
            Timer.track('Neuro amount');

            for (i in Game.Objects) {
                me = Game.Objects[i];
                if (me.onMinigame && me.minigame.draw && !me.muted) me.minigame.draw();
            }
            Timer.track('draw minigames');

            if (Game.drawT % 5 === 0) {
                //if (Game.prefs.monospace) {l('cookies').className='title monospace';} else {l('cookies').className='title';}
                let lastLocked = 0;
                for (i in Game.Objects) {
                    me = Game.Objects[i];

                    //make products full-opacity if we can buy them
                    let classes = 'product';
                    price = me.bulkPrice;
                    if (Game.cookiesEarned >= me.basePrice || me.bought > 0) {
                        classes += ' unlocked';
                        lastLocked = 0;
                        me.locked = 0;
                    } else {
                        classes += ' locked';
                        lastLocked++;
                        me.locked = 1;
                    }
                    if ((Game.buyMode === 1 && Game.cookies >= price) || (Game.buyMode === -1 && me.amount > 0)) classes += ' enabled'; else classes += ' disabled';
                    if (lastLocked > 2) classes += ' toggledOff';
                    me.l.className = classes;
                    //if (me.id>0) {l('productName'+me.id).innerHTML=Beautify(me.storedTotalCps/Game.ObjectsById[me.id-1].storedTotalCps,2);}
                }

                //make upgrades full-opacity if we can buy them
                let lastPrice = 0;
                for (i in Game.UpgradesInStore) {
                    me = Game.UpgradesInStore[i];
                    if (!me.bought) {
                        price = me.getPrice();
                        let canBuy = me.canBuy();//(Game.cookies>=price);
                        let enabled = (elementByID('upgrade' + i).className.indexOf('enabled') > -1);
                        if ((canBuy && !enabled) || (!canBuy && enabled)) Game.upgradesToRebuild = 1;
                        if (price < lastPrice) Game.storeToRefresh = 1;//is this upgrade less expensive than the previous one? trigger a refresh to sort it again
                        lastPrice = price;
                    }
                    if (me.timerDisplay) {
                        let T = me.timerDisplay();
                        if (T !== -1) {
                            if (!elementByID('upgradePieTimer' + i)) elementByID('upgrade' + i).innerHTML = elementByID('upgrade' + i).innerHTML + '<div class="pieTimer" id="upgradePieTimer' + i + '"></div>';
                            T = (T * 144) % 144;
                            elementByID('upgradePieTimer' + i).style.backgroundPosition = (-Math.floor(T % 18)) * 48 + 'px ' + (-Math.floor(T / 18)) * 48 + 'px';
                        }
                    }

                    //if (me.canBuy()) l('upgrade'+i).className='crate upgrade enabled'; else l('upgrade'+i).className='crate upgrade disabled';
                }
            }
            Timer.track('store');

            if (Game.PARTY)//i was bored and felt like messing with CSS
            {
                let pulse = Math.pow((Game.T % 10) / 10, 0.5);
                Game.l.style.filter = 'hue-rotate(' + ((Game.T * 5) % 360) + 'deg) brightness(' + (150 - 50 * pulse) + '%)';
                Game.l.style.webkitFilter = 'hue-rotate(' + ((Game.T * 5) % 360) + 'deg) brightness(' + (150 - 50 * pulse) + '%)';
                Game.l.style.transform = 'scale(' + (1.02 - 0.02 * pulse) + ',' + (1.02 - 0.02 * pulse) + ') rotate(' + (Math.sin(Game.T * 0.5) * 0.5) + 'deg)';
                elementByID('wrapper').style.overflowX = 'hidden';
                elementByID('wrapper').style.overflowY = 'hidden';
            }

            Timer.clean();
            if (Game.prefs.animate && ((Game.prefs.fancy && Game.drawT % 1 === 0) || (!Game.prefs.fancy && Game.drawT % 10 === 0)) && Game.AscendTimer === 0 && Game.onMenu === '') Game.DrawBuildings();
            Timer.track('buildings');

            Game.textParticlesUpdate();
            Timer.track('text particles');
        }

        Game.NotesDraw();
        Timer.track('notes');
        //Game.tooltip.update();//changed to only update when the mouse is moved

        for (i in Game.customDraw) {
            Game.customDraw[i]();
        }

        Game.drawT++;
        //if (Game.prefs.altDraw) requestAnimationFrame(Game.Draw);
    }

    /*=====================================================================================
	MAIN LOOP
	=======================================================================================*/
    Game.Loop = () => {
        if (Game.timedout) return false;
        Timer.say('START');
        Timer.track('browser stuff');
        Timer.say('LOGIC');
        //update game logic !
        Game.catchupLogic = 0;
        Game.Logic();
        Game.catchupLogic = 1;

        let time = Date.now();


        //latency compensator
        Game.accumulatedDelay += ((time - Game.time) - 1000 / Game.fps);
        if (Game.prefs.timeout && time - Game.lastActivity >= 1000 * 60 * 5) {
            if (Game.accumulatedDelay > 1000 * 60 * 30) Game.delayTimeouts += 3;//more than 30 minutes delay ? computer probably asleep and not making cookies anyway
            else if (Game.accumulatedDelay > 1000 * 5) Game.delayTimeouts++;//add to timeout counter when we skip 10 seconds worth of frames (and the player has been inactive for at least 5 minutes)
            if (Game.delayTimeouts >= 3) Game.Timeout();//trigger timeout when the timeout counter is 3+
        }

        Game.accumulatedDelay = Math.min(Game.accumulatedDelay, 1000 * 5);//don't compensate over 5 seconds; if you do, something's probably very wrong
        Game.time = time;
        while (Game.accumulatedDelay > 0) {
            Game.Logic();
            Game.accumulatedDelay -= 1000 / Game.fps;//as long as we're detecting latency (slower than target fps), execute logic (this makes drawing slower but makes the logic behave closer to correct target fps)
        }
        Game.catchupLogic = 0;
        Timer.track('logic');
        Timer.say('END LOGIC');
        if (!Game.prefs.altDraw) {
            let hasFocus = document.hasFocus();
            Timer.say('DRAW');
            if (hasFocus || Game.prefs.focus || Game.loopT % 10 === 0) requestAnimationFrame(Game.Draw);
            //if (document.hasFocus() || Game.loopT%5==0) Game.Draw();
            Timer.say('END DRAW');
        } else requestAnimationFrame(Game.Draw);

        //if (!hasFocus) Game.tooltip.hide();

        if (Game.sesame) {
            //fps counter and graph
            Game.previousFps = Game.currentFps;
            Game.currentFps = Game.getFps();
            let ctx = Game.fpsGraphCtx;
            ctx.drawImage(Game.fpsGraph, -1, 0);
            ctx.fillStyle = 'rgb(' + Math.round((1 - Game.currentFps / Game.fps) * 128) + ',0,0)';
            ctx.fillRect(128 - 1, 0, 1, 64);
            ctx.strokeStyle = '#fff';
            ctx.beginPath();
            ctx.moveTo(128 - 1, (1 - Game.previousFps / Game.fps) * 64);
            ctx.lineTo(128, (1 - Game.currentFps / Game.fps) * 64);
            ctx.stroke();

            elementByID('fpsCounter').innerHTML = Game.currentFps + ' fps';
            let str = '';
            for (let i in Timer.labels) {
                str += Timer.labels[i];
            }
            if (Game.debugTimersOn) elementByID('debugLog').style.display = 'block';
            else elementByID('debugLog').style.display = 'none';
            elementByID('debugLog').innerHTML = str;

        }
        Timer.reset();

        Game.loopT++;
        setTimeout(Game.Loop, 1000 / Game.fps);
    }
}