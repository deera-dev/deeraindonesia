
export const fmtDate = (d) =>
  d
    ? new Date(d + "T00:00:00").toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "-";

export const STATUS_META = {
  sedang_dibuat: {
    label: "Sedang Dibuat",
    cls: "bg-violet-500/10 text-violet-600 border border-violet-500/30",
  },
  planning: {
    label: "Belum Dibuat",
    cls: "bg-sky-500/10 text-sky-600 border border-sky-500/30",
  },
  draft: {
    label: "Menunggu Approval",
    cls: "bg-skin-raised text-skin-text3 border border-skin-bdr",
  },
  approved: {
    label: "Disetujui",
    cls: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/30",
  },
  ditahan: {
    label: "Ditahan",
    cls: "bg-amber-500/10 text-amber-600 border border-amber-500/30",
  },
  rejected: {
    label: "Ditolak",
    cls: "bg-red-500/10 text-red-500 border border-red-500/30",
  },
};

export const isWoSelesai = (s) => s?.status === "approved" && !!s?.wo_selesai_at;

export const isSedangDibuat = (s) => s?.status === "planning" && !!s?.wo_sampel_at;

export function filterByTab(sampels, tab) {
  const list = sampels ?? [];
  if (tab === "planning") return list.filter((s) => s.status === "planning" && !s.wo_sampel_at);
  if (tab === "draft") return list.filter((s) => s.status === "draft" || isSedangDibuat(s));
  if (tab === "selesai") return list.filter(isWoSelesai);
  if (tab === "all") return list.filter((s) => !isWoSelesai(s));
  if (tab === "approved") return list.filter((s) => s.status === "approved" && !isWoSelesai(s));
  return list.filter((s) => s.status === tab);
}

export function referenceFotos(sampel) {
  const items = sampel?.bahan_items ?? [];
  const bahan = items.length
    ? items.map((b, i) => b?.foto ?? (i === 0 ? sampel?.bahan_foto : null))
    : [sampel?.bahan_foto];
  return {
    bahan: bahan.filter(Boolean),
    model: (sampel?.model_foto ?? []).filter(Boolean),
  };
}

export function buildNomor() {
  const d = new Date();
  const ymd = d.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `SPL-${ymd}-${rand}`;
}


export function sortPlanningQueue(sampels) {
  return (sampels ?? [])
    .filter((s) => s.status === "planning")
    .sort((a, b) => {
      const ua = a.urutan ?? Infinity;
      const ub = b.urutan ?? Infinity;
      if (ua !== ub) return ua - ub;
      return (a.created_at ?? "").localeCompare(b.created_at ?? "");
    });
}

export function nextPlanningUrutan(sampels) {
  const queue = sortPlanningQueue(sampels);
  if (queue.length === 0) return 0;
  const maxUrutan = Math.max(...queue.map((s) => s.urutan ?? -1));
  return maxUrutan + 1;
}

export function buildReorderUpdates(orderedIds) {
  return (orderedIds ?? []).map((id, urutan) => ({ id, urutan }));
}

export function sortWithPinnedFirst(sampels) {
  return [...(sampels ?? [])].sort((a, b) => {
    const pa = a.pinned ? 1 : 0;
    const pb = b.pinned ? 1 : 0;
    if (pa !== pb) return pb - pa;
    return 0;
  });
}


export function formatDisplayName(nameOrEmail) {
  if (!nameOrEmail) return "";
  const base = nameOrEmail.includes("@") ? nameOrEmail.split("@")[0] : nameOrEmail;
  return base
    .split(/[.\s_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export function buildTimeline(history) {
  return (history ?? [])
    .map((h) => ({ type: "history", at: h.changed_at, raw: h }))
    .sort((a, b) => (a.at ?? "").localeCompare(b.at ?? ""));
}

export const MAX_WO_REF_FOTOS = 6;

function toPointers(text) {
  return String(text ?? "")
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*[-\u2022*\u00b7]+\s*/, "").trim())
    .filter(Boolean);
}

export function splitCatatanPoints(text) {
  return String(text ?? "")
    .split(/\r?\n|,/)
    .map((l) => l.replace(/^\s*[-\u2022*\u00b7]+\s*/, "").trim())
    .filter(Boolean);
}

export function listAllWoFotos(sampel) {
  const urls = [
    ...(sampel?.foto ?? []),
    ...(sampel?.model_foto ?? []),
    sampel?.bahan_foto,
    ...(sampel?.bahan_items ?? []).map((b) => b?.foto),
  ].filter(Boolean);
  return [...new Set(urls)];
}

export function buildWoNotes(sampel, { excludeUrls = [], selected = null, maxRefs = MAX_WO_REF_FOTOS } = {}) {
  const refFotos = [];
  const labelFor = (url) => {
    if (!url || excludeUrls.includes(url)) return null;
    if (selected && !selected.includes(url)) return null;
    const found = refFotos.find((r) => r.url === url);
    if (found) return found.label;
    if (refFotos.length >= maxRefs) return null;
    const label = String.fromCharCode(65 + refFotos.length);
    refFotos.push({ label, url });
    return label;
  };

  const bullets = [...toPointers(sampel?.perubahan)];
  for (const url of selected ?? []) labelFor(url);
  return { text: bullets.map((b) => `- ${b}`).join("\n"), refFotos };
}

export function productFotos(product) {
  return [product?.image, ...(product?.detail ?? [])].filter(Boolean);
}

export function repeatCandidates(products) {
  return (products ?? []).filter((p) => !!p.image);
}

export function buildRepeatPrefill(product) {
  return {
    nama: `Repeat ${product.kode ?? String(product.nama ?? "").replace(/^repeat\s+/i, "")}`.trim(),
    modelFotos: productFotos(product).slice(0, 3),
    repeat: { id: product.id, kode: product.kode },
  };
}

export function repeatFotoFor(sampel, products) {
  const p = (products ?? []).find((x) => x.id === sampel?.repeat_dari_id || x.kode === sampel?.repeat_dari_kode);
  const foto = p ? productFotos(p) : [];
  return foto.length ? foto : sampel?.model_foto ?? [];
}

export function buildPrintHtml(dataUrls) {
  const list = Array.isArray(dataUrls) ? dataUrls : [dataUrls];
  const imgs = list
    .map((src, i) => `<img id="${i === 0 ? "wo" : "wo" + i}" src="${src}" alt="Work Order ${i + 1}">`)
    .join("");
  return (
    '<!doctype html><html><head><meta charset="utf-8"><title>Work Order</title>' +
    "<style>@page{size:A4 portrait;margin:0}" +
    "html,body{margin:0;padding:0;background:#fff}" +
    "img{display:block;width:210mm;height:297mm;page-break-after:always;break-after:page}" +
    "img:last-child{page-break-after:auto;break-after:auto}</style></head>" +
    `<body>${imgs}</body></html>`
  );
}

export function printImageA4(dataUrls) {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
    document.body.appendChild(iframe);
    const cleanup = () => setTimeout(() => iframe.remove(), 1000);
    const doc = iframe.contentDocument;
    doc.open();
    doc.write(buildPrintHtml(dataUrls));
    doc.close();
    const imgs = Array.from(doc.images);
    let left = imgs.length;
    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        resolve();
      } catch (err) {
        reject(err);
      } finally {
        cleanup();
      }
    };
    imgs.forEach((im) => {
      if (im.complete && im.naturalWidth > 0) {
        left -= 1;
        if (left <= 0) go();
      } else {
        im.onload = () => {
          left -= 1;
          if (left <= 0) go();
        };
        im.onerror = () => {
          done = true;
          cleanup();
          reject(new Error("Gagal memuat gambar Work Order"));
        };
      }
    });
  });
}

export function distinctBahan(sampels = []) {
  const set = new Set();
  for (const s of sampels ?? []) {
    for (const b of s?.bahan_items ?? []) {
      const n = (b?.nama_bahan ?? "").trim();
      if (n) set.add(n);
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

export function filterByBahan(sampels = [], bahan = "") {
  if (!bahan) return sampels;
  return (sampels ?? []).filter((s) =>
    (s?.bahan_items ?? []).some((b) => (b?.nama_bahan ?? "").trim() === bahan),
  );
}

export const WO_ZONA = [
  { key: "dada", label: "Dada" },
  { key: "bawah", label: "Bawah" },
  { key: "lengan", label: "Lengan" },
  { key: "tangan_depan", label: "Tangan Depan" },
  { key: "samping", label: "Samping" },
  { key: "belakang", label: "Belakang" },
  { key: "pundak", label: "Pundak" },
];

export const MOTIF_OPTIONS = [
  { key: "motif", label: "Motif" },
  { key: "polos", label: "Polos" },
];

export function emptyZonaCatatan() {
  return Object.fromEntries(WO_ZONA.map((z) => [z.key, { catatan: "", crop: null, motif: null }]));
}

export function zonaHasContent(zona) {
  return WO_ZONA.some((z) => {
    const entry = zona?.[z.key];
    return !!entry?.catatan?.trim() || !!entry?.crop || !!entry?.motif;
  });
}

export function photoGridDims(n) {
  if (n <= 1) return { cols: 1, rows: 1 };
  if (n === 2) return { cols: 1, rows: 2 };
  if (n <= 4) return { cols: 2, rows: 2 };
  return { cols: 2, rows: 3 };
}
