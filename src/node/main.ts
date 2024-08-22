import { ExtensionContext } from "vscode";
import { activateCoverage } from "./coverage";
import { activateYAML } from "./yamlClientMain";

export function activate(context: ExtensionContext) {
  activateCoverage(context);
  return activateYAML(context);
}
