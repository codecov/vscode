/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ExtensionContext } from "vscode";
import {
  startClient,
  LanguageClientConstructor,
  RuntimeEnvironment,
} from "../extension";
import {
  TransportKind,
  LanguageClientOptions,
  LanguageClient,
} from "vscode-languageclient/node";

import { SchemaExtensionAPI } from "../schema-extension-api";
import { JSONSchemaCache } from "../json-schema-cache";

export async function activate(
  context: ExtensionContext
): Promise<SchemaExtensionAPI> {
  const serverModule = context.asAbsolutePath("./dist/languageserver.js");
  const debugOptions = {
    execArgv: ["--nolazy", "--inspect=6009"],
  };

  const serverOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: debugOptions,
    },
  };

  const newLanguageClient: LanguageClientConstructor = (
    id: string,
    name: string,
    clientOptions: LanguageClientOptions
  ) => {
    return new LanguageClient(id, name, serverOptions, clientOptions);
  };

  const runtime: RuntimeEnvironment = {
    schemaCache: new JSONSchemaCache(
      context.globalStorageUri.fsPath,
      context.globalState
    ),
  };

  return startClient(context, newLanguageClient, runtime);
}

function startedFromSources(): boolean {
  return process.env["DEBUG_VSCODE_YAML"] === "true";
}
