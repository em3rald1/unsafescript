export enum TokenType {
    // abstract types, values are ranging
    BinOpToken, // +-/*%
    NumToken, // any number, hexadecimal/decimal/octal
    IdentToken, // any string not identified as a keyword
    StringToken,
    CharToken,

    // keywords
    ImportToken,
    FunctionToken,
    DeleteToken,
    WordToken,
    StrToken,
    PtrToken,
    ReturnToken,
    ASMToken,
    ForToken,
    WhileToken,
    IfToken,
    ElseToken,

    // symbols
    EOF, // end of file
    EquToken, // equals token
    Comma, Dot, // , .
    CompareToken, // > <
    LogicToken, // | & ^
    NotToken,
    Colon, Semicolon, // : ;
    OpenBrace, CloseBrace, // {}
    OpenBracket, CloseBracket, // []
    OpenParen, CloseParen,  // ()
}


export interface Token {
    type: TokenType,
    value: string
}