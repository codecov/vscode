import {
  workspace,
  window,
  extensions,
  Uri,
  ConfigurationTarget,
  commands,
} from "vscode";
import type { ExtensionContext } from "vscode";
import {
  LanguageClient,
  RevealOutputChannelOn,
  NotificationType,
  RequestType,
} from "vscode-languageclient/node";
import type { LanguageClientOptions } from "vscode-languageclient/node";
import {
  CUSTOM_SCHEMA_REQUEST,
  CUSTOM_CONTENT_REQUEST,
  SchemaExtensionAPI,
} from "./schema-extension-api";
import type { IJSONSchemaCache } from "./json-schema-cache";
import { getJsonSchemaContent } from "./json-schema-content-provider";
import { joinPath } from "./paths";
import { validateAction } from "./validate";
import Sentry from "../sentry";

export interface ISchemaAssociations {
  [pattern: string]: string[];
}

export interface ISchemaAssociation {
  fileMatch: string[];
  uri: string;
}

namespace SettingIds {
  export const maxItemsComputed = "yaml.maxItemsComputed";
}

namespace StorageIds {
  export const maxItemsExceededInformation = "yaml.maxItemsExceededInformation";
}

namespace SchemaAssociationNotification {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const type: NotificationType<
    ISchemaAssociations | ISchemaAssociation[]
  > = new NotificationType("json/schemaAssociations");
}

namespace VSCodeContentRequestRegistration {
  // eslint-disable-next-line @typescript-eslint/ban-types
  export const type: NotificationType<{}> = new NotificationType(
    "yaml/registerContentRequest"
  );
}

namespace VSCodeContentRequest {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const type: RequestType<string, string, any> = new RequestType(
    "vscode/content"
  );
}

namespace FSReadFile {
  // eslint-disable-next-line @typescript-eslint/ban-types
  export const type: RequestType<string, string, {}> = new RequestType(
    "fs/readFile"
  );
}

namespace DynamicCustomSchemaRequestRegistration {
  // eslint-disable-next-line @typescript-eslint/ban-types
  export const type: NotificationType<{}> = new NotificationType(
    "yaml/registerCustomSchemaRequest"
  );
}

namespace ResultLimitReachedNotification {
  // eslint-disable-next-line @typescript-eslint/ban-types
  export const type: NotificationType<string> = new NotificationType(
    "yaml/resultLimitReached"
  );
}

export namespace SchemaSelectionRequests {
  export const type: NotificationType<void> = new NotificationType(
    "yaml/supportSchemaSelection"
  );
  export const schemaStoreInitialized: NotificationType<void> =
    new NotificationType("yaml/schema/store/initialized");
}

let client: LanguageClient;

export type LanguageClientConstructor = (
  name: string,
  description: string,
  clientOptions: LanguageClientOptions
) => LanguageClient;

export interface RuntimeEnvironment {
  readonly schemaCache: IJSONSchemaCache;
}

export async function startClient(
  context: ExtensionContext,
  newLanguageClient: LanguageClientConstructor,
  runtime: RuntimeEnvironment
): Promise<SchemaExtensionAPI> {
  // On first time install
  const extensionInstalledBefore = context.globalState.get(
    "codecov.extensionInstalledBefore",
    false
  );

  if (!extensionInstalledBefore) {
    // Show a restart prompt after installation
    window
      .showInformationMessage(
        "It looks like this is your first time installing Codecov in the IDE. Please restart Visual Studio Code for the changes to take effect.",
        "Restart"
      )
      .then((choice) => {
        if (choice === "Restart") {
          commands.executeCommand("workbench.action.reloadWindow");
        }
      });

    // Store the flag indicating that the extension has been installed
    context.globalState.update("codecov.extensionInstalledBefore", true);
  }

  // Activate validator
  const command = "codecov.validate";
  const commandHandler = () => {
    try {
      validateAction(context);
    } catch (e) {
      Sentry.captureException(e);
      throw e;
    }
  };

  context.subscriptions.push(commands.registerCommand(command, commandHandler));

  const outputChannel = window.createOutputChannel("Codecov Extension");
  const clientOptions: LanguageClientOptions = {
    documentSelector: [
      { scheme: "file", language: "codecov" },
      { pattern: "**/codecov.yml" },
      { pattern: "**/codecov.yaml" },
    ],
    synchronize: {
      configurationSection: "codecov",
      fileEvents: [
        workspace.createFileSystemWatcher("**/codecov.yml"),
        workspace.createFileSystemWatcher("codecov.yml"),
        workspace.createFileSystemWatcher("**/codecov.yaml"),
        workspace.createFileSystemWatcher("codecov.yaml"),
      ],
    },
    revealOutputChannelOn: RevealOutputChannelOn.Never,
    outputChannel,
  };

  client = newLanguageClient("codecov", "Codecov Extension", clientOptions);
  const schemaExtensionAPI = new SchemaExtensionAPI(client);
  await client.start();

  client.sendNotification(
    SchemaAssociationNotification.type,
    getSchemaAssociations()
  );

  // Tell the server that the client is ready to provide custom schema content
  client.sendNotification(DynamicCustomSchemaRequestRegistration.type);
  // Tell the server that the client supports schema requests sent directly to it
  client.sendNotification(VSCodeContentRequestRegistration.type);
  // Tell the server that the client supports schema selection requests
  client.sendNotification(SchemaSelectionRequests.type);
  // If the server asks for custom schema content, get it and send it back
  client.onRequest(CUSTOM_SCHEMA_REQUEST, (resource: string) => {
    return schemaExtensionAPI.requestCustomSchema(resource);
  });
  client.onRequest(CUSTOM_CONTENT_REQUEST, (uri: string) => {
    return schemaExtensionAPI.requestCustomSchemaContent(uri);
  });
  client.onRequest(VSCodeContentRequest.type, (uri: string) => {
    return getJsonSchemaContent(uri, runtime.schemaCache);
  });
  client.onRequest(FSReadFile.type, (fsPath: string) => {
    return workspace.fs
      .readFile(Uri.file(fsPath))
      .then((uint8array) => new TextDecoder().decode(uint8array));
  });

  return schemaExtensionAPI;
}

// This method is called when your extension is deactivated
export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}

function getSchemaAssociations(): ISchemaAssociation[] {
  const associations: ISchemaAssociation[] = [];
  extensions.all.forEach((extension) => {
    const packageJSON = extension.packageJSON;
    if (
      packageJSON &&
      packageJSON.contributes &&
      packageJSON.contributes.yamlValidation
    ) {
      const yamlValidation = packageJSON.contributes.yamlValidation;

      if (Array.isArray(yamlValidation)) {
        yamlValidation.forEach((jv) => {
          // eslint-disable-next-line prefer-const
          let { fileMatch, url } = jv;
          if (typeof fileMatch === "string") {
            fileMatch = [fileMatch];
          }
          if (Array.isArray(fileMatch) && typeof url === "string") {
            let uri: string = url;
            if (uri[0] === "." && uri[1] === "/") {
              uri = joinPath(extension.extensionUri, uri).toString();
            }
            fileMatch = fileMatch.map((fm) => {
              if (fm[0] === "%") {
                fm = fm.replace(/%APP_SETTINGS_HOME%/, "/User");
                fm = fm.replace(/%MACHINE_SETTINGS_HOME%/, "/Machine");
                fm = fm.replace(/%APP_WORKSPACES_HOME%/, "/Workspaces");
              } else if (!fm.match(/^(\w+:\/\/|\/|!)/)) {
                fm = "/" + fm;
              }
              return fm;
            });

            associations.push({ fileMatch, uri });
          }
        });
      }
    }
  });
  return associations;
}

export function logToExtensionOutputChannel(message: string): void {
  client.outputChannel.appendLine(message);
}
