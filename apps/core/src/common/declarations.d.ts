declare module 'node:test' {
  export interface TestContext {
    test: (name: string, fn: () => Promise<void> | void) => Promise<void>;
    skip: (message: string) => void;
  }
  const test: (name: string, fn: (t: TestContext) => Promise<void> | void) => Promise<void>;
  export default test;
}

declare module 'node:assert' {
  export function strictEqual(actual: unknown, expected: unknown, message?: string): void;
}

declare const process: {
  env: Record<string, string | undefined>;
};
