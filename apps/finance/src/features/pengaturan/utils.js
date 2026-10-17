
export const TARIF_POTONG = {
  pola: 50_000,
  sampel: 100_000,
};

export const TARIF_FINISHING_PER_PCS = 2_500;
export const TARIF_KANCING = 150;
export const TARIF_QA = 500;

export const TARIF_KREATIF = {
  video: 50_000,
  foto_seri: 30_000,
  logo: 20_000,
};


export const DEFAULT_FINANCE_CONFIG = {
  tarif_pola: 50_000,
  tarif_sampel: 100_000,
  tarif_gosok: 1_300,
  tarif_lipat: 700,
  tarif_buang_benang: 300,
  tarif_pasang_pin: 300,
  tarif_hangtag: 200,
  tarif_seri: 200,
  tarif_kancing: 150,
  tarif_lubang: 150,
  tarif_qc: 500,
  tarif_video: 50_000,
  tarif_foto: 30_000,
  tarif_logo: 20_000,
};

export const FINANCE_CONFIG_META = [
  { key: "tarif_pola", label: "Tarif Pola / lembar", group: "Potong" },
  { key: "tarif_sampel", label: "Tarif Sampel / lembar", group: "Potong" },
  { key: "tarif_gosok", label: "Gosok / pcs", group: "Finishing" },
  { key: "tarif_lipat", label: "Lipat / pcs", group: "Finishing" },
  { key: "tarif_buang_benang", label: "Buang Benang / pcs", group: "Finishing" },
  { key: "tarif_pasang_pin", label: "Pasang Pin / pcs", group: "Finishing" },
  { key: "tarif_hangtag", label: "Hangtag & Kode / pcs", group: "Finishing" },
  { key: "tarif_seri", label: "Seri / pcs", group: "Finishing" },
  { key: "tarif_kancing", label: "Kancing / buah", group: "Finishing" },
  { key: "tarif_lubang", label: "Lubang / buah", group: "Finishing" },
  { key: "tarif_qc", label: "QC / pcs", group: "QC" },
  { key: "tarif_video", label: "Video Kreatif / video", group: "Kreatif" },
  { key: "tarif_foto", label: "Foto Seri / seri", group: "Kreatif" },
  { key: "tarif_logo", label: "Logo / logo", group: "Kreatif" },
];
