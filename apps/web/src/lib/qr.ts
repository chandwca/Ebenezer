import qrcode from 'qrcode-generator';

export type QrCode = { size: number; path: string };

export function qrCode(value: string): QrCode {
  const code = qrcode(0, 'M');
  code.addData(value);
  code.make();
  const size = code.getModuleCount();
  let path = '';
  for (let row = 0; row < size; row++)
    for (let column = 0; column < size; column++)
      if (code.isDark(row, column)) path += `M${column} ${row}h1v1h-1z`;
  return { size, path };
}
