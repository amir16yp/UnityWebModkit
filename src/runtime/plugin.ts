import { Logger } from "../logger";
import { writeUint8ArrayAtOffset } from "../utils";
import type { Runtime } from "./runtime-core";
import type {
  Hook,
  HookInfo,
  ModkitPluginOptions,
  PostfixCallback,
  PrefixCallback,
} from "./types";
import { ValueWrapper } from "./value-wrapper";

export class ModkitPlugin {
  public readonly name: string;
  public readonly version: string;
  public readonly logger: Logger;
  public onLoaded: (() => void) | undefined = undefined;
  private _referencedAssemblies: string[] = [];
  private _hooks: Hook[] = [];
  private _runtime: Runtime;

  constructor(
    name: string,
    version: string | undefined,
    referencedAssemblies: string[] | undefined,
    runtime: Runtime,
  ) {
    this.name = name;
    this.version = version || "1.0.0";
    this.logger = new Logger(name);
    this._referencedAssemblies = referencedAssemblies || [];
    this._runtime = runtime;
  }

  public get hooks() {
    return this._hooks;
  }

  public get referencedAssemblies() {
    return this._referencedAssemblies;
  }

  public hookPrefix(target: HookInfo, callback: PrefixCallback): Hook {
    return this.hook(target, callback, 0);
  }

  public hookPostfix(target: HookInfo, callback: PostfixCallback): Hook {
    return this.hook(target, callback, 1);
  }

  private hook(
    target: HookInfo,
    callback: PrefixCallback | PostfixCallback,
    kind: number,
  ): Hook {
    const hook = {
      typeName: target.typeName,
      methodName: target.methodName,
      params: target.params,
      returnType: target.returnType,
      applied: false,
      enabled: true,
      kind,
      callback,
    };
    this._hooks.push(hook);
    return hook;
  }

  public call(
    target: string,
    targetMethodOrArgs?: string | any[],
    args?: any[],
  ) {
    // @ts-ignore
    const _game = window.unityInstance || game;
    const tableName: string =
      this._runtime.tableName ||
      this._runtime.resolveTableName(_game.Module.asm);
    if (typeof targetMethodOrArgs === "string") {
      const tableIndex = this._runtime.getTableIndex(
        target,
        targetMethodOrArgs,
      );
      if (tableIndex === -1)
        throw new Error(
          `Failed to invoke function! Could not find table index for ${
            target + "$$" + targetMethodOrArgs
          }`,
        );
      if (args)
        args = args.map((arg) =>
          arg instanceof ValueWrapper ? arg.val() : arg,
        );
      const result = _game.Module.asm[tableName].get(tableIndex)(
        ...(args as any[]),
      );
      return new ValueWrapper(result);
    } else if (
      typeof targetMethodOrArgs === "object" ||
      typeof targetMethodOrArgs === "undefined"
    ) {
      const [typeName, methodName] = target.replace("::", "$$").split("$$");
      const tableIndex = this._runtime.getTableIndex(typeName, methodName);
      if (tableIndex === -1)
        throw new Error(
          `Failed to invoke function! Could not find table index for ${
            typeName + "$$" + methodName
          }`,
        );
      if (!targetMethodOrArgs) targetMethodOrArgs = [];
      targetMethodOrArgs = targetMethodOrArgs.map((arg) =>
        arg instanceof ValueWrapper ? arg.val() : arg,
      );
      const result = _game.Module.asm[tableName].get(tableIndex)(
        ...(targetMethodOrArgs as any[]),
      );
      return new ValueWrapper(result);
    }
  }

  public createObject(typeInfo: ValueWrapper | number): ValueWrapper {
    return new ValueWrapper(this._runtime.createObject(typeInfo));
  }

  public createMstr(char: string): ValueWrapper {
    // @ts-ignore
    const _game = window.unityInstance || game;
    const charArray = new TextEncoder().encode(char);
    const nullTerminatedArray = new Uint8Array(charArray.length + 1);
    nullTerminatedArray.set(charArray);
    nullTerminatedArray[charArray.length] = 0;
    const charAlloc = this._runtime.malloc(nullTerminatedArray.length);
    writeUint8ArrayAtOffset(
      _game.Module.HEAPU8,
      nullTerminatedArray,
      charAlloc,
    );
    const res = this.call("System.Runtime.InteropServices.Marshal", "PtrToStringAnsi", [charAlloc]) as ValueWrapper;
    return res;
  }

  public slice(address: ValueWrapper | number, size: number = 256): Uint8Array {
    return this._runtime.memory(address, size);
  }

  public malloc(size: number): ValueWrapper {
    return new ValueWrapper(this._runtime.malloc(size));
  }

  public free(block: ValueWrapper | number) {
    this._runtime.free(block);
  }

  public memcpy(
    dest: ValueWrapper | number,
    src: ValueWrapper | number,
    count: number,
  ) {
    // @ts-ignore
    const _game = window.unityInstance || game;
    writeUint8ArrayAtOffset(
      _game.Module.HEAPU8,
      this.slice(src, count),
      dest instanceof ValueWrapper ? dest.val() : dest,
    );
  }
}

export type { ModkitPluginOptions };
