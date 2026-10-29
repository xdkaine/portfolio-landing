import {
  listProjects,
  parseProjectQuery,
  ProjectQueryError,
} from "@/lib/v2/catalog";
import { v2Error, v2Json } from "@/lib/v2/http";
export function GET(request: Request) {
  try {
    return v2Json(
      listProjects(parseProjectQuery(new URL(request.url).searchParams)),
    );
  } catch (error) {
    if (error instanceof ProjectQueryError) return v2Error(error.message, 400);
    throw error;
  }
}
