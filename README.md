# UnsafeScript
A parody to javascript or assemblyscript but allowing accessing any memory address. No security, do whatever you want, but run in URCL.

# Compiling code:
`$ deno run -A main.ts <file> <max register count - 1>`

Syntax:
Semicolon are going after statements (e.g variable declaration, return statement, delete statement, assembly line statement), semicolons can't go after expressions (e.g 5 + 3, function calls)
Variable types: `word`, `ptr`, `str`
Declaration of variable:
```
word varname = 5;
ptr ptrname = [5, 4, 3, 2, 1];
str strname = "hello world";
```

Function declaration:
```
fn functionname() {
  word x = 5;
  x -= 1
  ret x;
}
```

Return keyword is `ret`

While loop:
```
word x = 5;
while(x > 0) {
  // ...
  x -= 1
}
```

For loop:
```
word x = 5;
for(x > 0; x -= 1;) {
  //...
}
```

If/else (else if does not exist):
```
if(x > 5) {
  callIfOver5()
else {
  callIfLess5()
}
```

Delete variable:
```
del varname;
```

Using assembly in code (1 line at a time):
```
asm "OUT %NUMB 5";
```
