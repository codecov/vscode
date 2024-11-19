import { ExtensionContext } from "vscode";
import { activateCoverage } from "./coverage/coverage";
import { activateYAML } from "./yaml/yamlClientMain";

export function activate(context: ExtensionContext) {
  activateCoverage(context);
  return activateYAML(context);
}
