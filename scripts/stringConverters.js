function utf8_to_b64(str) {
    try {
        return Base64.encode(unescape(encodeURIComponent(str)));
    } catch (err) {
        return '';
    }
}

function b64_to_utf8(str) {
    try {
        return decodeURIComponent(escape(Base64.decode(str)));
    } catch (err) {
        return '';
    }
}

export {b64_to_utf8, utf8_to_b64}