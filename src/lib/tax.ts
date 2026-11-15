// Shop prices include GST (Indian consumer prices are tax-inclusive).

/** The GST contained in a tax-inclusive price. */
export function includedGst(price: number, ratePercent: number) {
  return ratePercent > 0 ? (price * ratePercent) / (100 + ratePercent) : 0;
}
