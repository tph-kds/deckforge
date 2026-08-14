export interface IntrinsicImageSize {
  width: number;
  height: number;
}

function toBytes(dataUri: string): Uint8Array {
  const comma = dataUri.indexOf(",");
  if (comma < 0) {
    return new Uint8Array(0);
  }
  const header = dataUri.slice(0, comma);
  const payload = dataUri.slice(comma + 1);
  if (/;base64$/i.test(header)) {
    const binary = atob(payload);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  const decoded = decodeURIComponent(payload);
  const bytes = new Uint8Array(decoded.length);
  for (let i = 0; i < decoded.length; i += 1) {
    bytes[i] = decoded.charCodeAt(i);
  }
  return bytes;
}

function readPng(bytes: Uint8Array): IntrinsicImageSize | null {
  if (bytes.length < 24) {
    return null;
  }
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < signature.length; i += 1) {
    if (bytes[i] !== signature[i]) {
      return null;
    }
  }
  if (bytes[12] !== 0x49 || bytes[13] !== 0x48 || bytes[14] !== 0x44 || bytes[15] !== 0x52) {
    return null;
  }
  const width = (bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19];
  const height = (bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23];
  if (width <= 0 || height <= 0) {
    return null;
  }
  return { width, height };
}

function readGif(bytes: Uint8Array): IntrinsicImageSize | null {
  if (bytes.length < 10) {
    return null;
  }
  if (bytes[0] !== 0x47 || bytes[1] !== 0x49 || bytes[2] !== 0x46) {
    return null;
  }
  const width = bytes[6] | (bytes[7] << 8);
  const height = bytes[8] | (bytes[9] << 8);
  if (width <= 0 || height <= 0) {
    return null;
  }
  return { width, height };
}

function readJpeg(bytes: Uint8Array): IntrinsicImageSize | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return null;
  }
  let offset = 2;
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = bytes[offset + 1];
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }
    if (marker === 0xff || marker === 0x01) {
      offset += 2;
      continue;
    }
    const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
    if (length < 2 || offset + 2 + length > bytes.length) {
      return null;
    }
    const isSof =
      marker === 0xc0 ||
      marker === 0xc1 ||
      marker === 0xc2 ||
      marker === 0xc3 ||
      marker === 0xc5 ||
      marker === 0xc6 ||
      marker === 0xc7 ||
      marker === 0xc9 ||
      marker === 0xca ||
      marker === 0xcb ||
      marker === 0xcd ||
      marker === 0xce ||
      marker === 0xcf;
    if (isSof) {
      if (offset + 9 > bytes.length) {
        return null;
      }
      const height = (bytes[offset + 5] << 8) | bytes[offset + 6];
      const width = (bytes[offset + 7] << 8) | bytes[offset + 8];
      if (width <= 0 || height <= 0) {
        return null;
      }
      return { width, height };
    }
    offset += 2 + length;
  }
  return null;
}

function readWebP(bytes: Uint8Array): IntrinsicImageSize | null {
  if (bytes.length < 30) {
    return null;
  }
  if (bytes[0] !== 0x52 || bytes[1] !== 0x49 || bytes[2] !== 0x46 || bytes[3] !== 0x46) {
    return null;
  }
  if (bytes[8] !== 0x57 || bytes[9] !== 0x45 || bytes[10] !== 0x42 || bytes[11] !== 0x50) {
    return null;
  }
  const chunkHeader = String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15]);
  if (chunkHeader === "VP8X") {
    const width = 1 + (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16));
    const height = 1 + (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16));
    if (width <= 0 || height <= 0) {
      return null;
    }
    return { width, height };
  }
  if (chunkHeader === "VP8 " && bytes[20] !== 0x2f) {
    const width = (bytes[26] | (bytes[27] << 8)) & 0x3fff;
    const height = (bytes[28] | (bytes[29] << 8)) & 0x3fff;
    if (width <= 0 || height <= 0) {
      return null;
    }
    return { width, height };
  }
  if (chunkHeader === "VP8L") {
    const width = 1 + (((bytes[22] & 0x3f) << 8) | bytes[21]);
    const height = 1 + (((bytes[24] & 0x0f) << 10) | (bytes[23] << 2) | ((bytes[22] & 0xc0) >> 6));
    if (width <= 0 || height <= 0) {
      return null;
    }
    return { width, height };
  }
  return null;
}

export function readImageSizeFromDataUri(dataUri: string): IntrinsicImageSize | null {
  if (typeof dataUri !== "string" || !dataUri.startsWith("data:")) {
    return null;
  }
  const bytes = toBytes(dataUri);
  if (bytes.length === 0) {
    return null;
  }
  return (
    readPng(bytes) ?? readJpeg(bytes) ?? readGif(bytes) ?? readWebP(bytes)
  );
}
