// Same normalization already used for wa.me links in app/admin/inquiries/page.js
// (normalizePhoneForWa): strip everything but digits, drop leading zeros, and
// assume a bare 10-digit number is Indian (prefix 91). Foreign numbers that
// already include their country code pass through unchanged. Shared here so
// the CRM API (server) and CRM UI (client) normalize identically — the DB
// unique constraint on phone_number depends on both sides agreeing.
export function normalizePhone(raw) {
  let digits = String(raw || '').replace(/\D/g, '').replace(/^0+/, '');
  if (digits.length === 10) digits = `91${digits}`;
  return digits;
}

export function isValidNormalizedPhone(digits) {
  return /^[0-9]{8,15}$/.test(digits || '');
}
