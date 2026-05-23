/**
 * Browser stub untuk iconv-lite.
 *
 * react-thermal-printer menggunakan iconv.encode(string, charset) untuk
 * mengkonversi teks ke byte sesuai code page printer (PC437, dsb).
 *
 * Di browser kita tidak punya iconv-lite, tapi untuk struk Deera yang
 * isinya ASCII murni (huruf, angka, tanda baca) nilai byte-nya sama
 * persis antara ASCII, PC437, Latin-1, dan UTF-8 — sehingga konversi
 * sederhana charCodeAt sudah cukup.
 */

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
