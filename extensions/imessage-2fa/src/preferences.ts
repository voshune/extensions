import { getPreferenceValues } from "@raycast/api";
import { ExtensionPreferences } from "./types";

const extensionPreferences: ExtensionPreferences = getPreferenceValues();
export const lookBackMinutes = (parseInt(extensionPreferences.lookBackDays || "1") || 1) * 24 * 60;
