import Parser from './ast/parser.ts';
import { Compiler } from './compiler/compiler.ts';
import { Environment } from './runtime/dyn_environment.ts';

if(Deno.args.length > 0) {
    if(Deno.args.length == 1) {
        const env = new Environment();
        const codeRaw = Deno.readFileSync(Deno.args[0]);
        const code = new TextDecoder().decode(codeRaw);
        const program = new Parser().parse(code);
        const compiler = new Compiler(8);
        compiler.compile(program, env);
        console.log(compiler.fuse_code());
    } else {
        const env = new Environment();
        const codeRaw = Deno.readFileSync(Deno.args[0]);
        const code = new TextDecoder().decode(codeRaw);
        const program = new Parser().parse(code);
        const compiler = new Compiler(parseInt(Deno.args[1]));
        compiler.compile(program, env);
        console.log(compiler.fuse_code());
    }
} else {
    console.error("Usage: deno run -A main.ts <file> <amount of registers, default to 8>");
}