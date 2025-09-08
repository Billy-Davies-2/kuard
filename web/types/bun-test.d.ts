declare module 'bun:test' {
  export const describe: (name: string, fn: () => void) => void;
  export const it: (name: string, fn: () => Promise<any> | any) => void;
  export const expect: (val: any) => any;
  export const beforeAll: (fn: () => Promise<any> | any) => void;
  export const afterAll: (fn: () => Promise<any> | any) => void;
}
