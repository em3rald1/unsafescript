import { Statement, Program, NumericLiteral, MemberExpr, CallExpr, IdentLiteral, BinaryExpr, StringLiteral, CharLiteral, VarDecl, FunDecl, ArrayLiteral, ReturnStatement, DelStatement, AssignExpr, ASMLine, ComparisonExpr, ForStatement, WhileStatement, IfStatement, LogicalExpr, BinOpAssignExpr, BitwiseExpr, NotExpr } from "../ast/ast.ts";
import { CompilerValue, NumberVal, RegisterVal, LabelVal, toString } from "./cvalues.ts";
import { Environment } from "../runtime/dyn_environment.ts";

export class Compiler {
    free_regs: boolean[] = [];
    frame_pointer = 0;
    code = "";
    data_code = "";
    strings = 0;
    arrays = 0;
    if_stmts = 0;
    else_stmts = 0;
    while_stmts = 0;
    constructor(regs_amount: number) {
        for(let i = 0; i < regs_amount; i++) this.free_regs.push(true);
        this.frame_pointer = regs_amount+1;
        this.code += `MOV R${this.frame_pointer} SP\n`;
    }
    private allocateReg(): number {
        const free = this.free_regs.indexOf(true);
        this.free_regs[free] = false;
        return free+1;
    }
    private freeReg(free: number): void {
        this.free_regs[free-1] = true;
    }
    private freeAll(): void {
        for(let i = 0; i < this.free_regs.length; i++) this.free_regs[i] = true;
    }
    compile(statement: Statement, env: Environment): CompilerValue {
        switch(statement.type) {
            // literals
            case "NumericLiteral": {
                return { type: "number", value: (statement as NumericLiteral).value } as NumberVal;
            }
            case "CharLiteral": {
                return { type: "number", value: (statement as CharLiteral).value.charCodeAt(0) } as NumberVal;
            }
            case "StringLiteral": {
                this.data_code += `.string_${++this.strings}\nDW "${(statement as StringLiteral).value}"\n`;
                return { type:'label', value: `.string_${this.strings}`} as LabelVal;
            }
            case "IdentLiteral": {
                if(!env.exists((statement as IdentLiteral).value)) {
                    console.error(`Variable ${(statement as IdentLiteral).value} does not exist.`);
                    Deno.exit(1);
                }
                let lfp = this.frame_pointer; // local frame pointer
                const addr = env.read((statement as IdentLiteral).value).addr+1;

                const depth = env.getVarDepth((statement as IdentLiteral).value);
                let curEnv = env;
                const reg2 = depth > 0 ? this.allocateReg() : 0;
                for(let i = 0; i < depth; i++) {
                    this.code += `LOD R${reg2} R${lfp}\n`;
                    lfp = reg2;
                    curEnv = curEnv.parent as Environment;
                }
                const reg = this.allocateReg();
                this.code += `LLOD R${reg} R${lfp} -${addr}\n`;
                return { type: "register", value: reg } as RegisterVal;
            }
            case "ArrayLiteral": {
                this.data_code += `.array_${++this.arrays}\n`;
                const stmt = (statement as ArrayLiteral);

                for(let i = 0; i < stmt.value.length; i++) {
                    this.code += `LSTR .array_${this.arrays} ${i} ${toString(this.compile(stmt.value[i], env))}\n`;
                    this.data_code += 'DW 0\n';
                }

                return { type: "label", value: `.array_${this.arrays}\n` } as LabelVal;
            }
            // expressions
            case "BinaryExpr": {
                const stmt = statement as BinaryExpr;
                const left = this.compile(stmt.left, env);
                const right = this.compile(stmt.right, env);
                const op = stmt.op == "+" ? "ADD" : stmt.op == "-" ? "SUB" : stmt.op == "*" ? "MLT" : stmt.op == "/" ? "DIV" : stmt.op == "%" ? "MOD" : "NOP";
                let reg: number;
                if(left.type == "register" && right.type != "register") {
                    reg = (left as RegisterVal).value;
                } else if(left.type != "register" && right.type == "register") {
                    reg = (right as RegisterVal).value;
                } else if(left.type == "register" && right.type == "register") {
                    reg = (left as RegisterVal).value;
                    this.freeReg((right as RegisterVal).value);
                } else {
                    reg = this.allocateReg();
                }
                this.code += `${op} R${reg} ${toString(left)} ${toString(right)}\n`;
                return { type: "register", value: reg } as RegisterVal;
            }
            case "MemberExpr": {
                const stmt = statement as MemberExpr;
                if(!stmt.computed) {
                    console.error("Non-computed values are not supported yet!");
                    Deno.exit(1);
                }
                const obj = this.compile(stmt.obj, env);
                const prop = this.compile(stmt.property, env);
                let reg: number;
                if(obj.type == "register" && prop.type != "register") {
                    reg = (obj as RegisterVal).value;
                } else if(obj.type != "register" && prop.type == "register") {
                    reg = (prop as RegisterVal).value;
                } else if(obj.type == "register" && prop.type == "register") {
                    reg = (obj as RegisterVal).value;
                    this.freeReg((prop as RegisterVal).value);
                } else {
                    reg = this.allocateReg();
                }
                this.code += `LLOD R${reg} ${toString(obj)} ${toString(prop)}\n`;
                return { type: "register", value: reg } as RegisterVal;
            }
            case "AssignExpr": {
                const stmt = statement as AssignExpr;
                const left = stmt.left;
                const right = this.compile(stmt.right, env);
                if(left.type == "IdentLiteral") {
                    const varlit = env.read((left as IdentLiteral).value);

                    const depth = env.getVarDepth((left as IdentLiteral).value);
                    

                    let { addr: vaddr, type } = varlit;
                    vaddr++;
                    if(type == "number" && !["register", "number"].includes(right.type)) {
                        console.log(`Can not assign value of type ${right.type} to variable of type ${type}`);
                        Deno.exit(1);
                    } else if((type == "pointer" || type == "string") && !["pointer", "register", "label"].includes(right.type)) {
                        console.log(`Can not assign value of type ${right.type} to variable of type ${type}`);
                        Deno.exit(1);
                    }
                    let lfp = this.frame_pointer;
                    let curEnv = env;
                    const reg = this.allocateReg();
                    for(let i = 0; i < depth; i++) {
                        this.code += `LOD R${reg} R${lfp}\n`;
                        lfp = reg;
                        curEnv = curEnv.parent as Environment;
                    }
                    
                    this.code += `LSTR R${lfp} -${vaddr} ${toString(right)}\n`;
                    return { type: "register", value: reg } as RegisterVal;
                } else if(left.type == "MemberExpr") {
                    const obj = toString(this.compile((left as MemberExpr).obj, env));
                    const prop = toString(this.compile((left as MemberExpr).property, env));
                    this.code += `LSTR ${obj} ${prop} ${toString(right)}\n`;
                    return right;
                }
                else {
                    console.error(`Assigning value to node of type ${left.type} is unsupported`);
                    Deno.exit(1);
                }
                break;
            }
            case "CallExpr": {
                const stmt = statement as CallExpr;
                for(const arg of stmt.args) {
                    const argc = toString(this.compile(arg, env));
                    this.code += `PSH ${argc}\n`;
                }
                if(stmt.caller.type == "IdentLiteral") {
                    this.code += `CAL .${(stmt.caller as IdentLiteral).value}\n`;
                    const reg = this.allocateReg();
                    this.code += `MOV R${reg} R1\n`;
                    for(const _arg of stmt.args) this.code += `POP R0\n`;
                    return { type: "register", value: reg } as RegisterVal; // return value is stored in R1
                }
                else {
                    const caller = toString(this.compile(stmt.caller, env));
                    this.code += `CAL ${caller}\n`;
                    const reg = this.allocateReg();
                    this.code += `MOV R${reg} R1\n`;
                    for(const _arg of stmt.args) this.code += `POP R0\n`;
                    return { type: "register", value: reg } as RegisterVal;
                }
            }
            case "ComparisonExpr": {
                const stmt = statement as ComparisonExpr;
                const lhs = this.compile(stmt.left, env);
                const rhs = this.compile(stmt.right, env);
                const op = stmt.op;
                let reg;
                if(lhs.type == "register" && rhs.type != "register") {
                    reg = (lhs as RegisterVal).value;
                } else if(lhs.type != "register" && rhs.type == "register") {
                    reg = (rhs as RegisterVal).value;
                } else if(lhs.type == "register" && rhs.type == "register") {
                    reg = (lhs as RegisterVal).value;
                    this.freeReg((rhs as RegisterVal).value);
                } else reg = this.allocateReg();
                const left = toString(lhs);
                const right = toString(rhs);
                switch(op) {
                    case ">": {
                        this.code += `SSETG R${reg} ${left} ${right}\n`;
                        return { type: "register", value: reg } as RegisterVal;
                    }
                    case ">=": {
                        this.code += `SSETGE R${reg} ${left} ${right}\n`;
                        return { type: "register", value: reg } as RegisterVal;
                    }
                    case "<": {
                        this.code += `SSETL R${reg} ${left} ${right}\n`;
                        return { type: "register", value: reg } as RegisterVal;
                    }
                    case "<=": {
                        this.code += `SSETLE R${reg} ${left} ${right}\n`;
                        return { type: "register", value: reg } as RegisterVal;
                    }
                    case "==": {
                        this.code += `SETE R${reg} ${left} ${right}\n`;
                        return { type: "register", value: reg } as RegisterVal;
                    }
                    case "!=": {
                        this.code += `SETNE R${reg} ${left} ${right}\n`;
                        return { type: "register", value: reg } as RegisterVal; 
                    }
                    default: {
                        console.error(`Operator ${op} not supported in comparison expression`);
                        Deno.exit(1);
                    }
                }
                break;
            }
            case "NotExpr": {
                const stmt = statement as NotExpr;
                const value = this.compile(stmt.value, env);
                const reg = value.type == "register" ? (value as RegisterVal).value : this.allocateReg();
                this.code += `NOT R${reg} ${toString(value)}\n`;
                return { type: "register", value: reg } as RegisterVal;
            }
            case "BitwiseExpr": {
                const stmt = statement as BitwiseExpr;
                const op = stmt.op == "|" ? "OR" : stmt.op == "&" ? "AND" : stmt.op == "^" ? "XOR" : "UNDEF";
                const left = this.compile(stmt.left, env);
                const right = this.compile(stmt.right, env);
                let reg: number;
                if(left.type == "register" && right.type != "register") {
                    reg = (left as RegisterVal).value;
                } else if(left.type != "register" && right.type == "register") {
                    reg = (right as RegisterVal).value;
                } else if(left.type == "register" && right.type == "register") {
                    reg = (left as RegisterVal).value;
                    this.freeReg((right as RegisterVal).value);
                } else reg = this.allocateReg();
                this.code += `${op} R${reg} ${left} ${right}\n`;
                return { type: "register", value: reg } as RegisterVal;
            }
            case "LogicalExpr": {
                const stmt = statement as LogicalExpr;
                // convert left and right to boolean
                const left = this.compile(stmt.left, env);
                const reg1 = left.type == "register" ? (left as RegisterVal).value : this.allocateReg();
                this.code += `SETNE R${reg1} ${toString(left)} 0\n`;
                const right = this.compile(stmt.right, env);
                const reg2 = right.type == "register" ? (left as RegisterVal).value : this.allocateReg();
                this.code += `SETNE R${reg2} ${toString(right)} 0\n`;
                const op = stmt.op == "||" ? "OR" : stmt.op == "&&" ? "AND" : stmt.op == "^^" ? "XOR" : "UNDEF";
                this.code += `${op} R${reg1} R${reg1} R${reg2}\n`;
                this.freeReg(reg2);
                return { type: "register", value: reg1 } as RegisterVal;
            }
            case 'BinOpAssignExpr': {
                const stmt = statement as BinOpAssignExpr;
                const op = stmt.op == "+=" ? "ADD" : stmt.op == "-=" ? "SUB" : stmt.op == "*=" ? "MLT" : stmt.op == "/=" ? "DIV" : "UNDEF";
                if(stmt.left.type == "IdentLiteral" ) {
                    const vreg = this.compile(stmt.left, env);
                    let {addr, type}  = env.read((stmt.left as IdentLiteral).value);
                    addr++;
                    const val = this.compile(stmt.right, env);
                    if(type != "number") {
                        console.error(`Can not apply binary operations on variable of type ${type}`);
                        Deno.exit(1);
                    }
                    let lfp = this.frame_pointer;
                    const depth = env.getVarDepth((stmt.left as IdentLiteral).value);
                    const reg = depth > 0 ? this.allocateReg() : 0;
                    let curEnv = env;
                    for(let i = 0; i < depth; i++) {
                        this.code += `LOD R${reg} R${lfp}\n`;
                        lfp = reg;
                        curEnv = curEnv.parent as Environment;
                    }

                    this.code += `${op} ${toString(vreg)} ${toString(vreg)} ${toString(val)}\nLSTR R${lfp} -${addr} ${toString(vreg)}\n`;
                    return vreg;
                } else {
                    if(stmt.left.type == "MemberExpr") {
                        const obj = toString(this.compile((stmt.left as MemberExpr).obj, env));
                        const prop = toString(this.compile((stmt.left as MemberExpr).property, env));
                        const reg = this.allocateReg();
                        this.code += `LLOD R${reg} ${obj} ${prop}\n`;
                        const right = this.compile(stmt.right, env);
                        this.code += `${op} R${reg} R${reg} ${toString(right)}\n`;
                        this.code += `LSTR ${obj} ${prop} R${reg}\n`;
                        this.freeReg(reg);
                        return right;
                    } else {
                        console.error("Cannot assign value to left value of type " + stmt.left.type);
                        Deno.exit(1);
                    }
                    break;
                }
            }
            // statements
            case "Program": {
                const stmt = statement as Program;
                for(const stmts of stmt.body) {
                    this.freeAll();
                    this.compile(stmts, env);
                }
                return { type: "register", value: 0 } as RegisterVal;
            }
            case "FunDecl": {
                const stmt = statement as FunDecl;
                this.code += `HLT\n.${stmt.name}\n`;
                const nenv = new Environment(env);
                this.code += `PSH R${this.frame_pointer}\nMOV R${this.frame_pointer} SP\n`;
                for(let i = 0; i < stmt.params.length; i++) {
                    const param = stmt.params[i];
                    nenv.declare(...param);
                    const paramI = stmt.params.length - i;
                    const reg = this.allocateReg();
                    this.code += `LLOD R${reg} SP ${paramI+i+1}\nPSH R${reg}\n`;
                    this.freeReg(reg);
                }
                for(const bstmt of stmt.body) {
                    this.compile(bstmt, nenv);
                }
                return { type: "register", value: 0 } as RegisterVal;
            }
            case "VarDecl": {
                const varDecl = statement as VarDecl;
                env.declare(varDecl.name, varDecl.vtype);
                const value = this.compile(varDecl.value, env);
                if(varDecl.vtype == "number" && !["number", "register"].includes(value.type)) {
                    console.error(`Value of type ${value.type} can not be stored in variable of type ${varDecl.vtype}`);
                    Deno.exit(1);
                } else if(varDecl.vtype == "pointer" && !["register", "pointer", "label"].includes(value.type)) {
                    console.error(`Value of type ${value.type} can not be stored in variable of type ${varDecl.vtype}`);
                    Deno.exit(1);
                } else if(varDecl.vtype == "string" && !["pointer", "register", "label"].includes(value.type)) {
                    console.error(`Value of type ${value.type} can not be stored in variable of type ${varDecl.vtype}`);
                }
                this.code += `PSH ${toString(value)}\n`;
                if(value.type == "register") {
                    this.freeReg((value as RegisterVal).value);
                }
                return { type: "register", value: 0 } as RegisterVal;
            }
            case "ASMLine": {
                this.code += (statement as ASMLine).value + '\n';
                return { type: "register", value: 0 } as RegisterVal;
            }
            case "DelStatement": {
                env.remove((statement as DelStatement).value);
                return { type: "register", value: 0 } as RegisterVal;
            }
            case "ReturnStatement": {
                const stmt = statement as ReturnStatement;
                const value = toString(this.compile(stmt.value, env));
                for(let i = 0; i < env.vars.size; i++) {
                    this.code += `POP R0\n`;
                } 
                this.code += `MOV R1 ${value}\nPOP R${this.frame_pointer}\nRET\n`;
                return { type: "register", value: 0 } as RegisterVal;
            }
            case "IfStatement": {
                const stmt = statement as IfStatement;
                const condition = toString(this.compile(stmt.condition, env));
                this.code += `BRZ .if_end_${this.if_stmts} ${condition}\n`;
                this.code += `.if_${this.if_stmts++}\n`;
                for(const stat of stmt.ifbody) {
                    this.compile(stat, env);
                }
                if(stmt.elsebody != undefined) {
                    this.code += `JMP .else_end_${this.else_stmts}\n`;
                }
                this.code += `.if_end_${this.if_stmts-1}\n`;
                if(stmt.elsebody != undefined) {
                    for(const stat of stmt.elsebody) {
                        this.compile(stat, env);
                    }
                    this.code += `.else_end_${this.else_stmts++}\n`;
                }
                
                return { type: "register", value: 0 } as RegisterVal;
            }
            case "WhileStatement": {
                const stmt = statement as WhileStatement;
                // .while
                // check if the condition is passed, if no jmp .while_end
                // execute
                // jmp .while
                this.code += `.while_${this.while_stmts}\n`;

                const cond = toString(this.compile(stmt.condition, env));
                this.code += `BRZ .while_end_${this.while_stmts} ${cond}\n`;

                for(const stat of stmt.body) {
                    this.compile(stat, env);
                }
                this.code += `JMP .while_${this.while_stmts}\n`;
                this.code += `.while_end_${this.while_stmts++}\n`;
                return { type: "register", value: 0 } as RegisterVal;
            }
            case "ForStatement": {
                const stmt = statement as ForStatement;
                
                this.code += `.while_${this.while_stmts}\n`;
                const cond = toString(this.compile(stmt.condition, env));
                this.code += `BRZ .while_end_${this.while_stmts} ${cond}\n`;

                for(const stat of stmt.body) {
                    this.compile(stat, env);
                }

                this.compile(stmt.action, env);
                this.code += `JMP .while_${this.while_stmts}\n`;
                this.code += `.while_end_${this.while_stmts++}\n`;
                return { type: "register", value: 0 } as RegisterVal;
            }
            default: {
                console.error("Received ast node not supported for compiling!", statement);
                Deno.exit(1);
            }
        }
    }
}
