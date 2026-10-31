import "server-only";

import { createLibraryLoader } from "@/lib/v2/library";
import { listWriting } from "@/lib/v2/writingServer";

export const loadLibrary = createLibraryLoader(listWriting);
