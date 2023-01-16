import { VType, Variable } from "./vtype.ts";

export class Environment {
    vars: Map<string, Variable> = new Map();
    parent?: Environment;
    constructor(parent?: Environment) {
        this.parent = parent;
    }
    
    addrs(): number[] {
        const list: number[] = [];
        this.vars.forEach(val => { list.push(val.addr) } );
        return list;
    }

    exists(vname: string): boolean {
        if(this.vars.has(vname)) return true;
        else if(this.parent != undefined) {
            return this.parent.exists(vname);
        } else {
            return false;
        }
    }
    lastAddr(): number {
        //console.log(this.addrs(), Math.max(...this.addrs()));
        if(this.addrs().length == 0) return 0;
        return Math.max(...this.addrs())+1;
    }

    getVarDepth(vname: string): number {
        if(this.vars.has(vname)) return 0;
        else if(this.parent != undefined) if(this.parent.vars.has(vname)) return 1; else return this.parent.getVarDepth(vname)+1;
        else {
            console.error(`Variable ${vname} does not exist`);
            Deno.exit(1);
        }
    }
    
    declare(vname: string, type: VType): Variable {
        if(this.vars.has(vname)) {
            console.error(`Variable ${vname} already exists`);
            Deno.exit(1);
        } else {
            const variable = { type, addr: this.lastAddr() } as Variable;
            this.vars.set(vname, variable);
            return variable;
        }
    }

    read(vname: string): Variable {
        if(!this.vars.has(vname)) {
            if(this.parent != undefined) {
                if(this.parent.vars.has(vname)) {
                    return this.parent.vars.get(vname) as Variable;
                }
            }
            console.error(`Variable ${vname} does not exist`);
            Deno.exit(1);
        } else {
            return this.vars.get(vname) as Variable;
        }
    }

    remove(vname: string): void {
        if(!this.vars.has(vname)) {
            console.error(`Variable ${vname} does not exist`);
            Deno.exit(1);
        } else {
            this.vars.delete(vname);
        }
    }
}