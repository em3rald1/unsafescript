# UnsafeScript
A parody to javascript or assemblyscript but allowing accessing any memory address. No security, do whatever you want, but run in URCL.

# Compiling code:
`$ deno run -A main.ts <file> <max register count - 1>`

Syntax:
Variable types: `word`, `ptr`, `str`
Declaration of variable:
```
word varname = 5;
ptr ptrname = [5, 4, 3, 2, 1];
str strname = "hello world";
```

Function declaration:
```
fun functionname() {
  word x = 5;
  x -= 1
  return x;
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
delete varname;
```

Using assembly in code (1 line at a time):
```
asm "OUT %NUMB 5";
```
