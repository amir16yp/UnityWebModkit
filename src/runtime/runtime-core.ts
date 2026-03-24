import { Logger } from "../logger";
import { preload } from "../preloader";

export class Runtime {
  private logger: Logger;
  private startedInitializing = false;
  private preloadPromise: Promise<unknown> | null = null;
  private instantiateStreaming: typeof WebAssembly.instantiateStreaming | undefined;
  private instantiate: typeof WebAssembly.instantiate | undefined;

  public constructor() {
    this.logger = new Logger("UnityWebModkit");
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
    await this.preloadPromise;
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

  private async onWebAssemblyInstantiate(
    bufferSource: BufferSource | WebAssembly.Module,
    importObject?: WebAssembly.Imports,
  ): Promise<WebAssembly.WebAssemblyInstantiatedSource> {
    this.logger.info("WebAssembly.instantiate called");
    await this.ensurePreloaded();
    if (!this.instantiate) {
      throw new Error("WebAssembly.instantiate is unavailable");
    }
    if (bufferSource instanceof WebAssembly.Module) {
      return this.instantiate(bufferSource, importObject);
    }
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
    return this.instantiateStreaming(source, importObject);
  }
}
