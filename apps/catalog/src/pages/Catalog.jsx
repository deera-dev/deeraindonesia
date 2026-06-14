import { useEffect, useRef, useState } from "react";
import CatalogSlide from "../components/CatalogSlide";
import Modal from "../components/Modal";
import { useProducts } from "@deera/shared/hooks/useProducts";
import { supabase } from "@deera/shared/lib/supabase";

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
  const [soldOutSet, setSoldOutSet] = useState(new Set());
  const mainRef = useRef(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    supabase.rpc("get_sold_out_kodes").then(({ data, error: rpcErr }) => {
      if (!rpcErr && data?.length) {
        setSoldOutSet(new Set(data.map((r) => r.kode)));
      }
    });
  }, []);

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    function onScroll() {
      setShowScrollTop(el.scrollTop > el.clientHeight * 0.5);
    }
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  function handleCloseModal() {
    markModalShown();
    setOpenModal(false);
  }

  return (
    <>
      <main
        ref={mainRef}
        className="w-full h-screen min-h-screen overflow-y-scroll bg-black snap-y snap-mandatory"
      >
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
          (() => {
            const sorted = [...(products ?? [])]
              .filter((p) => !!p.image)
              .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
            return sorted.map((model, index) => (
              <CatalogSlide
                key={model.kode}
                model={model}
                isLast={index === sorted.length - 1}
                soldOut={soldOutSet.has(model.kode)}
              />
            ));
          })()}
      </main>

      <button
        onClick={() => setOpenModal(true)}
        className="fixed bottom-6 right-6 z-50 px-5 py-2 font-editorial text-xs tracking-[0.3em] text-white/90 border border-white/30 bg-black/40 backdrop-blur hover:border-white transition"
      >
        VISIT US
      </button>

      {showScrollTop && (
        <button
          onClick={() => mainRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Kembali ke atas"
          className="fixed bottom-6 left-6 z-50 w-10 h-10 flex items-center justify-center border border-white/30 bg-black/40 backdrop-blur text-white/80 hover:border-white hover:text-white active:scale-95 transition text-base"
        >
          &#8593;
        </button>
      )}

      <Modal open={openModal} onClose={handleCloseModal} />
    </>
  );
}
