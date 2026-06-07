import { assertProductionRuntimeConfiguration } from "../runtime-config.mjs";

assertProductionRuntimeConfiguration();
await import("../server.js");
