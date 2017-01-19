'use strict';

import * as vscode from 'vscode';
import DiredProvider from './provider';

const FIXED_WINDOW_AUTHORITY = "fixed_window";
export const FXIED_URI = vscode.Uri.parse('dired://fixed_window')

export function encodeLocation(dir: string, fixed_window: boolean): vscode.Uri {
    if (fixed_window) {
        return FXIED_URI;
    } else {
        return vscode.Uri.parse(`${DiredProvider.scheme}://${dir}`);
    }
}

export function decodeLocation(uri: vscode.Uri): [string, vscode.Position] {
    const line = 0; // TODO
    const character = 0;
    if (uri.authority === FIXED_WINDOW_AUTHORITY) {
        const [dir] = <[string]>JSON.parse(uri.query);
        return [dir, new vscode.Position(line, character)];
    } else {
        return [uri.fsPath, new vscode.Position(line, character)];
    }

}
