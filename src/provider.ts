'use strict';

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

import { encodeLocation, decodeLocation, FXIED_URI } from './utils';
import ReferencesDocument from './referencesDocument';

export default class DiredProvider implements vscode.TextDocumentContentProvider {
    static scheme = 'dired'; // ex: dired://<directory>

    private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
    private _files: ReferencesDocument[];
    private _fixed_window: boolean;
    private _dirname: string;

    constructor(fixed_window: boolean) {
        this._fixed_window = fixed_window;
    }

    dispose() {
        this._files = [];
        this._onDidChange.dispose();
    }

    get onDidChange() {
        return this._onDidChange.event;
    }

    setDirName(dir: string): Thenable<string>{
        return new Promise((resolve) => {
            this._dirname = dir;
            resolve(dir);
        });
    }

    enter() {
        const f = this.getFile();
        if (!f) {
            return;
        }
        const uri = f.uri(this._fixed_window);
        this._dirname = f.path;
        this._onDidChange.fire(uri);
    }

    provideTextDocumentContent(uri: vscode.Uri): string | Thenable<string> {       
        const dirname = this._dirname;
        if (fs.lstatSync(dirname).isFile()) {
            vscode.window.showErrorMessage(`${dirname} is file. something wrong`);
            return "is file";
        }
        // TODO: Promisify lsstat
        const files = [".", ".."].concat(fs.readdirSync(dirname));
        this._files = files.map((filename) => {
            const stat = fs.statSync(path.join(dirname, filename));
            return new ReferencesDocument(dirname, filename, stat);
        });
        let lines = [
            dirname + ":", // header line
        ];
        return lines.concat(this._files.map((f) => {
            return f.line(1);
        })).join('\n');
    }

    createDir(dirname: string) {
        const p = path.join(this._dirname, dirname);
        fs.mkdirSync(p);
        vscode.window.showInformationMessage(`${p} is created.`);
    }
    rename(newName: string) {
        const f = this.getFile();
        if (!f) {
            return;
        }
        const n = path.join(this._dirname, newName);
        vscode.window.showInformationMessage(`${f.fileName} is renamed to ${n}`);
    }
    copy(newName: string) {
        const f = this.getFile();
        if (!f) {
            return;
        }
        const n = path.join(this._dirname, newName);
        vscode.window.showInformationMessage(`${f.fileName} is copied to ${n}`);
    }
    goUpDir() {
        const p = path.join(this._dirname, "..");
        const stats = fs.lstatSync(p);
        const f = new ReferencesDocument(this._dirname, "..", stats);
        const uri = f.uri(this._fixed_window);
        this._dirname = p;
        this._onDidChange.fire(uri);
    }

    /**
     * get file from cursor position.
     */
    private getFile(): ReferencesDocument {
        const cursor = vscode.window.activeTextEditor.selection.active;
        if (cursor.line < 1) {
            return null;
        }
        return this._files[cursor.line-1]; // 1 means direpath on top;
    }
}
