import { Logger } from "../logger";
import { UnresolvedMetadataError } from "../errors";
import {
  createIl2CppContext,
  createMetadata,
  Il2CppContext,
  Il2CppMetadata,
} from "../il2cpp";
import { WebData } from "../web-data";
import { preload } from "../preloader";
import {
  bufToHex,
  concatenateUint8Arrays,
  makeId,
  uint8ArrayStartsWith,
  waitFor,
  writeUint8ArrayAtOffset,
} from "../utils";
import {
  BufferReader,
  OP_CALL,
  SECTION_CODE,
  SECTION_ELEMENT,
  SECTION_TYPE,
  VarUint32ToArray,
  WailParser,
  WailVariable,
} from "../wail";
import { BinaryReader, BinaryWriter } from "../utils/binary";
import { dataTypeSizes } from "../extras";

export class Runtime {
  public tableName: string | undefined;
  private logger: Logger;
  private plugins: ModkitPlugin[] = [];
  private startedInitializing = false;
  private allReferencedAssemblies: string[] = [];
  private globalMetadata: Il2CppMetadata | null | undefined;
  private il2CppContext: Il2CppContext | undefined;
  private resolvedIl2CppFunctions: Record<string, number> = {};
  private instantiateStreaming: any;
  private internalMappings: any;
  private internalWasmTypes: any;
  private internalWasmCode: any;

  public constructor() {
    this.logger = new Logger("UnityWebModkit");
  }

  public createPlugin(opts: ModkitPluginOptions): ModkitPlugin {
    if (!this.startedInitializing) this.initialize();
    const plugin = new ModkitPlugin(
      opts.name,
      opts.version,
      opts.referencedAssemblies,
      this,
    );
    this.plugins.push(plugin);
    return plugin;
  }

  private async initialize(): Promise<void> {
    if (typeof window === "undefined") {
      console.log(
        "\x1b[37m[UnityWebModkit]\x1b[0m \x1b[33m[WARN]\x1b[0m Not running in a browser environment! Nothing will be executed.",
      );
      return;
    }
    this.startedInitializing = true;
    this.hookWasmInstantiate();
    const webData = await preload();
    this.logger.debug("Parsed web data into %d node(s)", webData.nodes.length);
    webData.unityVersion
      ? this.logger.info("Running under Unity %s", webData.unityVersion)
      : this.logger.warn("Unable to determine Unity version from web data!");
    this.readGlobalMetadataFromStorage(webData).catch(() => {
      window.indexedDB.deleteDatabase("UnityWebModkit");
      this.loadGlobalMetadata(webData);
    });
  }

  private async loadGlobalMetadata(webData: WebData) {
    const metadataNode = webData.getNode(
      "Il2CppData/Metadata/global-metadata.dat",
    );
    if (!metadataNode || !metadataNode.data) {
      this.logger.error(
        new UnresolvedMetadataError(
          "Unable to find global-metadata.dat! The game may be encrypted, corrupt or unsupported.",
        ).print(),
      );
      return;
    }
    this.allReferencedAssemblies = this.plugins.flatMap(
      (plugin) => plugin.referencedAssemblies,
    );
    const globalMetadata = await createMetadata(
      metadataNode.data,
      this.allReferencedAssemblies,
    );
    if (globalMetadata.isErr()) {
      this.logger.error(globalMetadata.error.print());
      return;
    }
    this.globalMetadata = globalMetadata.value;
    this.saveGlobalMetadata();
  }

  private saveGlobalMetadata() {
    const request = window.indexedDB.open("UnityWebModkit", 2);
    request.onupgradeneeded = () => {
      const db = request.result;
      const objectStore = db.createObjectStore("storage", {
        keyPath: "name",
      });
      objectStore.createIndex("name", "name", { unique: true });
      objectStore.transaction.oncomplete = () => {
        const storageObjectStore = db
          .transaction("storage", "readwrite")
          .objectStore("storage");
        storageObjectStore.add(this.globalMetadata);
      };
    };
  }

  private saveIl2CppContext() {
    const request = window.indexedDB.open("UnityWebModkit", 2);
    request.onsuccess = () => {
      const db = request.result;
      const storageObjectStore = db
        .transaction("storage", "readwrite")
        .objectStore("storage");
      storageObjectStore.add(this.il2CppContext);
    };
  }

  private readGlobalMetadataFromStorage(webData: WebData): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      indexedDB.databases().then(async (databases) => {
        const uwmStore = databases.findIndex(
          (d) => d.name === "UnityWebModkit",
        );
        if (uwmStore == -1) {
          reject();
          return;
        }
        const request = window.indexedDB.open("UnityWebModkit", 2);
        request.onsuccess = () => {
          const transaction = request.result.transaction(["storage"]);
          const objectStore = transaction.objectStore("storage");
          const metadataRequest = objectStore.get("metadata");
          metadataRequest.onsuccess = async () => {
            const metadataNode = webData.getNode(
              "Il2CppData/Metadata/global-metadata.dat",
            );
            if (!metadataNode || !metadataNode.data) {
              reject();
              return;
            }
            this.allReferencedAssemblies = this.plugins.flatMap(
              (plugin) => plugin.referencedAssemblies,
            );
            const globalMetadata = metadataRequest.result;
            if (
              JSON.stringify(this.allReferencedAssemblies.sort()) !==
              JSON.stringify(globalMetadata.referencedAssemblies.sort())
            ) {
              reject();
              return;
            }
            const currentHash = bufToHex(
              await window.crypto.subtle.digest("SHA-256", metadataNode.data),
            );
            if (currentHash !== globalMetadata.integrityHash) {
              reject();
              return;
            }
            this.globalMetadata = globalMetadata;
            resolve();
          };
        };
      });
    });
  }

  private readIl2CppContextFromStorage(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      indexedDB.databases().then(async (databases) => {
        const uwmStore = databases.findIndex(
          (d) => d.name === "UnityWebModkit",
        );
        if (uwmStore == -1) {
          reject();
          return;
        }
        const request = window.indexedDB.open("UnityWebModkit", 2);
        request.onsuccess = () => {
          const transaction = request.result.transaction(["storage"]);
          const objectStore = transaction.objectStore("storage");
          const il2CppRequest = objectStore.get("il2cpp");
          il2CppRequest.onsuccess = async () => {
            this.il2CppContext = il2CppRequest.result;
            resolve();
          };
        };
      });
    });
  }

  private hookWasmInstantiate() {
    this.instantiateStreaming = WebAssembly.instantiateStreaming;
    WebAssembly.instantiateStreaming =
      this.onWebAssemblyInstantiateStreaming.bind(this);
  }

  private async onWebAssemblyInstantiateStreaming(
    source: Response | PromiseLike<Response>,
    importObject?: WebAssembly.Imports | undefined,
  ): Promise<WebAssembly.WebAssemblyInstantiatedSource> {
    // Wait for the Il2Cpp metadata to be resolved before continuing
    await waitFor(() => this.globalMetadata);
    if (this.globalMetadata?.imageDefs.length === 0)
      return this.instantiateStreaming(source, importObject);
    let bufferSource: ArrayBuffer;
    if (source instanceof Promise) {
      bufferSource = await source.then((res) => res.arrayBuffer());
    } else if (source instanceof Response) {
      bufferSource = await source.arrayBuffer();
    } else {
      this.logger.error(
        "TypeError: Got an unexpected object type as the first argument to WebAssembly.instantiateStreaming",
      );
      return Promise.reject();
    }
    this.logger.debug("handling buffer ig");
    return this.handleBuffer(bufferSource, importObject);
  }

  private handleBuffer(
    bufferSource: ArrayBuffer,
    importObject?: WebAssembly.Imports | undefined,
  ): Promise<WebAssembly.WebAssemblyInstantiatedSource> {
    return new Promise<WebAssembly.WebAssemblyInstantiatedSource>(
      async (resolve, reject) => {
        if (!importObject) importObject = {};
        await this.readIl2CppContextFromStorage();
        if (!this.il2CppContext) this.searchWasmBinary(bufferSource);
        if (!this.il2CppContext) {
          reject();
          return;
        }
        const bufferUint8Array = new Uint8Array(bufferSource);
        const wailPreparser = new WailParser(bufferUint8Array);
        wailPreparser._optionalSectionFlags |= 1 << SECTION_CODE;
        wailPreparser._optionalSectionFlags |= 1 << SECTION_ELEMENT;
        wailPreparser._optionalSectionFlags |= 1 << SECTION_TYPE;
        wailPreparser.parse();
        // this.resolveIl2CppFunctions(importObject);
        const wail = new WailParser(bufferUint8Array);
        // this.exportIl2CppFunctions(wail);
        this.logger.message("Chainloader initialized");
        this.logger.info("%d plugin(s) to load", this.plugins.length);
        const replacementFuncIndexes: WailVariable[] = [];
        const oldFuncIndexes: WailVariable[] = [];
        var i = 0,
          pluginLen = this.plugins.length;
        while (i < pluginLen) {
          const usePlugin = this.plugins[i];
          this.logger.info(
            "Loading [%s %s]",
            usePlugin.name,
            usePlugin.version,
          );
          var j = 0,
            hookLen = usePlugin.hooks.length;
          while (j < hookLen) {
            const useHook = usePlugin.hooks[j];
            useHook.tableIndex = this.getTableIndex(
              useHook.typeName,
              useHook.methodName,
            );
            useHook.index = this.getInternalIndex(useHook.tableIndex);
            const injectName =
              useHook.typeName + "xx" + useHook.methodName + makeId(8);
            let injectFunc = null;
            if (!useHook.kind) {
              injectFunc = async (...args: number[]) => {
                // @ts-ignore
                await waitFor(() => window.unityInstance)
                
                // @ts-ignore
                const _game = window.unityInstance;
                const tableName: string =
                  this.tableName ||
                  this.resolveTableName(_game.Module.asm);
                const originalFunction = _game.Module.asm[
                  tableName
                ].get(useHook.tableIndex);
                if (!useHook.enabled) {
                  if (useHook.returnType) {
                    return originalFunction(...args);
                  }
                  originalFunction(...args);
                  return;
                }
                const wrappedArgs: ValueWrapper[] = args.map(
                  (arg) => new ValueWrapper(arg),
                );
                const result = useHook.callback(...wrappedArgs);
                // Unwrap arguments in case they were changed in the callback function
                args = wrappedArgs.map((arg) => arg.val());
                if (result === undefined || result === true) {
                  if (useHook.returnType) {
                    return originalFunction(...args);
                  }
                  originalFunction(...args);
                }
              };
            } else {
              injectFunc = async (...args: number[]) => {
                // @ts-ignore
                await waitFor(() => window.unityInstance)
                
                // @ts-ignore
                const _game = window.unityInstance || game;
                const tableName: string =
                  this.tableName ||
                  this.resolveTableName(_game.Module.asm);
                const originalFunction = _game.Module.asm[
                  tableName
                ].get(useHook.tableIndex);
                let originalResult = originalFunction(...args);
                if (!useHook.enabled)
                  return useHook.returnType ? originalResult : undefined;
                if (originalResult !== undefined)
                  originalResult = new ValueWrapper(originalResult);
                const wrappedArgs = args.map((arg) => new ValueWrapper(arg));
                useHook.callback(originalResult, ...wrappedArgs);
                return originalResult?.val();
              };
            }
            importObject.env = importObject.env || {};
            console.log(importObject);
            importObject.env[injectName] = injectFunc;
            const injectType = this.internalWasmTypes.findIndex(
              (type: any) =>
                JSON.stringify(type.params) ===
                  JSON.stringify(useHook.params) &&
                type.returnType === useHook.returnType,
            );
            const replacementFuncIndex = wail.addImportEntry({
              moduleStr: "env",
              fieldStr: injectName,
              kind: "func",
              type: injectType,
            });
            replacementFuncIndexes.push(replacementFuncIndex);
            const oldFuncIndex = wail.getFunctionIndex(useHook.index);
            oldFuncIndexes.push(oldFuncIndex);
            ++j;
          }
          if (usePlugin.onLoaded) usePlugin.onLoaded();
          ++i;
        }
        this.logger.debug("after plugin loading importobj.env is", importObject.env);
        this.resolveIl2CppFunctions(importObject);
        this.exportIl2CppFunctions(wail);
        wail.addInstructionParser(OP_CALL, (instrBytes: any) => {
          const mappedOldFuncIndexes = oldFuncIndexes.map((item) => item.i32());
          const reader = new BufferReader(instrBytes);
          const opcode = reader.readUint8();
          const callTarget = reader.readVarUint32();
          if (mappedOldFuncIndexes.includes(callTarget)) {
            const workingIndex = mappedOldFuncIndexes.indexOf(callTarget);
            const workingHook = this.getHookByIndex(workingIndex);
            if (workingHook) workingHook.applied = true;
            return new Uint8Array([
              opcode,
              ...VarUint32ToArray(replacementFuncIndexes[workingIndex].i32()),
            ]);
          }
          return instrBytes;
        });
        wail.parse();
        this.logger.debug("after wail parse importobj.env is", importObject.env);
        WebAssembly.instantiate(wail.write(), importObject).then(
          (instantiatedSource) => {
            // Fallback for hooking functions that are invoked indirectly
            const unappliedHooks = this.getUnappliedHooks();
            const tableName: string =
              this.tableName ||
              this.resolveTableName(
                (instantiatedSource as any).instance.exports,
              );
            unappliedHooks.forEach((hook) => {
              // @ts-ignore
              var originalFunc = (instantiatedSource as any).instance.exports[
                tableName
              ].get(hook.tableIndex);
              const hookResults = hook.returnType ? [hook.returnType] : [];
              let injectFunc = null;
              if (!hook.kind) { // PREFIX
                // @ts-ignore
                injectFunc = new WebAssembly.Function(
                  {
                    parameters: hook.params,
                    results: hookResults,
                  },
                  (...args: number[]) => {
                    if (!hook.enabled) {
                      if (hook.returnType) {
                        return originalFunc(...args);
                      }
                      originalFunc(...args);
                      return;
                    }
                    const wrappedArgs = args.map(
                      (arg) => new ValueWrapper(arg),
                    );
                    const result = hook.callback(...wrappedArgs);
                    // Unwrap arguments in case they were changed in the callback function
                    args = wrappedArgs.map((arg) => arg.val());
                    if (result === undefined || result === true) {
                      if (hook.returnType) {
                        return originalFunc(...args);
                      }
                      originalFunc(...args);
                    }
                  },
                );
              } else { // POSTFIX
                // @ts-ignore
                injectFunc = new WebAssembly.Function(
                  {
                    parameters: hook.params,
                    results: hookResults,
                  },
                  (...args: number[]) => {
                    let originalResult = originalFunc(...args);
                    if (!hook.enabled)
                      return hook.returnType ? originalResult : undefined;
                    if (originalResult !== undefined)
                      originalResult = new ValueWrapper(originalResult);
                    const wrappedArgs = args.map(
                      (arg) => new ValueWrapper(arg),
                    );
                    hook.callback(originalResult, ...wrappedArgs);
                    return originalResult?.val();
                  },
                );
              }
              // @ts-ignore
              instantiatedSource.instance.exports[tableName].set(
                hook.tableIndex,
                injectFunc,
              );
              hook.applied = true;
            });
            this.logger.message("Chainloader startup complete");
            resolve(instantiatedSource);
          },
        );
        this.logger.debug("at end of handle buffer importobj.env is", importObject.env);
      },
    );
  }

  private searchWasmBinary(bufferSource: ArrayBuffer) {
    if (!this.globalMetadata) return;
    const il2CppContext = createIl2CppContext(
      bufferSource,
      this.globalMetadata,
      this.allReferencedAssemblies,
    );
    if (il2CppContext.isErr()) {
      this.logger.error(il2CppContext.error.print());
      return;
    }
    this.il2CppContext = il2CppContext.value;
    this.saveIl2CppContext();
  }

  // public for debugging purposes
  public resolveIl2CppFunctions(importObject: WebAssembly.Imports) {
    // const il2CppStringNew = this.internalWasmCode.find((func: any) => {
    //   return uint8ArrayStartsWith(
    //     concatenateUint8Arrays(func.instructions),
    //     [35, 0, 65, 16, 107, 34, 2, 36, 0, 32, 2, 32, 0, 32, 1, 16],
    //   );
    // });
    // COMMENTED BECAUSE importObject.env is undefined (this is ran before the plugin loading so idk mannn)
    // ignore the above but its fine i think adsffdxc
    const importObjectSize = Object.keys(importObject.env).length;
    // this.resolvedIl2CppFunctions["il2cpp_string_new"] =
    //   il2CppStringNew?.preservedIndex + importObjectSize;
    // TODO: This is a hack, but seems to work consistently with Unity 2021.3.15f1 (hopefully 2023 too)
    this.resolvedIl2CppFunctions["il2cpp_object_new"] = importObjectSize + 3;
  }

  private exportIl2CppFunctions(wail: WailParser) {
    for (const key in this.resolvedIl2CppFunctions) {
      const value = wail.getFunctionIndex(this.resolvedIl2CppFunctions[key]);
      wail.addExportEntry(value, {
        fieldStr: key,
        kind: "func",
      });
    }
  }

  public resolveTableName(asm: any) {
    return (
      Object.keys(asm).find((key) => asm[key].constructor.name == "Table") ||
      "Unknown"
    );
  }

  public createObject(typeInfo: number | ValueWrapper): number {
    // @ts-ignore
    const _game = window.unityInstance || game;
    console.log("creating object with typeinfo", typeInfo);
    const result = _game.Module.asm.il2cpp_object_new(
      typeInfo instanceof ValueWrapper ? typeInfo.val() : typeInfo,
    );
    console.log("created object result at", result);
    return result;
  }

  public createMstr(char: string): number {
    // @ts-ignore
    const _game = window.unityInstance || game;
    const charAlloc = _game.Module._malloc(char.length);
    writeUint8ArrayAtOffset(
      _game.Module.HEAPU8,
      new TextEncoder().encode(char),
      charAlloc,
    );
    return _game.Module.asm.il2cpp_string_new(charAlloc, char.length);
  }

  public memory(address: number | ValueWrapper, size: number): Uint8Array {
    // @ts-ignore
    const _game = window.unityInstance || game;
    if (address instanceof ValueWrapper) address = address.val();
    return _game.Module.HEAPU8.slice(address, address + size);
  }

  public malloc(size: number): number {
    // @ts-ignore
    const _game = window.unityInstance || game;
    return _game.Module._malloc(size);
  }

  public free(block: number | ValueWrapper) {
    // @ts-ignore
    const _game = window.unityInstance || game;
    _game.Module._free(
      block instanceof ValueWrapper ? block.val() : block,
    );
  }

  public getTableIndex(targetClass: string, targetMethod: string): number {
    if (!this.il2CppContext?.scriptData[targetClass]) return -1;
    const result = this.il2CppContext.scriptData[targetClass][targetMethod];
    if (!result) return -1;
    return result;
  }

  private getInternalIndex(tableIndex: number): number {
    return this.internalMappings[0].elements[tableIndex - 1];
  }

  private getHookByIndex(index: number): Hook | null {
    let totalHooksCount = 0;

    for (const plugin of this.plugins) {
      const hooksCount = plugin.hooks.length;

      // Check if the index is within the current plugin's hooks range
      if (index < totalHooksCount + hooksCount) {
        const hookIndex = index - totalHooksCount;
        return plugin.hooks[hookIndex];
      }

      totalHooksCount += hooksCount;
    }

    // If the index is out of range, return null
    return null;
  }

  private getUnappliedHooks(): Hook[] {
    return this.plugins
      .flatMap((plugin) => plugin.hooks)
      .filter((hook) => !hook.applied);
  }
}

type Hook = {
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

type PrefixCallback = ((...args: any) => boolean) | (() => void);
type PostfixCallback = (...args: any) => void;

type ModkitPluginOptions = {
  name: string;
  version?: string;
  referencedAssemblies?: string[];
};

class ModkitPlugin {
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

  public call(target: string, args: any[]): void;
  public call(targetClass: string, targetMethod: string, args: any[]): void;
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
    return new ValueWrapper(this._runtime.createMstr(char));
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

export class ValueWrapper {
  private _result: number;

  constructor(result: number) {
    this._result = result;
  }

  public set(value: ValueWrapper | number) {
    this._result = value instanceof ValueWrapper ? value.val() : value;
  }

  public val(): number {
    return this._result;
  }

  public mstr() {
    return ValueWrapper.readUtf16Char(this._result + 12);
  }

  public deref(): ValueWrapper | undefined {
    const val = this.readField(0, "u32")?.val();
    // BUG: 0 is falsy here
    return val ? new ValueWrapper(val) : undefined;
  }

  public getClassName(): string | null {
    try {
      // @ts-ignore
      const _game = window.unityInstance || game;
      const classPtr = new DataView(
        _game.Module.HEAPU8.slice(
          this._result,
          this._result + 4,
        ).buffer,
      ).getUint32(0, true);
      let classNamePtr = new DataView(
        _game.Module.HEAPU8.slice(classPtr + 8, classPtr + 12).buffer,
      ).getUint32(0, true);
      const classNameReader = new BinaryReader(
        _game.Module.HEAPU8.slice(
          classNamePtr,
          classNamePtr + 128, // Assumed max length for a class name
        ).buffer,
      );
      return classNameReader.readNullTerminatedUTF8String();
    } catch {
      return null;
    }
  }

  public readField(offset: number, type: string) {
    // @ts-ignore
    const _game = window.unityInstance || game;
    const valAddress = this._result + offset;
    let valArray = _game.Module.HEAPU8.slice(
      valAddress,
      valAddress + 4,
    );
    const reader = new BinaryReader(valArray.buffer);
    switch (type) {
      case "i32":
        return new ValueWrapper(reader.readInt32());
      case "f32":
        return new ValueWrapper(reader.readFloat());
      case "u8":
        return new ValueWrapper(reader.readUint8());
      case "u32":
        return new ValueWrapper(reader.readUint32());
    }
  }

  public writeField(
    offset: number,
    type: string,
    value: ValueWrapper | number,
  ) {
    // @ts-ignore
    const _game = window.unityInstance || game;
    let size = dataTypeSizes[type];
    const writer = new BinaryWriter(new ArrayBuffer(size));
    if (value instanceof ValueWrapper) value = value.val();
    switch (type) {
      case "u8":
        writer.writeUint8(value);
        break;
      case "i32":
        writer.writeInt32(value);
        break;
      case "u32":
        writer.writeUint32(value);
        break;
      case "f32":
        writer.writeFloat(value);
        break;
    }
    writeUint8ArrayAtOffset(
      _game.Module.HEAPU8,
      writer.finalize(),
      this._result + offset,
    );
  }

  private static readUtf16Char(ptr: number) {
    // @ts-ignore
    const _game = window.unityInstance || game;
    let buffer = new Uint16Array(_game.Module.HEAPU8.buffer);
    let offset = ptr / 2; // divide by 2 to convert from byte offset to character offset
    let subarray = [];
    let charCode = buffer[offset];

    while (charCode !== 0) {
      subarray.push(charCode);
      offset++;
      charCode = buffer[offset];
    }

    let decoder = new TextDecoder("utf-16le");
    return decoder.decode(new Uint16Array(subarray));
  }
}
