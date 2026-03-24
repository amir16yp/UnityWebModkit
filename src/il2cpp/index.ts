import { ok, err, Result } from "neverthrow";
import { BinaryReader, BinaryWriter } from "../utils/binary";
import { Il2CppContextCreationError, MetadataParsingError } from "../errors";
import { patternSearch, bufToHex } from "../utils";

const SUPPORTED_METADATA_VERSIONS = new Set([24, 31]);

export type Il2CppMetadata = {
  buffer: ArrayBuffer;
  header: Il2CppGlobalMetadataHeader;
  integrityHash: string;
  referencedAssemblies?: string[];
  typeToAssembly: Record<string, string>;
  imageDefs: Il2CppImageDefinition[];
  typeDefs: Il2CppTypeDefinition[];
  methodDefs: Il2CppMethodDefinition[];
  originalImageDefCount: number;
  originalMethodDefCount: number;
  version: number;
  name: string;
};

type Il2CppGlobalMetadataHeader = {
  sanity: number;
  version: number;
  stringLiteralOffset: number;
  stringLiteralSize: number;
  stringLiteralDataOffset: number;
  stringLiteralDataSize: number;
  stringOffset: number;
  stringSize: number;
  eventsOffset: number;
  eventsSize: number;
  propertiesOffset: number;
  propertiesSize: number;
  methodsOffset: number;
  methodsSize: number;
  parameterDefaultValuesOffset: number;
  parameterDefaultValuesSize: number;
  fieldDefaultValuesOffset: number;
  fieldDefaultValuesSize: number;
  fieldAndParameterDefaultValueDataOffset: number;
  fieldAndParameterDefaultValueDataSize: number;
  fieldMarshaledSizesOffset: number;
  fieldMarshaledSizesSize: number;
  parametersOffset: number;
  parametersSize: number;
  fieldsOffset: number;
  fieldsSize: number;
  genericParametersOffset: number;
  genericParametersSize: number;
  genericParameterConstraintsOffset: number;
  genericParameterConstraintsSize: number;
  genericContainersOffset: number;
  genericContainersSize: number;
  nestedTypesOffset: number;
  nestedTypesSize: number;
  interfacesOffset: number;
  interfacesSize: number;
  vtableMethodsOffset: number;
  vtableMethodsSize: number;
  interfaceOffsetsOffset: number;
  interfaceOffsetsSize: number;
  typeDefinitionsOffset: number;
  typeDefinitionsSize: number;
  // rgctxEntriesOffset: number; // Max v24.1
  // rgctxEntriesCount: number; // Max v24.1
  imagesOffset: number;
  imagesSize: number;
  assembliesOffset: number;
  assembliesSize: number;
  // metadataUsageListsOffset: number; // Max v24.5
  // metadataUsageListsCount: number; // Max v24.5
  // metadataUsagePairsOffset: number; // Max v24.5
  // metadataUsagePairsCount: number; // Max v24.5
  fieldRefsOffset: number;
  fieldRefsSize: number;
  referencedAssembliesOffset: number;
  referencedAssembliesSize: number;
  // attributesInfoOffset: number; // Max v27.2
  // attributesInfoCount: number; // Max v27.2
  // attributeTypesOffset: number; // Max v27.2
  // attributeTypesCount: number; // Max v27.2
  attributeDataOffset: number;
  attributeDataSize: number;
  attributeDataRangeOffset: number;
  attributeDataRangeSize: number;
  unresolvedVirtualCallParameterTypesOffset: number;
  unresolvedVirtualCallParameterTypesSize: number;
  unresolvedVirtualCallParameterRangesOffset: number;
  unresolvedVirtualCallParameterRangesSize: number;
  windowsRuntimeTypeNamesOffset: number;
  windowsRuntimeTypeNamesSize: number;
  windowsRuntimeStringsOffset: number;
  windowsRuntimeStringsSize: number;
  exportedTypeDefinitionsOffset: number;
  exportedTypeDefinitionsSize: number;
};

type Il2CppImageDefinition = {
  nameIndex: number;
  assemblyIndex: number;
  typeStart: number;
  typeCount: number;
  exportedTypeStart: number;
  exportedTypeCount: number;
  entryPointIndex: number;
  token: number;
  customAttributeStart: number;
  customAttributeCount: number;
};

type Il2CppTypeDefinition = {
  typeIndex?: number;
  nameIndex: number;
  namespaceIndex: number;
  customAttributeIndex: number;
  byvalTypeIndex: number;
  byrefTypeIndex: number;
  declaringTypeIndex: number;
  parentIndex: number;
  elementTypeIndex: number;
  genericContainerIndex: number;
  flags: number;
  fieldStart: number;
  methodStart: number;
  eventStart: number;
  propertyStart: number;
  nestedTypesStart: number;
  interfacesStart: number;
  vtableStart: number;
  interfaceOffsetsStart: number;
  rgctxStartIndex: number;
  rgctxCount: number;
  method_count: number;
  property_count: number;
  field_count: number;
  event_count: number;
  nested_type_count: number;
  vtable_count: number;
  interfaces_count: number;
  interface_offsets_count: number;
  bitfield: number;
  token: number;
};

type Il2CppMethodDefinition = {
  methodIndex?: number;
  nameIndex: number;
  declaringType: number;
  returnType: number;
  parameterStart: number;
  customAttributeIndex: number;
  genericContainerIndex: number;
  actualMethodIndex: number;
  invokerIndex: number;
  delegateWrapperIndex: number;
  rgctxStartIndex: number;
  rgctxCount: number;
  token: number;
  flags: number;
  iflags: number;
  slot: number;
  parameterCount: number;
};

function hasCustomAttributeIndexInTypeDefinition(version: number) {
  return version <= 24;
}

function hasRGCTXInTypeDefinition(version: number) {
  return version <= 24.1;
}

function hasCustomAttributeIndexInMethodDefinition(version: number) {
  return version <= 24;
}

function hasLegacyMethodMetadataFields(version: number) {
  return version <= 24.1;
}

export type Il2CppContext = {
  codeGenModules: Il2CppCodeGenModuleCollection;
  codeGenModuleMethodPointers: Il2CppCodeGenModuleMethodPointers;
  scriptData: Il2CppScriptData;
  name: string;
};

type Il2CppCodeGenModule = {
  moduleName: number;
  methodPointerCount: number;
  methodPointers: number;
  adjustorThunkCount: number;
  adjustorThunks: number;
  invokerIndices: number;
  reversePInvokeWrapperCount: number;
  reversePInvokeWrapperIndices: number;
  rgctxRangesCount: number;
  rgctxRanges: number;
  rgctxsCount: number;
  rgctxs: number;
  debuggerMetadata: number;
  moduleInitializer: number;
  staticConstructorTypeIndices: number;
  metadataRegistration: number;
  codeRegistration: number;
};

type Il2CppCodeGenModuleCollection = {
  [moduleName: string]: Il2CppCodeGenModule;
};

type Il2CppCodeGenModuleMethodPointers = {
  [moduleName: string]: number[];
};

type Il2CppScriptData = {
  [typeName: string]: {
    [methodName: string]: number;
  };
};

type WebAssemblyDataSection = {
  index: number;
  offset: number;
  data: Uint8Array;
};

export function createIl2CppContext(
  buffer: ArrayBuffer,
  metadata: Il2CppMetadata,
  referencedAssemblies?: string[],
): Result<Il2CppContext, Il2CppContextCreationError> {
  console.log("createIl2CppContext");
  const shouldReferenceAll = !referencedAssemblies || referencedAssemblies.length === 0;
  const dataSections: WebAssemblyDataSection[] = [];
  const reader = new BinaryReader(buffer);
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
  const memoryReader = new BinaryReader(memoryBuffer);
  const memoryWriter = new BinaryWriter(memoryBuffer);
  dataSections.forEach((dataSection) => {
    memoryWriter.seek(dataSection.offset);
    memoryWriter.writeBytes(dataSection.data);
  });
  // Plus search
  const sectionHelper = getSectionHelper(
    buffer.byteLength,
    memoryBuffer,
    bssStart,
    metadata.methodDefs.length,
    metadata.originalImageDefCount,
  );
  const codeRegistration = sectionHelper.findCodeRegistration();
  const pCodeRegistration = readCodeRegistration(
    memoryReader,
    codeRegistration,
  );
  const pCodeGenModules = readCodeGenModules(
    memoryReader,
    pCodeRegistration.codeGenModules,
    pCodeRegistration.codeGenModulesCount,
  );
  const codeGenModules: Il2CppCodeGenModuleCollection = {};
  const codeGenModuleMethodPointers: Il2CppCodeGenModuleMethodPointers = {};
  console.log("\n========== CODEGEN MODULES ==========");
  for (let i = 0; i < pCodeGenModules.length; i++) {
    const pCodeGenModule = readCodeGenModule(memoryReader, pCodeGenModules[i]);
    memoryReader.seek(pCodeGenModule.moduleName);
    const moduleName = memoryReader.readNullTerminatedUTF8String();
    const isReferenced =
      shouldReferenceAll || !!referencedAssemblies?.includes(moduleName);
    console.log(`[${i}] ${moduleName} - ${isReferenced ? '✓ LOADED' : '✗ skipped'} (methodPointers: ${pCodeGenModule.methodPointerCount})`);
    if (!isReferenced) continue;
    codeGenModules[moduleName] = pCodeGenModule;
    const methodPointers = readCodeGenModuleMethodPointers(
      memoryReader,
      pCodeGenModule.methodPointers,
      pCodeGenModule.methodPointerCount,
    );
    codeGenModuleMethodPointers[moduleName] = methodPointers;
  }
  console.log("=====================================\n");
  return ok({
    codeGenModules,
    codeGenModuleMethodPointers,
    scriptData: {},
    name: "il2cpp",
  });
}

export async function createMetadata(
  buffer: ArrayBuffer,
  referencedAssemblies?: string[],
): Promise<Result<Il2CppMetadata, MetadataParsingError>> {
  console.log("createMetadata");
  const reader = new BinaryReader(buffer);
  const sanity = reader.readUint32();
  if (sanity !== 0xfab11baf)
    return err(
      new MetadataParsingError(
        "Metadata file supplied is not a valid metadata file.",
      ),
    );
  const version = reader.readUint32();
  if (version < 0 || version > 1000)
    return err(
      new MetadataParsingError(
        "Metadata file supplied is not a valid metadata file.",
      ),
    );
  if (!SUPPORTED_METADATA_VERSIONS.has(version))
    return err(
      new MetadataParsingError(
        `Metadata file supplied is not a supported version [${version}].`,
      ),
    );
  const effectiveVersion = detectMetadataVersion(reader, version);
  console.log(`Detected effective metadata version: ${effectiveVersion}`);
  return createMetadataFromSupportedVersion(
    reader,
    buffer,
    effectiveVersion,
    referencedAssemblies,
  );
}

function detectMetadataVersion(reader: BinaryReader, version: number) {
  if (version !== 24) {
    return version;
  }

  reader.seek(0);
  const header = readHeader(reader);

  if (header.stringLiteralOffset === 264) {
    const imageDefs = readImageDefinitions(
      reader,
      header.imagesOffset,
      header.imagesSize,
    );
    if (header.assembliesSize / 68 < imageDefs.length) {
      return 24.4;
    }
    return 24.2;
  }

  const imageDefs = readImageDefinitions(
    reader,
    header.imagesOffset,
    header.imagesSize,
  );
  const hasNonLegacyImageTokens = imageDefs.some((imageDef) => imageDef.token !== 1);

  if (!hasNonLegacyImageTokens) {
    return 24;
  }

  if (header.assembliesSize / 64 === imageDefs.length) {
    return 24.5;
  }

  return 24.1;
}

function getStringFromIndex(
  reader: BinaryReader,
  base: number,
  offset: number,
) {
  reader.seek(base + offset);
  return reader.readNullTerminatedUTF8String();
}

function normalizeAssemblyName(imageName: string) {
  const normalizedPath = imageName.replace(/\\/g, "/");
  const lastSegment = normalizedPath.split("/").pop() || imageName;
  if (lastSegment.endsWith(".dll")) {
    return lastSegment;
  }
  return `${lastSegment}.dll`;
}

function isReferencedTypeIndex(
  imageDefinitions: Il2CppImageDefinition[],
  typeIndex: number,
) {
  for (const imageDef of imageDefinitions) {
    const typeStart = imageDef.typeStart;
    const typeEnd = typeStart + imageDef.typeCount;
    if (typeIndex >= typeStart && typeIndex < typeEnd) {
      return true;
    }
  }

  return false;
}

async function createMetadataFromSupportedVersion(
  reader: BinaryReader,
  buffer: ArrayBuffer,
  version: number,
  referencedAssemblies?: string[],
): Promise<Result<Il2CppMetadata, MetadataParsingError>> {
  const shouldReferenceAll = !referencedAssemblies || referencedAssemblies.length === 0;
  reader.seek(0);
  const header = readHeader(reader);
  const imageDefs = readImageDefinitions(
    reader,
    header.imagesOffset,
    header.imagesSize,
  );
  console.log("imageDefs length: ", imageDefs.length);
  console.log(imageDefs);
  console.log("\n========== EXTRACTED ASSEMBLIES ==========");
  console.log(`Total assemblies found: ${imageDefs.length}`);
  const referencedImageDefs = [];
  const referencedAssemblySet = new Set(referencedAssemblies || []);
  const typeIndexToAssembly: Record<number, string> = {};
  const typeToAssembly: Record<string, string> = {};
  let i = 0;
  let len = imageDefs.length;
  while (i < len) {
    const imageDef = imageDefs[i];
    const imageName = getStringFromIndex(
      reader,
      header.stringOffset,
      imageDef.nameIndex,
    );
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
  const typeDefs = readTypeDefinitions(
    reader,
    header.typeDefinitionsOffset,
    header.typeDefinitionsSize,
    referencedImageDefs,
    version,
  );
  console.log("\n========== EXTRACTED TYPE DEFINITIONS ==========");
  console.log(`Total types extracted: ${typeDefs.length}`);
  typeDefs.forEach((typeDef, idx) => {
    const typeName = getStringFromIndex(
      reader,
      header.stringOffset,
      typeDef.nameIndex,
    );
    const namespaceName = getStringFromIndex(
      reader,
      header.stringOffset,
      typeDef.namespaceIndex,
    );
    const fullName = namespaceName ? `${namespaceName}.${typeName}` : typeName;
    typeToAssembly[fullName] = typeIndexToAssembly[typeDef.typeIndex!] || "";
    console.log(`[${idx}] ${fullName} (methods: ${typeDef.method_count}, fields: ${typeDef.field_count})`);
  });
  console.log("================================================\n");
  const methodDefs = readMethodDefinitions(
    reader,
    header.methodsOffset,
    header.methodsSize,
    version,
  );
  const referencedMethodDefs = [];
  i = 0;
  len = methodDefs.length;
  while (i < len) {
    const methodDef = methodDefs[i];
    if (
      typeDefs.findIndex((t) => t.typeIndex === methodDef.declaringType) !== -1
    ) {
      referencedMethodDefs.push(methodDef);
    }
    i++;
  }
  console.log("\n========== EXTRACTED METHOD DEFINITIONS ==========");
  console.log(`Total methods extracted: ${referencedMethodDefs.length}`);
  referencedMethodDefs.slice(0, 50).forEach((methodDef, idx) => {
    const methodName = getStringFromIndex(
      reader,
      header.stringOffset,
      methodDef.nameIndex,
    );
    console.log(`[${idx}] ${methodName} (params: ${methodDef.parameterCount}, token: 0x${methodDef.token.toString(16)})`);
  });
  if (referencedMethodDefs.length > 50) {
    console.log(`... and ${referencedMethodDefs.length - 50} more methods`);
  }
  console.log("==================================================\n");
  const integrityHash = bufToHex(
    await window.crypto.subtle.digest("SHA-256", buffer),
  );
  return ok({
    buffer,
    header,
    typeToAssembly,
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
}

function readHeader(reader: BinaryReader): Il2CppGlobalMetadataHeader {
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

function readImageDefinitions(
  reader: BinaryReader,
  offset: number,
  size: number,
): Il2CppImageDefinition[] {
  console.log("readImageDefinitions")
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

function readTypeDefinitions(
  reader: BinaryReader,
  offset: number,
  size: number,
  imageDefinitions: Il2CppImageDefinition[],
  version: number,
): Il2CppTypeDefinition[] {
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

function readMethodDefinitions(
  reader: BinaryReader,
  offset: number,
  size: number,
  version: number,
): Il2CppMethodDefinition[] {
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

function readCodeRegistration(reader: BinaryReader, offset: number) {
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

function readCodeGenModules(
  reader: BinaryReader,
  offset: number,
  size: number,
) {
  reader.seek(offset);
  const modules = [];
  for (let i = 0; i < size; i++) {
    modules.push(reader.readUint32());
  }
  return modules;
}

function readCodeGenModule(
  reader: BinaryReader,
  offset: number,
): Il2CppCodeGenModule {
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
    debuggerMetadata: reader.readUint32(),
    moduleInitializer: reader.readUint32(),
    staticConstructorTypeIndices: reader.readUint32(),
    metadataRegistration: reader.readUint32(),
    codeRegistration: reader.readUint32(),
  };
}

function readCodeGenModuleMethodPointers(
  reader: BinaryReader,
  offset: number,
  size: number,
) {
  reader.seek(offset);
  const methodPointers = [];
  for (let i = 0; i < size; i++) {
    methodPointers.push(reader.readUint32());
  }
  return methodPointers;
}

function getSectionHelper(
  length: number,
  memoryBuffer: ArrayBuffer,
  bssStart: number,
  methodCount: number,
  imageCount: number,
) {
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
  private exec: any[] = [];
  private data: any[] = [];
  private bss: any[] = [];
  private memoryReader: BinaryReader;
  private imageCount: number;

  private static featureBytes = new Uint8Array([
    0x6d, 0x73, 0x63, 0x6f, 0x72, 0x6c, 0x69, 0x62, 0x2e, 0x64, 0x6c, 0x6c,
    0x00,
  ]);

  constructor(memoryBuffer: any, imageCount: number) {
    this.memoryReader = new BinaryReader(memoryBuffer);
    this.imageCount = imageCount;
  }

  public setExecSection(exec: any) {
    this.exec.push(exec);
  }

  public setDataSection(data: any) {
    this.data.push(data);
  }

  public setBssSection(bss: any) {
    this.bss.push(bss);
  }

  public findCodeRegistration(): number {
    let codeRegistration = this.findCodeRegistrationData();
    return codeRegistration;
  }

  private findCodeRegistrationData(): number {
    return this.findCodeRegistration2019(this.data);
  }

  private findCodeRegistration2019(secs: any[]): number {
    for (let i = 0; i < secs.length; i++) {
      const sec = secs[i];
      this.memoryReader.seek(sec.offset);
      const buff = this.memoryReader.readUint8Array(sec.offsetEnd - sec.offset);
      const matches = patternSearch(buff, SectionHelper.featureBytes);
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
                  return refva3 - 4 * 14;
                }
              }
            }
          }
        }
      }
    }
    return 0;
  }

  private findReference(addr: number): number[] {
    const references: number[] = [];
    for (let i = 0; i < this.data.length; i++) {
      const dataSec = this.data[i];
      var position = dataSec.offset;
      const end =
        Math.min(dataSec.offsetEnd, this.memoryReader.buffer.byteLength) - 4;
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
