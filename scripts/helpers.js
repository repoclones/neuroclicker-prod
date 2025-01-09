/*=====================================================================================
MISC HELPER FUNCTIONS
=======================================================================================*/
/**
 * @param {string} what
 */
function elementByID(what) {
    return document.getElementById(what);
}

/**
 * @param {[*]} arr
 * @returns {*}
 */
function chooseRandomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * @param {string} str
 */
function escapeRegExp(str) {
    return str.replace(/[\-\[\]\/{}()*+?.\\^$|]/g, "\\$&");
}

/**
 * @param {string} find
 * @param {string} replace
 * @param {string} str
 */
function replaceAll(find, replace, str) {
    return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);
}

export {elementByID, chooseRandomElement, replaceAll}