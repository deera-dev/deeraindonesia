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
