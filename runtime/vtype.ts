export type VType = 
    | "number"
    | "string"
    | "pointer";

export interface Variable {
    type: VType,
    addr: number,
}

export interface NumberVar extends Variable {
    type: "number",
    addr: number,
}

export interface StringVar extends Variable {
    type: "string",
    addr: number,
}

export interface PtrVar extends Variable  {
    type: "pointer",
    addr: number
}