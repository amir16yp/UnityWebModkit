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
import { ModkitPlugin } from "./plugin";
import type { Hook, ModkitPluginOptions } from "./types";
import { ValueWrapper } from "./value-wrapper";

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
  private instantiate: any;
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
    this.readGlobalMetadataFromStorage(webData).catch((error) => {
      this.logger.warn("Failed to read metadata from storage: %s", error);
      this.logger.info("Deleting stale UnityWebModkit database...");
      window.indexedDB.deleteDatabase("UnityWebModkit");
      this.loadGlobalMetadata(webData);
    });
  }

  private async loadGlobalMetadata(webData: WebData) {
    this.logger.info("Loading global metadata from web data...");
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
    this.logger.info("Found global-metadata.dat (%d bytes)", metadataNode.size);
    
    this.allReferencedAssemblies = this.plugins.flatMap(
      (plugin) => plugin.referencedAssemblies,
    );
    this.logger.info("Referenced assemblies: %s", this.allReferencedAssemblies.join(", "));
    
    this.logger.info("Creating IL2CPP metadata...");
    const globalMetadata = await createMetadata(
      metadataNode.data,
      this.allReferencedAssemblies,
    );
    if (globalMetadata.isErr()) {
      this.logger.error(globalMetadata.error.print());
      return;
    }
    this.globalMetadata = globalMetadata.value;
    this.logger.info("Global metadata loaded successfully (version: %d)", this.globalMetadata.version);
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
      // short circuit - always load fresh metadata for now
      this.logger.debug("Skipping metadata cache, loading fresh metadata");
      reject();
      return;
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
            this.logger.message(globalMetadata);
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
    this.logger.info("Hooking WebAssembly instantiation methods...");
    
    // Hook instantiateStreaming (modern Unity)
    this.instantiateStreaming = WebAssembly.instantiateStreaming;
    WebAssembly.instantiateStreaming =
      this.onWebAssemblyInstantiateStreaming.bind(this);
    
    // Hook instantiate (older Unity 2019.x)
    this.instantiate = WebAssembly.instantiate;
    // @ts-ignore - TypeScript doesn't like our overload, but it works at runtime
    WebAssembly.instantiate = this.onWebAssemblyInstantiate.bind(this);
    
    this.logger.info("WebAssembly hooks installed");
  }

  private async onWebAssemblyInstantiate(
    bufferSource: BufferSource | WebAssembly.Module,
    importObject?: WebAssembly.Imports | undefined,
  ): Promise<WebAssembly.WebAssemblyInstantiatedSource> {
    this.logger.info("WebAssembly.instantiate called");
    
    // If it's already a Module, use original instantiate
    if (bufferSource instanceof WebAssembly.Module) {
      this.logger.debug("Received WebAssembly.Module, passing through");
      return this.instantiate(bufferSource, importObject);
    }
    
    // Wait for the Il2Cpp metadata to be resolved before continuing
    this.logger.info("Waiting for global metadata to load...");
    await waitFor(() => this.globalMetadata);
    this.logger.info("Global metadata loaded, checking image definitions...");
    
    if (this.globalMetadata?.imageDefs.length === 0) {
      this.logger.warn("No image definitions found, passing through without modding");
      return this.instantiate(bufferSource, importObject);
    }
    
    this.logger.info("Found %d image definitions, proceeding with modding", this.globalMetadata?.imageDefs.length || 0);
    
    let arrayBuffer: ArrayBuffer;
    if (bufferSource instanceof ArrayBuffer) {
      arrayBuffer = bufferSource;
    } else if (ArrayBuffer.isView(bufferSource)) {
      arrayBuffer = bufferSource.buffer.slice(
        bufferSource.byteOffset,
        bufferSource.byteOffset + bufferSource.byteLength
      );
    } else {
      this.logger.error("Unexpected buffer type");
      return Promise.reject();
    }
    
    this.logger.info("Processing WASM buffer (%d bytes)", arrayBuffer.byteLength);
    return this.handleBuffer(arrayBuffer, importObject);
  }

  private async onWebAssemblyInstantiateStreaming(
    source: Response | PromiseLike<Response>,
    importObject?: WebAssembly.Imports | undefined,
  ): Promise<WebAssembly.WebAssemblyInstantiatedSource> {
    this.logger.info("WebAssembly.instantiateStreaming called");
    
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
    this.logger.info("Processing WASM buffer (%d bytes)", bufferSource.byteLength);
    return this.handleBuffer(bufferSource, importObject);
  }

  private handleBuffer(
    bufferSource: ArrayBuffer,
    importObject?: WebAssembly.Imports | undefined,
  ): Promise<WebAssembly.WebAssemblyInstantiatedSource> {
    return new Promise<WebAssembly.WebAssemblyInstantiatedSource>(
      async (resolve, reject) => {
        if (!importObject) importObject = {};
        // await this.readIl2CppContextFromStorage();
        if (!this.il2CppContext) this.searchWasmBinary(bufferSource);
        if (!this.il2CppContext) {
          this.logger.warn("no ctx - uh oh...")
          debugger;
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
        this.instantiate(wail.write(), importObject).then(
          (
            instantiatedSource: WebAssembly.WebAssemblyInstantiatedSource,
          ) => {
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
    if (!this.globalMetadata) {
      this.logger.error("Cannot search WASM binary - no global metadata loaded!");
      return;
    }
    this.logger.info("Searching WASM binary for IL2CPP context...");
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
    this.logger.info("IL2CPP context created successfully");
    this.saveIl2CppContext();
  }

  // public for debugging purposes
  public resolveIl2CppFunctions(importObject: WebAssembly.Imports) {
    const il2CppStringNew = 2169; // dev5 only (gone lol)
    this.resolvedIl2CppFunctions["il2cpp_string_new"] = 2169;
    // TODO: This is a hack, but seems to work consistently with Unity 2021.3.15f1 (hopefully 2023 too)
    this.resolvedIl2CppFunctions["il2cpp_object_new"] = 2158;
    this.logger.info("resolved funcs i hope")
  }

  private exportIl2CppFunctions(wail: WailParser) {
    for (const key in this.resolvedIl2CppFunctions) {
      const value = wail.getFunctionIndex(this.resolvedIl2CppFunctions[key]);
      wail.addExportEntry(value, {
        fieldStr: key,
        kind: "func",
      });
    }
    this.logger.info("Exported %d Il2Cpp functions", Object.keys(this.resolvedIl2CppFunctions).length);
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
    const charAlloc = this.malloc(char.length);
    writeUint8ArrayAtOffset(
      _game.Module.HEAPU8,
      new TextEncoder().encode(char),
      charAlloc,
    );
    // mscorlib needs to be referenced when this is called
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
    return _game.Module.asm.malloc(size);
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
