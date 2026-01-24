interface PlausibleOptions {
  props?: Record<string, string>;
  u?: string; // optional URL override
}

interface PlausibleFn {
  (event: string, options?: PlausibleOptions): void;

  q?: unknown[];
  o?: Record<string, any>;
  init?: (options?: Record<string, any>) => void;
}

declare global {
  interface Window {
    plausible: PlausibleFn;
  }
}

export {};
