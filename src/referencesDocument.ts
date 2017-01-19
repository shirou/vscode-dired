'use strict';

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

var Mode = require('stat-mode');
import DiredProvider from './provider';
import { encodeLocation, decodeLocation } from './utils';


export default class ReferencesDocument {
    private _uri: vscode.Uri;
    private _stats: fs.Stats;
    private _dirname: string;
    private _filename: string;
    private _mode: any;
    private _selected: boolean;

    constructor(dir: string, filename: string, stats: fs.Stats) {
        this._stats = stats;
        this._dirname = dir;
        this._filename = filename;
        this._mode = new Mode(this._stats);
    }

    select(flag: boolean): void{
        this._selected = flag;
    }

    get path(): string {
        return path.join(this._dirname, this._filename);
    }
    get fileName(): string {
        return this._filename;
    }

    public line(column: Number): string {
        return `${this._mode.toString()} ${this._filename}  `;
    }

    public uri(fixed_window: boolean): vscode.Uri {
        const p = path.join(this._dirname, this._filename);
        if (this._mode.isDirectory()) {
            return encodeLocation(p, fixed_window);
        } else if (this._mode.isFile()) {
            return vscode.Uri.parse(`file://${p}`);
        }
        return;
    }
}