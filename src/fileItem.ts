'use strict';

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

var Mode = require('stat-mode');
import DiredProvider from './provider';
import { IDResolver } from './IDResolver';
import { encodeLocation, decodeLocation } from './utils';


export default class FileItem {
    private _uri: vscode.Uri;
    private _stats: fs.Stats;
    private _dirname: string;
    private _filename: string;
    private _mode: any;
    private _selected: boolean;

    static _resolver = new IDResolver();
    
    constructor(dir: string, filename: string, stats: fs.Stats) {
        this._stats = stats;
        this._dirname = dir;
        this._filename = filename;
        this._mode = new Mode(this._stats);
    }

    toggleSelect(): void{
        if (this._selected) {
            this._selected = false;
        } else {
            this._selected = true;
        }
    }

    get path(): string {
        return path.join(this._dirname, this._filename);
    }
    get fileName(): string {
        return this._filename;
    }

    public line(column: Number): string {
        const u = FileItem._resolver.username(this._stats.uid);
        const g = FileItem._resolver.groupname(this._stats.gid);
        const size = this.pad(this._stats.size, 8, " ");
        const month = this.pad(this._stats.ctime.getMonth()+1, 2, "0");
        const day = this.pad(this._stats.ctime.getDay(), 2, "0");
        const hour = this.pad(this._stats.ctime.getHours(), 2, "0");
        const min = this.pad(this._stats.ctime.getMinutes(), 2, "0");
        let se = " ";
        if (this._selected) {
            se = "*";
        }
        return `${se} ${this._mode.toString()} ${u} ${g} ${size} ${month} ${day} ${hour}:${min} ${this._filename}`;
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

    pad(num:number, size:number, p: string): string {
        var s = num+"";
        while (s.length < size) s = p + s;
        return s;
    }
}