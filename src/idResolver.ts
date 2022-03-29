'use strict';

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as readline from 'readline';
import * as path from 'path'

export class IDResolver {
    private _user_cache = new Map<Number, string>();
    private _group_cache = new Map<Number, string>();

    constructor() {
        this.create(true);
        this.create(false);
    }
    username(uid: Number):string | undefined{
        return this._user_cache.get(uid);
    }
    groupname(uid: Number):string | undefined{
        return this._group_cache.get(uid);
    }

    private create(user: boolean){
        // create a cache file in the user's home directory for Windows and Unix
        const home = require('os').homedir();
        const cache_file = user ? '.vscode-dired-user-cache' : '.vscode-dired-group-cache';
        const cache_path = path.join(home, cache_file);

        if (fs.existsSync(cache_file) === false) {
            // create empty file
            fs.writeFileSync(cache_path, '');
        }
        const rl = readline.createInterface({
            input: fs.createReadStream(cache_file),
        });
        rl.on('line', (line:string) => {
            const l = line.split(":", 3);
            const name = l[0];
            const uid = parseInt(l[2], 10);
            if (user) {
                this._user_cache.set(uid, name);
            } else {
                this._group_cache.set(uid, name);
            }
        });
    }

    createOnMac(){
        // dscl . -list /Users UniqueID
        // dscl . -list /Groups gid
    }
}