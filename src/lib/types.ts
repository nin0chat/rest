export enum Role {
    Guest= 1 << 0,
    User= 1 << 1,
    Bot= 1 << 2,
    System= 1 << 3,
    Mod= 1 << 4,
    Admin= 1 << 5
};

export interface User {
  id: string
  email: string
  username: string
  roles: number
}

export type Arguments<T> = T extends (...args: infer U) => any ? U : never;
export type Argument<T, Index extends number> = Arguments<T>[Index];