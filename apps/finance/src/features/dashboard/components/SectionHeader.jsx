/** SectionHeader.jsx — Label section kecil di Dashboard. */
export default function SectionHeader({ children }) {
  return (
    <p className="font-editorial text-[10px] tracking-[0.22em] uppercase text-skin-text3 mt-5 mb-2">
      {children}
    </p>
  );
}
