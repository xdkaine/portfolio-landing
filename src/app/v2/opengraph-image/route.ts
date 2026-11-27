import { getSiteSettings } from "@/lib/siteSettings";
import { renderSocialCard } from "@/lib/v2/socialCard";
import { homeSocialPreview } from "@/lib/v2/socialPreview";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const settings = await getSiteSettings();
  return renderSocialCard(homeSocialPreview(settings.siteDescription), "/v2", request);
}
