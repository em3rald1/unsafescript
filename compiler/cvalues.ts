export type ValueType =
    | "number"
    | "register"
    | "pointer"
    | "label";

export interface CompilerValue {
    type: ValueType,
}

export interface NumberVal extends CompilerValue {
    type: "number",
    value: number,
}

export interface RegisterVal extends CompilerValue {
    type: "register",
    value: number
}

export interface PointerVal extends CompilerValue {
    type: "pointer",
    value: number
}

export interface LabelVal extends CompilerValue {
    type: "label",
    value: string
}

export function toString(val: CompilerValue): string {
    switch(val.type) {
        case "number": {
            return (val as NumberVal).value.toString();
        }
        case "pointer": {
            return `M${(val as PointerVal).value}`;
        }
        case 'register': {
            return `R${(val as RegisterVal).value}`;
        }
        case "label": {
            return (val as LabelVal).value;
        }
    }
}