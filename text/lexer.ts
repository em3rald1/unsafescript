import { TokenType, Token } from "./tokens.ts";
import { isNumber } from "./textutil.ts";

const keywords: {[key: string]: TokenType} = {
    word: TokenType.WordToken, // parsed
    int16: TokenType.WordToken, // parsed
    ptr: TokenType.PtrToken, // parsed
    str: TokenType.StrToken,
    fn: TokenType.FunctionToken, // parsed
    ret: TokenType.ReturnToken, // parsed
    asm: TokenType.ASMToken, // parsed
    for: TokenType.ForToken, // parsed
    del: TokenType.DeleteToken, // parsed
    while: TokenType.WhileToken, // parsed
    if: TokenType.IfToken, // parsed
    else: TokenType.ElseToken // parsed
}
const skippable = ' \n\r\t';
const nonstandard = skippable + "<>+-/*%=,.:;(){}[]'\"";

function tok(type: TokenType, value=''): Token {
    return { type, value } as Token;
}

export function tokenize(source: string): Token[] {
    const output: Token[] = [];
    const src = source.split("");
    while(src.length > 0) {
        if(skippable.includes(src[0])) src.shift();
        else if('+-/*%'.includes(src[0])) output.push(tok(TokenType.BinOpToken, src.shift()));
        else if(src[0] == '=') output.push(tok(TokenType.EquToken, src.shift()));
        else if(src[0] == ',') output.push(tok(TokenType.Comma, src.shift()));
        else if(src[0] == '.') output.push(tok(TokenType.Dot, src.shift()));
        else if(src[0] == ':') output.push(tok(TokenType.Colon, src.shift()));
        else if(src[0] == ';') output.push(tok(TokenType.Semicolon, src.shift()));
        else if(src[0] == '(') output.push(tok(TokenType.OpenParen, src.shift()));
        else if(src[0] == ')') output.push(tok(TokenType.CloseParen, src.shift()));
        else if(src[0] == '{') output.push(tok(TokenType.OpenBrace, src.shift()));
        else if(src[0] == '}') output.push(tok(TokenType.CloseBrace, src.shift()));
        else if(src[0] == '[') output.push(tok(TokenType.OpenBracket, src.shift()));
        else if(src[0] == ']') output.push(tok(TokenType.CloseBracket, src.shift()));
        else if(src[0] == '!') output.push(tok(TokenType.NotToken, src.shift()));
        else if(['<', '>'].includes(src[0])) output.push(tok(TokenType.CompareToken, src.shift()));
        else if(['|', '&', '^'].includes(src[0])) output.push(tok(TokenType.LogicToken, src.shift()));
        else if(src[0] == '"') {
            src.shift();
            let value = "";
            while(src.length > 0 && src[0] != '"') {
                value += src.shift();
            }
            src.shift();
            output.push(tok(TokenType.StringToken, value));
        }
        else if(src[0] == "'") {
            src.shift();
            const value = src.shift();
            if(src.shift() != "'") {
                console.error("Expected single quote after a char");
                Deno.exit(1);
            }
            output.push(tok(TokenType.CharToken, value));
        }
        else {
            if(isNumber(src[0])) {
                let num = '';
                while(src.length > 0 && !skippable.includes(src[0]) && isNumber(src[0])) {
                    num += src.shift();
                }
                output.push(tok(TokenType.NumToken, num));
            } else {
                let val = '';
                while(src.length > 0 && !nonstandard.includes(src[0])) {
                    val += src.shift();
                }
                const reserved = keywords[val];
                if(typeof reserved != 'number') output.push(tok(TokenType.IdentToken, val));
                else output.push(tok(reserved, val));
            }
        }
    }
    output.push(tok(TokenType.EOF, "EOF"));
    return output;
}