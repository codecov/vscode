import * as vscode from "vscode";
import axios from "axios";

const ENDPOINT = "https://api.codecov.io/validate/v2?source=vscode";

export function validateAction(context: vscode.ExtensionContext) {
  const editor = vscode.window.activeTextEditor;
  if (editor) {
    const document = editor.document;
    const data = document.getText();

    axios
      .post(ENDPOINT, data, {
        headers: {
          "Content-Type": "text/plain",
        },
      })
      .then(function (response) {
        // handle response
        vscode.window.showInformationMessage(
          "Codecov: " + response.data.message
        );
        vscode.window.setStatusBarMessage(
          "Codecov: " + response.data.message,
          10000
        );
        return;
      })
      .catch(function (error) {
        if (error?.response?.status >= 500) {
          vscode.window.showErrorMessage(
            "Codecov: Unable to connect to server or something went seriously wrong."
          );
          return;
        }

        console.log(error);

        const validationErrors = error.response.data.validation_error;
        const result = parseErrors(validationErrors);

        console.log("Codecov: " + error.response.data.message);
        vscode.window.showErrorMessage(
          "Codecov: " + error.response.data.message
        );

        // Show each error
        if (result.length > 0 && Array.isArray(result)) {
          result.forEach((element) => {
            vscode.window.showErrorMessage(
              "Codecov: Issue found with " + element
            );
          });
        }
      });
  }
}

function parseErrors(errors: object) {
  const message = traverse(errors);

  return message;
}

function traverse(item: {} | string[] | string, root = ""): string | string[] {
  if (typeof item === "string") {
    return root + ": " + item;
  }
  if (typeof item === "object") {
    let pairs = [];
    for (const [key, [value]] of Object.entries(item)) {
      const newRoot = root.length > 0 ? `${root} -> ${key}` : key;
      pairs.push(traverse(value, newRoot));
    }
    return pairs.flat();
  }
  return [];
}
