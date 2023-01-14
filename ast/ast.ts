import { VType } from "../runtime/vtype.ts"

export type NodeType =
    // Statement 
    | "VarDecl" // compiled (6/10 done, 60%)
    | "FunDecl" // compiled
    | "Program" // compiled
    | "ReturnStatement" // compiled
    | "DelStatement" // compiled
    | "ASMLine" // compiled
    | "ForStatement"
    | "WhileStatement"
    | "IfStatement"
    | "ElseStatement"
    // Expressions
    | "BinaryExpr" // compiled (6/9 done, 66.67%)
    | "MemberExpr" // compiled
    | "CallExpr" // compiled
    | "AssignExpr" // compiled
    | "BinOpAssignExpr"
    | "NotExpr" // compiled
    | "ComparisonExpr" // compiled
    | "LogicalExpr"
    | "BitwiseExpr"
    // Literals
    | "NumericLiteral" // compiled (6/6 done, 100%)
    | "IdentLiteral"  // compiled
    | "StringLiteral" // compiled
    | "CharLiteral" // compiled
    | "ArrayLiteral" // compiled
    | "NullLiteral"; // compiled

// Statements

export interface Statement {
    type: NodeType;
}

export interface Program extends Statement {
    type: "Program",
    body: Statement[];
}

export interface VarDecl extends Statement {
    type: "VarDecl",
    name: string,
    value: Expr,
    vtype: VType,
}

export interface FunDecl extends Statement {
    type: "FunDecl",
    name: string,
    params: [string, VType][],
    body: Statement[]
}

export interface ReturnStatement extends Statement {
    type: "ReturnStatement",
    value: Expr;
}

export interface DelStatement extends Statement {
    type: "DelStatement",
    value: string
}

export interface ASMLine extends Statement {
    type: "ASMLine",
    value: string
}

export interface ForStatement {
    type: "ForStatement",
    condition: Expr,
    action: Expr
    body: Statement[]
}

export interface WhileStatement extends Statement {
    type: "WhileStatement",
    condition: Expr,
    body: Statement[];
}

export interface IfStatement extends Statement {
    type: "IfStatement",
    condition: Expr,
    body: Statement[];
}
export interface ElseStatement extends Statement {
    type: "ElseStatement",
    body: Statement[];
}
// Expressions

export interface Expr {
    type: NodeType
}

export interface NotExpr extends Expr {
    type: "NotExpr",
    value: Expr
}

export interface LogicalExpr extends Expr {
    type: "LogicalExpr",
    op: string,
    left: Expr,
    right: Expr
}

export interface ComparisonExpr extends Expr {
    type: "ComparisonExpr",
    left: Expr,
    right: Expr,
    op: string
}

export interface AssignExpr extends Expr {
    type: "AssignExpr",
    right: Expr,
    left: Expr;
}

export interface BitwiseExpr extends Expr {
    type: "BitwiseExpr",
    left: Expr,
    right: Expr,
    op: string
}

export interface BinOpAssignExpr extends Expr {
    type: "BinOpAssignExpr",
    right: Expr,
    left: Expr,
    op: string
}
export interface NumericLiteral extends Expr {
    type: "NumericLiteral",
    value: number;
}

export interface ArrayLiteral extends Expr {
    type: "ArrayLiteral",
    value: Expr[]
}

export interface IdentLiteral extends Expr {
    type: "IdentLiteral",
    value: string;
}

export interface NullLiteral extends Expr {
    type: "NullLiteral",
    value: null;
}

export interface StringLiteral extends Expr {
    type: "StringLiteral",
    value: string
}

export interface CharLiteral extends Expr {
    type: "CharLiteral",
    value: string
}

export interface BinaryExpr extends Expr {
    type: "BinaryExpr",
    left: Expr,
    right: Expr,
    op: string;
}

export interface MemberExpr extends Expr {
    type: "MemberExpr"
    computed: boolean,
    obj: Expr,
    property: Expr,
}

export interface CallExpr extends Expr {
    type: "CallExpr",
    caller: Expr,
    args: Expr[],
}