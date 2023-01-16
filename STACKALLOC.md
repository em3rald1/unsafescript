CREATE FRAME:
    MOV FP, SP

CREATE VARIABLE:
    PSH x

READ VARIABLE IN CURRENT SCOPE:
    LLOD Rx FP 1-addr

WRITE VARIABLE IN CURRENT SCOPE:
    LSTR FP 1-addr Rx

GET PREVIOUS FRAME POINTER:
    LLOD Rx SP varsAmount

GET VARIABLE BY INDEX:
    LLOD Rx FP -index

MOV R16 SP
PSH 1
PSH 2
.scope1
    PSH R16
    MOV R16 SP
    PSH 3
    PSH 4

    LLOD R2 SP 2
    SUB R2 R2 SP
    SUB R2 R2 3
    LLOD R2 R2 SP
    .scope2
        PSH R16
        MOV R16 SP
        PSH 5
    .scope3
        PSH R16
        MOV R16 SP
        PSH 5
        
        LLOD R2 R16 -1