function pack(bytes) {
    var chars = [];
    var len = bytes.length;
    for (var i = 0, n = len; i < n;) {
        chars.push(((bytes[i++] & 0xff) << 8) | (bytes[i++] & 0xff));
    }
    return String.fromCharCode.apply(null, chars);
}

function unpack(str) {
    var bytes = [];
    var len = str.length;
    for (var i = 0, n = len; i < n; i++) {
        var char = str.charCodeAt(i);
        bytes.push(char >>> 8, char & 0xFF);
    }
    return bytes;
}

//modified from http://www.smashingmagazine.com/2011/10/19/optimizing-long-lists-of-yesno-values-with-javascript/
/*
function pack2( string  values) {
    var chunks = values.match(/.{1,14}/g), packed = '';
    for (var i=0; i < chunks.length; i++) {
        packed += String.fromCharCode(parseInt('1'+chunks[i], 2));
    }
    return packed;
}
*/

function unpack2(/* string */ packed) {
    var values = '';
    for (var i = 0; i < packed.length; i++) {
        values += packed.charCodeAt(i).toString(2).substring(1);
    }
    return values;
}

function pack3(values) {
    //too many save corruptions, darn it to heck
    return values;
}

export {pack3, unpack, unpack2, pack};