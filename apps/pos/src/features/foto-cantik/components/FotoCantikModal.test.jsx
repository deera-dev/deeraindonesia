import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const share = vi.fn().mockResolvedValue({ method: "share-file" });
vi.mock("../hooks", () => ({
  useFotoCantik: () => ({ loading: false, photos: [{ kode: "D-1", nama: "G", blob: null }, { kode: "D-2", nama: "H", blob: null }] }),
  sharePhotos: (...a) => share(...a),
}));
import FotoCantikModal from "./FotoCantikModal";

describe("FotoCantikModal", () => {
  it("mengirim hanya produk yang dipilih", async () => {
    const onClose = vi.fn();
    render(<FotoCantikModal sale={{ buyer_name: "A" }} onClose={onClose} />);
    fireEvent.click(screen.getByText("D-2"));
    fireEvent.click(screen.getByText(/Bagikan/));
    await vi.waitFor(() => expect(share).toHaveBeenCalled());
    expect(share.mock.calls[0][1].map((p) => p.kode)).toEqual(["D-1"]);
    await vi.waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
