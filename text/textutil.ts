export function isNumber(ident: string): boolean {
    if(ident.length > 1) {
        if(ident.startsWith('0x')) {
            const nident = ident.slice(2);
            for(const char of nident) {
                if(!'1234567890abcdef'.includes(char.toLowerCase())) return false; 
            }
            return true;
        }
        else if(ident.startsWith('0b')) {
            const nident = ident.slice(2);
            for(const char of nident) {
                if(!'01'.includes(char)) return false;
            }
            return true;
        } else {
            return !isNaN(parseInt(ident));
        }
    } else {
        return !isNaN(parseInt(ident));
    }
}