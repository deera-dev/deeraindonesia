
const iconv = {
  encode(str, _encoding) {
    const bytes = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) {
      bytes[i] = str.charCodeAt(i) & 0xff;
    }
    return bytes;
  },

  decode(buf, _encoding) {
    return new TextDecoder("latin1").decode(buf);
  },
};

export default iconv;
