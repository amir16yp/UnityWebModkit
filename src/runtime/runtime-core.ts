import { Logger } from "../logger";
import { createIl2CppContext, createMetadata, Il2CppContext, Il2CppDiscoveredFunction, Il2CppMetadata } from "../il2cpp";
import { preload } from "../preloader";
import { WebData } from "../web-data";

export type RuntimeIl2CppFunctionWrapper = {
  assemblyName: string;
  moduleName: string;
  typeName: string;
  methodName: string;
  qualifiedName: string;
  pointer: number;
  parameterCount: number;
  token: number;
  methodIndex: number;
  invoke: (...args: unknown[]) => never;
};

export type RuntimeIl2CppWrapperRegistry = {
  byQualifiedName: Record<string, RuntimeIl2CppFunctionWrapper[]>;
  byTypeName: Record<string, Record<string, RuntimeIl2CppFunctionWrapper[]>>;
  all: RuntimeIl2CppFunctionWrapper[];
};

export class Runtime {
  private logger: Logger;
  private startedInitializing = false;
  private preloadPromise: Promise<WebData> | null = null;
  private instantiateStreaming: typeof WebAssembly.instantiateStreaming | undefined;
  private instantiate: typeof WebAssembly.instantiate | undefined;
  private metadata: Il2CppMetadata | null = null;
  private il2cppContext: Il2CppContext | null = null;
  private il2cppWrappers: RuntimeIl2CppWrapperRegistry = {
    byQualifiedName: {},
    byTypeName: {},
    all: [],
  };

  public constructor() {
    this.logger = new Logger("UnityWebModkit");
  }

  public getIl2CppContext(): Il2CppContext | null {
    return this.il2cppContext;
  }

  public getIl2CppWrappers(): RuntimeIl2CppWrapperRegistry {
    return this.il2cppWrappers;
  }

  public getIl2CppFunction(qualifiedName: string): RuntimeIl2CppFunctionWrapper[] {
    return this.il2cppWrappers.byQualifiedName[qualifiedName] || [];
  }

  public getIl2CppFunctionsByType(typeName: string): Record<string, RuntimeIl2CppFunctionWrapper[]> {
    return this.il2cppWrappers.byTypeName[typeName] || {};
  }

  public async init(): Promise<void> {
    if (typeof window === "undefined") {
      console.log(
        "\x1b[37m[UnityWebModkit]\x1b[0m \x1b[33m[WARN]\x1b[0m Not running in a browser environment! Nothing will be executed.",
      );
      return;
    }
    if (this.startedInitializing) {
      await this.preloadPromise;
      return;
    }
    this.startedInitializing = true;
    this.hookWasmInstantiate();
    this.preloadPromise = preload();
    const webData = await this.preloadPromise;
    await this.initializeIl2CppMetadata(webData);
  }

  private hookWasmInstantiate() {
    this.logger.info("Hooking WebAssembly instantiation methods...");
    this.instantiateStreaming = WebAssembly.instantiateStreaming;
    WebAssembly.instantiateStreaming =
      this.onWebAssemblyInstantiateStreaming.bind(this);
    this.instantiate = WebAssembly.instantiate;
    WebAssembly.instantiate = this.onWebAssemblyInstantiate.bind(this) as typeof WebAssembly.instantiate;
    this.logger.info("WebAssembly hooks installed");
  }

  private async ensurePreloaded(): Promise<void> {
    if (!this.startedInitializing) {
      await this.init();
      return;
    }
    await this.preloadPromise;
  }

  private async initializeIl2CppMetadata(webData: WebData): Promise<void> {
    if (this.metadata) {
      return;
    }
    const metadataNode = webData.getNode("Il2CppData/Metadata/global-metadata.dat");
    if (!metadataNode?.data) {
      this.logger.warn("IL2CPP metadata node was not found in Unity web data");
      return;
    }
    this.logger.info("Parsing IL2CPP metadata...");
    const metadataResult = await createMetadata(metadataNode.data);
    if (metadataResult.isErr()) {
      this.logger.error("Failed to parse IL2CPP metadata: %s", metadataResult.error.print());
      return;
    }
    this.metadata = metadataResult.value;
    this.logger.info(
      "IL2CPP metadata loaded (%d images, %d methods)",
      this.metadata.imageDefs.length,
      this.metadata.methodDefs.length,
    );
  }

  private async initializeIl2CppContext(wasmBuffer: ArrayBuffer): Promise<void> {
    if (this.il2cppContext) {
      return;
    }
    await this.ensurePreloaded();
    if (!this.metadata) {
      this.logger.warn("Skipping IL2CPP context creation because metadata is unavailable");
      return;
    }
    this.logger.info("Creating IL2CPP context from WebAssembly module...");
    const contextResult = createIl2CppContext(wasmBuffer, this.metadata);
    if (contextResult.isErr()) {
      this.logger.error("Failed to create IL2CPP context: %s", contextResult.error.print());
      return;
    }
    this.il2cppContext = contextResult.value;
    this.il2cppWrappers = this.createIl2CppWrapperRegistry(
      this.il2cppContext.discoveredFunctions,
    );
    this.logger.info(
      "IL2CPP context created (%d codegen modules)",
      Object.keys(this.il2cppContext.codeGenModules).length,
    );
    this.logger.info(
      "IL2CPP wrappers created (%d discovered functions)",
      this.il2cppWrappers.all.length,
    );
  }

  private createIl2CppWrapperRegistry(
    discoveredFunctions: Il2CppDiscoveredFunction[],
  ): RuntimeIl2CppWrapperRegistry {
    const registry: RuntimeIl2CppWrapperRegistry = {
      byQualifiedName: {},
      byTypeName: {},
      all: [],
    };
    for (const discoveredFunction of discoveredFunctions) {
      const wrapper = this.createIl2CppFunctionWrapper(discoveredFunction);
      registry.all.push(wrapper);
      if (!registry.byQualifiedName[wrapper.qualifiedName]) {
        registry.byQualifiedName[wrapper.qualifiedName] = [];
      }
      registry.byQualifiedName[wrapper.qualifiedName].push(wrapper);
      if (!registry.byTypeName[wrapper.typeName]) {
        registry.byTypeName[wrapper.typeName] = {};
      }
      if (!registry.byTypeName[wrapper.typeName][wrapper.methodName]) {
        registry.byTypeName[wrapper.typeName][wrapper.methodName] = [];
      }
      registry.byTypeName[wrapper.typeName][wrapper.methodName].push(wrapper);
    }
    return registry;
  }

  private createIl2CppFunctionWrapper(
    discoveredFunction: Il2CppDiscoveredFunction,
  ): RuntimeIl2CppFunctionWrapper {
    return {
      ...discoveredFunction,
      invoke: (...args: unknown[]) => {
        throw new Error(
          `Invocation is not implemented for IL2CPP function ${discoveredFunction.qualifiedName} at 0x${discoveredFunction.pointer.toString(16)}. Received ${args.length} arguments.`,
        );
      },
    };
  }

  private getArrayBufferFromBufferSource(bufferSource: BufferSource): ArrayBuffer {
    if (bufferSource instanceof ArrayBuffer) {
      return bufferSource;
    }
    return bufferSource.buffer.slice(
      bufferSource.byteOffset,
      bufferSource.byteOffset + bufferSource.byteLength,
    );
  }

  private async onWebAssemblyInstantiate(
    bufferSource: BufferSource | WebAssembly.Module,
    importObject?: WebAssembly.Imports,
  ): Promise<WebAssembly.Instance | WebAssembly.WebAssemblyInstantiatedSource> {
    this.logger.info("WebAssembly.instantiate called");
    await this.ensurePreloaded();
    if (!this.instantiate) {
      throw new Error("WebAssembly.instantiate is unavailable");
    }
    if (bufferSource instanceof WebAssembly.Module) {
      return this.instantiate(bufferSource, importObject);
    }
    await this.initializeIl2CppContext(this.getArrayBufferFromBufferSource(bufferSource));
    return this.instantiate(bufferSource, importObject);
  }

  private async onWebAssemblyInstantiateStreaming(
    source: Response | PromiseLike<Response>,
    importObject?: WebAssembly.Imports,
  ): Promise<WebAssembly.WebAssemblyInstantiatedSource> {
    this.logger.info("WebAssembly.instantiateStreaming called");
    await this.ensurePreloaded();
    if (!this.instantiateStreaming) {
      throw new Error("WebAssembly.instantiateStreaming is unavailable");
    }
    const response = await source;
    await this.initializeIl2CppContext(await response.clone().arrayBuffer());
    return this.instantiateStreaming(response, importObject);
  }
}
