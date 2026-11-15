'use client';

interface VariantStockGridProps {
  colors: { name: string; hex: string }[];
  sizes: { label: string; value: string }[];
  /** Stock as text per combination, keyed by variantKey(color, size). Empty = not tracked. */
  value: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
}

export const variantKey = (color: string, size: string) => `${color}|${size}`;

/** Every colour/size combination the product offers ("" where it has no colours or sizes). */
export function variantCombos(colors: { name: string }[], sizes: { value: string }[]) {
  const colorList = colors.length ? colors.map((c) => c.name) : [''];
  const sizeList = sizes.length ? sizes.map((s) => s.value) : [''];
  return colorList.flatMap((color) => sizeList.map((size) => ({ color, size }))).filter((c) => c.color || c.size);
}

export function VariantStockGrid({ colors, sizes, value, onChange }: VariantStockGridProps) {
  const set = (color: string, size: string, v: string) => onChange({ ...value, [variantKey(color, size)]: v.replace(/[^0-9]/g, '') });
  const cell = (color: string, size: string) => (
    <input
      type="text"
      inputMode="numeric"
      value={value[variantKey(color, size)] ?? ''}
      onChange={(e) => set(color, size, e.target.value)}
      placeholder="0"
      aria-label={`Stock for ${[color, sizes.find((s) => s.value === size)?.label].filter(Boolean).join(' / ')}`}
      className="w-20 rounded-lg border border-gray-200 px-2 py-1.5 text-center text-sm focus:border-primary-400 focus:outline-none"
    />
  );

  const combos = variantCombos(colors, sizes);
  const total = combos.reduce((sum, c) => sum + (parseInt(value[variantKey(c.color, c.size)] || '0') || 0), 0);
  const tracked = combos.some((c) => (value[variantKey(c.color, c.size)] ?? '') !== '');
  const swatch = (c: { name: string; hex: string }) => (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-3.5 w-3.5 rounded-full border border-gray-200" style={{ background: c.hex }} />
      {c.name}
    </span>
  );

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-xl border border-gray-100">
        {colors.length > 0 && sizes.length > 0 ? (
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Size / Colour</th>
                {colors.map((c) => <th key={c.name} className="px-3 py-2 font-medium">{swatch(c)}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sizes.map((s) => (
                <tr key={s.value}>
                  <td className="px-3 py-2 font-medium text-gray-700">{s.label}</td>
                  {colors.map((c) => <td key={c.name} className="px-3 py-2 text-center">{cell(c.name, s.value)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="divide-y divide-gray-100">
            {(colors.length ? colors.map((c) => ({ key: c.name, label: swatch(c), color: c.name, size: '' })) : sizes.map((s) => ({ key: s.value, label: s.label, color: '', size: s.value }))).map((row) => (
              <div key={row.key} className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="font-medium text-gray-700">{row.label}</span>
                {cell(row.color, row.size)}
              </div>
            ))}
          </div>
        )}
      </div>
      <p className="text-xs text-gray-500">
        {tracked
          ? `Total stock: ${total}. Shoppers can only buy combinations that have stock; sold-out ones are shown crossed out.`
          : 'Leave every box empty to use the single Stock Quantity for the whole product.'}
      </p>
    </div>
  );
}
