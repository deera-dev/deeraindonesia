import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("cloudinary module load warning", () => {
  let warnSpy;

  beforeEach(() => {
    vi.resetModules();
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    warnSpy.mockRestore();
  });

  it("warning saat CLOUD_NAME/UPLOAD_PRESET tidak di-set", async () => {
    vi.stubEnv("VITE_CLOUDINARY_CLOUD_NAME", "");
    vi.stubEnv("VITE_CLOUDINARY_UPLOAD_PRESET", "");

    await import("./cloudinary");

    expect(warnSpy).toHaveBeenCalledWith(
      "[Cloudinary] VITE_CLOUDINARY_CLOUD_NAME atau VITE_CLOUDINARY_UPLOAD_PRESET belum di-set di .env",
    );
  });

  it("tidak warning saat CLOUD_NAME dan UPLOAD_PRESET keduanya di-set", async () => {
    vi.stubEnv("VITE_CLOUDINARY_CLOUD_NAME", "deera-cloud");
    vi.stubEnv("VITE_CLOUDINARY_UPLOAD_PRESET", "deera-preset");

    await import("./cloudinary");

    expect(warnSpy).not.toHaveBeenCalled();
  });
});

describe("uploadImage", () => {
  let warnSpy;
  let instances;
  let OriginalXHR;

  beforeEach(() => {
    vi.resetModules();
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    instances = [];
    OriginalXHR = global.XMLHttpRequest;

    class MockXHR {
      constructor() {
        this.upload = {};
        instances.push(this);
      }
      open() {}
      send() {}
    }
    vi.stubGlobal("XMLHttpRequest", MockXHR);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    warnSpy.mockRestore();
    global.XMLHttpRequest = OriginalXHR;
  });

  const lastXhr = () => instances[instances.length - 1];

  it("throw saat Cloudinary belum dikonfigurasi", async () => {
    vi.stubEnv("VITE_CLOUDINARY_CLOUD_NAME", "");
    vi.stubEnv("VITE_CLOUDINARY_UPLOAD_PRESET", "");

    const { uploadImage } = await import("./cloudinary");

    await expect(uploadImage(new File(["x"], "x.png"))).rejects.toThrow(
      "Cloudinary belum dikonfigurasi",
    );
  });

  it("resolve dengan shape yang benar saat upload sukses, dan memanggil onProgress saat lengthComputable", async () => {
    vi.stubEnv("VITE_CLOUDINARY_CLOUD_NAME", "deera-cloud");
    vi.stubEnv("VITE_CLOUDINARY_UPLOAD_PRESET", "deera-preset");

    const { uploadImage } = await import("./cloudinary");
    const onProgress = vi.fn();
    const json = {
      secure_url: "https://res.cloudinary.com/deera-cloud/image/upload/v1/abc.png",
      public_id: "abc",
      width: 100,
      height: 200,
      bytes: 12345,
      format: "png",
    };

    const promise = uploadImage(new File(["x"], "x.png"), { onProgress });
    const xhr = lastXhr();

    xhr.upload.onprogress({ lengthComputable: true, loaded: 50, total: 100 });

    xhr.status = 200;
    xhr.responseText = JSON.stringify(json);
    xhr.onload();

    const result = await promise;

    expect(onProgress).toHaveBeenCalledWith(50);
    expect(result).toEqual({
      url: json.secure_url,
      publicId: json.public_id,
      width: json.width,
      height: json.height,
      bytes: json.bytes,
      format: json.format,
    });
  });

  it("tidak memanggil onProgress saat lengthComputable false", async () => {
    vi.stubEnv("VITE_CLOUDINARY_CLOUD_NAME", "deera-cloud");
    vi.stubEnv("VITE_CLOUDINARY_UPLOAD_PRESET", "deera-preset");

    const { uploadImage } = await import("./cloudinary");
    const onProgress = vi.fn();

    const promise = uploadImage(new File(["x"], "x.png"), { onProgress });
    const xhr = lastXhr();

    xhr.upload.onprogress({ lengthComputable: false, loaded: 50, total: 100 });

    xhr.status = 200;
    xhr.responseText = JSON.stringify({ secure_url: "u", public_id: "p" });
    xhr.onload();

    await promise;
    expect(onProgress).not.toHaveBeenCalled();
  });

  it("tidak melempar saat onProgress tidak diberikan walau lengthComputable true", async () => {
    vi.stubEnv("VITE_CLOUDINARY_CLOUD_NAME", "deera-cloud");
    vi.stubEnv("VITE_CLOUDINARY_UPLOAD_PRESET", "deera-preset");

    const { uploadImage } = await import("./cloudinary");

    const promise = uploadImage(new File(["x"], "x.png"));
    const xhr = lastXhr();

    expect(() =>
      xhr.upload.onprogress({ lengthComputable: true, loaded: 50, total: 100 }),
    ).not.toThrow();

    xhr.status = 200;
    xhr.responseText = JSON.stringify({ secure_url: "u", public_id: "p" });
    xhr.onload();

    await promise;
  });

  it("reject saat status di luar rentang 200-299", async () => {
    vi.stubEnv("VITE_CLOUDINARY_CLOUD_NAME", "deera-cloud");
    vi.stubEnv("VITE_CLOUDINARY_UPLOAD_PRESET", "deera-preset");

    const { uploadImage } = await import("./cloudinary");

    const promise = uploadImage(new File(["x"], "x.png"));
    const xhr = lastXhr();

    xhr.status = 500;
    xhr.responseText = "Internal Server Error";
    xhr.onload();

    await expect(promise).rejects.toThrow("Upload gagal (500): Internal Server Error");
  });

  it("reject saat terjadi error jaringan (xhr.onerror)", async () => {
    vi.stubEnv("VITE_CLOUDINARY_CLOUD_NAME", "deera-cloud");
    vi.stubEnv("VITE_CLOUDINARY_UPLOAD_PRESET", "deera-preset");

    const { uploadImage } = await import("./cloudinary");

    const promise = uploadImage(new File(["x"], "x.png"));
    const xhr = lastXhr();

    xhr.onerror();

    await expect(promise).rejects.toThrow("Upload error / network");
  });
});

describe("uploadVideo", () => {
  let warnSpy;
  let instances;
  let OriginalXHR;

  beforeEach(() => {
    vi.resetModules();
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    instances = [];
    OriginalXHR = global.XMLHttpRequest;

    class MockXHR {
      constructor() {
        this.upload = {};
        instances.push(this);
      }
      open() {}
      send() {}
    }
    vi.stubGlobal("XMLHttpRequest", MockXHR);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    warnSpy.mockRestore();
    global.XMLHttpRequest = OriginalXHR;
  });

  const lastXhr = () => instances[instances.length - 1];

  it("throw saat Cloudinary belum dikonfigurasi", async () => {
    vi.stubEnv("VITE_CLOUDINARY_CLOUD_NAME", "");
    vi.stubEnv("VITE_CLOUDINARY_UPLOAD_PRESET", "");

    const { uploadVideo } = await import("./cloudinary");
    await expect(uploadVideo(new File(["x"], "x.mp4"))).rejects.toThrow(
      "Cloudinary belum dikonfigurasi",
    );
  });

  it("resolve dengan shape yang benar saat upload sukses", async () => {
    vi.stubEnv("VITE_CLOUDINARY_CLOUD_NAME", "deera-cloud");
    vi.stubEnv("VITE_CLOUDINARY_UPLOAD_PRESET", "deera-preset");

    const { uploadVideo } = await import("./cloudinary");
    const json = {
      secure_url: "https://res.cloudinary.com/deera-cloud/video/upload/v1/gamis.mp4",
      public_id: "gamis",
      duration: 12.5,
      bytes: 50000,
      format: "mp4",
    };

    const promise = uploadVideo(new File(["x"], "x.mp4"));
    const xhr = lastXhr();
    xhr.status = 200;
    xhr.responseText = JSON.stringify(json);
    xhr.onload();

    const result = await promise;
    expect(result).toEqual({
      url: json.secure_url,
      publicId: json.public_id,
      duration: json.duration,
      bytes: json.bytes,
      format: json.format,
    });
  });

  it("memanggil onProgress saat lengthComputable true", async () => {
    vi.stubEnv("VITE_CLOUDINARY_CLOUD_NAME", "deera-cloud");
    vi.stubEnv("VITE_CLOUDINARY_UPLOAD_PRESET", "deera-preset");

    const { uploadVideo } = await import("./cloudinary");
    const onProgress = vi.fn();
    const promise = uploadVideo(new File(["x"], "x.mp4"), { onProgress });
    const xhr = lastXhr();
    xhr.upload.onprogress({ lengthComputable: true, loaded: 25, total: 100 });
    xhr.status = 200;
    xhr.responseText = JSON.stringify({ secure_url: "u", public_id: "p" });
    xhr.onload();
    await promise;
    expect(onProgress).toHaveBeenCalledWith(25);
  });

  it("reject saat status di luar rentang 200-299", async () => {
    vi.stubEnv("VITE_CLOUDINARY_CLOUD_NAME", "deera-cloud");
    vi.stubEnv("VITE_CLOUDINARY_UPLOAD_PRESET", "deera-preset");

    const { uploadVideo } = await import("./cloudinary");
    const promise = uploadVideo(new File(["x"], "x.mp4"));
    const xhr = lastXhr();
    xhr.status = 400;
    xhr.responseText = "Bad Request";
    xhr.onload();
    await expect(promise).rejects.toThrow("Upload video gagal (400): Bad Request");
  });

  it("reject saat error jaringan (xhr.onerror)", async () => {
    vi.stubEnv("VITE_CLOUDINARY_CLOUD_NAME", "deera-cloud");
    vi.stubEnv("VITE_CLOUDINARY_UPLOAD_PRESET", "deera-preset");

    const { uploadVideo } = await import("./cloudinary");
    const promise = uploadVideo(new File(["x"], "x.mp4"));
    lastXhr().onerror();
    await expect(promise).rejects.toThrow("Upload error / network");
  });
});

describe("cldUrl", () => {
  let cldUrl;

  beforeEach(async () => {
    vi.resetModules();
    vi.stubEnv("VITE_CLOUDINARY_CLOUD_NAME", "deera-cloud");
    vi.stubEnv("VITE_CLOUDINARY_UPLOAD_PRESET", "deera-preset");
    ({ cldUrl } = await import("./cloudinary"));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("mengembalikan url apa adanya saat falsy (null)", () => {
    expect(cldUrl(null)).toBeNull();
  });

  it("mengembalikan url apa adanya saat falsy (undefined)", () => {
    expect(cldUrl(undefined)).toBeUndefined();
  });

  it("mengembalikan url apa adanya saat bukan string", () => {
    expect(cldUrl(12345)).toBe(12345);
  });

  it("mengembalikan url apa adanya saat bukan url cloudinary (tidak ada /upload/)", () => {
    const url = "https://images.example.com/foto.png";
    expect(cldUrl(url)).toBe(url);
  });

  it("menyisipkan f_auto,q_auto tanpa opsi tambahan", () => {
    const url = "https://res.cloudinary.com/demo/image/upload/v1/foto.png";
    expect(cldUrl(url)).toBe(
      "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/v1/foto.png",
    );
  });

  it("menambahkan transform width", () => {
    const url = "https://res.cloudinary.com/demo/image/upload/v1/foto.png";
    expect(cldUrl(url, { width: 300 })).toBe(
      "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_300/v1/foto.png",
    );
  });

  it("menambahkan transform height", () => {
    const url = "https://res.cloudinary.com/demo/image/upload/v1/foto.png";
    expect(cldUrl(url, { height: 400 })).toBe(
      "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,h_400/v1/foto.png",
    );
  });

  it("menambahkan transform crop", () => {
    const url = "https://res.cloudinary.com/demo/image/upload/v1/foto.png";
    expect(cldUrl(url, { crop: "fill" })).toBe(
      "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_fill/v1/foto.png",
    );
  });

  it("menambahkan transform dpr", () => {
    const url = "https://res.cloudinary.com/demo/image/upload/v1/foto.png";
    expect(cldUrl(url, { dpr: 2 })).toBe(
      "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,dpr_2/v1/foto.png",
    );
  });

  it("menggabungkan semua transform sekaligus", () => {
    const url = "https://res.cloudinary.com/demo/image/upload/v1/foto.png";
    expect(cldUrl(url, { width: 300, height: 400, crop: "fill", dpr: 2 })).toBe(
      "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_300,h_400,c_fill,dpr_2/v1/foto.png",
    );
  });
});
