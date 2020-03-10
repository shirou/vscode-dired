'use strict';

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

import FileItem from './fileItem';

const FIXED_URI: vscode.Uri = vscode.Uri.parse('dired://fixed_window');

export default class DiredProvider implements vscode.TextDocumentContentProvider {
    static scheme = 'dired'; // ex: dired://<directory>

    private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
    private _fixed_window: boolean;
    private _buffer: string[]; // This is a temporary buffer. Reused by multiple tabs.

    constructor(fixed_window: boolean) {
        this._fixed_window = fixed_window;
    }

    dispose() {
        this._onDidChange.dispose();
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
        if (!this.dirname) {
            return;
        }
        this.createBuffer(this.dirname)
            .then(() => this._onDidChange.fire(this.uri));
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
        this.selectFiles(true);
    }

    unselect() {
        this.selectFiles(false);
    }

    goUpDir() {
        if (!this.dirname || this.dirname === "/") {
            return;
        }
        const p = path.join(this.dirname, "..");
        this.openDir(p);
    }

    openDir(path: string) {
        const f = new FileItem(path, "", true); // Incomplete FileItem just to get URI.
        const uri = f.uri;
        if (uri) {
            this.createBuffer(path)
                .then(() => vscode.workspace.openTextDocument(uri))
                .then(doc => vscode.window.showTextDocument(doc, this.getTextDocumentShowOptions(this._fixed_window)));
        }
    }

    showFile(uri: vscode.Uri) {
        vscode.workspace.openTextDocument(uri).then(doc => {
            vscode.window.showTextDocument(doc, this.getTextDocumentShowOptions(this._fixed_window));
        });
        // TODO: show warning when open file failed
        // vscode.window.showErrorMessage(`Could not open file ${uri.fsPath}: ${err}`);
    }

    provideTextDocumentContent(uri: vscode.Uri): string | Thenable<string> {
        return this.render();
    }

    private get uri(): vscode.Uri {
        if (this.dirname) {
            const f = new FileItem(this.dirname, "", true); // Incomplete FileItem just to get URI.
            const uri = f.uri;
            if (uri) {
                return uri;
            }
        }
        return FIXED_URI;
    }

    private render(): Thenable<string> {
        return new Promise((resolve) => {
            resolve(this._buffer.join('\n'));
        });
    }

    private createBuffer(dirname: string): Thenable<string[]> {
        return new Promise((resolve) => {
            let files: FileItem[] = [];
            if (fs.lstatSync(dirname).isDirectory()) {
                try {
                    files = this.readDir(dirname);
                } catch (err) {
                    vscode.window.showErrorMessage(`Could not read ${dirname}: ${err}`);
                }
            }

            this._buffer = [
                dirname + ":", // header line
            ];
            this._buffer = this._buffer.concat(files.map((f) => f.line()));

            resolve(this._buffer);
        });
    }

    private readDir(dirname: string): FileItem[] {
        const files = [".", ".."].concat(fs.readdirSync(dirname));
        return <FileItem[]>files.map((filename) => {
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

    private getFile(): FileItem | null {
        const at = vscode.window.activeTextEditor;
        if (!at) {
            return null;
        }
        const cursor = at.selection.active;
        if (cursor.line < 1) {
            return null;
        }
        const lineText = at.document.lineAt(cursor.line);
        if (this.dirname && lineText) {
            return FileItem.parseLine(this.dirname, lineText.text);
        }
        return null;
    }

    private selectFiles(value: boolean) {
        if (!this.dirname) {
            return;
        }
        const at = vscode.window.activeTextEditor;
        if (!at) {
            return;
        }
        const doc = at.document;
        if (!doc) {
            return;
        }
        this._buffer = [];
        for (let i = 0; i < doc.lineCount; i++) {
            this._buffer.push(doc.lineAt(i).text);
        }

        let start = 0;
        let end = 0;
        let allowSelectDot = false; // Want to copy emacs's behavior exactly

        if (at.selection.isEmpty) {
            const cursor = at.selection.active;
            if (cursor.line === 0) { // Select all
                start = 1;
                end = doc.lineCount;
            } else {
                allowSelectDot = true;
                start = cursor.line;
                end = cursor.line + 1;
                vscode.commands.executeCommand("cursorMove", { to: "down", by: "line" });
            }
        } else {
            start = at.selection.start.line;
            end = at.selection.end.line;
        }

        for (let i = start; i < end; i++) {
            const f = FileItem.parseLine(this.dirname, this._buffer[i]);
            if (f.fileName === "." || f.fileName === "..") {
                if (!allowSelectDot) {
                    continue;
                }
            }
            f.select(value);
            this._buffer[i] = f.line();
        }
        const uri = this.uri;
        this._onDidChange.fire(uri);
    }

    private getTextDocumentShowOptions(fixed_window: boolean): vscode.TextDocumentShowOptions {
        const opts: vscode.TextDocumentShowOptions = {
            preview: fixed_window,
            viewColumn: vscode.ViewColumn.Active
        };
        return opts;
    }
}
