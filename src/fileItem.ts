'use strict';

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

var Mode = require('stat-mode');
import DiredProvider from './provider';
import { IDResolver } from './idResolver';
import { URL } from 'url';


export default class FileItem {

    constructor(
        private _dirname: string,
        private _filename: string,
        private _isDirectory: boolean = false,
        private _isFile: boolean = true,
        private _username: string | undefined = undefined,
        private _groupname: string | undefined = undefined,
        private _size: number = 0,
        private _month: number = 0,
        private _day: number = 0,
        private _hour: number = 0,
        private _min: number = 0,
        private _modeStr: string | undefined = undefined,
        private _selected: boolean = false) {}

    static _resolver = new IDResolver();

    public static create(dir: string, filename: string, stats: fs.Stats) {
        const mode = new Mode(stats);
        return new FileItem(
            dir,
            filename,
            mode.isDirectory(),
            mode.isFile(),
            FileItem._resolver.username(stats.uid),
            FileItem._resolver.groupname(stats.gid),
            stats.size,
            stats.ctime.getMonth()+1,
            stats.ctime.getDate(),
            stats.ctime.getHours(),
            stats.ctime.getMinutes(),
            mode.toString(),
            false);
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
        const u = (this._username + "        ").substr(0, 8);
        const g = (this._groupname + "        ").substr(0, 8);
        const size = this.pad(this._size, 8, " ");
        const month = this.pad(this._month, 2, "0");
        const day = this.pad(this._day, 2, "0");
        const hour = this.pad(this._hour, 2, "0");
        const min = this.pad(this._min, 2, "0");
        let se = " ";
        if (this._selected) {
            se = "*";
        }
        return `${se} ${this._modeStr} ${u} ${g} ${size} ${month} ${day} ${hour}:${min} ${this._filename}`;
    }

    public static parseLine(dir: string, line: string): FileItem {
        const filename = line.substr(52);
        const username = line.substr(13, 8);
        const groupname = line.substr(22, 8);
        const size = parseInt(line.substr(31, 8));
        const month = parseInt(line.substr(40, 2));
        const day = parseInt(line.substr(43, 2));
        const hour = parseInt(line.substr(46, 2));
        const min = parseInt(line.substr(49, 2));
        const modeStr = line.substr(2, 10);
        const isDirectory = (modeStr.substr(0, 1) === "d");
        const isFile = (modeStr.substr(0, 1) === "-");
        const isSelected = (line.substr(0, 1) === "*");

        return new FileItem(
            dir,
            filename,
            isDirectory,
            isFile,
            username,
            groupname,
            size,
            month,
            day,
            hour,
            min,
            modeStr,
            isSelected);
    }

    public get uri(): vscode.Uri | undefined {
        const p = path.join(this._dirname, this._filename);
        if (this._isDirectory) {
            const u = new URL(`${DiredProvider.scheme}://${p}`);
            return vscode.Uri.parse(u.href);
        } else if (this._isFile) {
            const u = new URL(`file:///${p}`);
            return vscode.Uri.parse(u.href);
        }
        return undefined;
    }

    pad(num:number, size:number, p: string): string {
        var s = num+"";
        while (s.length < size) s = p + s;
        return s;
    }
}