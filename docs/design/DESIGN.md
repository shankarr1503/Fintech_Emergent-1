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
- A real type pairing set entirely in small caps: Playfair Display SC for display, Alegreya Sans SC for everything else. Both have true small-cap glyphs, so it looks the same on iOS, Android and web.
- Strictly black and white. There's no colour anywhere, not even for success or failure: states are told apart by icon, word and shade.
- Uneven, intentional rhythm: big serif headline, then dense lists. Section labels are small tracked capitals, like a printed statement.
- Specific copy written for this app, including empty states.

## Tokens

Black and white only: every token is a grey. Light mode is shown; dark mode inverts it (black paper, white ink). All text pairs meet WCAG AA, at 5.9:1 or better.

| Token | Light | Use |
|---|---|---|
| `paper` / `surface` | `#FFFFFF` | App background, cards, sheets |
| `paperDeep` | `#F2F2F2` | Chips, soft fills, icon marks |
| `ink` | `#000000` | Text, primary buttons |
| `ink2` / `ink3` | `#333333` / `#595959` | Secondary / tertiary text |
| `line` / `lineStrong` | `#E0E0E0` / `#BDBDBD` | Hairlines, outlines |
| `night` | `#000000` | Hero cards, Rewards, sign-in |
| `gold` | `#FFFFFF` | The accent on dark surfaces: progress, rings, highlight buttons (with a black outline on white) |
| `green` / `red` | `#000000` | Kept as names for meaning; the icon and word carry the state |

Payment receipts: Paid on black, Waiting on `#2B2B2B`, Failed on `#474747`, each with its own icon (tick, clock, cross) and title.

Type, all in small caps: Display (Playfair Display SC, 30 to 60), Title (Alegreya Sans SC 700, 18), Body (Alegreya Sans SC 400, 16), Small (14), Label (Alegreya Sans SC 700, 12, tracked capitals). Sizes run slightly larger than usual because small-cap lowercase letters are short. Radius 12 inputs, 18 cards, 26 hero. 4-pt spacing grid; screen gutter 20.

## Structure

`Home · Money · [Scan] · Rewards · Me`

- **Home:** what's left this month, the four jobs, people, today's streak, what's due, one insight, services.
- **Money:** everything you own and owe: accounts, activity, spending, debts, goals.
- **Scan:** camera QR scan → amount → swipe to pay → success.
- **Rewards:** the game: level, streak, quests, badges, coin store, leaderboard.
- **Me:** profile, security, linked accounts, help.
