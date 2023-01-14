import { Statement, Expr, Program, NumericLiteral, MemberExpr, CallExpr, IdentLiteral, NullLiteral, BinaryExpr, StringLiteral, CharLiteral, VarDecl, FunDecl, ArrayLiteral, ReturnStatement, DelStatement, AssignExpr, ASMLine, ComparisonExpr, ForStatement, WhileStatement, IfStatement, ElseStatement, LogicalExpr, BinOpAssignExpr, BitwiseExpr, NotExpr } from "../ast/ast.ts";
import { CompilerValue, NumberVal, RegisterVal, PointerVal, LabelVal, toString } from "./cvalues.ts";
import { Variable, NumberVar, StringVar, PtrVar  } from "../runtime/vtype.ts";
import { Environment } from "../runtime/environment.ts";
import Parser from '../ast/parser.ts';

export class Compiler {
    free_regs: boolean[] = [];
    code = "";
    data_code = "";
    strings = 0;
    arrays = 0;
    constructor(regs_amount: number) {
        for(let i = 0; i < regs_amount; i++) this.free_regs.push(true);
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
                const addr = env.read((statement as IdentLiteral).value).addr;
                const reg = this.allocateReg();
                this.code += `LOD R${reg} M${addr}\n`;
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
                const left = toString(this.compile(stmt.left, env));
                const right = toString(this.compile(stmt.right, env));
                const op = stmt.op == "+" ? "ADD" : stmt.op == "-" ? "SUB" : stmt.op == "*" ? "MLT" : stmt.op == "/" ? "DIV" : stmt.op == "%" ? "MOD" : "NOP";
                const reg = this.allocateReg();
                this.code += `${op} R${reg} ${left} ${right}\n`;
                return { type: "register", value: reg } as RegisterVal;
            }
            case "MemberExpr": {
                const stmt = statement as MemberExpr;
                if(!stmt.computed) {
                    console.error("Non-computed values are not supported yet!");
                    Deno.exit(1);
                }
                const obj = toString(this.compile(stmt.obj, env));
                const prop = toString(this.compile(stmt.property, env));
                const reg = this.allocateReg();
                this.code += `LLOD R${reg} ${obj} ${prop}\n`;
                return { type: "register", value: reg } as RegisterVal;
            }
            case "AssignExpr": {
                const stmt = statement as AssignExpr;
                const left = stmt.left;
                const right = this.compile(stmt.right, env);
                if(left.type == "IdentLiteral") {
                    const vaddr = env.read((left as IdentLiteral).value).addr;
                    this.code += `STR M${vaddr} ${toString(right)}\n`;
                    return { type: "pointer", value: vaddr } as PointerVal;
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
                    return { type: "register", value: 1} as RegisterVal; // return value is stored in R1
                }
                else {
                    const caller = toString(this.compile(stmt.caller, env));
                    this.code += `CAL ${caller}\n`;
                    return { type: "register", value: 1 } as RegisterVal;
                }
            }
            case "ComparisonExpr": {
                const stmt = statement as ComparisonExpr;
                const left = toString(this.compile(stmt.left, env));
                const right = toString(this.compile(stmt.right, env));
                const op = stmt.op;
                const reg = this.allocateReg();
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
                const value = toString(this.compile(stmt.value, env));
                const reg = this.allocateReg();
                this.code += `NOT R${reg} ${value}\n`;
                return { type: "register", value: reg } as RegisterVal;
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
                this.code += `.${stmt.name}\n`;
                const nenv = new Environment(env);
                for(let i = 0; i < stmt.params.length; i++) {
                    const param = stmt.params[i];
                    nenv.declare(...param);
                    const addr = nenv.read(param[0]).addr;
                    const paramI = stmt.params.length - i;
                    const reg = this.allocateReg();
                    this.code += `LLOD R${reg} SP ${paramI}\nSTR M${addr} R${reg}\n`;
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
                const { addr } = env.read(varDecl.name);
                const value = this.compile(varDecl.value, env);
                this.code += `STR M${addr} ${toString(value)}\n`;
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
                this.code += `MOV R1 ${value}\nRET\n`;
                return { type: "register", value: 0 } as RegisterVal;
            }
            default: {
                console.error("Received ast node not supported for compiling!", statement);
                Deno.exit(1);
            }
        }
    }
}

const parser = new Parser();
const res = parser.parse('ptr arr = [5, 4, 3, 2, 1];');
const compiler = new Compiler(8);
const env = new Environment();
compiler.compile(res, env);
console.log(compiler);
console.log(env);
console.log(compiler.code+compiler.data_code);