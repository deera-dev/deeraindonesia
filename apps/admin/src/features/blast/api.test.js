import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSupabaseMock, makeBuilder, resetSupabaseMock } from "../../../../../test/helpers/supabaseMock";

const supabaseMock = createSupabaseMock();
vi.mock("@deera/shared/lib/supabase", () => ({ supabase: supabaseMock }));

const {
  fetchCampaigns,
  fetchTargetCountsByCampaign,
  fetchCampaignDetail,
  createCampaign,
  markTargetStatus,
  markCampaignSelesai,
  deleteCampaign,
  fetchMessageTemplates,
  createMessageTemplate,
  updateMessageTemplate,
  deleteMessageTemplate,
} = await import("./api");

beforeEach(() => {
  resetSupabaseMock(supabaseMock);
});

describe("fetchCampaigns", () => {
  it("mengambil campaign terurut created_at desc", async () => {
    supabaseMock.from.mockReturnValueOnce(makeBuilder({ data: [{ id: "camp1" }], error: null }));
    const result = await fetchCampaigns();
    expect(supabaseMock.from).toHaveBeenCalledWith("blast_campaign");
    expect(result).toEqual([{ id: "camp1" }]);
  });
});

describe("fetchTargetCountsByCampaign", () => {
  it("mengelompokkan status per campaign_id", async () => {
    supabaseMock.from.mockReturnValueOnce(
      makeBuilder({
        data: [
          { campaign_id: "a", status: "terkirim" },
          { campaign_id: "a", status: "pending" },
          { campaign_id: "b", status: "dilewati" },
        ],
        error: null,
      }),
    );
    const result = await fetchTargetCountsByCampaign();
    expect(result).toEqual({
      a: { total: 2, terkirim: 1, pending: 1, dilewati: 0 },
      b: { total: 1, dilewati: 1, terkirim: 0, pending: 0 },
    });
  });
});

describe("fetchCampaignDetail", () => {
  it("mengambil campaign + targets secara paralel", async () => {
    const campaignBuilder = makeBuilder({ data: { id: "camp1" }, error: null });
    const targetsBuilder = makeBuilder({ data: [{ id: "t1" }], error: null });
    supabaseMock.from.mockReturnValueOnce(campaignBuilder).mockReturnValueOnce(targetsBuilder);

    const result = await fetchCampaignDetail("camp1");

    expect(campaignBuilder.eq).toHaveBeenCalledWith("id", "camp1");
    expect(targetsBuilder.eq).toHaveBeenCalledWith("campaign_id", "camp1");
    expect(result).toEqual({ campaign: { id: "camp1" }, targets: [{ id: "t1" }] });
  });
});

describe("createCampaign", () => {
  it("melempar error saat nama kosong", async () => {
    await expect(createCampaign({ nama: "", targets: [{ nama: "x" }] })).rejects.toThrow(
      "Nama blast wajib diisi.",
    );
  });

  it("melempar error saat tidak ada target", async () => {
    await expect(createCampaign({ nama: "Promo", targets: [] })).rejects.toThrow(
      "Pilih minimal satu target.",
    );
  });

  it("insert campaign lalu bulk insert targets dgn campaign_id yang benar", async () => {
    const campaignBuilder = makeBuilder({ data: { id: "camp1" }, error: null });
    const targetsBuilder = makeBuilder({ data: null, error: null });
    supabaseMock.from.mockReturnValueOnce(campaignBuilder).mockReturnValueOnce(targetsBuilder);

    const result = await createCampaign({
      nama: "Promo Lebaran",
      productKodes: ["D-01-OSK"],
      message: "Halo",
      targets: [{ source: "calon", contactId: "c1", nama: "Budi", noHp: "0812" }],
      user: { email: "a@b.com", name: "Admin" },
    });

    expect(campaignBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ nama: "Promo Lebaran", status: "berjalan" }),
    );
    expect(targetsBuilder.insert).toHaveBeenCalledWith([
      {
        campaign_id: "camp1",
        source: "calon",
        contact_id: "c1",
        nama: "Budi",
        no_hp: "0812",
        status: "pending",
      },
    ]);
    expect(result).toEqual({ id: "camp1" });
  });
});

describe("markTargetStatus", () => {
  it("set sent_at hanya saat status terkirim", async () => {
    const builder = makeBuilder({ data: { id: "t1", status: "terkirim" }, error: null });
    supabaseMock.from.mockReturnValueOnce(builder);
    await markTargetStatus("t1", "terkirim");
    const payload = builder.update.mock.calls[0][0];
    expect(payload.status).toBe("terkirim");
    expect(payload.sent_at).toBeDefined();
  });

  it("tidak set sent_at utk status lain", async () => {
    const builder = makeBuilder({ data: { id: "t1", status: "dilewati" }, error: null });
    supabaseMock.from.mockReturnValueOnce(builder);
    await markTargetStatus("t1", "dilewati");
    const payload = builder.update.mock.calls[0][0];
    expect(payload).not.toHaveProperty("sent_at");
  });
});

describe("markTargetStatus — target toko Ngorder", () => {
  it("terkirim ke toko -> status toko jadi 'sudah' (sudah di-approach)", async () => {
    const targetBuilder = makeBuilder({
      data: { id: "t1", status: "terkirim", source: "toko", contact_id: "toko1" },
      error: null,
    });
    const tokoBuilder = makeBuilder({ data: { id: "toko1", status_approach: "sudah" }, error: null });
    supabaseMock.from.mockReturnValueOnce(targetBuilder).mockReturnValueOnce(tokoBuilder);
    await markTargetStatus("t1", "terkirim");
    expect(supabaseMock.from).toHaveBeenNthCalledWith(2, "toko");
    expect(tokoBuilder.update.mock.calls[0][0].status_approach).toBe("sudah");
  });

  it("dilewati ke toko -> toko TIDAK diubah", async () => {
    const targetBuilder = makeBuilder({
      data: { id: "t1", status: "dilewati", source: "toko", contact_id: "toko1" },
      error: null,
    });
    supabaseMock.from.mockReturnValueOnce(targetBuilder);
    await markTargetStatus("t1", "dilewati");
    expect(supabaseMock.from).toHaveBeenCalledTimes(1);
  });

  it("terkirim ke pelanggan/calon -> tidak menyentuh tabel toko", async () => {
    const targetBuilder = makeBuilder({
      data: { id: "t1", status: "terkirim", source: "pelanggan", contact_id: "p1" },
      error: null,
    });
    supabaseMock.from.mockReturnValueOnce(targetBuilder);
    await markTargetStatus("t1", "terkirim");
    expect(supabaseMock.from).toHaveBeenCalledTimes(1);
  });

  it("gagal update toko tidak menggagalkan penandaan terkirim", async () => {
    const targetBuilder = makeBuilder({
      data: { id: "t1", status: "terkirim", source: "toko", contact_id: "toko1" },
      error: null,
    });
    const tokoBuilder = makeBuilder({ data: null, error: new Error("boom") });
    supabaseMock.from.mockReturnValueOnce(targetBuilder).mockReturnValueOnce(tokoBuilder);
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(markTargetStatus("t1", "terkirim")).resolves.toMatchObject({ id: "t1" });
    spy.mockRestore();
  });
});

describe("markCampaignSelesai / deleteCampaign", () => {
  it("update status jadi selesai", async () => {
    const builder = makeBuilder({ data: null, error: null });
    supabaseMock.from.mockReturnValueOnce(builder);
    await markCampaignSelesai("camp1");
    expect(builder.update).toHaveBeenCalledWith({ status: "selesai" });
    expect(builder.eq).toHaveBeenCalledWith("id", "camp1");
  });

  it("delete campaign by id", async () => {
    const builder = makeBuilder({ data: null, error: null });
    supabaseMock.from.mockReturnValueOnce(builder);
    await deleteCampaign("camp1");
    expect(builder.delete).toHaveBeenCalled();
    expect(builder.eq).toHaveBeenCalledWith("id", "camp1");
  });
});

describe("fetchMessageTemplates", () => {
  it("mengambil semua template terurut created_at asc", async () => {
    supabaseMock.from.mockReturnValueOnce(makeBuilder({ data: [{ id: "tpl1" }], error: null }));
    const result = await fetchMessageTemplates();
    expect(supabaseMock.from).toHaveBeenCalledWith("blast_message_template");
    expect(result).toEqual([{ id: "tpl1" }]);
  });
});

describe("createMessageTemplate", () => {
  it("melempar error saat nama kosong", async () => {
    await expect(createMessageTemplate({ nama: "", pesan: "Halo" })).rejects.toThrow(
      "Nama template wajib diisi.",
    );
  });

  it("melempar error saat pesan kosong", async () => {
    await expect(createMessageTemplate({ nama: "Promo", pesan: "   " })).rejects.toThrow(
      "Isi pesan template wajib diisi.",
    );
  });

  it("insert nama ter-trim + pesan apa adanya", async () => {
    const builder = makeBuilder({ data: { id: "tpl-new" }, error: null });
    supabaseMock.from.mockReturnValueOnce(builder);
    const result = await createMessageTemplate({ nama: "  Promo  ", pesan: "Halo Kak" });
    expect(builder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ nama: "Promo", pesan: "Halo Kak" }),
    );
    expect(result).toEqual({ id: "tpl-new" });
  });
});

describe("updateMessageTemplate", () => {
  it("melempar error saat id kosong", async () => {
    await expect(updateMessageTemplate(null, {})).rejects.toThrow("id template wajib diisi.");
  });

  it("hanya menimpa field yang disebut (nama/pesan)", async () => {
    const builder = makeBuilder({ data: { id: "tpl1" }, error: null });
    supabaseMock.from.mockReturnValueOnce(builder);
    await updateMessageTemplate("tpl1", { pesan: "Teks baru" });
    const payload = builder.update.mock.calls[0][0];
    expect(payload.pesan).toBe("Teks baru");
    expect(payload).not.toHaveProperty("nama");
    expect(builder.eq).toHaveBeenCalledWith("id", "tpl1");
  });
});

describe("deleteMessageTemplate", () => {
  it("melempar error saat id kosong", async () => {
    await expect(deleteMessageTemplate(null)).rejects.toThrow("id template wajib diisi.");
  });

  it("delete by id", async () => {
    const builder = makeBuilder({ data: null, error: null });
    supabaseMock.from.mockReturnValueOnce(builder);
    await deleteMessageTemplate("tpl1");
    expect(builder.delete).toHaveBeenCalled();
    expect(builder.eq).toHaveBeenCalledWith("id", "tpl1");
  });
});
