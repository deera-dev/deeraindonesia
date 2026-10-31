import { supabase } from "@deera/shared/lib/supabase";

export interface TrackVisitPayload {
  visitor: string;
  session: string;
  path: string;
  referrer?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  src?: string | null;
  isLanding?: boolean;
  device?: string | null;
  tripId?: string | null;
  tokoId?: string | null;
  link?: string | null;
  internal?: boolean;
}

export async function trackVisit(payload: TrackVisitPayload): Promise<void> {
  const { error } = await supabase.rpc("track_visit", {
    p_visitor: payload.visitor,
    p_session: payload.session,
    p_path: payload.path,
    p_referrer: payload.referrer ?? null,
    p_utm_source: payload.utmSource ?? null,
    p_utm_medium: payload.utmMedium ?? null,
    p_utm_campaign: payload.utmCampaign ?? null,
    p_src: payload.src ?? null,
    p_is_landing: !!payload.isLanding,
    p_device: payload.device ?? null,
    p_trip_id: payload.tripId ?? null,
    p_toko_id: payload.tokoId ?? null,
    p_link: payload.link ?? null,
    p_internal: !!payload.internal,
  });
  if (error) throw error;
}
