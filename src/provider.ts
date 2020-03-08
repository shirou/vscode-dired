'use strict';

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

import { encodeLocation, decodeLocation, FIXED_URI } from './utils';
import FileItem from './fileItem';

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

    setDirName(dirname: string): Thenable<string>{
        return new Promise((resolve) => {
            if (fs.lstatSync(dirname).isDirectory()) {
                try {
                    this.readDir(dirname);
                } catch(err) {
                    vscode.window.showErrorMessage(`Could not read ${dirname}: ${err}`);
                }
            }
            this._dirname = dirname;
            resolve(dirname);
        });
    }

    get dirname() {
        return this._dirname;    
    }

    enter() {
        const f = this.getFile();
        if (!f) {
            return;
        }
        const uri = f.uri(this._fixed_window);
        if (!uri) {
            return;
        }
        if (uri.scheme !== DiredProvider.scheme){
            this.showFile(uri);
            return;
        }
        this.setDirName(f.path)
            .then((dirname) => {
                this._onDidChange.fire(uri);
        });
    }

    reload() {
        const f = this._files[0]; // must "."
        const uri = f.uri(this._fixed_window);
        this._onDidChange.fire(uri);
    }

    render() {
        const lines = [
            this._dirname + ":", // header line
        ];
        return lines.concat(this._files.map((f) => {
            return f.line(1);
        })).join('\n');
    }

    showFile(uri: vscode.Uri) {
        vscode.workspace.openTextDocument(uri).then(doc => {
                vscode.window.showTextDocument(doc);
        });
        // TODO: show warning when open file failed
        // vscode.window.showErrorMessage(`Could not open file ${uri.fsPath}: ${err}`);
    }

    provideTextDocumentContent(uri: vscode.Uri): string | Thenable<string> {       
        if (fs.lstatSync(this._dirname).isFile()) {
            this.showFile(uri);
            return "";
        }
        return this.render();
    }

    readDir(dirname: string) {
        // TODO: Promisify readdir
        const files = [".", ".."].concat(fs.readdirSync(dirname));
        this._files = <FileItem[]>files.map((filename) => {
            const p = path.join(dirname, filename);
            try {
                const stat = fs.statSync(p);
                return new FileItem(dirname, filename, stat);
            } catch(err) {
                vscode.window.showErrorMessage(`Could not get stat of ${p}: ${err}`);
                return null;
            }
        }).filter((fileItem) => {
            if (fileItem) {
                return true;
            }else{
                return false;
            }
        });
    }

    createDir(dirname: string) {
        const p = path.join(this._dirname, dirname);
        fs.mkdirSync(p);
        this.reload();
        vscode.window.showInformationMessage(`${p} is created.`);
    }

    rename(newName: string) {
        const f = this.getFile();
        if (!f) {
            return;
        }
        const n = path.join(this._dirname, newName);
        this.reload();
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

    select() {
        const f = this.getFile();
        if (!f) {
            return;
        }
        f.toggleSelect();
        this.render();
        const uri = f.uri(this._fixed_window);
        this._onDidChange.fire(uri);
    }

    goUpDir() {
        if (this._dirname === "/") {
            return;
        }
        const p = path.join(this._dirname, "..");
        try{
            const stats = fs.lstatSync(p);
            const f = new FileItem(this._dirname, "..", stats);
            const uri = f.uri(this._fixed_window);
            this.setDirName(p)
                .then((dirname) => {
                    this._onDidChange.fire(uri);
            });
        } catch (err) {
            vscode.window.showInformationMessage(`Could not get stat of ${p}: ${err}`);
        }
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
        return this._files[cursor.line-1]; // 1 means direpath on top;
    }
}
