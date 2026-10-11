"""PCI DSS scope reduction: we never store card numbers.

The app doesn't collect card data (card bills are paid by bank account/UPI and
cards are shown by bank name and last four only). As a safety net, anything a
user types into free text (payment notes, support messages) is scanned and
card-number-like digit runs that pass the Luhn check are masked before storage.
"""
import re

_CANDIDATE = re.compile(r"(?:\d[ -]?){13,19}")


def _luhn_ok(digits: str) -> bool:
    total = 0
    for i, ch in enumerate(reversed(digits)):
        d = int(ch)
        if i % 2:
            d = d * 2 - 9 if d > 4 else d * 2
        total += d
    return total % 10 == 0


def mask_card_numbers(text: str) -> str:
    def repl(m: re.Match) -> str:
        digits = re.sub(r"\D", "", m.group(0))
        if 13 <= len(digits) <= 19 and _luhn_ok(digits):
            return f"[card ••••{digits[-4:]}]"
        return m.group(0)

    return _CANDIDATE.sub(repl, text or "")
