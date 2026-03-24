/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/logger/index.ts":
/*!*****************************!*\
  !*** ./src/logger/index.ts ***!
  \*****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Logger: () => (/* binding */ Logger)
/* harmony export */ });
/* unused harmony export LogLevel */
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["NONE"] = 0] = "NONE";
    LogLevel[LogLevel["ERROR"] = 1] = "ERROR";
    LogLevel[LogLevel["WARN"] = 2] = "WARN";
    LogLevel[LogLevel["INFO"] = 4] = "INFO";
    LogLevel[LogLevel["DEBUG"] = 8] = "DEBUG";
    LogLevel[LogLevel["MESSAGE"] = 16] = "MESSAGE";
    LogLevel[LogLevel["ALL"] = 31] = "ALL";
})(LogLevel || (LogLevel = {}));
class Logger {
    constructor(name) {
        this.name = name;
    }
    error(...args) {
        this.log(LogLevel.ERROR, ...args);
    }
    warn(...args) {
        this.log(LogLevel.WARN, ...args);
    }
    info(...args) {
        this.log(LogLevel.INFO, ...args);
    }
    debug(...args) {
        this.log(LogLevel.DEBUG, ...args);
    }
    message(...args) {
        this.log(LogLevel.MESSAGE, ...args);
    }
    log(level, ...args) {
        if (this.shouldLog(level) && args.length > 0) {
            const logPrefix = `%c[UnityWebModkit] %c[${this.name}] %c[${LogLevel[level]}]%c`;
            let message = args.shift();
            if (typeof message !== "string") {
                args.push(message);
                message = "";
            }
            else {
                message = " " + message;
            }
            let mainPrefixStyles = "color: #FFD700; font-weight: bold;";
            let logStyles = "color: #fff;";
            let messageStyles;
            switch (level) {
                case LogLevel.ERROR:
                    messageStyles = "color: #FF6E74;";
                    break;
                case LogLevel.WARN:
                    messageStyles = "color: #FFB36A;";
                    break;
                case LogLevel.INFO:
                    messageStyles = "color: #35EA93;";
                    break;
                case LogLevel.DEBUG:
                    messageStyles = "color: #BE7CFF;";
                    break;
                case LogLevel.MESSAGE:
                    messageStyles = "color: #56C4FF;";
                    break;
            }
            console.log(logPrefix + message, mainPrefixStyles, logStyles, messageStyles, "color: default;", ...args);
        }
    }
    shouldLog(level) {
        if (level === LogLevel.DEBUG)
            // @ts-ignore
            return true;
        return true;
    }
}


/***/ }),

/***/ "./src/mod.ts":
/*!********************!*\
  !*** ./src/mod.ts ***!
  \********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Runtime: () => (/* binding */ Runtime),
/* harmony export */   preload: () => (/* reexport safe */ _preloader__WEBPACK_IMPORTED_MODULE_1__.preload),
/* harmony export */   version: () => (/* binding */ version)
/* harmony export */ });
/* harmony import */ var _runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./runtime */ "./src/runtime/index.ts");
/* harmony import */ var _preloader__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./preloader */ "./src/preloader/index.ts");
// Exports



// @ts-ignore Set by webpack at bundle time
const version = "1.1.0";
const Runtime = new _runtime__WEBPACK_IMPORTED_MODULE_0__.Runtime();
void Runtime.init();


/***/ }),

/***/ "./src/preloader/index.ts":
/*!********************************!*\
  !*** ./src/preloader/index.ts ***!
  \********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   preload: () => (/* binding */ preload)
/* harmony export */ });
/* harmony import */ var _logger__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../logger */ "./src/logger/index.ts");
/* harmony import */ var _web_data__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../web-data */ "./src/web-data/index.ts");
/* harmony import */ var _mod__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../mod */ "./src/mod.ts");
var __awaiter = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};



const logger = new _logger__WEBPACK_IMPORTED_MODULE_0__.Logger("Preloader");
const UNITY_WEB_DATA_SIGNATURE = "UnityWebData1.0\0";
function hasUnityWebDataSignature(data) {
    if (data.length < UNITY_WEB_DATA_SIGNATURE.length)
        return false;
    return (String.fromCharCode.apply(null, Array.from(data.subarray(0, UNITY_WEB_DATA_SIGNATURE.length))) === UNITY_WEB_DATA_SIGNATURE);
}
function getHeaderPreview(data, length = 32) {
    return Array.from(data.subarray(0, Math.min(length, data.length)))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(" ");
}
function logHeaderPreview(label, data) {
    logger.info("%s header: %s", label, getHeaderPreview(data));
}
function hasGzipUnityMarker(data) {
    const marker = "UnityWeb Compressed Content (gzip)";
    if (data.length < 2 || data[0] !== 31 || data[1] !== 139)
        return false;
    const preview = String.fromCharCode.apply(null, Array.from(data.subarray(0, Math.min(96, data.length))));
    return preview.includes(marker);
}
function hasBrotliUnityMarker(data) {
    const marker = "UnityWeb Compressed Content (brotli)";
    if (!data.length)
        return false;
    const preview = String.fromCharCode.apply(null, Array.from(data.subarray(0, Math.min(96, data.length))));
    return preview.includes(marker);
}
function maybeDecompressUnityWebData(buffer) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function* () {
        const bytes = new Uint8Array(buffer);
        logHeaderPreview("Captured buffer", bytes);
        if (hasUnityWebDataSignature(bytes))
            return buffer;
        let format = null;
        if (hasGzipUnityMarker(bytes))
            format = "gzip";
        if (hasBrotliUnityMarker(bytes))
            format = "brotli";
        if (!format)
            return buffer;
        logger.info("Detected UnityWeb %s-compressed data, decompressing...", format);
        let decompressedBuffer;
        if (format === "brotli") {
            const brotliCompression = (_b = (_a = window.UnityLoader) === null || _a === void 0 ? void 0 : _a.Compression) === null || _b === void 0 ? void 0 : _b.brotli;
            const decompress = brotliCompression === null || brotliCompression === void 0 ? void 0 : brotliCompression.decompress;
            if (typeof decompress !== "function") {
                throw new Error("UnityLoader brotli decompressor is unavailable");
            }
            const decompressed = decompress.call(brotliCompression, new Uint8Array(buffer));
            if (!(decompressed instanceof Uint8Array)) {
                throw new Error("UnityLoader brotli decompressor returned an invalid result");
            }
            decompressedBuffer = decompressed.slice().buffer;
        }
        else {
            const ds = new DecompressionStream(format);
            const decompressedStream = new Blob([buffer]).stream().pipeThrough(ds);
            decompressedBuffer = yield new Response(decompressedStream).arrayBuffer();
        }
        logger.info("Decompressed Unity data to %d bytes", decompressedBuffer.byteLength);
        const decompressedBytes = new Uint8Array(decompressedBuffer);
        logHeaderPreview("Final decompressed buffer", decompressedBytes);
        if (!hasUnityWebDataSignature(decompressedBytes)) {
            logger.warn("Decompressed buffer still lacks UnityWebData signature. Header: %s", getHeaderPreview(decompressedBytes));
        }
        return decompressedBuffer;
    });
}
function toAbsoluteUrl(url) {
    return new URL(url, window.location.href).href;
}
function readUnityCacheEntry(url) {
    return new Promise((resolve) => {
        const request = window.indexedDB.open("UnityCache", 2);
        request.onsuccess = (event) => {
            const db = event.target.result;
            try {
                const getRequest = db
                    .transaction(["XMLHttpRequest"], "readonly")
                    .objectStore("XMLHttpRequest")
                    .get(url);
                getRequest.onsuccess = (getEvent) => {
                    var _a, _b;
                    const result = getEvent.target.result;
                    db.close();
                    resolve((_b = (_a = result === null || result === void 0 ? void 0 : result.xhr) === null || _a === void 0 ? void 0 : _a.response) !== null && _b !== void 0 ? _b : null);
                };
                getRequest.onerror = () => {
                    db.close();
                    resolve(null);
                };
            }
            catch (_a) {
                db.close();
                resolve(null);
            }
        };
        request.onerror = () => {
            resolve(null);
        };
    });
}
function preload() {
    logger.info("UnityWebModkit v%s - %s", _mod__WEBPACK_IMPORTED_MODULE_2__.version, window.location.hostname);
    // @ts-ignore Set by webpack at bundle time
    logger.info("Build hash: %s", __webpack_require__.h());
    logger.info("Starting Unity data preload...");
    return loadWebData();
}
function loadWebData() {
    logger.info("Installing network hooks for Unity data preload...");
    return interceptUnityDataRequest();
}
function interceptUnityDataRequest() {
    return new Promise((resolve) => {
        let resolved = false;
        const originalFetch = window.fetch;
        const originalXHROpen = XMLHttpRequest.prototype.open;
        const originalXHRSend = XMLHttpRequest.prototype.send;
        const cleanup = () => {
            window.fetch = originalFetch;
            XMLHttpRequest.prototype.open = originalXHROpen;
            XMLHttpRequest.prototype.send = originalXHRSend;
        };
        const tryResolve = (buffer, source) => __awaiter(this, void 0, void 0, function* () {
            if (resolved)
                return;
            resolved = true;
            cleanup();
            logger.info("Unity data file captured via %s (%d bytes)", source, buffer.byteLength);
            try {
                const parsedBuffer = yield maybeDecompressUnityWebData(buffer);
                resolve(parseWebData(parsedBuffer));
            }
            catch (error) {
                logger.error("Failed to prepare Unity data buffer: %s", error);
                throw error;
            }
        });
        const isUnityDataUrl = (url) => {
            const normalized = url.toLowerCase();
            return normalized.includes(".data") || normalized.includes(".data.unityweb");
        };
        window.fetch = function (input, init) {
            return __awaiter(this, void 0, void 0, function* () {
                const url = typeof input === "string"
                    ? input
                    : input instanceof URL
                        ? input.toString()
                        : input.url;
                if (isUnityDataUrl(url)) {
                    logger.info("Unity data request detected via fetch: %s", url);
                    const response = yield originalFetch.call(this, input, init);
                    const buffer = yield response.clone().arrayBuffer();
                    void tryResolve(buffer, "fetch");
                    return response;
                }
                return originalFetch.call(this, input, init);
            });
        };
        XMLHttpRequest.prototype.open = function (method, url, async, username, password) {
            this.__uwmUrl = typeof url === "string" ? url : url.toString();
            return originalXHROpen.call(this, method, url, async !== null && async !== void 0 ? async : true, username, password);
        };
        XMLHttpRequest.prototype.send = function (body) {
            const xhr = this;
            const url = xhr.__uwmUrl;
            if (typeof url === "string" && isUnityDataUrl(url)) {
                logger.info("Unity data request detected via XHR: %s", url);
                xhr.addEventListener("load", () => __awaiter(this, void 0, void 0, function* () {
                    if (xhr.status < 200 || xhr.status >= 400)
                        return;
                    const absoluteUrl = toAbsoluteUrl(url);
                    logger.info("Reading Unity data from UnityCache for %s", absoluteUrl);
                    const cachedBuffer = yield readUnityCacheEntry(absoluteUrl);
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
                }));
            }
            return originalXHRSend.call(this, body);
        };
        logger.info("Fetch/XHR hooks installed, waiting for Unity data request...");
    });
}
function parseWebData(data) {
    logger.info("Parsing WebData structure from buffer (%d bytes)", data.byteLength);
    const bytes = new Uint8Array(data);
    logHeaderPreview("WebData parse input", bytes);
    if (!hasUnityWebDataSignature(bytes)) {
        throw new Error(`Invalid Unity web data signature. Header: ${getHeaderPreview(bytes)}`);
    }
    const webData = new _web_data__WEBPACK_IMPORTED_MODULE_1__.WebData(data, [
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


/***/ }),

/***/ "./src/runtime/index.ts":
/*!******************************!*\
  !*** ./src/runtime/index.ts ***!
  \******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Runtime: () => (/* reexport safe */ _runtime_core__WEBPACK_IMPORTED_MODULE_0__.Runtime)
/* harmony export */ });
/* harmony import */ var _runtime_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./runtime-core */ "./src/runtime/runtime-core.ts");



/***/ }),

/***/ "./src/runtime/runtime-core.ts":
/*!*************************************!*\
  !*** ./src/runtime/runtime-core.ts ***!
  \*************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Runtime: () => (/* binding */ Runtime)
/* harmony export */ });
/* harmony import */ var _logger__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../logger */ "./src/logger/index.ts");
/* harmony import */ var _preloader__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../preloader */ "./src/preloader/index.ts");
var __awaiter = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};


class Runtime {
    constructor() {
        this.startedInitializing = false;
        this.preloadPromise = null;
        this.logger = new _logger__WEBPACK_IMPORTED_MODULE_0__.Logger("UnityWebModkit");
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            if (typeof window === "undefined") {
                console.log("\x1b[37m[UnityWebModkit]\x1b[0m \x1b[33m[WARN]\x1b[0m Not running in a browser environment! Nothing will be executed.");
                return;
            }
            if (this.startedInitializing) {
                yield this.preloadPromise;
                return;
            }
            this.startedInitializing = true;
            this.hookWasmInstantiate();
            this.preloadPromise = (0,_preloader__WEBPACK_IMPORTED_MODULE_1__.preload)();
            yield this.preloadPromise;
        });
    }
    hookWasmInstantiate() {
        this.logger.info("Hooking WebAssembly instantiation methods...");
        this.instantiateStreaming = WebAssembly.instantiateStreaming;
        WebAssembly.instantiateStreaming =
            this.onWebAssemblyInstantiateStreaming.bind(this);
        this.instantiate = WebAssembly.instantiate;
        WebAssembly.instantiate = this.onWebAssemblyInstantiate.bind(this);
        this.logger.info("WebAssembly hooks installed");
    }
    ensurePreloaded() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.startedInitializing) {
                yield this.init();
                return;
            }
            yield this.preloadPromise;
        });
    }
    onWebAssemblyInstantiate(bufferSource, importObject) {
        return __awaiter(this, void 0, void 0, function* () {
            this.logger.info("WebAssembly.instantiate called");
            yield this.ensurePreloaded();
            if (!this.instantiate) {
                throw new Error("WebAssembly.instantiate is unavailable");
            }
            if (bufferSource instanceof WebAssembly.Module) {
                return this.instantiate(bufferSource, importObject);
            }
            return this.instantiate(bufferSource, importObject);
        });
    }
    onWebAssemblyInstantiateStreaming(source, importObject) {
        return __awaiter(this, void 0, void 0, function* () {
            this.logger.info("WebAssembly.instantiateStreaming called");
            yield this.ensurePreloaded();
            if (!this.instantiateStreaming) {
                throw new Error("WebAssembly.instantiateStreaming is unavailable");
            }
            return this.instantiateStreaming(source, importObject);
        });
    }
}


/***/ }),

/***/ "./src/utils/binary/index.ts":
/*!***********************************!*\
  !*** ./src/utils/binary/index.ts ***!
  \***********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   BinaryReader: () => (/* binding */ BinaryReader)
/* harmony export */ });
/* unused harmony export BinaryWriter */
class BinaryReader {
    constructor(arrayBuffer, littleEndian = true) {
        this._view = new DataView(arrayBuffer);
        this._buffer = arrayBuffer;
        this._offset = 0;
        this._littleEndian = littleEndian;
        this._utf8decoder = new TextDecoder("utf-8");
    }
    get offset() {
        return this._offset;
    }
    get buffer() {
        return this._buffer;
    }
    seek(offset) {
        this._offset = offset;
    }
    readNullTerminatedUTF8String() {
        const startOffset = this._offset;
        while (this._view.getUint8(this._offset++) !== 0) { }
        const utf8String = this._utf8decoder.decode(this._view.buffer.slice(startOffset, this._offset - 1));
        return utf8String;
    }
    readUTF8StringWithLength() {
        const stringLength = this.readUint32();
        const utf8String = this._utf8decoder.decode(this._view.buffer.slice(this._offset, this._offset + stringLength));
        this._offset += stringLength;
        return utf8String;
    }
    readUint8() {
        const value = this._view.getUint8(this._offset);
        this._offset++;
        return value;
    }
    readUint16() {
        const value = this._view.getUint16(this._offset, this._littleEndian);
        this._offset += 2;
        return value;
    }
    readInt32() {
        const value = this._view.getInt32(this._offset, this._littleEndian);
        this._offset += 4;
        return value;
    }
    readUint32() {
        const value = this._view.getUint32(this._offset, this._littleEndian);
        this._offset += 4;
        return value;
    }
    readFloat() {
        const value = this._view.getFloat32(this._offset, this._littleEndian);
        this._offset += 4;
        return value;
    }
    readULEB128() {
        let result = 0;
        let shift = 0;
        let byte;
        do {
            byte = this.readUint8();
            result |= (byte & 0x7f) << shift;
            shift += 7;
        } while (byte & 0x80);
        return result;
    }
    readUint8Array(length) {
        const slice = this.readSlice(this.offset, length);
        this._offset += length;
        return new Uint8Array(slice);
    }
    readSlice(offset, length) {
        return this._view.buffer.slice(offset, offset + length);
    }
}
class BinaryWriter {
    constructor(buffer, littleEndian = true) {
        this._view = new DataView(buffer);
        this._offset = 0;
        this._littleEndian = littleEndian;
    }
    seek(offset) {
        if (offset >= 0 && offset < this._view.byteLength) {
            this._offset = offset;
        }
        else {
            throw new Error("Invalid offset value.");
        }
    }
    writeUint8(value) {
        if (this._offset < this._view.byteLength) {
            this._view.setUint8(this._offset, value);
            this._offset += 1;
        }
        else {
            throw new Error("Buffer overflow: Cannot write beyond the ArrayBuffer length.");
        }
    }
    writeInt32(value) {
        if (this._offset < this._view.byteLength) {
            this._view.setInt32(this._offset, value, this._littleEndian);
            this._offset += 4;
        }
        else {
            throw new Error("Buffer overflow: Cannot write beyond the ArrayBuffer length.");
        }
    }
    writeUint32(value) {
        if (this._offset < this._view.byteLength) {
            this._view.setUint32(this._offset, value, this._littleEndian);
            this._offset += 4;
        }
        else {
            throw new Error("Buffer overflow: Cannot write beyond the ArrayBuffer length.");
        }
    }
    writeFloat(value) {
        if (this._offset < this._view.byteLength) {
            this._view.setFloat32(this._offset, value, this._littleEndian);
            this._offset += 4;
        }
        else {
            throw new Error("Buffer overflow: Cannot write beyond the ArrayBuffer length.");
        }
    }
    writeBytes(bytes) {
        const bytesToWrite = new Uint8Array(bytes);
        const remainingSpace = this._view.byteLength - this._offset;
        const bytesToWriteLength = bytesToWrite.length;
        if (bytesToWriteLength <= remainingSpace) {
            for (let i = 0; i < bytesToWriteLength; i++) {
                this._view.setUint8(this._offset, bytesToWrite[i]);
                this._offset++;
            }
        }
        else {
            throw new Error("Buffer overflow: Cannot write beyond the ArrayBuffer length.");
        }
    }
    finalize() {
        return new Uint8Array(this._view.buffer);
    }
}


/***/ }),

/***/ "./src/web-data/index.ts":
/*!*******************************!*\
  !*** ./src/web-data/index.ts ***!
  \*******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   WebData: () => (/* binding */ WebData)
/* harmony export */ });
/* harmony import */ var _utils_binary__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../utils/binary */ "./src/utils/binary/index.ts");

class WebData {
    constructor(buffer, resolvableNodes) {
        var _a;
        this.nodes = [];
        const reader = new _utils_binary__WEBPACK_IMPORTED_MODULE_0__.BinaryReader(buffer);
        this.signature = reader.readNullTerminatedUTF8String();
        this.headLen = reader.readUint32();
        while (reader.offset < this.headLen) {
            const node = {
                offset: reader.readUint32(),
                size: reader.readUint32(),
                name: reader.readUTF8StringWithLength(),
            };
            const resolvableNode = resolvableNodes === null || resolvableNodes === void 0 ? void 0 : resolvableNodes.find((item) => item[0] === node.name);
            if (!resolvableNode)
                continue;
            node.size = (_a = resolvableNode[1]) !== null && _a !== void 0 ? _a : node.size;
            this.nodes.push(node);
        }
        for (const node of this.nodes) {
            node.data = reader.readSlice(node.offset, node.size);
        }
        this.resolveUnityVersion(reader);
    }
    getNode(name) {
        return this.nodes.find((n) => n.name === name);
    }
    resolveUnityVersion(reader) {
        const dataUnity3dNode = this.getNode("data.unity3d");
        if (!dataUnity3dNode || !dataUnity3dNode.data)
            return;
        const dataUnity3dReader = new _utils_binary__WEBPACK_IMPORTED_MODULE_0__.BinaryReader(dataUnity3dNode.data);
        dataUnity3dReader.seek(18);
        this.unityVersion = dataUnity3dReader.readNullTerminatedUTF8String();
    }
}


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/getFullHash */
/******/ 	(() => {
/******/ 		__webpack_require__.h = () => ("1d0b0c83de9e52e64bc0")
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__("./src/mod.ts");
/******/ 	window.UnityWebModkit = __webpack_exports__;
/******/ 	
/******/ })()
;