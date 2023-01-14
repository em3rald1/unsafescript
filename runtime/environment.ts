import { VType, Variable, NumberVar, StringVar, PtrVar } from "./vtype.ts";

function missingNumbers(input: number[]) {
    let result: number[] = [];
  
    for (
      let i = 0, targetValue = input[0];
      targetValue <= input[input.length - 1];
      targetValue++
    ) {
      if (input[i] != targetValue) {
        result.push(targetValue);
      } else {
        i++;
      }
    }
  
    return result;
  }
export class Environment {
    parent?: Environment;
    vars: Map<string, Variable>;
    constructor(parent?: Environment) {
        this.vars = new Map();
        this.parent = parent;
    }
    exists(vname: string): boolean {
        if(this.vars.has(vname)) return true;
        else if(this.parent != undefined) {
            return this.parent.exists(vname);
        } else {
            return false;
        }
    }

    addresses() {
        let list: number[] = [];
        this.vars.forEach(val => { list.push(val.addr) } );
        if(this.parent != undefined) list = list.concat(this.parent.addresses());
        return list;
    }

    findFree(): number {
        const addrs = this.addresses();
        const missing = missingNumbers(addrs);
        if(missing.length == 0) return addrs.length;
        return missing[0];
        
    }
    variables(): number {
        return this.vars.size + (this.parent == undefined ? 0 : this.parent.variables());
    }

    declare(vname: string, type: VType) {
        if(this.vars.has(vname)) {
            console.error(`Variable ${vname} already exists.`);
            Deno.exit(1);
        }
        this.vars.set(vname, { type, addr: this.findFree() } as Variable);
    }
    read(vname: string): Variable {
        if(!this.vars.has(vname)) {
            console.error(`Variable ${vname} does not exist.`)
            Deno.exit(1);
        }
        return this.vars.get(vname) as Variable;
    }
    remove(vname: string): void {
        if(!this.vars.has(vname)) return;
        this.vars.delete(vname);
    }
}