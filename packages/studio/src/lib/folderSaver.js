export async function pickFolder() {
  return window.showDirectoryPicker({ mode: 'readwrite' });
}

export async function savePrintToFolder(root, folderName, sizedFiles, onProgress) {
  const printDir = await root.getDirectoryHandle(folderName, { create: true });

  for (const { ratio, files } of sizedFiles) {
    const ratioDir = await printDir.getDirectoryHandle(ratio, { create: true });
    for (const { label, blob } of files) {
      onProgress?.(`Writing ${ratio} / ${label}…`);
      const fh = await ratioDir.getFileHandle(`${label}.png`, { create: true });
      const writable = await fh.createWritable();
      await writable.write(blob);
      await writable.close();
    }
  }
}
