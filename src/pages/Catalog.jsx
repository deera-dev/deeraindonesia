import { useState } from "react";
import CatalogSlide from "../components/CatalogSlide";
import Modal from "../components/Modal";
import { useProducts } from "../hooks/useProducts";

const MODAL_KEY = "visit_us_shown_date";

function shouldShowModalToday() {
  try {
    const today = new Date().toISOString().split("T")[0];
    return localStorage.getItem(MODAL_KEY) !== today;
  } catch {
    return true;
  }
}

function markModalShown() {
  try {
    const today = new Date().toISOString().split("T")[0];
    localStorage.setItem(MODAL_KEY, today);
  } catch {
    /* empty */
  }
}

export default function Catalog() {
  const [openModal, setOpenModal] = useState(() => shouldShowModalToday());
  const { products, loading, error } = useProducts();

  function handleCloseModal() {
    markModalShown();
    setOpenModal(false);
  }

  return (
    <>
      <main className="w-full h-screen min-h-screen overflow-y-scroll bg-black snap-y snap-mandatory">
        {loading && (
          <div className="flex items-center justify-center w-full h-screen text-white/40 font-editorial text-xs tracking-[0.3em]">
            LOADING...
          </div>
        )}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center w-full h-screen text-center px-7">
            <p className="font-editorial text-white/80 text-sm tracking-[0.25em]">
              GAGAL MEMUAT KATALOG
            </p>
            <p className="mt-3 font-editorial text-white/40 text-xs tracking-[0.15em]">
              {error.message}
            </p>
          </div>
        )}
        {!loading && !error && products?.length === 0 && (
          <div className="flex items-center justify-center w-full h-screen text-white/40 font-editorial text-xs tracking-[0.3em]">
            BELUM ADA PRODUK
          </div>
        )}
        {!loading &&
          !error &&
          products?.map((model, index) => (
            <CatalogSlide
              key={model.kode}
              model={model}
              isLast={index === products.length - 1}
            />
          ))}
      </main>

      {/* VISIT US BUTTON */}
      <button
        onClick={() => setOpenModal(true)}
        className="fixed bottom-6 right-6 z-50 px-5 py-2 font-editorial text-xs tracking-[0.3em] text-white/90 border border-white/30 bg-black/40 backdrop-blur hover:border-white transition"
      >
        VISIT US
      </button>

      <Modal open={openModal} onClose={handleCloseModal} />
    </>
  );
}
