import { Link, useLocation } from "react-router-dom";
import BackToTop from "@deera/shared/components/BackToTop";
import AdminBottomNav from "./AdminBottomNav";
import AdminSidebar from "./AdminSidebar";

const SUB_NAVS = [
  { to: "/produksi/sampel", label: "Planning" },
  { to: "/produksi/record", label: "Produksi" },
  { to: "/produksi/jahit", label: "Jahit" },
  { to: "/produksi/hpp", label: "HPP" },
  { to: "/produksi/bahan", label: "Bahan" },
];

export default function ProduksiLayout({ children, title, headerAction }) {
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen bg-skin-page text-skin-text pb-20 md:pb-6 md:pl-64">
      <header className="sticky top-0 z-30 bg-skin-card border-b-2 border-skin-bdr shadow-sm">
        <div className="flex items-center justify-between gap-3 px-4 py-4 md:px-8">
          <div className="min-w-0">
            <h1 className="font-headline text-skin-accent-text text-xl leading-none md:text-2xl">
              PRODUKSI
            </h1>
            {title && (
              <p className="mt-0.5 font-editorial text-xs tracking-[0.15em] text-skin-text3 uppercase truncate">
                {title}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">{headerAction}</div>
        </div>

        <div className="flex flex-wrap border-t border-skin-bdr-lt">
          {SUB_NAVS.map(({ to, label }) => {
            const active = pathname === to || pathname.startsWith(to + "/");
            return (
              <Link
                key={to}
                to={to}
                className={`flex-1 min-w-[60px] py-2.5 text-center font-editorial text-[10px] tracking-[0.1em] uppercase transition border-b-2 ${
                  active
                    ? "border-skin-accent text-skin-accent-text"
                    : "border-transparent text-skin-text3 hover:text-skin-text"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </header>

      <main className="px-4 py-4 md:px-8 xl:px-10 2xl:px-12 md:py-6">{children}</main>

      <BackToTop />
      <AdminSidebar />
      <AdminBottomNav />
    </div>
  );
}
