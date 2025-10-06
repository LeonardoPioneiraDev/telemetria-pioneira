// src/types/json-bigint.d.ts
declare module 'json-bigint' {
  interface JSONbigOptions {
    storeAsString?: boolean;
    strict?: boolean;
    protoAction?: 'error' | 'ignore' | 'preserve';
    constructorAction?: 'error' | 'ignore' | 'preserve';
  }

  interface JSONbigStatic {
    parse(text: string, reviver?: any): any;
    stringify(value: any, replacer?: any, space?: string | number): string;
  }

  function JSONbig(options?: JSONbigOptions): JSONbigStatic;

  namespace JSONbig {
    function parse(text: string, reviver?: any): any;
    function stringify(value: any, replacer?: any, space?: string | number): string;
  }

  export = JSONbig;
}
