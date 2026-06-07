import { assertProductionRuntimeConfiguration } from "../runtime-config.mjs";

export async function register() {
  assertProductionRuntimeConfiguration();
}
