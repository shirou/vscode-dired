'use strict';

import * as vscode from 'vscode';
import DiredProvider from './provider';
import { encodeLocation, decodeLocation, FXIED_URI } from './utils';

import * as path from 'path';

export interface ExtensionInternal {
    DiredProvider: DiredProvider,
}

export function activate(context: vscode.ExtensionContext): ExtensionInternal {
    const fixed_window = true; // TODO: configurable
    const provider = new DiredProvider(fixed_window); 

    const providerRegistrations = vscode.Disposable.from(
        vscode.workspace.registerTextDocumentContentProvider(DiredProvider.scheme, provider),
    );
    const commandOpen = vscode.commands.registerCommand("extension.dired.open", () => {
        const at = vscode.window.activeTextEditor;
        if (!at) {
            return;
        }
        const doc = at.document;
        const dir = path.dirname(doc.fileName);
        return provider.setDirName(dir)
            .then(() => provider.reload())
            .then(() => vscode.workspace.openTextDocument(FXIED_URI))
            .then(doc => vscode.window.showTextDocument(doc, 0));
    });
    const commandEnter = vscode.commands.registerCommand("extension.dired.enter", () => {
        provider.enter();
    });
    const commandCreateDir = vscode.commands.registerCommand("extension.dired.createDir", () => {
        vscode.window.showInputBox()
        .then((dirName) => {
            if (!dirName) {
                return;
            }
            provider.createDir(dirName);
        });
    });
    const commandRename = vscode.commands.registerCommand("extension.dired.rename", () => {
        vscode.window.showInputBox()
        .then((newName: string) => {
            provider.rename(newName);
        });
    });
    const commandCopy = vscode.commands.registerCommand("extension.dired.copy", () => {
        vscode.window.showInputBox()
        .then((newName: string) => {
            provider.copy(newName);
        });
    });
    const commandGoUpDir = vscode.commands.registerCommand("extension.dired.goUpDir", () => {
        provider.goUpDir();
    });
    const commandRefresh = vscode.commands.registerCommand("extension.dired.refresh", () => {
        provider.reload();
    });
    const commandSelect = vscode.commands.registerCommand("extension.dired.select", () => {
        provider.select();
    });
    const commandClose = vscode.commands.registerCommand("extension.dired.close", () => {
        provider.clear();
        vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    });

    context.subscriptions.push(
        provider,
        commandOpen,
        commandEnter,
        commandCreateDir,
        commandRename,
        commandCopy,
        commandGoUpDir,
        commandRefresh,
        commandClose,
        commandSelect,
        providerRegistrations
    );

    vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor.document.uri.scheme === DiredProvider.scheme) {
            vscode.commands.executeCommand('setContext', 'dired.open', true);
        } else {
            vscode.commands.executeCommand('setContext', 'dired.open', false);
        }
    });

    return {
        DiredProvider: provider,
    };
}