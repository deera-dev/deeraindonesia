import { describe, it, expect } from "vitest";
import { isBot, deviceType, parseSourceParams, trackablePath } from "./utils";

describe("analytics utils", () => {
  it("isBot mengenali crawler & webdriver", () => {
    expect(isBot("Mozilla/5.0 (compatible; Googlebot/2.1)")).toBe(true);
    expect(isBot("Mozilla/5.0 iPhone", true)).toBe(true);
    expect(isBot("Mozilla/5.0 (iPhone; CPU iPhone OS 17) Safari")).toBe(false);
  });
  it("deviceType", () => {
    expect(deviceType("Mozilla/5.0 (Linux; Android 14) Mobile")).toBe("mobile");
    expect(deviceType("Mozilla/5.0 (Windows NT 10.0)")).toBe("desktop");
  });
  it("parseSourceParams membaca utm & src", () => {
    expect(parseSourceParams("?utm_source=chatgpt.com&src=qr")).toEqual({ utmSource: "chatgpt.com", utmMedium: null, utmCampaign: null, src: "qr" });
  });
  it("trackablePath mengabaikan root", () => {
    expect(trackablePath("/")).toBeNull();
    expect(trackablePath("/q/D-1")).toBeNull();
    expect(trackablePath("/code/D-1")).toBe("/code/D-1");
  });
});
