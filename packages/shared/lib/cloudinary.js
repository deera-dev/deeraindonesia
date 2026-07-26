// CLOUDINARY HELPERS
// - uploadImage(file): upload File gambar ke Cloudinary, return secure URL
// - uploadVideo(file): upload File video ke Cloudinary, return secure URL
// - cldUrl(url, opts): inject f_auto,q_auto + opsi transform ke URL Cloudinary

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

if (!CLOUD_NAME || !UPLOAD_PRESET) {
  console.warn(
    "[Cloudinary] VITE_CLOUDINARY_CLOUD_NAME atau VITE_CLOUDINARY_UPLOAD_PRESET belum di-set di .env",
  );
}

// ============= UPLOAD =============
export async function uploadImage(file, { onProgress } = {}) {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error("Cloudinary belum dikonfigurasi");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const json = JSON.parse(xhr.responseText);
        resolve({
          url: json.secure_url,
          publicId: json.public_id,
          width: json.width,
          height: json.height,
          bytes: json.bytes,
          format: json.format,
        });
      } else {
        reject(new Error(`Upload gagal (${xhr.status}): ${xhr.responseText}`));
      }
    };

    xhr.onerror = () => reject(new Error("Upload error / network"));
    xhr.send(formData);
  });
}

// ============= UPLOAD VIDEO =============
export async function uploadVideo(file, { onProgress } = {}) {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error("Cloudinary belum dikonfigurasi");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const json = JSON.parse(xhr.responseText);
        resolve({
          url: json.secure_url,
          publicId: json.public_id,
          duration: json.duration,
          bytes: json.bytes,
          format: json.format,
        });
      } else {
        reject(new Error(`Upload video gagal (${xhr.status}): ${xhr.responseText}`));
      }
    };

    xhr.onerror = () => reject(new Error("Upload error / network"));
    xhr.send(formData);
  });
}

// ============= URL TRANSFORM =============
// Inject /upload/f_auto,q_auto,<opts>/  setelah /upload/
// Hasil: foto otomatis ke-deliver sebagai WebP/AVIF, kompresi pintar, opsional resize
export function cldUrl(url, opts = {}) {
  if (!url || typeof url !== "string") return url;
  if (!url.includes("/upload/")) return url; // bukan URL Cloudinary, return as-is

  const transforms = ["f_auto", "q_auto"];
  if (opts.width) transforms.push(`w_${opts.width}`);
  if (opts.height) transforms.push(`h_${opts.height}`);
  if (opts.crop) transforms.push(`c_${opts.crop}`);
  if (opts.dpr) transforms.push(`dpr_${opts.dpr}`);
  const transformStr = transforms.join(",");
  const parts = url.split("/upload/");
  if (parts.length !== 2) return url;
  return `${parts[0]}/upload/${transformStr}/${parts[1]}`;
}

// ============= VIDEO POSTER (THUMBNAIL) =============
// cldVideoPoster(url, opts): generate URL thumbnail JPG dari video Cloudinary.
// Trik Cloudinary: URL video (resource_type "video") yang ekstensinya diganti
// jadi .jpg/.png otomatis mengembalikan frame video sebagai gambar — tidak
// perlu request/transformasi khusus di sisi server. "so_0" (start offset 0
// detik) memastikan selalu ambil frame paling awal (konsisten, bukan acak).
// Dipakai untuk poster <video> & thumbnail galeri di halaman detail produk,
// supaya video tidak tampil kotak hitam kosong sebelum diputar.
export function cldVideoPoster(url, opts = {}) {
  if (!url || typeof url !== "string") return url;
  if (!url.includes("/upload/")) return url;

  const transforms = ["so_0", "f_auto", "q_auto"];
  if (opts.width) transforms.push(`w_${opts.width}`);
  if (opts.height) transforms.push(`h_${opts.height}`);
  const transformStr = transforms.join(",");
  const parts = url.split("/upload/");
  if (parts.length !== 2) return url;
  const withTransform = `${parts[0]}/upload/${transformStr}/${parts[1]}`;
  return withTransform.replace(/\.(mp4|mov|webm|mkv|avi)(\?.*)?$/i, ".jpg$2");
}
