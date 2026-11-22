import { permanentRedirect } from "next/navigation";
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; permanentRedirect(`/v2/api/posts/${encodeURIComponent(slug)}`); }
