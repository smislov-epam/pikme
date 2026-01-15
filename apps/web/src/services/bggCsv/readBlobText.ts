export async function readBlobText(file: Blob): Promise<string> {
  const anyFile = file as unknown as {
    text?: () => Promise<string>
    arrayBuffer?: () => Promise<ArrayBuffer>
  }

  if (typeof anyFile.text === 'function') return anyFile.text()

  if (typeof anyFile.arrayBuffer === 'function') {
    const buf = await anyFile.arrayBuffer()
    return new TextDecoder('utf-8').decode(new Uint8Array(buf))
  }

  throw new Error('Unable to read file contents')
}
