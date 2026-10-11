// Mirrors pin_problem() in backend/app/auth.py so a weak PIN is caught before the user types it twice.
// The server still enforces the rule.
const WEAK = new Set(['0000', '1111', '1234', '4321', '1212', '000000', '111111', '123456', '654321', '121212', '123123', '112233']);

export function pinProblem(pin: string): string | null {
  if (!/^\d{4,6}$/.test(pin)) return 'PIN must be 4 to 6 digits';
  if (WEAK.has(pin) || new Set(pin).size === 1) return 'That PIN is too easy to guess';
  const steps = new Set([...pin].slice(1).map((c, i) => Number(c) - Number(pin[i])));
  if (steps.size === 1 && (steps.has(1) || steps.has(-1))) return 'Avoid sequences like 2345';
  return null;
}
