export type Hook = {
  index?: number;
  tableIndex?: number;
  typeName: string;
  methodName: string;
  params: string[];
  returnType?: string;
  applied: boolean;
  enabled: boolean;
  kind: number;
  callback: PrefixCallback | PostfixCallback;
};

export type HookInfo = {
  typeName: string;
  methodName: string;
  params: string[];
  returnType?: string;
};

export type PrefixCallback = ((...args: any) => boolean) | (() => void);
export type PostfixCallback = (...args: any) => void;

export type ModkitPluginOptions = {
  name: string;
  version?: string;
  referencedAssemblies?: string[];
};
