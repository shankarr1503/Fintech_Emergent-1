# CoinQuest design notes

## What we took from each app

| App | What it gets right | What we borrow | What we avoid |
|---|---|---|---|
| **Google Pay** | People come first. Paying a friend is two taps; amount entry is huge and calm. | Recent-people row on Home, full-screen amount entry, one-line "Pay from" selector, big green success state. | Its sparse Home hides useful money context. |
| **PhonePe** | Scan is the centre of the tab bar. Everything for UPI is one step away. | Raised centre Scan button, service grid labels in plain words. | The wall of 30+ icons; ours stays to 8. |
| **Paytm** | Top row of the four most common jobs. | Four primary actions: Scan, Pay anyone, Bills, Balance. | Ad banners, carousels, competing colours. |
| **CRED** | Feels expensive: dark surfaces, big confident type, a serif display face, tactile slide-to-pay, rewards that feel earned. | Ink "hero" cards, serif display numbers, swipe-to-pay, a dark Rewards tab. | Hiding basic information behind gestures; low-contrast grey text. |
| **1% Club / Jar** | Money habits as small daily wins. | Streaks, daily quests and levels, kept to one strip on Home and one tab. | Gamifying payments themselves: paying a bill should feel safe, not like a game. |

## Principles

1. **Calm by default, playful on success.** Screens that move money are quiet and precise. Delight (coins, level-ups, quest clears) appears only *after* something good happens.
2. **Numbers are the interface.** Amounts use tabular figures, the ₹ sits smaller than the digits, paise are muted, and negative amounts are words ("Spent"), not just red.
3. **One accent.** Gold means coins and rewards, and nothing else. Green and red only ever mean money in and money out.
4. **Plain words.** "Left this month", "Due in 5 days", "Debt-free by Dec 2027". No "Unlock your financial potential".
5. **Every screen has one job.** The primary action is the only filled button on the screen.

## Avoiding the "AI look"

- No purple-to-blue gradients, glass blur, glowing orbs or sparkle emoji.
- Not every block is the same rounded card with a soft shadow: we use hairline borders, full-bleed dark hero cards and plain list rows.
- A real type pairing (Instrument Serif for display, DM Sans for everything else) instead of a single default sans.
- Warm paper background (`#F4F1EA`) instead of pure white or grey; ink (`#16130F`) instead of pure black.
- Uneven, intentional rhythm: big serif headline, then dense lists. Section labels are small tracked capitals, like a printed statement.
- Specific copy written for this app, including empty states.

## Tokens

| Token | Value | Use |
|---|---|---|
| `paper` | `#F4F1EA` | App background |
| `surface` | `#FFFFFF` | Cards, sheets |
| `ink` | `#16130F` | Text, primary buttons, hero cards |
| `ink2` / `ink3` | `#5E574C` / `#8F8778` | Secondary / tertiary text |
| `line` | `#E4DED2` | Hairlines |
| `gold` | `#E3A812` | Coins and rewards only |
| `green` | `#167150` | Money in, success |
| `red` | `#B5402E` | Money out when it matters, errors |

Type: Display (Instrument Serif 44/36/30), Title (DM Sans 600 20/17), Body (DM Sans 15/13), Label (DM Sans 600 11, +0.8 tracking, caps). Radius 12 inputs, 18 cards, 26 hero. 4-pt spacing grid; screen gutter 20.

## Structure

`Home · Money · [Scan] · Rewards · Me`

- **Home:** what's left this month, the four jobs, people, today's streak, what's due, one insight, services.
- **Money:** everything you own and owe: accounts, activity, spending, debts, goals.
- **Scan:** camera QR scan → amount → swipe to pay → success.
- **Rewards:** the game: level, streak, quests, badges, coin store, leaderboard.
- **Me:** profile, security, linked accounts, help.
