import { LogLevel, Logger } from "../logger";
import { WebData } from "../web-data";
import { version } from "../mod";

const logger = new Logger("Preloader");
const UNITY_WEB_DATA_SIGNATURE = "UnityWebData1.0\0";

function hasUnityWebDataSignature(data: Uint8Array): boolean {
  if (data.length < UNITY_WEB_DATA_SIGNATURE.length) return false;
  return (
    String.fromCharCode.apply(
      null,
      Array.from(data.subarray(0, UNITY_WEB_DATA_SIGNATURE.length)),
    ) === UNITY_WEB_DATA_SIGNATURE
  );
}

function getHeaderPreview(data: Uint8Array, length: number = 32): string {
  return Array.from(data.subarray(0, Math.min(length, data.length)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join(" ");
}

function logHeaderPreview(label: string, data: Uint8Array): void {
  logger.info("%s header: %s", label, getHeaderPreview(data));
}

function hasGzipUnityMarker(data: Uint8Array): boolean {
  const marker = "UnityWeb Compressed Content (gzip)";
  if (data.length < 2 || data[0] !== 31 || data[1] !== 139) return false;
  const preview = String.fromCharCode.apply(
    null,
    Array.from(data.subarray(0, Math.min(96, data.length))),
  );
  return preview.includes(marker);
}

function hasBrotliUnityMarker(data: Uint8Array): boolean {
  const marker = "UnityWeb Compressed Content (brotli)";
  if (!data.length) return false;
  const preview = String.fromCharCode.apply(
    null,
    Array.from(data.subarray(0, Math.min(96, data.length))),
  );
  return preview.includes(marker);
}

async function maybeDecompressUnityWebData(buffer: ArrayBuffer): Promise<ArrayBuffer> {
  const bytes = new Uint8Array(buffer);
  logHeaderPreview("Captured buffer", bytes);
  if (hasUnityWebDataSignature(bytes)) return buffer;

  let format: "deflate" | "deflate-raw" | "gzip" | "brotli" | null = null;
  if (hasGzipUnityMarker(bytes)) format = "gzip";
  if (hasBrotliUnityMarker(bytes)) format = "brotli";
  if (!format) return buffer;

  logger.info("Detected UnityWeb %s-compressed data, decompressing...", format);
  let decompressedBuffer: ArrayBuffer;
  if (format === "brotli") {
    const brotliCompression = (window as any).UnityLoader?.Compression?.brotli;
    const decompress = brotliCompression?.decompress;
    if (typeof decompress !== "function") {
      throw new Error("UnityLoader brotli decompressor is unavailable");
    }
    const decompressed = decompress.call(brotliCompression, new Uint8Array(buffer));
    if (!(decompressed instanceof Uint8Array)) {
      throw new Error("UnityLoader brotli decompressor returned an invalid result");
    }
    decompressedBuffer = decompressed.slice().buffer;
  } else {
    const ds = new DecompressionStream(format);
    const decompressedStream = new Blob([buffer]).stream().pipeThrough(ds);
    decompressedBuffer = await new Response(decompressedStream).arrayBuffer();
  }
  logger.info("Decompressed Unity data to %d bytes", decompressedBuffer.byteLength);
  const decompressedBytes = new Uint8Array(decompressedBuffer);
  logHeaderPreview("Final decompressed buffer", decompressedBytes);
  if (!hasUnityWebDataSignature(decompressedBytes)) {
    logger.warn(
      "Decompressed buffer still lacks UnityWebData signature. Header: %s",
      getHeaderPreview(decompressedBytes),
    );
  }
  return decompressedBuffer;
}

function toAbsoluteUrl(url: string): string {
  return new URL(url, window.location.href).href;
}

function readUnityCacheEntry(url: string): Promise<ArrayBuffer | null> {
  return new Promise<ArrayBuffer | null>((resolve) => {
    const request = window.indexedDB.open("UnityCache", 2);

    request.onsuccess = (event: any) => {
      const db = event.target.result;
      try {
        const getRequest = db
          .transaction(["XMLHttpRequest"], "readonly")
          .objectStore("XMLHttpRequest")
          .get(url);

        getRequest.onsuccess = (getEvent: any) => {
          const result = getEvent.target.result;
          db.close();
          resolve(result?.xhr?.response ?? null);
        };

        getRequest.onerror = () => {
          db.close();
          resolve(null);
        };
      } catch {
        db.close();
        resolve(null);
      }
    };

    request.onerror = () => {
      resolve(null);
    };
  });
}

export function preload(): Promise<WebData> {
  logger.info("UnityWebModkit v%s - %s", version, window.location.hostname);
  // @ts-ignore Set by webpack at bundle time
  logger.info("Build hash: %s", __webpack_hash__);
  logger.info("Starting Unity data preload...");
  return loadWebData();
}

function loadWebData(): Promise<WebData> {
  logger.info("Installing network hooks for Unity data preload...");
  return interceptUnityDataRequest();
}

function interceptUnityDataRequest(): Promise<WebData> {
  return new Promise<WebData>((resolve) => {
    let resolved = false;
    const originalFetch = window.fetch;
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;

    const cleanup = () => {
      window.fetch = originalFetch;
      XMLHttpRequest.prototype.open = originalXHROpen;
      XMLHttpRequest.prototype.send = originalXHRSend;
    };

    const tryResolve = async (buffer: ArrayBuffer, source: string) => {
      if (resolved) return;
      resolved = true;
      cleanup();
      logger.info("Unity data file captured via %s (%d bytes)", source, buffer.byteLength);
      try {
        const parsedBuffer = await maybeDecompressUnityWebData(buffer);
        resolve(parseWebData(parsedBuffer));
      } catch (error) {
        logger.error("Failed to prepare Unity data buffer: %s", error);
        throw error;
      }
    };

    const isUnityDataUrl = (url: string) => {
      const normalized = url.toLowerCase();
      return normalized.includes(".data") || normalized.includes(".data.unityweb");
    };

    window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
      const url = typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
      if (isUnityDataUrl(url)) {
        logger.info("Unity data request detected via fetch: %s", url);
        const response = await originalFetch.call(this, input as any, init);
        const buffer = await response.clone().arrayBuffer();
        void tryResolve(buffer, "fetch");
        return response;
      }
      return originalFetch.call(this, input as any, init);
    };

    XMLHttpRequest.prototype.open = function (
      method: string,
      url: string | URL,
      async?: boolean,
      username?: string | null,
      password?: string | null,
    ) {
      (this as any).__uwmUrl = typeof url === "string" ? url : url.toString();
      return originalXHROpen.call(this, method, url as any, async ?? true, username as any, password as any);
    };

    XMLHttpRequest.prototype.send = function (body?: Document | XMLHttpRequestBodyInit | null) {
      const xhr = this;
      const url = (xhr as any).__uwmUrl;
      if (typeof url === "string" && isUnityDataUrl(url)) {
        logger.info("Unity data request detected via XHR: %s", url);
        xhr.addEventListener("load", async () => {
          if (xhr.status < 200 || xhr.status >= 400) return;
          const absoluteUrl = toAbsoluteUrl(url);
          logger.info("Reading Unity data from UnityCache for %s", absoluteUrl);
          const cachedBuffer = await readUnityCacheEntry(absoluteUrl);
          if (cachedBuffer && cachedBuffer.byteLength > 0) {
            void tryResolve(cachedBuffer, "unitycache");
            return;
          }
          logger.warn("UnityCache entry unavailable for %s, falling back to live XHR response", absoluteUrl);
          const response = xhr.response;
          if (response instanceof ArrayBuffer && response.byteLength > 0) {
            void tryResolve(response, "xhr");
            return;
          }
          if (response instanceof Blob) {
            response.arrayBuffer().then((buffer) => {
              void tryResolve(buffer, "xhr-blob");
            });
          }
        });
      }
      return originalXHRSend.call(this, body as any);
    };

    logger.info("Fetch/XHR hooks installed, waiting for Unity data request...");
  });
}

function parseWebData(data: ArrayBuffer): WebData {
  logger.info("Parsing WebData structure from buffer (%d bytes)", data.byteLength);
  const bytes = new Uint8Array(data);
  logHeaderPreview("WebData parse input", bytes);
  if (!hasUnityWebDataSignature(bytes)) {
    throw new Error(
      `Invalid Unity web data signature. Header: ${getHeaderPreview(bytes)}`,
    );
  }
  const webData = new WebData(data, [
    ["data.unity3d", 32],
    ["Il2CppData/Metadata/global-metadata.dat"],
  ]);
  logger.info("WebData parsed successfully:");
  logger.info("  - Signature: %s", webData.signature);
  logger.info("  - Unity Version: %s", webData.unityVersion || "unknown");
  logger.info("  - Nodes extracted: %d", webData.nodes.length);
  webData.nodes.forEach(node => {
    logger.info("    * %s (%d bytes)", node.name, node.size);
  });
  return webData;
}
