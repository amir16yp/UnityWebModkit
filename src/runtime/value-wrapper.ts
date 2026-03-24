import { dataTypeSizes } from "../extras";
import { writeUint8ArrayAtOffset } from "../utils";
import { BinaryReader, BinaryWriter } from "../utils/binary";

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
          classNamePtr + 128,
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
    let offset = ptr / 2;
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
