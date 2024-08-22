// Todo list:
// - Create setting for auth token (DONE)
// - parse commit and or branch for more accurate coverage: try sha -> try branch -> fallback to main
// - refactor owner/repo extration logic and persist it
// - better error messaging (token unauthorized for example) (DONE)
//
// Stretch goals:
// - Cache coverage with smart refetching (e.g,. if don't have coverage for current SHA, keep trying to refetch)
// - Traverse commit history until coverage is found
// - Selfhosted support (DONE)
// - Show coverage totals somewhere
// - maybe add codecov button to disable and/or view in codecov
//
// Not doing, but would be cool:
// - gl/bb support (DONE ANYWAY)
//
import {
  ExtensionContext,
  OverviewRulerLane,
  Position,
  Range,
  Uri,
  window,
  workspace,
} from "vscode";
import axios from "axios";

type Coverage =
  | {
      line_coverage: [number, number][];
    }
  | undefined;

const Colors = {
  covered: "rgb(33,181,119)",
  partial: "rgb(244,176,27)",
  missed: "rgb(245,32,32)",
} as const;

const Icons = {
  covered: Uri.parse(
    "data:image/svg+xml;base64," +
      Buffer.from(
        `<svg version="1.1" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
  <rect width="3" height="100%" fill="${Colors.covered}" />
</svg>`
      ).toString("base64")
  ),
  partial: Uri.parse(
    "data:image/svg+xml;base64," +
      Buffer.from(
        `<svg version="1.1" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
  <rect width="3" height="100%" fill="${Colors.partial}" />
</svg>`
      ).toString("base64")
  ),
  missed: Uri.parse(
    "data:image/svg+xml;base64," +
      Buffer.from(
        `<svg version="1.1" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
  <rect width="3" height="100%" fill="${Colors.missed}" />
</svg>`
      ).toString("base64")
  ),
} as const;

export function activateCoverage(context: ExtensionContext) {
  let timeout: NodeJS.Timeout | undefined = undefined;

  const lineCoveredDecoration = window.createTextEditorDecorationType({
    gutterIconPath: Icons.covered,
    overviewRulerColor: Colors.covered,
    isWholeLine: true,
    overviewRulerLane: OverviewRulerLane.Right,
  });
  const linePartialDecoration = window.createTextEditorDecorationType({
    gutterIconPath: Icons.partial,
    overviewRulerColor: Colors.partial,
    overviewRulerLane: OverviewRulerLane.Right,
  });
  const lineMissedDecoration = window.createTextEditorDecorationType({
    gutterIconPath: Icons.missed,
    overviewRulerColor: Colors.missed,
    overviewRulerLane: OverviewRulerLane.Right,
  });

  let activeEditor = window.activeTextEditor;

  async function updateDecorations() {
    if (!activeEditor) {
      return;
    }

    const config = workspace.getConfiguration("codecov");

    const enabled = config.get("coverage.enabled");
    if (!enabled) return;

    let apiKey = config.get("api.key");
    let apiUrl = config.get("api.url");
    const provider = config.get("api.gitProvider");

    if (!apiKey) {
      const result = await window.showErrorMessage(
        "To see Codecov line coverage in your editor, you must first set an API Key.",
        {
          modal: true,
          detail:
            "If you don't want to do this right now, you can disable Codecov line coverage in the Codecov extension's settings.",
        },
        "Set an API Key"
      );

      if (result === "Set an API Key") {
        apiKey = await window.showInputBox({
          title: "Enter your Codecov API Key",
          prompt:
            "You can generate an API key in your account settings within the Codecov app.",
        });
        if (!apiKey) return;
        await config.update("api.key", apiKey, true);
      }
    }

    if (!apiUrl) {
      // Just reset it to default for this workspace
      await config.update("api.url", "https://api.codecov.io", false);
      apiUrl = "https://api.codecov.io";
    }

    const path = encodeURIComponent(
      workspace.asRelativePath(activeEditor.document.fileName)
    );

    // TODO: pull this out to its own function and cache it in the extension workspace context
    const gitConfig = Uri.file(
      workspace.getWorkspaceFolder(Uri.file(activeEditor.document.fileName))
        ?.uri.path + "/.git/config"
    );
    const remote = await workspace.fs
      .readFile(gitConfig)
      .then((buf) => buf.toString())
      .then((string) => string.split("\n"))
      .then((lines) => lines.find((line) => line.match(/git@.*:.*\/.*.git$/)))
      .then((line) => line?.replace(/.*:/, "").replace(".git", "").split("/"));
    if (!remote) return;
    const [owner, repo] = remote;

    const coverage: Coverage = await axios
      .get(
        `${apiUrl}/api/v2/${provider}/${owner}/repos/${repo}/file_report/${path}`,
        {
          headers: {
            accept: "application/json",
            authorization: `Bearer ${apiKey}`,
          },
        }
      )
      .then((response) => response.data)
      .catch((error) => {
        if (error?.response?.status >= 500) {
          window.showErrorMessage(
            "Codecov: Unable to connect to server or something went seriously wrong. Double check your API key in the Codecov extension settings"
          );
        } else if (error?.response.status === 401) {
          window.showErrorMessage(
            "Codecov: The provided API key is unauthorized to access this repo, double check the API key in the Codecov extension settings."
          );
        }
      });

    if (!coverage || !coverage.line_coverage) {
      // No coverage for this file
      return;
    }

    const coveredLines: Range[] = [];
    const partialLines: Range[] = [];
    const missedLines: Range[] = [];

    coverage.line_coverage.forEach((line) => {
      if (line[1] === 0) {
        coveredLines.push(
          new Range(new Position(line[0] - 1, 0), new Position(line[0] - 1, 0))
        );
      } else if (line[1] === 2) {
        partialLines.push(
          new Range(new Position(line[0] - 1, 0), new Position(line[0] - 1, 0))
        );
      } else {
        missedLines.push(
          new Range(new Position(line[0] - 1, 0), new Position(line[0] - 1, 0))
        );
      }
    });

    activeEditor.setDecorations(lineCoveredDecoration, coveredLines);
    activeEditor.setDecorations(linePartialDecoration, partialLines);
    activeEditor.setDecorations(lineMissedDecoration, missedLines);
  }

  if (activeEditor) {
    updateDecorations();
  }

  window.onDidChangeActiveTextEditor(
    (editor) => {
      activeEditor = editor;
      if (editor) {
        updateDecorations();
      }
    },
    null,
    context.subscriptions
  );

  workspace.onDidSaveTextDocument(
    (event) => {
      if (activeEditor && event === activeEditor.document) {
        updateDecorations();
      }
    },
    null,
    context.subscriptions
  );
}
