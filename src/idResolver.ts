'use strict';

import * as fs from 'fs';
import * as readline from 'readline';

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
        let path: string;
        if (user) {
            path = '/etc/passwd';
        } else {
            path = '/etc/group';
        }

        if (fs.existsSync(path) === false) {
            console.log(`${path} not found`);
            return;
        }
        const rl = readline.createInterface({
            input: fs.createReadStream(path),
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