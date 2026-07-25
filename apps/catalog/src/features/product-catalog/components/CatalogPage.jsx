import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CatalogSlide from "./CatalogSlide";
import VisitUsModal from "./VisitUsModal";
import SearchModal from "./SearchModal";
import { useProducts } from "@deera/shared/features/products/hooks";
import { useSoldOutSet, useVisitUsModal, useCatalogSearch } from "../hooks";
import { sortCatalogProducts } from "../utils";

export default function CatalogPage() {
  const { products, loading, error } = useProducts();
  const soldOutSet = useSoldOutSet();
  const { open: openModal, initOpen, show: showModal, close: closeModal } = useVisitUsModal();
  const {
    open: searchOpen,
    query: searchQuery,
    show: showSearch,
    close: closeSearch,
    setQuery: setSearchQuery,
  } = useCatalogSearch();
  const mainRef = useRef(null);
  const slideNodesRef = useRef({});
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [activeKode, setActiveKode] = useState(null);

  useEffect(() => {
    initOpen();
  }, [initOpen]);

  useEffect(() => {
    const el = mainRef.current;
    /* v8 ignore next @preserve -- mainRef selalu terisi saat effect ini
       jalan (React commit ref <main> sebelum effect); guard ini hanya
       defensif & tidak bisa dipicu lewat render normal. */
    if (!el) return;
    function onScroll() {
      setShowScrollTop(el.scrollTop > el.clientHeight * 0.5);
    }
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const sorted = useMemo(() => sortCatalogProducts(products), [products]);

  const activePosition = sorted.findIndex((p) => p.kode === activeKode) + 1;

  const handleActive = useCallback((kode) => setActiveKode(kode), []);

  const registerNode = useCallback((kode, node) => {
    if (node) {
      slideNodesRef.current[kode] = node;
    } else {
      delete slideNodesRef.current[kode];
    }
  }, []);

  function handleSelectSearchResult(kode) {
    const node = slideNodesRef.current[kode];
    node?.scrollIntoView({ behavior: "auto", block: "start" });
    closeSearch();
  }

  return (
    <>
      <main
        ref={mainRef}
        className="w-full h-dvh min-h-dvh overflow-y-scroll bg-black snap-y snap-mandatory"
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
          sorted.map((model, index) => (
            <CatalogSlide
              key={model.kode}
              model={model}
              isLast={index === sorted.length - 1}
              soldOut={soldOutSet.has(model.kode)}
              onActive={handleActive}
              registerNode={registerNode}
            />
          ))}
      </main>

      {!loading && !error && sorted.length > 0 && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-40 px-3 py-1 font-editorial text-[11px] tracking-[0.25em] text-white/50 pointer-events-none">
          {(activePosition > 0 ? activePosition : 1)} / {sorted.length}
        </div>
      )}

      <button
        onClick={showSearch}
        aria-label="Cari produk"
        className="fixed top-6 right-6 z-50 px-5 py-3 font-editorial text-xs tracking-[0.3em] text-white/90 border border-white/30 bg-black/40 backdrop-blur hover:border-white transition"
      >
        CARI
      </button>

      <button
        onClick={showModal}
        className="fixed bottom-6 right-6 z-50 px-5 py-3 font-editorial text-xs tracking-[0.3em] text-white/90 border border-white/30 bg-black/40 backdrop-blur hover:border-white transition"
      >
        VISIT US
      </button>

      {showScrollTop && (
        <button
          onClick={() => mainRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Kembali ke atas"
          className="fixed bottom-6 left-6 z-50 w-11 h-11 flex items-center justify-center border border-white/30 bg-black/40 backdrop-blur text-white/80 hover:border-white hover:text-white active:scale-95 transition text-base"
        >
          &#8593;
        </button>
      )}

      <VisitUsModal open={openModal} onClose={closeModal} />

      <SearchModal
        open={searchOpen}
        query={searchQuery}
        products={sorted}
        soldOutSet={soldOutSet}
        onSetQuery={setSearchQuery}
        onSelect={handleSelectSearchResult}
        onClose={closeSearch}
      />
    </>
  );
}
