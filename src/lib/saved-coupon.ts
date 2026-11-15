// A coupon entered on the cart page, carried to checkout (this browser tab only).
const KEY = 'bb-coupon';

export function rememberCoupon(code: string) {
  try {
    if (code) sessionStorage.setItem(KEY, code);
    else sessionStorage.removeItem(KEY);
  } catch {}
}

export function readSavedCoupon(): string {
  try {
    return sessionStorage.getItem(KEY) || '';
  } catch {
    return '';
  }
}
