export async function compareImages(page, before, after) {
  const aSize = [before.readUInt32BE(16), before.readUInt32BE(20)];
  const bSize = [after.readUInt32BE(16), after.readUInt32BE(20)];
  const sameDimensions = JSON.stringify(aSize) === JSON.stringify(bSize);
  const totalPixels = aSize[0] * aSize[1];
  if (!sameDimensions) return { sameDimensions, totalPixels, differentPixels: -1, sizes: [aSize, bSize] };
  if (before.equals(after)) return { sameDimensions, totalPixels, differentPixels: 0 };
  const pixels = await page.evaluate(async ({ a, b }) => {
    const decode = async text => {
      const response = await fetch(`data:image/png;base64,${text}`);
      const bitmap = await createImageBitmap(await response.blob());
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width; canvas.height = bitmap.height;
      const context = canvas.getContext('2d');
      context.drawImage(bitmap, 0, 0);
      return context.getImageData(0, 0, bitmap.width, bitmap.height).data;
    };
    const aa = await decode(a), bb = await decode(b);
    let differentPixels = 0, maxChannelDelta = 0;
    for (let i = 0; i < aa.length; i += 4) {
      const delta = Math.max(...[0, 1, 2, 3].map(channel => Math.abs(aa[i + channel] - bb[i + channel])));
      if (delta > 0) differentPixels++;
      maxChannelDelta = Math.max(maxChannelDelta, delta);
    }
    return { differentPixels, maxChannelDelta };
  }, { a: before.toString('base64'), b: after.toString('base64') });
  return { sameDimensions, totalPixels, ...pixels };
}
