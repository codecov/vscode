import { ExtensionContext } from "vscode";
import { activateCoverage } from "./coverage/coverage";
import { activateYAML } from "./yaml/yamlClientMain";
import Sentry from "./sentry";

export function activate(context: ExtensionContext) {
  try {
    activateCoverage(context);
    return activateYAML(context);
  } catch (e) {
    Sentry.captureException(e);
    throw e;
  }
}
