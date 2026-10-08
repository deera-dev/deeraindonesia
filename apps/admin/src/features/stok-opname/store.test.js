import { describe, it, expect, beforeEach } from "vitest";
import { useStokOpnameSessionStore } from "./store";

beforeEach(() => {
  useStokOpnameSessionStore.setState({ loc: null, counted: {}, guideDismissed: false });
  localStorage.clear();
});

describe("useStokOpnameSessionStore", () => {
  it("markCounted menyimpan per lokasi tanpa menimpa lokasi lain", () => {
    const s = useStokOpnameSessionStore.getState();
    s.markCounted("gudang", "A", 0);
    s.markCounted("cideng", "B", 3);
    s.markCounted("gudang", "C", -1);
    const { counted } = useStokOpnameSessionStore.getState();
    expect(Object.keys(counted.gudang)).toEqual(["A", "C"]);
    expect(counted.cideng.B.selisih).toBe(3);
    expect(counted.gudang.A.at).toMatch(/^\d{4}-/);
  });

  it("resetCounted hanya mengosongkan satu lokasi", () => {
    const s = useStokOpnameSessionStore.getState();
    s.markCounted("gudang", "A", 0);
    s.markCounted("cideng", "B", 0);
    s.resetCounted("gudang");
    const { counted } = useStokOpnameSessionStore.getState();
    expect(counted.gudang).toEqual({});
    expect(counted.cideng.B).toBeDefined();
  });

  it("dipersist dengan key stok_opname_session_v1", () => {
    useStokOpnameSessionStore.getState().setLoc("tegalgubug");
    const raw = JSON.parse(localStorage.getItem("stok_opname_session_v1"));
    expect(raw.state.loc).toBe("tegalgubug");
  });
});
