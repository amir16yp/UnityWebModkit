/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./node_modules/neverthrow/dist/index.es.js":
/*!**************************************************!*\
  !*** ./node_modules/neverthrow/dist/index.es.js ***!
  \**************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   err: () => (/* binding */ err),
/* harmony export */   ok: () => (/* binding */ ok)
/* harmony export */ });
/* unused harmony exports Err, Ok, Result, ResultAsync, errAsync, fromAsyncThrowable, fromPromise, fromSafePromise, fromThrowable, okAsync, safeTry */
const defaultErrorConfig = {
    withStackTrace: false,
};
// Custom error object
// Context / discussion: https://github.com/supermacro/neverthrow/pull/215
const createNeverThrowError = (message, result, config = defaultErrorConfig) => {
    const data = result.isOk()
        ? { type: 'Ok', value: result.value }
        : { type: 'Err', value: result.error };
    const maybeStack = config.withStackTrace ? new Error().stack : undefined;
    return {
        data,
        message,
        stack: maybeStack,
    };
};

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */

function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

function __values(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
}

function __await(v) {
    return this instanceof __await ? (this.v = v, this) : new __await(v);
}

function __asyncGenerator(thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i;
    function verb(n) { if (g[n]) i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; }
    function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
    function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
    function fulfill(value) { resume("next", value); }
    function reject(value) { resume("throw", value); }
    function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
}

function __asyncDelegator(o) {
    var i, p;
    return i = {}, verb("next"), verb("throw", function (e) { throw e; }), verb("return"), i[Symbol.iterator] = function () { return this; }, i;
    function verb(n, f) { i[n] = o[n] ? function (v) { return (p = !p) ? { value: __await(o[n](v)), done: n === "return" } : f ? f(v) : v; } : f; }
}

function __asyncValues(o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
}

class ResultAsync {
    constructor(res) {
        this._promise = res;
    }
    static fromSafePromise(promise) {
        const newPromise = promise.then((value) => new Ok(value));
        return new ResultAsync(newPromise);
    }
    static fromPromise(promise, errorFn) {
        const newPromise = promise
            .then((value) => new Ok(value))
            .catch((e) => new Err(errorFn(e)));
        return new ResultAsync(newPromise);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static fromThrowable(fn, errorFn) {
        return (...args) => {
            return new ResultAsync((() => __awaiter(this, void 0, void 0, function* () {
                try {
                    return new Ok(yield fn(...args));
                }
                catch (error) {
                    return new Err(errorFn ? errorFn(error) : error);
                }
            }))());
        };
    }
    static combine(asyncResultList) {
        return combineResultAsyncList(asyncResultList);
    }
    static combineWithAllErrors(asyncResultList) {
        return combineResultAsyncListWithAllErrors(asyncResultList);
    }
    map(f) {
        return new ResultAsync(this._promise.then((res) => __awaiter(this, void 0, void 0, function* () {
            if (res.isErr()) {
                return new Err(res.error);
            }
            return new Ok(yield f(res.value));
        })));
    }
    mapErr(f) {
        return new ResultAsync(this._promise.then((res) => __awaiter(this, void 0, void 0, function* () {
            if (res.isOk()) {
                return new Ok(res.value);
            }
            return new Err(yield f(res.error));
        })));
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
    andThen(f) {
        return new ResultAsync(this._promise.then((res) => {
            if (res.isErr()) {
                return new Err(res.error);
            }
            const newValue = f(res.value);
            return newValue instanceof ResultAsync ? newValue._promise : newValue;
        }));
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
    orElse(f) {
        return new ResultAsync(this._promise.then((res) => __awaiter(this, void 0, void 0, function* () {
            if (res.isErr()) {
                return f(res.error);
            }
            return new Ok(res.value);
        })));
    }
    match(ok, _err) {
        return this._promise.then((res) => res.match(ok, _err));
    }
    unwrapOr(t) {
        return this._promise.then((res) => res.unwrapOr(t));
    }
    /**
     * Emulates Rust's `?` operator in `safeTry`'s body. See also `safeTry`.
     */
    safeUnwrap() {
        return __asyncGenerator(this, arguments, function* safeUnwrap_1() {
            return yield __await(yield __await(yield* __asyncDelegator(__asyncValues(yield __await(this._promise.then((res) => res.safeUnwrap()))))));
        });
    }
    // Makes ResultAsync implement PromiseLike<Result>
    then(successCallback, failureCallback) {
        return this._promise.then(successCallback, failureCallback);
    }
}
const okAsync = (value) => new ResultAsync(Promise.resolve(new Ok(value)));
const errAsync = (err) => new ResultAsync(Promise.resolve(new Err(err)));
const fromPromise = ResultAsync.fromPromise;
const fromSafePromise = ResultAsync.fromSafePromise;
const fromAsyncThrowable = ResultAsync.fromThrowable;

/**
 * Short circuits on the FIRST Err value that we find
 */
const combineResultList = (resultList) => {
    let acc = ok([]);
    for (const result of resultList) {
        if (result.isErr()) {
            acc = err(result.error);
            break;
        }
        else {
            acc.map((list) => list.push(result.value));
        }
    }
    return acc;
};
/* This is the typesafe version of Promise.all
 *
 * Takes a list of ResultAsync<T, E> and success if all inner results are Ok values
 * or fails if one (or more) of the inner results are Err values
 */
const combineResultAsyncList = (asyncResultList) => ResultAsync.fromSafePromise(Promise.all(asyncResultList)).andThen(combineResultList);
/**
 * Give a list of all the errors we find
 */
const combineResultListWithAllErrors = (resultList) => {
    let acc = ok([]);
    for (const result of resultList) {
        if (result.isErr() && acc.isErr()) {
            acc.error.push(result.error);
        }
        else if (result.isErr() && acc.isOk()) {
            acc = err([result.error]);
        }
        else if (result.isOk() && acc.isOk()) {
            acc.value.push(result.value);
        }
        // do nothing when result.isOk() && acc.isErr()
    }
    return acc;
};
const combineResultAsyncListWithAllErrors = (asyncResultList) => ResultAsync.fromSafePromise(Promise.all(asyncResultList)).andThen(combineResultListWithAllErrors);

// eslint-disable-next-line @typescript-eslint/no-namespace
var Result;
(function (Result) {
    /**
     * Wraps a function with a try catch, creating a new function with the same
     * arguments but returning `Ok` if successful, `Err` if the function throws
     *
     * @param fn function to wrap with ok on success or err on failure
     * @param errorFn when an error is thrown, this will wrap the error result if provided
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function fromThrowable(fn, errorFn) {
        return (...args) => {
            try {
                const result = fn(...args);
                return ok(result);
            }
            catch (e) {
                return err(errorFn ? errorFn(e) : e);
            }
        };
    }
    Result.fromThrowable = fromThrowable;
    function combine(resultList) {
        return combineResultList(resultList);
    }
    Result.combine = combine;
    function combineWithAllErrors(resultList) {
        return combineResultListWithAllErrors(resultList);
    }
    Result.combineWithAllErrors = combineWithAllErrors;
})(Result || (Result = {}));
const ok = (value) => new Ok(value);
const err = (err) => new Err(err);
function safeTry(body) {
    const n = body().next();
    if (n instanceof Promise) {
        return n.then((r) => r.value);
    }
    return n.value;
}
class Ok {
    constructor(value) {
        this.value = value;
    }
    isOk() {
        return true;
    }
    isErr() {
        return !this.isOk();
    }
    map(f) {
        return ok(f(this.value));
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    mapErr(_f) {
        return ok(this.value);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
    andThen(f) {
        return f(this.value);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
    orElse(_f) {
        return ok(this.value);
    }
    asyncAndThen(f) {
        return f(this.value);
    }
    asyncMap(f) {
        return ResultAsync.fromSafePromise(f(this.value));
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    unwrapOr(_v) {
        return this.value;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    match(ok, _err) {
        return ok(this.value);
    }
    safeUnwrap() {
        const value = this.value;
        /* eslint-disable-next-line require-yield */
        return (function* () {
            return value;
        })();
    }
    _unsafeUnwrap(_) {
        return this.value;
    }
    _unsafeUnwrapErr(config) {
        throw createNeverThrowError('Called `_unsafeUnwrapErr` on an Ok', this, config);
    }
}
class Err {
    constructor(error) {
        this.error = error;
    }
    isOk() {
        return false;
    }
    isErr() {
        return !this.isOk();
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    map(_f) {
        return err(this.error);
    }
    mapErr(f) {
        return err(f(this.error));
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
    andThen(_f) {
        return err(this.error);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
    orElse(f) {
        return f(this.error);
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    asyncAndThen(_f) {
        return errAsync(this.error);
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    asyncMap(_f) {
        return errAsync(this.error);
    }
    unwrapOr(v) {
        return v;
    }
    match(_ok, err) {
        return err(this.error);
    }
    safeUnwrap() {
        const error = this.error;
        return (function* () {
            yield err(error);
            throw new Error('Do not use this generator out of `safeTry`');
        })();
    }
    _unsafeUnwrap(config) {
        throw createNeverThrowError('Called `_unsafeUnwrap` on an Err', this, config);
    }
    _unsafeUnwrapErr(_) {
        return this.error;
    }
}
const fromThrowable = Result.fromThrowable;
//#endregion




/***/ }),

/***/ "./src/errors/index.ts":
/*!*****************************!*\
  !*** ./src/errors/index.ts ***!
  \*****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   MetadataParsingError: () => (/* binding */ MetadataParsingError)
/* harmony export */ });
/* unused harmony exports UnresolvedMetadataError, Il2CppContextCreationError */
class CustomError extends Error {
    constructor(message) {
        super(message);
        this.message = message;
        Object.setPrototypeOf(this, new.target.prototype);
    }
    print() {
        return this.name + ": " + this.message;
    }
}
class UnresolvedMetadataError extends CustomError {
    constructor() {
        super(...arguments);
        this.name = "UnresolvedMetadataError";
    }
}
class MetadataParsingError extends CustomError {
    constructor() {
        super(...arguments);
        this.name = "MetadataParsingError";
    }
}
class Il2CppContextCreationError extends CustomError {
    constructor() {
        super(...arguments);
        this.name = "Il2CppContextCreationError";
    }
}


/***/ }),

/***/ "./src/il2cpp/index.ts":
/*!*****************************!*\
  !*** ./src/il2cpp/index.ts ***!
  \*****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   createIl2CppContext: () => (/* binding */ createIl2CppContext),
/* harmony export */   createMetadata: () => (/* binding */ createMetadata)
/* harmony export */ });
/* harmony import */ var neverthrow__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! neverthrow */ "./node_modules/neverthrow/dist/index.es.js");
/* harmony import */ var _utils_binary__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../utils/binary */ "./src/utils/binary/index.ts");
/* harmony import */ var _errors__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../errors */ "./src/errors/index.ts");
/* harmony import */ var _utils__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../utils */ "./src/utils/index.ts");
var __awaiter = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};




const SUPPORTED_METADATA_VERSIONS = new Set([24, 31]);
const MAX_REASONABLE_REGISTRATION_COUNT = 0x35000;
const CODE_REGISTRATION_BACKTRACK_WORD_CANDIDATES = [14, 13, 12, 11];
const CODE_REGISTRATION_SHIFT_CANDIDATES = [0, -4, -8, -12];
function hasCustomAttributeIndexInTypeDefinition(version) {
    return version <= 24;
}
function hasRGCTXInTypeDefinition(version) {
    return version <= 24.1;
}
function hasCustomAttributeIndexInMethodDefinition(version) {
    return version <= 24;
}
function hasLegacyMethodMetadataFields(version) {
    return version <= 24.1;
}
function getMethodKey(methodName, methodIndex) {
    return `${methodName}#${methodIndex}`;
}
function createIl2CppContext(buffer, metadata, referencedAssemblies) {
    var _a, _b;
    console.log("createIl2CppContext");
    const shouldReferenceAll = !referencedAssemblies || referencedAssemblies.length === 0;
    const dataSections = [];
    const reader = new _utils_binary__WEBPACK_IMPORTED_MODULE_1__.BinaryReader(buffer);
    reader.seek(8);
    while (reader.offset < buffer.byteLength) {
        const id = reader.readULEB128();
        const len = reader.readULEB128();
        if (id !== 11) {
            // Skip until we reach data section
            reader.seek(reader.offset + len);
            continue;
        }
        const count = reader.readULEB128();
        for (let i = 0; i < count; i++) {
            const index = reader.readULEB128();
            reader.seek(reader.offset + 1);
            const offset = reader.readULEB128();
            reader.seek(reader.offset + 1);
            const data = reader.readUint8Array(reader.readULEB128());
            dataSections.push({
                index,
                offset,
                data,
            });
        }
        break;
    }
    const last = dataSections[dataSections.length - 1];
    const bssStart = last.offset + last.data.length;
    // Initialized memory buffer
    const memoryBuffer = new ArrayBuffer(buffer.byteLength);
    const memoryReader = new _utils_binary__WEBPACK_IMPORTED_MODULE_1__.BinaryReader(memoryBuffer);
    const memoryWriter = new _utils_binary__WEBPACK_IMPORTED_MODULE_1__.BinaryWriter(memoryBuffer);
    dataSections.forEach((dataSection) => {
        memoryWriter.seek(dataSection.offset);
        memoryWriter.writeBytes(dataSection.data);
    });
    // Plus search
    const sectionHelper = getSectionHelper(buffer.byteLength, memoryBuffer, bssStart, metadata.methodDefs.length, metadata.originalImageDefCount);
    const codeRegistration = sectionHelper.findCodeRegistration();
    const pCodeRegistration = readCodeRegistration(memoryReader, codeRegistration, buffer.byteLength, metadata.originalImageDefCount, metadata.originalMethodDefCount);
    const pCodeGenModules = readCodeGenModules(memoryReader, pCodeRegistration.codeGenModules, pCodeRegistration.codeGenModulesCount);
    const codeGenModules = {};
    const codeGenModuleMethodPointers = {};
    const scriptData = {};
    const discoveredFunctions = [];
    console.log("\n========== CODEGEN MODULES ==========");
    for (let i = 0; i < pCodeGenModules.length; i++) {
        const pCodeGenModule = readCodeGenModule(memoryReader, pCodeGenModules[i]);
        memoryReader.seek(pCodeGenModule.moduleName);
        const moduleName = memoryReader.readNullTerminatedUTF8String();
        const isReferenced = shouldReferenceAll || !!(referencedAssemblies === null || referencedAssemblies === void 0 ? void 0 : referencedAssemblies.includes(moduleName));
        console.log(`[${i}] ${moduleName} - ${isReferenced ? '✓ LOADED' : '✗ skipped'} (methodPointers: ${pCodeGenModule.methodPointerCount})`);
        if (!isReferenced)
            continue;
        codeGenModules[moduleName] = pCodeGenModule;
        const methodPointers = readCodeGenModuleMethodPointers(memoryReader, pCodeGenModule.methodPointers, pCodeGenModule.methodPointerCount);
        codeGenModuleMethodPointers[moduleName] = methodPointers;
        const assemblyName = normalizeAssemblyName(moduleName);
        const assemblyMethodDefs = metadata.methodDefs.filter((methodDef) => {
            const typeName = metadata.typeNamesByIndex[methodDef.declaringType];
            return typeName && metadata.typeToAssembly[typeName] === assemblyName;
        });
        const methodCount = Math.min(methodPointers.length, assemblyMethodDefs.length);
        for (let methodIndex = 0; methodIndex < methodCount; methodIndex++) {
            const methodDef = assemblyMethodDefs[methodIndex];
            const typeName = metadata.typeNamesByIndex[methodDef.declaringType] || `<type:${methodDef.declaringType}>`;
            const methodName = getStringFromIndex(memoryReader, metadata.header.stringOffset, methodDef.nameIndex);
            const pointer = methodPointers[methodIndex];
            if (!scriptData[typeName]) {
                scriptData[typeName] = {};
            }
            scriptData[typeName][getMethodKey(methodName, (_a = methodDef.methodIndex) !== null && _a !== void 0 ? _a : methodIndex)] = pointer;
            discoveredFunctions.push({
                assemblyName,
                moduleName,
                typeName,
                methodName,
                qualifiedName: `${typeName}.${methodName}`,
                pointer,
                parameterCount: methodDef.parameterCount,
                token: methodDef.token,
                methodIndex: (_b = methodDef.methodIndex) !== null && _b !== void 0 ? _b : methodIndex,
            });
        }
    }
    console.log("=====================================\n");
    return (0,neverthrow__WEBPACK_IMPORTED_MODULE_0__.ok)({
        codeGenModules,
        codeGenModuleMethodPointers,
        scriptData,
        discoveredFunctions,
        name: "il2cpp",
    });
}
function createMetadata(buffer, referencedAssemblies) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("createMetadata");
        const reader = new _utils_binary__WEBPACK_IMPORTED_MODULE_1__.BinaryReader(buffer);
        const sanity = reader.readUint32();
        if (sanity !== 0xfab11baf)
            return (0,neverthrow__WEBPACK_IMPORTED_MODULE_0__.err)(new _errors__WEBPACK_IMPORTED_MODULE_2__.MetadataParsingError("Metadata file supplied is not a valid metadata file."));
        const version = reader.readUint32();
        if (version < 0 || version > 1000)
            return (0,neverthrow__WEBPACK_IMPORTED_MODULE_0__.err)(new _errors__WEBPACK_IMPORTED_MODULE_2__.MetadataParsingError("Metadata file supplied is not a valid metadata file."));
        if (!SUPPORTED_METADATA_VERSIONS.has(version))
            return (0,neverthrow__WEBPACK_IMPORTED_MODULE_0__.err)(new _errors__WEBPACK_IMPORTED_MODULE_2__.MetadataParsingError(`Metadata file supplied is not a supported version [${version}].`));
        const effectiveVersion = detectMetadataVersion(reader, version);
        console.log(`Detected effective metadata version: ${effectiveVersion}`);
        return createMetadataFromSupportedVersion(reader, buffer, effectiveVersion, referencedAssemblies);
    });
}
function detectMetadataVersion(reader, version) {
    if (version !== 24) {
        return version;
    }
    reader.seek(0);
    const header = readHeader(reader);
    if (header.stringLiteralOffset === 264) {
        const imageDefs = readImageDefinitions(reader, header.imagesOffset, header.imagesSize);
        if (header.assembliesSize / 68 < imageDefs.length) {
            return 24.4;
        }
        return 24.2;
    }
    const imageDefs = readImageDefinitions(reader, header.imagesOffset, header.imagesSize);
    const hasNonLegacyImageTokens = imageDefs.some((imageDef) => imageDef.token !== 1);
    if (!hasNonLegacyImageTokens) {
        return 24;
    }
    if (header.assembliesSize / 64 === imageDefs.length) {
        return 24.5;
    }
    return 24.1;
}
function getStringFromIndex(reader, base, offset) {
    reader.seek(base + offset);
    return reader.readNullTerminatedUTF8String();
}
function normalizeAssemblyName(imageName) {
    const normalizedPath = imageName.replace(/\\/g, "/");
    const lastSegment = normalizedPath.split("/").pop() || imageName;
    if (lastSegment.endsWith(".dll")) {
        return lastSegment;
    }
    return `${lastSegment}.dll`;
}
function isReferencedTypeIndex(imageDefinitions, typeIndex) {
    for (const imageDef of imageDefinitions) {
        const typeStart = imageDef.typeStart;
        const typeEnd = typeStart + imageDef.typeCount;
        if (typeIndex >= typeStart && typeIndex < typeEnd) {
            return true;
        }
    }
    return false;
}
function createMetadataFromSupportedVersion(reader, buffer, version, referencedAssemblies) {
    return __awaiter(this, void 0, void 0, function* () {
        const shouldReferenceAll = !referencedAssemblies || referencedAssemblies.length === 0;
        reader.seek(0);
        const header = readHeader(reader);
        const imageDefs = readImageDefinitions(reader, header.imagesOffset, header.imagesSize);
        console.log("imageDefs length: ", imageDefs.length);
        console.log(imageDefs);
        console.log("\n========== EXTRACTED ASSEMBLIES ==========");
        console.log(`Total assemblies found: ${imageDefs.length}`);
        const referencedImageDefs = [];
        const referencedAssemblySet = new Set(referencedAssemblies || []);
        const typeIndexToAssembly = {};
        const typeToAssembly = {};
        const typeNamesByIndex = {};
        let i = 0;
        let len = imageDefs.length;
        while (i < len) {
            const imageDef = imageDefs[i];
            const imageName = getStringFromIndex(reader, header.stringOffset, imageDef.nameIndex);
            const assemblyName = normalizeAssemblyName(imageName);
            const isReferenced = shouldReferenceAll || referencedAssemblySet.has(imageName) || referencedAssemblySet.has(assemblyName);
            console.log(`[${i}] ${assemblyName} - ${isReferenced ? '✓ REFERENCED' : '✗ skipped'} (typeStart: ${imageDef.typeStart}, typeCount: ${imageDef.typeCount})`);
            for (let typeIndex = imageDef.typeStart; typeIndex < imageDef.typeStart + imageDef.typeCount; typeIndex++) {
                typeIndexToAssembly[typeIndex] = assemblyName;
            }
            if (isReferenced) {
                referencedImageDefs.push(imageDef);
            }
            i++;
        }
        console.log(`Referenced assemblies: ${referencedImageDefs.length}`);
        console.log("=========================================\n");
        const typeDefs = readTypeDefinitions(reader, header.typeDefinitionsOffset, header.typeDefinitionsSize, referencedImageDefs, version);
        console.log("\n========== EXTRACTED TYPE DEFINITIONS ==========");
        console.log(`Total types extracted: ${typeDefs.length}`);
        typeDefs.forEach((typeDef, idx) => {
            const typeName = getStringFromIndex(reader, header.stringOffset, typeDef.nameIndex);
            const namespaceName = getStringFromIndex(reader, header.stringOffset, typeDef.namespaceIndex);
            const fullName = namespaceName ? `${namespaceName}.${typeName}` : typeName;
            typeToAssembly[fullName] = typeIndexToAssembly[typeDef.typeIndex] || "";
            typeNamesByIndex[typeDef.typeIndex] = fullName;
            console.log(`[${idx}] ${fullName} (methods: ${typeDef.method_count}, fields: ${typeDef.field_count})`);
        });
        console.log("================================================\n");
        const methodDefs = readMethodDefinitions(reader, header.methodsOffset, header.methodsSize, version);
        const referencedMethodDefs = [];
        i = 0;
        len = methodDefs.length;
        while (i < len) {
            const methodDef = methodDefs[i];
            if (typeDefs.findIndex((t) => t.typeIndex === methodDef.declaringType) !== -1) {
                referencedMethodDefs.push(methodDef);
            }
            i++;
        }
        console.log("\n========== EXTRACTED METHOD DEFINITIONS ==========");
        console.log(`Total methods extracted: ${referencedMethodDefs.length}`);
        referencedMethodDefs.slice(0, 50).forEach((methodDef, idx) => {
            const methodName = getStringFromIndex(reader, header.stringOffset, methodDef.nameIndex);
            console.log(`[${idx}] ${methodName} (params: ${methodDef.parameterCount}, token: 0x${methodDef.token.toString(16)})`);
        });
        if (referencedMethodDefs.length > 50) {
            console.log(`... and ${referencedMethodDefs.length - 50} more methods`);
        }
        console.log("==================================================\n");
        const integrityHash = (0,_utils__WEBPACK_IMPORTED_MODULE_3__.bufToHex)(yield window.crypto.subtle.digest("SHA-256", buffer));
        return (0,neverthrow__WEBPACK_IMPORTED_MODULE_0__.ok)({
            buffer,
            header,
            typeToAssembly,
            typeNamesByIndex,
            imageDefs: referencedImageDefs,
            typeDefs,
            methodDefs: referencedMethodDefs,
            originalImageDefCount: imageDefs.length,
            originalMethodDefCount: methodDefs.length,
            version,
            name: "metadata",
            referencedAssemblies,
            integrityHash,
        });
    });
}
function readHeader(reader) {
    return {
        sanity: reader.readUint32(),
        version: reader.readInt32(),
        stringLiteralOffset: reader.readUint32(),
        stringLiteralSize: reader.readInt32(),
        stringLiteralDataOffset: reader.readUint32(),
        stringLiteralDataSize: reader.readInt32(),
        stringOffset: reader.readUint32(),
        stringSize: reader.readInt32(),
        eventsOffset: reader.readUint32(),
        eventsSize: reader.readInt32(),
        propertiesOffset: reader.readUint32(),
        propertiesSize: reader.readInt32(),
        methodsOffset: reader.readUint32(),
        methodsSize: reader.readInt32(),
        parameterDefaultValuesOffset: reader.readUint32(),
        parameterDefaultValuesSize: reader.readInt32(),
        fieldDefaultValuesOffset: reader.readUint32(),
        fieldDefaultValuesSize: reader.readInt32(),
        fieldAndParameterDefaultValueDataOffset: reader.readUint32(),
        fieldAndParameterDefaultValueDataSize: reader.readInt32(),
        fieldMarshaledSizesOffset: reader.readInt32(),
        fieldMarshaledSizesSize: reader.readInt32(),
        parametersOffset: reader.readUint32(),
        parametersSize: reader.readInt32(),
        fieldsOffset: reader.readUint32(),
        fieldsSize: reader.readInt32(),
        genericParametersOffset: reader.readUint32(),
        genericParametersSize: reader.readInt32(),
        genericParameterConstraintsOffset: reader.readUint32(),
        genericParameterConstraintsSize: reader.readInt32(),
        genericContainersOffset: reader.readUint32(),
        genericContainersSize: reader.readInt32(),
        nestedTypesOffset: reader.readUint32(),
        nestedTypesSize: reader.readInt32(),
        interfacesOffset: reader.readUint32(),
        interfacesSize: reader.readInt32(),
        vtableMethodsOffset: reader.readUint32(),
        vtableMethodsSize: reader.readInt32(),
        interfaceOffsetsOffset: reader.readInt32(),
        interfaceOffsetsSize: reader.readInt32(),
        typeDefinitionsOffset: reader.readUint32(),
        typeDefinitionsSize: reader.readInt32(),
        // rgctxEntriesOffset: reader.readUint32(), Max v24.1
        // rgctxEntriesCount: reader.readInt32(), Max v24.1
        imagesOffset: reader.readUint32(),
        imagesSize: reader.readInt32(),
        assembliesOffset: reader.readUint32(),
        assembliesSize: reader.readInt32(),
        // metadataUsageListsOffset: reader.readUint32(), Max v24.5
        // metadataUsageListsCount: reader.readInt32(),
        // metadataUsagePairsOffset: reader.readUint32(),
        // metadataUsagePairsCount: reader.readInt32(), Max v24.5
        fieldRefsOffset: reader.readUint32(),
        fieldRefsSize: reader.readInt32(),
        referencedAssembliesOffset: reader.readInt32(),
        referencedAssembliesSize: reader.readInt32(),
        // attributesInfoOffset: reader.readUint32(), Max v27.2
        // attributesInfoCount: reader.readInt32(),
        // attributeTypesOffset: reader.readUint32(),
        // attributeTypesCount: reader.readInt32(), Max v27.2
        attributeDataOffset: reader.readUint32(),
        attributeDataSize: reader.readInt32(),
        attributeDataRangeOffset: reader.readUint32(),
        attributeDataRangeSize: reader.readInt32(),
        unresolvedVirtualCallParameterTypesOffset: reader.readInt32(),
        unresolvedVirtualCallParameterTypesSize: reader.readInt32(),
        unresolvedVirtualCallParameterRangesOffset: reader.readInt32(),
        unresolvedVirtualCallParameterRangesSize: reader.readInt32(),
        windowsRuntimeTypeNamesOffset: reader.readInt32(),
        windowsRuntimeTypeNamesSize: reader.readInt32(),
        windowsRuntimeStringsOffset: reader.readInt32(),
        windowsRuntimeStringsSize: reader.readInt32(),
        exportedTypeDefinitionsOffset: reader.readInt32(),
        exportedTypeDefinitionsSize: reader.readInt32(),
    };
}
function readImageDefinitions(reader, offset, size) {
    console.log("readImageDefinitions");
    reader.seek(offset);
    const imageDefinitions = [];
    const imagesEnd = offset + size;
    while (reader.offset < imagesEnd) {
        imageDefinitions.push({
            nameIndex: reader.readUint32(),
            assemblyIndex: reader.readInt32(),
            typeStart: reader.readInt32(),
            typeCount: reader.readUint32(),
            exportedTypeStart: reader.readInt32(),
            exportedTypeCount: reader.readUint32(),
            entryPointIndex: reader.readInt32(),
            token: reader.readUint32(),
            customAttributeStart: reader.readInt32(),
            customAttributeCount: reader.readUint32(),
        });
    }
    return imageDefinitions;
}
function readTypeDefinitions(reader, offset, size, imageDefinitions, version) {
    reader.seek(offset);
    const typeDefinitions = [];
    const typesEnd = offset + size;
    let i = 0;
    while (reader.offset < typesEnd) {
        const nameIndex = reader.readUint32();
        const namespaceIndex = reader.readUint32();
        const customAttributeIndex = hasCustomAttributeIndexInTypeDefinition(version)
            ? reader.readInt32()
            : -1;
        const byvalTypeIndex = reader.readInt32();
        const byrefTypeIndex = version <= 24.5 ? reader.readInt32() : -1;
        const declaringTypeIndex = reader.readInt32();
        const parentIndex = reader.readInt32();
        const elementTypeIndex = reader.readInt32();
        const rgctxStartIndex = hasRGCTXInTypeDefinition(version)
            ? reader.readInt32()
            : -1;
        const rgctxCount = hasRGCTXInTypeDefinition(version)
            ? reader.readInt32()
            : 0;
        const genericContainerIndex = reader.readInt32();
        const typeDef = {
            typeIndex: i,
            nameIndex,
            namespaceIndex,
            customAttributeIndex,
            byvalTypeIndex,
            byrefTypeIndex,
            declaringTypeIndex,
            parentIndex,
            elementTypeIndex,
            genericContainerIndex,
            flags: reader.readUint32(),
            fieldStart: reader.readInt32(),
            methodStart: reader.readInt32(),
            eventStart: reader.readInt32(),
            propertyStart: reader.readInt32(),
            nestedTypesStart: reader.readInt32(),
            interfacesStart: reader.readInt32(),
            vtableStart: reader.readInt32(),
            interfaceOffsetsStart: reader.readInt32(),
            rgctxStartIndex,
            rgctxCount,
            method_count: reader.readUint16(),
            property_count: reader.readUint16(),
            field_count: reader.readUint16(),
            event_count: reader.readUint16(),
            nested_type_count: reader.readUint16(),
            vtable_count: reader.readUint16(),
            interfaces_count: reader.readUint16(),
            interface_offsets_count: reader.readUint16(),
            bitfield: reader.readUint32(),
            token: reader.readUint32(),
        };
        i++;
        if (!isReferencedTypeIndex(imageDefinitions, typeDef.typeIndex))
            continue;
        typeDefinitions.push(typeDef);
    }
    return typeDefinitions;
}
function readMethodDefinitions(reader, offset, size, version) {
    reader.seek(offset);
    const methodDefinitions = [];
    const methodsEnd = offset + size;
    let i = 0;
    while (reader.offset < methodsEnd) {
        const nameIndex = reader.readUint32();
        const declaringType = reader.readInt32();
        const returnType = reader.readInt32();
        const parameterStart = reader.readInt32();
        const customAttributeIndex = hasCustomAttributeIndexInMethodDefinition(version)
            ? reader.readInt32()
            : -1;
        const genericContainerIndex = reader.readInt32();
        const actualMethodIndex = hasLegacyMethodMetadataFields(version)
            ? reader.readInt32()
            : -1;
        const invokerIndex = hasLegacyMethodMetadataFields(version)
            ? reader.readInt32()
            : -1;
        const delegateWrapperIndex = hasLegacyMethodMetadataFields(version)
            ? reader.readInt32()
            : -1;
        const rgctxStartIndex = hasLegacyMethodMetadataFields(version)
            ? reader.readInt32()
            : -1;
        const rgctxCount = hasLegacyMethodMetadataFields(version)
            ? reader.readInt32()
            : 0;
        methodDefinitions.push({
            methodIndex: i,
            nameIndex,
            declaringType,
            returnType,
            parameterStart,
            customAttributeIndex,
            genericContainerIndex,
            actualMethodIndex,
            invokerIndex,
            delegateWrapperIndex,
            rgctxStartIndex,
            rgctxCount,
            token: reader.readUint32(),
            flags: reader.readUint16(),
            iflags: reader.readUint16(),
            slot: reader.readUint16(),
            parameterCount: reader.readUint16(),
        });
        i++;
    }
    return methodDefinitions;
}
function readCodeRegistration(reader, offset, bufferLength, imageCount, methodCount) {
    const candidates = CODE_REGISTRATION_SHIFT_CANDIDATES.map((shift) => {
        const candidateOffset = offset + shift;
        return {
            offset: candidateOffset,
            registration: readCodeRegistrationCandidate(reader, candidateOffset),
        };
    });
    const validCandidate = candidates.find((candidate) => isLikelyCodeRegistration(candidate.registration, bufferLength, imageCount, methodCount));
    if (validCandidate) {
        return validCandidate.registration;
    }
    return readCodeRegistrationCandidate(reader, offset);
}
function readCodeRegistrationCandidate(reader, offset) {
    reader.seek(offset);
    return {
        reversePInvokeWrapperCount: reader.readUint32(),
        reversePInvokeWrappers: reader.readUint32(),
        genericMethodPointersCount: reader.readUint32(),
        genericMethodPointers: reader.readUint32(),
        genericAdjustorThunks: reader.readUint32(),
        invokerPointersCount: reader.readUint32(),
        invokerPointers: reader.readUint32(),
        unresolvedVirtualCallCount: reader.readUint32(),
        unresolvedVirtualCallPointers: reader.readUint32(),
        interopDataCount: reader.readUint32(),
        interopData: reader.readUint32(),
        windowsRuntimeFactoryCount: reader.readUint32(),
        windowsRuntimeFactoryTable: reader.readUint32(),
        codeGenModulesCount: reader.readUint32(),
        codeGenModules: reader.readUint32(),
    };
}
function isReasonableCount(value, max) {
    return Number.isInteger(value) && value >= 0 && value <= max;
}
function isReasonablePointer(value, bufferLength) {
    return Number.isInteger(value) && value >= 0 && value < bufferLength;
}
function isLikelyCodeRegistration(registration, bufferLength, imageCount, methodCount) {
    if (!isReasonableCount(registration.codeGenModulesCount, Math.max(imageCount + 32, 512))) {
        return false;
    }
    if (registration.codeGenModulesCount < Math.max(1, imageCount - 4)) {
        return false;
    }
    if (!isReasonablePointer(registration.codeGenModules, bufferLength)) {
        return false;
    }
    if (!isReasonableCount(registration.genericMethodPointersCount, Math.max(methodCount * 2, MAX_REASONABLE_REGISTRATION_COUNT))) {
        return false;
    }
    if (!isReasonableCount(registration.invokerPointersCount, Math.max(methodCount * 2, MAX_REASONABLE_REGISTRATION_COUNT))) {
        return false;
    }
    if (!isReasonableCount(registration.reversePInvokeWrapperCount, MAX_REASONABLE_REGISTRATION_COUNT)) {
        return false;
    }
    if (!isReasonableCount(registration.unresolvedVirtualCallCount, MAX_REASONABLE_REGISTRATION_COUNT)) {
        return false;
    }
    if (!isReasonableCount(registration.interopDataCount, MAX_REASONABLE_REGISTRATION_COUNT)) {
        return false;
    }
    if (!isReasonableCount(registration.windowsRuntimeFactoryCount, MAX_REASONABLE_REGISTRATION_COUNT)) {
        return false;
    }
    return true;
}
function readCodeGenModules(reader, offset, size) {
    reader.seek(offset);
    const modules = [];
    for (let i = 0; i < size; i++) {
        modules.push(reader.readUint32());
    }
    return modules;
}
function readCodeGenModule(reader, offset) {
    reader.seek(offset);
    return {
        moduleName: reader.readUint32(),
        methodPointerCount: reader.readInt32(),
        methodPointers: reader.readUint32(),
        adjustorThunkCount: reader.readInt32(),
        adjustorThunks: reader.readUint32(),
        invokerIndices: reader.readUint32(),
        reversePInvokeWrapperCount: reader.readUint32(),
        reversePInvokeWrapperIndices: reader.readUint32(),
        rgctxRangesCount: reader.readInt32(),
        rgctxRanges: reader.readUint32(),
        rgctxsCount: reader.readInt32(),
        rgctxs: reader.readUint32(),
    };
}
function readCodeGenModuleMethodPointers(reader, offset, size) {
    reader.seek(offset);
    const methodPointers = [];
    for (let i = 0; i < size; i++) {
        methodPointers.push(reader.readUint32());
    }
    return methodPointers;
}
function getSectionHelper(length, memoryBuffer, bssStart, methodCount, imageCount) {
    const exec = {
        offset: 0,
        offsetEnd: methodCount,
        address: 0,
        addressEnd: methodCount,
    };
    const data = {
        offset: 1024,
        offsetEnd: length,
        address: 1024,
        addressEnd: length,
    };
    const bss = {
        offset: bssStart,
        offsetEnd: BigInt(9223372036854775807),
        address: bssStart,
        addressEnd: BigInt(9223372036854775807),
    };
    const sectionHelper = new SectionHelper(memoryBuffer, imageCount);
    sectionHelper.setExecSection(exec);
    sectionHelper.setDataSection(data);
    sectionHelper.setBssSection(bss);
    return sectionHelper;
}
class SectionHelper {
    constructor(memoryBuffer, imageCount) {
        this.exec = [];
        this.data = [];
        this.bss = [];
        this.memoryReader = new _utils_binary__WEBPACK_IMPORTED_MODULE_1__.BinaryReader(memoryBuffer);
        this.imageCount = imageCount;
    }
    setExecSection(exec) {
        this.exec.push(exec);
    }
    setDataSection(data) {
        this.data.push(data);
    }
    setBssSection(bss) {
        this.bss.push(bss);
    }
    findCodeRegistration() {
        let codeRegistration = this.findCodeRegistrationData();
        return codeRegistration;
    }
    findCodeRegistrationData() {
        return this.findCodeRegistration2019(this.data);
    }
    findCodeRegistration2019(secs) {
        for (let i = 0; i < secs.length; i++) {
            const sec = secs[i];
            this.memoryReader.seek(sec.offset);
            const buff = this.memoryReader.readUint8Array(sec.offsetEnd - sec.offset);
            const matches = (0,_utils__WEBPACK_IMPORTED_MODULE_3__.patternSearch)(buff, SectionHelper.featureBytes);
            for (let j = 0; j < matches.length; j++) {
                const dllva = matches[j] + sec.address;
                const refvas = this.findReference(dllva);
                for (let k = 0; k < refvas.length; k++) {
                    const refva = refvas[k];
                    const refva2s = this.findReference(refva);
                    for (let l = 0; l < refva2s.length; l++) {
                        const refva2 = refva2s[l];
                        for (let m = this.imageCount - 1; m >= 0; m--) {
                            const refva3s = this.findReference(refva2 - m * 4);
                            for (let n = 0; n < refva3s.length; n++) {
                                const refva3 = refva3s[n];
                                this.memoryReader.seek(refva3 - 4);
                                if (this.memoryReader.readInt32() === this.imageCount) {
                                    for (const backtrackWords of CODE_REGISTRATION_BACKTRACK_WORD_CANDIDATES) {
                                        const candidate = refva3 - 4 * backtrackWords;
                                        if (candidate >= 0) {
                                            return candidate;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        return 0;
    }
    findReference(addr) {
        const references = [];
        for (let i = 0; i < this.data.length; i++) {
            const dataSec = this.data[i];
            var position = dataSec.offset;
            const end = Math.min(dataSec.offsetEnd, this.memoryReader.buffer.byteLength) - 4;
            while (position < end) {
                this.memoryReader.seek(position);
                if (this.memoryReader.readUint32() === addr) {
                    references.push(position - dataSec.offset + dataSec.address);
                }
                position += 4;
            }
        }
        return references;
    }
}
SectionHelper.featureBytes = new Uint8Array([
    0x6d, 0x73, 0x63, 0x6f, 0x72, 0x6c, 0x69, 0x62, 0x2e, 0x64, 0x6c, 0x6c,
    0x00,
]);


/***/ }),

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
/* harmony import */ var _il2cpp__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../il2cpp */ "./src/il2cpp/index.ts");
/* harmony import */ var _preloader__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../preloader */ "./src/preloader/index.ts");
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
        this.metadata = null;
        this.il2cppContext = null;
        this.il2cppWrappers = {
            byQualifiedName: {},
            byTypeName: {},
            all: [],
        };
        this.logger = new _logger__WEBPACK_IMPORTED_MODULE_0__.Logger("UnityWebModkit");
    }
    getIl2CppContext() {
        return this.il2cppContext;
    }
    getIl2CppWrappers() {
        return this.il2cppWrappers;
    }
    getIl2CppFunction(qualifiedName) {
        return this.il2cppWrappers.byQualifiedName[qualifiedName] || [];
    }
    getIl2CppFunctionsByType(typeName) {
        return this.il2cppWrappers.byTypeName[typeName] || {};
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
            this.preloadPromise = (0,_preloader__WEBPACK_IMPORTED_MODULE_2__.preload)();
            const webData = yield this.preloadPromise;
            yield this.initializeIl2CppMetadata(webData);
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
    initializeIl2CppMetadata(webData) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.metadata) {
                return;
            }
            const metadataNode = webData.getNode("Il2CppData/Metadata/global-metadata.dat");
            if (!(metadataNode === null || metadataNode === void 0 ? void 0 : metadataNode.data)) {
                this.logger.warn("IL2CPP metadata node was not found in Unity web data");
                return;
            }
            this.logger.info("Parsing IL2CPP metadata...");
            const metadataResult = yield (0,_il2cpp__WEBPACK_IMPORTED_MODULE_1__.createMetadata)(metadataNode.data);
            if (metadataResult.isErr()) {
                this.logger.error("Failed to parse IL2CPP metadata: %s", metadataResult.error.print());
                return;
            }
            this.metadata = metadataResult.value;
            this.logger.info("IL2CPP metadata loaded (%d images, %d methods)", this.metadata.imageDefs.length, this.metadata.methodDefs.length);
        });
    }
    initializeIl2CppContext(wasmBuffer) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.il2cppContext) {
                return;
            }
            yield this.ensurePreloaded();
            if (!this.metadata) {
                this.logger.warn("Skipping IL2CPP context creation because metadata is unavailable");
                return;
            }
            this.logger.info("Creating IL2CPP context from WebAssembly module...");
            const contextResult = (0,_il2cpp__WEBPACK_IMPORTED_MODULE_1__.createIl2CppContext)(wasmBuffer, this.metadata);
            if (contextResult.isErr()) {
                this.logger.error("Failed to create IL2CPP context: %s", contextResult.error.print());
                return;
            }
            this.il2cppContext = contextResult.value;
            this.il2cppWrappers = this.createIl2CppWrapperRegistry(this.il2cppContext.discoveredFunctions);
            this.logger.info("IL2CPP context created (%d codegen modules)", Object.keys(this.il2cppContext.codeGenModules).length);
            this.logger.info("IL2CPP wrappers created (%d discovered functions)", this.il2cppWrappers.all.length);
        });
    }
    createIl2CppWrapperRegistry(discoveredFunctions) {
        const registry = {
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
    createIl2CppFunctionWrapper(discoveredFunction) {
        return Object.assign(Object.assign({}, discoveredFunction), { invoke: (...args) => {
                throw new Error(`Invocation is not implemented for IL2CPP function ${discoveredFunction.qualifiedName} at 0x${discoveredFunction.pointer.toString(16)}. Received ${args.length} arguments.`);
            } });
    }
    getArrayBufferFromBufferSource(bufferSource) {
        if (bufferSource instanceof ArrayBuffer) {
            return bufferSource;
        }
        return bufferSource.buffer.slice(bufferSource.byteOffset, bufferSource.byteOffset + bufferSource.byteLength);
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
            yield this.initializeIl2CppContext(this.getArrayBufferFromBufferSource(bufferSource));
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
            const response = yield source;
            yield this.initializeIl2CppContext(yield response.clone().arrayBuffer());
            return this.instantiateStreaming(response, importObject);
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
/* harmony export */   BinaryReader: () => (/* binding */ BinaryReader),
/* harmony export */   BinaryWriter: () => (/* binding */ BinaryWriter)
/* harmony export */ });
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

/***/ "./src/utils/index.ts":
/*!****************************!*\
  !*** ./src/utils/index.ts ***!
  \****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   bufToHex: () => (/* binding */ bufToHex),
/* harmony export */   patternSearch: () => (/* binding */ patternSearch)
/* harmony export */ });
/* unused harmony exports waitFor, makeId, concatenateUint8Arrays, uint8ArrayStartsWith, writeUint8ArrayAtOffset */
function waitFor(conditionFunction) {
    return new Promise((resolve) => {
        const poll = () => {
            if (conditionFunction()) {
                resolve();
            }
            else {
                setTimeout(poll, 400);
            }
        };
        poll();
    });
}
function makeId(length) {
    let text = "";
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
function patternSearch(mainArray, subArray) {
    const indexes = [];
    if (subArray.length === 0)
        return indexes;
    const lps = generateLPSArray(subArray);
    let i = 0;
    let j = 0;
    while (i < mainArray.length) {
        if (mainArray[i] === subArray[j]) {
            i++;
            j++;
        }
        if (j === subArray.length) {
            indexes.push(i - j);
            j = lps[j - 1];
        }
        else if (i < mainArray.length && mainArray[i] !== subArray[j]) {
            if (j !== 0) {
                j = lps[j - 1];
            }
            else {
                i++;
            }
        }
    }
    return indexes;
}
function concatenateUint8Arrays(arrays) {
    // Calculate the total length of the concatenated array
    let totalLength = 0;
    arrays.forEach((array) => {
        totalLength += array.length;
    });
    // Create a new Uint8Array with the total length
    const concatenatedArray = new Uint8Array(totalLength);
    // Use the set() method to copy the contents of each Uint8Array into the concatenated array
    let offset = 0;
    arrays.forEach((array) => {
        concatenatedArray.set(array, offset);
        offset += array.length;
    });
    return concatenatedArray;
}
function uint8ArrayStartsWith(array, expectedNumbers) {
    if (array.length < expectedNumbers.length) {
        return false;
    }
    for (let i = 0; i < expectedNumbers.length; i++) {
        if (array[i] !== expectedNumbers[i]) {
            return false;
        }
    }
    return true;
}
function writeUint8ArrayAtOffset(destination, source, offset) {
    if (offset + source.length > destination.length) {
        throw new Error("Source array does not fit at the specified offset in the destination array.");
    }
    for (let i = 0; i < source.length; i++) {
        destination[offset + i] = source[i];
    }
}
function bufToHex(buffer) {
    return [...new Uint8Array(buffer)]
        .map((x) => x.toString(16).padStart(2, "0"))
        .join("");
}
function generateLPSArray(pattern) {
    const lps = [];
    lps[0] = 0;
    let len = 0;
    let i = 1;
    while (i < pattern.length) {
        if (pattern[i] === pattern[len]) {
            len++;
            lps[i] = len;
            i++;
        }
        else {
            if (len !== 0) {
                len = lps[len - 1];
            }
            else {
                lps[i] = 0;
                i++;
            }
        }
    }
    return lps;
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
/******/ 		__webpack_require__.h = () => ("7231f770bca45e664b10")
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