/**
 * gvasParser.js — Parses Unreal Engine GVAS save files into JS objects.
 *
 * GVAS is the binary serialization format used by Unreal Engine for .sav files.
 * This parser handles the header, custom versions, and recursive UProperty
 * deserialization including Struct, Array, Map, and primitive types.
 *
 * Usage:
 *   const { parseGVAS } = require('./gvasParser');
 *   const result = parseGVAS(fs.readFileSync('save.sav'));
 *   // => { header, className, properties }
 */
'use strict';

// ---------------------------------------------------------------------------
// Reader — wraps a Buffer with a movable cursor and primitive-read helpers
// ---------------------------------------------------------------------------

class Reader {
  constructor(buffer) {
    this.buf = buffer;
    this.pos = 0;
  }

  /** Read `n` raw bytes and advance the cursor. */
  readBytes(n) {
    const slice = this.buf.subarray(this.pos, this.pos + n);
    this.pos += n;
    return slice;
  }

  readUInt8() {
    const v = this.buf.readUInt8(this.pos);
    this.pos += 1;
    return v;
  }

  readInt32() {
    const v = this.buf.readInt32LE(this.pos);
    this.pos += 4;
    return v;
  }

  readUInt32() {
    const v = this.buf.readUInt32LE(this.pos);
    this.pos += 4;
    return v;
  }

  readInt64() {
    const v = this.buf.readBigInt64LE(this.pos);
    this.pos += 8;
    return v;
  }

  readUInt64() {
    const v = this.buf.readBigUInt64LE(this.pos);
    this.pos += 8;
    return v;
  }

  readUInt16() {
    const v = this.buf.readUInt16LE(this.pos);
    this.pos += 2;
    return v;
  }

  readFloat() {
    const v = this.buf.readFloatLE(this.pos);
    this.pos += 4;
    return v;
  }

  readDouble() {
    const v = this.buf.readDoubleLE(this.pos);
    this.pos += 8;
    return v;
  }

  /** Read a GUID as a 32-char hex string (16 bytes). */
  readGUID() {
    const bytes = this.readBytes(16);
    return bytes.toString('hex');
  }

  /**
   * Read an Unreal length-prefixed string.
   *
   * Format: int32 length.
   *   length > 0  → UTF-8 encoded, `length` bytes (last byte is 0x00).
   *   length < 0  → UTF-16LE encoded, |length| * 2 bytes (last 2 bytes are 0x00).
   *   length == 0 → empty string.
   */
  readString() {
    const length = this.readInt32();
    if (length === 0) return '';

    if (length > 0) {
      // UTF-8 path — `length` bytes including the null terminator
      const raw = this.readBytes(length);
      // Strip trailing null
      return raw.subarray(0, length - 1).toString('utf8');
    }

    // Negative length → UTF-16LE, |length| code-units (2 bytes each)
    const charCount = -length;
    const byteLen = charCount * 2;
    const raw = this.readBytes(byteLen);
    // Strip trailing null char (2 bytes)
    return raw.subarray(0, byteLen - 2).toString('utf16le');
  }

  /** Skip `n` bytes. */
  skip(n) {
    this.pos += n;
  }

  /** True if we haven't reached the end of the buffer. */
  hasMore() {
    return this.pos < this.buf.length;
  }
}

// ---------------------------------------------------------------------------
// Header parsing
// ---------------------------------------------------------------------------

function readHeader(r) {
  // Magic bytes "GVAS"
  const magic = r.readBytes(4).toString('ascii');
  if (magic !== 'GVAS') {
    throw new Error(`Invalid GVAS magic: expected "GVAS", got "${magic}"`);
  }

  const saveGameVersion = r.readInt32();
  const packageVersion = r.readInt32();

  // UE5 adds a licensee package version after the main package version
  const packageVersionLicensee = r.readInt32();

  // Engine version — stored as major.minor.patch.changelist + branch string
  const engineMajor = r.readUInt16();
  const engineMinor = r.readUInt16();
  const enginePatch = r.readUInt16();
  const engineChangelist = r.readUInt32();
  const engineBranch = r.readString();

  // Custom version format
  const customVersionFormat = r.readInt32();

  // Custom versions array: count, then { guid(16), version(int32) } each
  const customVersionCount = r.readInt32();
  const customVersions = [];
  for (let i = 0; i < customVersionCount; i++) {
    const guid = r.readGUID();
    const version = r.readInt32();
    customVersions.push({ guid, version });
  }

  return {
    magic,
    saveGameVersion,
    packageVersion,
    packageVersionLicensee,
    engineVersion: {
      major: engineMajor,
      minor: engineMinor,
      patch: enginePatch,
      changelist: engineChangelist,
      branch: engineBranch,
    },
    customVersionFormat,
    customVersions,
  };
}

// ---------------------------------------------------------------------------
// UProperty deserialization
// ---------------------------------------------------------------------------

/**
 * Read all UProperties until we hit "None". Returns a plain object keyed by
 * property name. Duplicate names are stored as arrays.
 */
function readProperties(r) {
  const props = {};

  while (r.hasMore()) {
    const name = r.readString();
    if (name === 'None' || name === '') break;

    const typeName = r.readString();

    // DataSize is stored as int64 but in practice fits in int32.
    // Read low 32 bits, skip high 32 bits.
    const dataSize = r.readInt32();
    r.skip(4); // upper 32 bits of the int64

    const value = readPropertyValue(r, typeName, dataSize, name);

    // Handle duplicate property names by collecting into an array
    if (name in props) {
      if (!Array.isArray(props[name])) {
        props[name] = [props[name]];
      }
      props[name].push(value);
    } else {
      props[name] = value;
    }
  }

  return props;
}

/**
 * Read the value portion of a UProperty given its type name and declared size.
 * The cursor should be right after the dataSize field.
 */
function readPropertyValue(r, typeName, dataSize, propName) {
  switch (typeName) {
    case 'IntProperty':
      return readIntProperty(r);
    case 'UInt16Property':
      return readUInt16Property(r);
    case 'UInt32Property':
      return readUInt32Property(r);
    case 'Int64Property':
      return readInt64Property(r);
    case 'UInt64Property':
      return readUInt64Property(r);
    case 'FloatProperty':
      return readFloatProperty(r);
    case 'DoubleProperty':
      return readDoubleProperty(r);
    case 'BoolProperty':
      return readBoolProperty(r);
    case 'StrProperty':
    case 'NameProperty':
    case 'TextProperty':
      return readStrProperty(r);
    case 'EnumProperty':
      return readEnumProperty(r);
    case 'ArrayProperty':
      return readArrayProperty(r, dataSize);
    case 'MapProperty':
      return readMapProperty(r, dataSize);
    case 'StructProperty':
      return readStructProperty(r, dataSize);
    case 'SetProperty':
      return readSetProperty(r, dataSize);
    case 'SoftObjectProperty':
      return readSoftObjectProperty(r);
    default:
      // Unknown type — skip over it using the declared data size and return raw
      // We still need to consume the null separator byte that most types have.
      // Since we don't know the exact layout, skip the whole dataSize.
      const raw = r.readBytes(dataSize);
      return { _unknownType: typeName, _raw: raw.toString('hex') };
  }
}

// -- Primitive property readers -----------------------------------------------

function readIntProperty(r) {
  r.skip(1); // null separator
  return r.readInt32();
}

function readUInt16Property(r) {
  r.skip(1); // null separator
  return r.readUInt16();
}

function readUInt32Property(r) {
  r.skip(1); // null separator
  return r.readUInt32();
}

function readInt64Property(r) {
  r.skip(1); // null separator
  const v = r.readInt64();
  // Return as Number if it fits, otherwise BigInt
  if (v >= Number.MIN_SAFE_INTEGER && v <= Number.MAX_SAFE_INTEGER) {
    return Number(v);
  }
  return v;
}

function readUInt64Property(r) {
  r.skip(1); // null separator
  const v = r.readUInt64();
  if (v <= Number.MAX_SAFE_INTEGER) {
    return Number(v);
  }
  return v;
}

function readFloatProperty(r) {
  r.skip(1); // null separator
  return r.readFloat();
}

function readDoubleProperty(r) {
  r.skip(1); // null separator
  return r.readDouble();
}

function readBoolProperty(r) {
  // BoolProperty stores the value in the byte right after dataSize,
  // followed by a null separator byte.
  const value = r.readUInt8();
  r.skip(1); // null separator
  return value !== 0;
}

function readStrProperty(r) {
  r.skip(1); // null separator
  return r.readString();
}

function readEnumProperty(r) {
  // Enum type name string, then null byte, then the enum value string
  const enumType = r.readString();
  r.skip(1); // null separator
  const enumValue = r.readString();
  return { _enumType: enumType, value: enumValue };
}

function readSoftObjectProperty(r) {
  r.skip(1); // null separator
  const assetPath = r.readString();
  const subPath = r.readString();
  return { assetPath, subPath };
}

// -- Container property readers -----------------------------------------------

function readArrayProperty(r, dataSize) {
  // Inner type string, then null separator, then element count
  const innerType = r.readString();
  r.skip(1); // null separator
  const count = r.readInt32();

  const items = [];

  if (innerType === 'StructProperty') {
    // Struct arrays have extra header: propName, typeName("StructProperty"),
    // element byte size, struct type name, guid, null byte
    const _structPropName = r.readString();
    const _structTypeName = r.readString();
    const _elementByteSize = r.readInt32();
    r.skip(4); // upper 32 of int64
    const structTypeName = r.readString();
    const _structGuid = r.readGUID();
    r.skip(1); // null separator

    for (let i = 0; i < count; i++) {
      items.push(readProperties(r));
    }
  } else if (innerType === 'ByteProperty') {
    // Byte arrays are stored as raw byte blobs — dataSize includes the
    // 4-byte count + the bytes themselves. Read count bytes directly.
    const blob = r.readBytes(count);
    return { _byteArray: true, length: count, data: blob.toString('base64') };
  } else {
    // Primitive array elements — read them directly without per-element headers
    for (let i = 0; i < count; i++) {
      items.push(readArrayElement(r, innerType));
    }
  }

  return items;
}

/** Read a single element of a primitive array (no property header). */
function readArrayElement(r, innerType) {
  switch (innerType) {
    case 'IntProperty':
      return r.readInt32();
    case 'UInt16Property':
      return r.readUInt16();
    case 'UInt32Property':
      return r.readUInt32();
    case 'Int64Property': {
      const v = r.readInt64();
      return (v >= Number.MIN_SAFE_INTEGER && v <= Number.MAX_SAFE_INTEGER)
        ? Number(v) : v;
    }
    case 'UInt64Property': {
      const v = r.readUInt64();
      return v <= Number.MAX_SAFE_INTEGER ? Number(v) : v;
    }
    case 'FloatProperty':
      return r.readFloat();
    case 'DoubleProperty':
      return r.readDouble();
    case 'BoolProperty':
      return r.readUInt8() !== 0;
    case 'StrProperty':
    case 'NameProperty':
      return r.readString();
    case 'EnumProperty':
      return r.readString();
    case 'SoftObjectProperty':
      return { assetPath: r.readString(), subPath: r.readString() };
    case 'ObjectProperty':
      return r.readString();
    default:
      // Can't safely skip unknown inner types in an array; return what we have
      return { _unknownInnerType: innerType };
  }
}

function readMapProperty(r, dataSize) {
  // Key type string, value type string, null byte, then skip 4 bytes, count
  const keyType = r.readString();
  const valueType = r.readString();
  r.skip(1); // null separator
  const _unknown = r.readInt32(); // often 0
  const count = r.readInt32();

  const entries = [];
  for (let i = 0; i < count; i++) {
    const key = readMapElement(r, keyType);
    const value = readMapElement(r, valueType);
    entries.push({ key, value });
  }

  // Also build a plain object for convenient access when keys are strings
  const obj = {};
  for (const { key, value } of entries) {
    if (typeof key === 'string') {
      obj[key] = value;
    }
  }

  return {
    _mapKeyType: keyType,
    _mapValueType: valueType,
    entries,
    ...(Object.keys(obj).length > 0 ? { map: obj } : {}),
  };
}

/** Read a single map key or value. Structs in maps are bare property blocks. */
function readMapElement(r, typeName) {
  switch (typeName) {
    case 'IntProperty':
      return r.readInt32();
    case 'UInt16Property':
      return r.readUInt16();
    case 'UInt32Property':
      return r.readUInt32();
    case 'Int64Property': {
      const v = r.readInt64();
      return (v >= Number.MIN_SAFE_INTEGER && v <= Number.MAX_SAFE_INTEGER)
        ? Number(v) : v;
    }
    case 'UInt64Property': {
      const v = r.readUInt64();
      return v <= Number.MAX_SAFE_INTEGER ? Number(v) : v;
    }
    case 'FloatProperty':
      return r.readFloat();
    case 'DoubleProperty':
      return r.readDouble();
    case 'BoolProperty':
      return r.readUInt8() !== 0;
    case 'StrProperty':
    case 'NameProperty':
      return r.readString();
    case 'EnumProperty':
      return r.readString();
    case 'StructProperty':
      // Map struct values are inline property blocks (no extra struct header)
      return readProperties(r);
    case 'ObjectProperty':
      return r.readString();
    default:
      return { _unknownMapType: typeName };
  }
}

function readStructProperty(r, dataSize) {
  // Struct type name, GUID, null separator, then nested properties
  const structType = r.readString();
  const guid = r.readGUID();
  r.skip(1); // null separator

  // Most structs are just nested property blocks terminated by "None"
  const props = readProperties(r);
  props._structType = structType;
  return props;
}

function readSetProperty(r, dataSize) {
  // Same layout as ArrayProperty but semantically a set
  const innerType = r.readString();
  r.skip(1); // null separator
  const _unknown = r.readInt32(); // often 0
  const count = r.readInt32();

  const items = [];
  for (let i = 0; i < count; i++) {
    items.push(readArrayElement(r, innerType));
  }
  return items;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Parse a GVAS save file buffer into a JS object.
 *
 * @param {Buffer} buffer - The raw .sav file contents.
 * @returns {{ header: object, className: string, properties: object }}
 *   - header: GVAS header with engine version and custom versions
 *   - className: The SaveGameClassName from the header
 *   - properties: Nested object of deserialized UProperties
 */
function parseGVAS(buffer) {
  const r = new Reader(buffer);

  let header;
  try {
    header = readHeader(r);
  } catch (err) {
    throw new Error(`Failed to parse GVAS header: ${err.message}`);
  }

  let className;
  try {
    className = r.readString();
  } catch (err) {
    return { header, className: null, properties: {}, _error: `Failed to read className: ${err.message}` };
  }

  let properties = {};
  try {
    properties = readProperties(r);
  } catch (err) {
    // Return partial results — we got the header and maybe some properties
    properties._error = `Parse error at offset ${r.pos}: ${err.message}`;
  }

  return { header, className, properties };
}

module.exports = { parseGVAS };
