import { permanentRedirect } from "next/navigation";
export function GET(request: Request) { const source = new URL(request.url); permanentRedirect(`/v2/api/posts${source.search}`); }
