import { Statement, Expr, Program, NumericLiteral, MemberExpr, CallExpr, IdentLiteral, NullLiteral, BinaryExpr, StringLiteral, CharLiteral, VarDecl, FunDecl, ArrayLiteral, ReturnStatement, DelStatement, AssignExpr, ASMLine, ComparisonExpr, ForStatement, WhileStatement, IfStatement, LogicalExpr, BinOpAssignExpr, BitwiseExpr, NotExpr, ImportStatement, Semicolon } from "./ast.ts";
import { TokenType, Token } from "../text/tokens.ts";
import { tokenize } from "../text/lexer.ts";
import { VType } from "../runtime/vtype.ts";

export default class Parser {
    private tokens: Token[] = [];
    private at(): Token {
        return this.tokens[0];
    }
    private next(): Token {
        return this.tokens[1];
    }
    private eat(): Token {
        return this.tokens.shift() as Token;
    }
    private expect(type: TokenType, errMsg: string): Token {
        const val = this.eat();
        if(val.type != type) {
            console.error(errMsg);
            Deno.exit(1);
        }
        return val;
    }
    private eof() {
        return this.at().type == TokenType.EOF;
    }

    private parse_var_decl(): VarDecl {
        let type = this.eat().value;
        switch(type) {
            case "word": {
                type = "number";
                break;
            }
            case "int16": {
                type = "number";
                break;
            }
            case "str": {
                type = "string";
                break;
            }
            case "ptr": {
                type = "pointer";
                break;
            }
        }
        const ident = this.expect(TokenType.IdentToken, "Expected variable name").value;
        const op = this.at();
        if(op.type == TokenType.Semicolon) {
            console.error("Cannot declare variables with no value as all variables are immutable.");
            Deno.exit(1);
        }
        this.eat();
        const value = this.parse_expr();
        this.expect(TokenType.Semicolon, "Expected semicolon after variable declaration statement");

        return { type: "VarDecl", name: ident, value, vtype: type } as VarDecl;
    }

    private parse_fun_decl(): Statement {
        this.eat(); // eat the "fn" keyword
        const name = this.expect(TokenType.IdentToken, "Expected function name").value;
        this.expect(TokenType.OpenParen, "Expected open parenthesis after function name");
        const params: [string, VType][] = [];
        while(!this.eof() && this.at().type != TokenType.CloseParen) {
            const typeRaw = this.eat();
            let type: VType;
            switch(typeRaw.type) {
                case TokenType.WordToken: {
                    type = "number";
                    break;
                }
                case TokenType.PtrToken: {
                    type = "pointer";
                    break;
                }
                case TokenType.StrToken: {
                    type = "string";
                    break;
                }
                default: {
                    console.error("Unexpected type provided in function parameters list: ", typeRaw.value);
                    Deno.exit(1);
                }
            }
            const name = this.expect(TokenType.IdentToken, "Expected parameter name");
            params.push([name.value, type as VType]);
            if(this.at().type == TokenType.Comma) this.eat();
        }

        this.eat();
        const body: Statement[] = [];
        this.expect(TokenType.OpenBrace, "Function body expected");
        while(!this.eof() && this.at().type != TokenType.CloseBrace) {
            body.push(this.parse_statement());
        }
        this.eat();

        return { type: "FunDecl", name, params, body } as FunDecl;
    }

    private parse_ret_statement(): Statement {
        this.eat();
        const value = this.parse_expr();
        this.expect(TokenType.Semicolon, "Expected semicolon after return statement");
        return { type: "ReturnStatement", value } as ReturnStatement;
    }
    
    private parse_del_statement(): Statement {
        this.eat();
        const varname = this.expect(TokenType.IdentToken, "Expected identifier in delete statement").value;
        this.expect(TokenType.Semicolon, "Expected semicolon after delete statement");
        return { type: "DelStatement", value: varname } as DelStatement;
    }

    private parse_asm_statement(): Statement {
        this.eat();
        const line = this.expect(TokenType.StringToken, "Expected string as a asm line");
        this.expect(TokenType.Semicolon, "Expected semicolon after asm line");
        return { type: "ASMLine", value: line.value } as ASMLine;
    }

    private parse_for_statement(): Statement {
        this.eat();
        this.expect(TokenType.OpenParen, "Open parenthesis expected after for keyword");
        const condition = this.at().type == TokenType.Semicolon ? (() => { this.eat(); return { type: "NullLiteral", value: null } as NullLiteral })() : this.parse_expr();
        condition.type == "NullLiteral" ? null : this.expect(TokenType.Semicolon, "Semicolon expected after condition inside of a for loop");
        const action = this.at().type == TokenType.Semicolon ? (() => { this.eat(); return { type: "NullLiteral", value: null } as NullLiteral })() : this.parse_expr();
        action.type == "NullLiteral" ? null : this.expect(TokenType.Semicolon, "Semicolon expected after action inside of a for loop");
        this.expect(TokenType.CloseParen, "Close parenthesis expected after for loop condition");
        this.expect(TokenType.OpenBrace, "Expected for loop body");
        const body: Statement[] = [];
        while(!this.eof() && this.at().type != TokenType.CloseBrace) {
            body.push(this.parse_statement());
        }
        this.eat();
        return { type: "ForStatement", condition, action, body } as ForStatement;
    }

    private parse_while_statement(): Statement {
        this.eat();

        this.expect(TokenType.OpenParen, "Open parenthesis expected after while keyword");

        const condition = this.parse_expr();
        const body: Statement[] = [];
        this.expect(TokenType.CloseParen, "Close parenthesis expected after while loop condition");
        this.expect(TokenType.OpenBrace, "While loop body expected");

        while(!this.eof() && this.at().type != TokenType.CloseBrace) {
            body.push(this.parse_statement());
        }
        this.eat();

        return { type: "WhileStatement", condition, body } as WhileStatement;
    }

    private parse_if_statement(): Statement {
        this.eat();

        this.expect(TokenType.OpenParen, "Open parenthesis expected after if keyword");

        const condition = this.parse_expr();
        const ifbody: Statement[] = [];
        this.expect(TokenType.CloseParen, "Close parenthesis expected after if condition");
        this.expect(TokenType.OpenBrace, "If keyword body expected");

        while(!this.eof() && this.at().type != TokenType.CloseBrace) {
            ifbody.push(this.parse_statement());
        }
        this.eat();

        const elsebody: Statement[] = [];

        if(this.at().type == TokenType.ElseToken) {
            this.eat();
            this.expect(TokenType.OpenBrace, "Else keyword body expected");
            while(!this.eof() &&  this.at().type != TokenType.CloseBrace) {
                elsebody.push(this.parse_statement());
            }
            this.eat();
        }
        if(elsebody.length > 0) return { type: "IfStatement", condition, ifbody, elsebody } as IfStatement;
        return { type: "IfStatement", condition, ifbody } as IfStatement;
    }
    private parse_import_statement(): Statement {
        this.eat();
        const val = this.eat();
        this.expect(TokenType.Semicolon, "Expected semicolon after import statement");
        if(val.type == TokenType.StringToken) {
            return { type: "ImportStatement", value: val.value, builtin: false } as ImportStatement;
        } else if(val.type == TokenType.IdentToken) {
            return { type: "ImportStatement", value: val.value, builtin: true } as ImportStatement;
        } else {
            console.error(`Can not import value of type ${val.type}`);
            Deno.exit(1);
        }
    }
    private parse_statement(): Statement {
        switch(this.at().type) {
            case TokenType.WordToken:
            case TokenType.PtrToken:
            case TokenType.StrToken:
                return this.parse_var_decl();
            case TokenType.FunctionToken:
                return this.parse_fun_decl();
            case TokenType.ReturnToken:
                return this.parse_ret_statement();
            case TokenType.DeleteToken:
                return this.parse_del_statement();
            case TokenType.ASMToken:
                return this.parse_asm_statement();
            case TokenType.ForToken: 
                return this.parse_for_statement();
            case TokenType.WhileToken:
                return this.parse_while_statement();
            case TokenType.IfToken:
                return this.parse_if_statement();
            case TokenType.ImportToken:
                return this.parse_import_statement();
            default: return this.parse_expr();
        }
    }

    private parse_expr(): Expr {
        return this.parse_logical_expr();
    }

    // Orders of prescidence:
    // Logical
    // Comparison
    // Assignment
    // ArrayExpr
    // Additive
    // Multiplicative
    // Call & Member
    // Primary

    private parse_logical_expr(): Expr {
        let left = this.parse_neg_comparison_expr();
        while(!this.eof() && this.at().type == TokenType.LogicToken && this.next().type == TokenType.LogicToken) {
            const op = this.eat().value + this.eat().value;
            const right = this.parse_neg_comparison_expr();
            left = { type: "LogicalExpr", op, left, right } as LogicalExpr;
        }
        return left;
    }

    private parse_neg_comparison_expr(): Expr {
        if(this.at().type == TokenType.NotToken) {
            this.eat();
            const value = this.parse_comparison_expr();
            return { type: "NotExpr", value } as NotExpr;
        } else {
            const left = this.parse_comparison_expr();
            if(this.at().type != TokenType.NotToken) return left;
            const op = this.eat().value + '=';
            this.expect(TokenType.EquToken, "Expected equality token after not symbol");
            const right = this.parse_comparison_expr();
            return { type: "ComparisonExpr", left, right, op } as ComparisonExpr;
        }
    }

    private parse_comparison_expr(): Expr {
        const left = this.parse_assign_expr();
        if(this.at().type == TokenType.CompareToken) {
            let op = this.eat().value;
            if(this.at().type == TokenType.EquToken) {
                op += "=";
                this.eat();
            }
            const right = this.parse_assign_expr();
            return { type: "ComparisonExpr", left, right, op } as ComparisonExpr;
        }
        return left;
    }

    private parse_assign_expr(): Expr {
        const left = this.parse_array_expr();
        if(this.at().type == TokenType.EquToken) {
            this.eat();
            if(this.at().type == TokenType.EquToken) {
                this.eat();
                const right = this.parse_array_expr();
                return { type: "ComparisonExpr", left, right, op: "=="} as ComparisonExpr;
            } else {
                const right = this.parse_array_expr();
                return { type: "AssignExpr", left, right } as AssignExpr;
            }
        }
        return left;
    }

    private parse_array_expr(): Expr {
        if(this.at().type != TokenType.OpenBracket) return this.parse_bitwise_expr();
        this.eat();
        const values: Expr[] = [];
        while(!this.eof() && this.at().type != TokenType.CloseBracket) {
            const value = this.parse_expr();
            values.push(value);
            if(this.at().type != TokenType.CloseBracket) this.expect(TokenType.Comma, "Comma expected after value in array literal");
        }
        this.eat();
        return { type: "ArrayLiteral", value: values } as ArrayLiteral;
    }

    private parse_bitwise_expr(): Expr {
        let left = this.parse_additive_expr();
        while(!this.eof() && this.at().type == TokenType.LogicToken && this.next().type != TokenType.LogicToken) {
            if(this.next().type == TokenType.EquToken) {
                const op = this.eat().value + this.eat().value;
                const right = this.parse_additive_expr();
                left = { type: "BinOpAssignExpr", left, right, op } as BinOpAssignExpr;
            }
            else {
                const op = this.eat().value;
                const right = this.parse_additive_expr();
                left = { type: "BitwiseExpr", left, right, op} as BitwiseExpr;
            }
        }
        return left;
    }

    private parse_additive_expr(): Expr {
        let left = this.parse_multiplicative_expr();
        while(['+', '-'].includes(this.at().value)) {
            if(this.next().type == TokenType.EquToken) {
                const op = this.eat().value + this.eat().value;
                const right = this.parse_multiplicative_expr();
                left = { type: "BinOpAssignExpr", left, right, op } as BinOpAssignExpr;
            }
            else {
                const op = this.eat().value;
                const right = this.parse_multiplicative_expr();
                left = { type: "BinaryExpr", left, right, op } as BinaryExpr; 
            }
        }

        return left;
    }


    private parse_multiplicative_expr(): Expr {
        let left = this.parse_call_member_expr();
        while(['*', '/', '%'].includes(this.at().value)) {
            if(this.next().type == TokenType.EquToken) {
                const op = this.eat().value + this.eat().value;
                const right = this.parse_call_member_expr();
                left = { type: "BinOpAssignExpr", left, right, op } as BinOpAssignExpr;
            } else {
                const op = this.eat().value;
                const right = this.parse_call_member_expr();
                left = { type: "BinaryExpr", left, right, op } as BinaryExpr;
            }
        }
        return left
    }

    private parse_call_member_expr(): Expr {
        const member = this.parse_member_expr();
        if(this.at().type == TokenType.OpenParen) {
            return this.parse_call_expr(member);
        }
        return member;
    }

    private parse_member_expr(): Expr {
        let obj = this.parse_primary();
        while(this.at().type == TokenType.Dot || this.at().type == TokenType.OpenBracket) {
            const op = this.eat();
            let property: Expr;
            let computed: boolean;
            if(op.type == TokenType.Dot) {
                computed = false;
                property = this.parse_primary();
                if(property.type != "IdentLiteral") {
                    console.error("Unable to compute member expression after the dot");
                    Deno.exit();
                }
            } else {
                computed = true;
                property = this.parse_expr();
                this.expect(TokenType.CloseBracket, "Expected close bracket after computed member expression");
            }
            obj = { type: "MemberExpr", obj, property, computed } as MemberExpr;
        }
        return obj;
    }

    private parse_call_expr(caller: Expr): Expr {
        let call_expr: Expr = { type: "CallExpr", caller , args: this.parse_args() } as CallExpr;
        if(this.at().type == TokenType.OpenParen) {
            call_expr = this.parse_call_expr(call_expr);
        }
        return call_expr;
    }

    private parse_args(): Expr[] {
        this.expect(TokenType.OpenParen, "Expected open parenthesis");
        const args: Expr[] = this.at().type == TokenType.CloseParen ? [] : this.parse_argument_list();
        this.expect(TokenType.CloseParen, "Expected close parenthesis");
        return args;
    }

    private parse_argument_list(): Expr[] {
        const args = [this.parse_expr()];
        while(!this.eof() && this.at().type == TokenType.Comma && this.eat()) {
            args.push(this.parse_expr());
        }
        return args;
    }

    private parse_primary(): Expr {
        const tk = this.at().type;
        switch(tk) {
            case TokenType.IdentToken: {
                return { type: "IdentLiteral", value: this.eat().value } as IdentLiteral;
            }
            case TokenType.NumToken: {
                return { type: "NumericLiteral", value: parseInt(this.eat().value) } as NumericLiteral;
            }
            case TokenType.StringToken: {
                return { type: "StringLiteral", value: this.eat().value } as StringLiteral;
            }
            case TokenType.CharToken: {
                return { type: "CharLiteral", value: this.eat().value } as CharLiteral;
            }
            case TokenType.Semicolon: {
                this.eat();
                return { type: "Semicolon" } as Semicolon;
            }
            case TokenType.OpenParen: {
                this.eat();
                const value = this.parse_expr();
                this.expect(TokenType.CloseParen, "Closing parenthesis expected after an expression");
                return value;
            }
            default: {
                this.eat();
                console.warn(`The token of type ${tk} may cause undefined behaviour because it was not defined in parser`);
                return { type: "NullLiteral", value: null } as NullLiteral;
            }
        }
    }
    public parse(source: string): Program {
        this.tokens = tokenize(source);
        const program = { type: "Program", body: []} as Program;
        while(!this.eof()) {
            program.body.push(this.parse_statement());
        }
        return program;
    }
}