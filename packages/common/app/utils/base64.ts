// Encoding UTF-8 ⇢ base64
export function utf8ToBase64(str: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);

  let binaryString = "";
  for (let i = 0; i < data.length; i++) {
    binaryString += String.fromCharCode(data[i]!);
  }

  return btoa(binaryString);
}

// Decoding base64 ⇢ UTF-8
export function base64ToUtf8(base64: string) {
  const binaryString = atob(base64);

  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const decoder = new TextDecoder("utf-8");
  return decoder.decode(bytes);
}
