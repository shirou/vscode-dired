'use strict';

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

import FileItem from './fileItem';

const FIXED_URI: vscode.Uri = vscode.Uri.parse('dired://fixed_window');

export default class DiredProvider implements vscode.TextDocumentContentProvider {
    static scheme = 'dired'; // ex: dired://<directory>

    private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
    private _files: FileItem[];
    private _fixed_window: boolean;
    private _dirname: string;

    constructor(fixed_window: boolean) {
        this._fixed_window = fixed_window;
    }

    dispose() {
        this.clear();
        this._onDidChange.dispose();
    }

    /**
     * clear provider information but not disposed.
     */
    clear() {
        this._files = [];
    }

    get onDidChange() {
        return this._onDidChange.event;
    }

    get dirname() {
        const at = vscode.window.activeTextEditor;
        if (!at) {
            return undefined;
        }
        const doc = at.document;
        if (!doc) {
            return undefined;
        }
        const line0 = doc.lineAt(0).text;
        const dir = line0.substr(0, line0.length - 1);
        return dir;
    }

    enter() {
        const f = this.getFile();
        if (!f) {
            return;
        }
        const uri = f.uri;
        if (!uri) {
            return;
        }
        if (uri.scheme !== DiredProvider.scheme) {
            this.showFile(uri);
            return;
        }
        this.openDir(f.path);
    }

    reload() {
        this._onDidChange.fire(this.uri);
    }

    createDir(dirname: string) {
        if (this.dirname) {
            const p = path.join(this.dirname, dirname);
            fs.mkdirSync(p);
            this.reload();
            vscode.window.showInformationMessage(`${p} is created.`);
        }
    }

    rename(newName: string) {
        const f = this.getFile();
        if (!f) {
            return;
        }
        if (this.dirname) {
            const n = path.join(this.dirname, newName);
            this.reload();
            vscode.window.showInformationMessage(`${f.fileName} is renamed to ${n}`);
        }
    }

    copy(newName: string) {
        const f = this.getFile();
        if (!f) {
            return;
        }
        if (this.dirname) {
            const n = path.join(this.dirname, newName);
            vscode.window.showInformationMessage(`${f.fileName} is copied to ${n}`);
        }
    }

    select() {
        const f = this.getFile();
        if (!f) {
            return;
        }
        f.toggleSelect();
        this.render();
        const uri = f.uri;
        this._onDidChange.fire(uri);
    }

    goUpDir() {
        if (!this.dirname || this.dirname === "/") {
            return;
        }
        const p = path.join(this.dirname, "..");
        this.openDir(p);
    }

    openDir(path: string) {
        this.setDirName(path)
            .then(() => this.reload())
            .then(() => vscode.workspace.openTextDocument(this.uri))
            .then(doc => vscode.window.showTextDocument(doc, this.getTextDocumentShowOptions(this._fixed_window)));
    }

    provideTextDocumentContent(uri: vscode.Uri): string | Thenable<string> {
        return this.render();
    }

    private get uri(): vscode.Uri {
        const f = this._files[0]; // must "."
        const uri = f.uri;
        return uri ? uri : FIXED_URI;
    }

    private render() {
        const lines = [
            this._dirname + ":", // header line
        ];
        return lines.concat(this._files.map((f) => {
            return f.line(1);
        })).join('\n');
    }

    private showFile(uri: vscode.Uri) {
        vscode.workspace.openTextDocument(uri).then(doc => {
            vscode.window.showTextDocument(doc, this.getTextDocumentShowOptions(this._fixed_window));
        });
        // TODO: show warning when open file failed
        // vscode.window.showErrorMessage(`Could not open file ${uri.fsPath}: ${err}`);
    }

    private setDirName(dirname: string): Thenable<string> {
        return new Promise((resolve) => {
            if (fs.lstatSync(dirname).isDirectory()) {
                try {
                    this.readDir(dirname);
                } catch (err) {
                    vscode.window.showErrorMessage(`Could not read ${dirname}: ${err}`);
                }
            }
            this._dirname = dirname;
            resolve(dirname);
        });
    }

    private readDir(dirname: string) {
        // TODO: Promisify readdir
        const files = [".", ".."].concat(fs.readdirSync(dirname));
        this._files = <FileItem[]>files.map((filename) => {
            const p = path.join(dirname, filename);
            try {
                const stat = fs.statSync(p);
                return FileItem.create(dirname, filename, stat);
            } catch (err) {
                vscode.window.showErrorMessage(`Could not get stat of ${p}: ${err}`);
                return null;
            }
        }).filter((fileItem) => {
            if (fileItem) {
                return true;
            } else {
                return false;
            }
        });
    }

    /**
     * get file from cursor position.
     */
    private getFile(): FileItem | null {
        const at = vscode.window.activeTextEditor;
        if (!at) {
            return null;
        }
        const cursor = at.selection.active;
        if (cursor.line < 1) {
            return null;
        }
        if (this.dirname) {
            const lineText = at.document.lineAt(cursor.line).text;
            return FileItem.parseLine(this.dirname, lineText);
        }
        return null;
    }

    private getTextDocumentShowOptions(fixed_window: boolean): vscode.TextDocumentShowOptions {
        const opts: vscode.TextDocumentShowOptions = {
            preview: fixed_window,
            viewColumn: vscode.ViewColumn.Active
        };
        return opts;
    }
}
