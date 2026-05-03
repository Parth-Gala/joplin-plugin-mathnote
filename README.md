# 🧮 MathNote — Expense Calculator Plugin for Joplin

A Mathematical Calculator + Note taking expense calculator that lives inside your Joplin notes. Write natural expense lines, hit Calculate, and totals appear automatically — no spreadsheet needed.

---

## Table of Contents

- [What It Does](#what-it-does)
- [Installation](#installation)
- [Toolbar Buttons](#toolbar-buttons)
- [How to Write Expense Lines](#how-to-write-expense-lines)
- [Line Types Reference](#line-types-reference)
  - [expr — Expression Line](#expr--expression-line)
  - [total — Section Total](#total--section-total)
  - [grandtotal — Grand Total](#grandtotal--grand-total)
  - [vardef — Variable Definition](#vardef--variable-definition)
  - [heading — Markdown Heading](#heading--markdown-heading)
  - [blank — Empty Line](#blank--empty-line)
  - [text — Plain Text](#text--plain-text)
- [Operators](#operators)
- [Full Example Note](#full-example-note)
- [The Live Panel](#the-live-panel)
- [Tips & Tricks](#tips--tricks)

---

## What It Does

| Before (you type) | After (plugin calculates) |
|---|---|
| `Coffee  3.5 * 20  \|` | `Coffee  3.5 * 20  \| 70` |
| `Rent  12000  \|` | `Rent  12000  \| 12,000` |
| `Total  \|` | `Total  \| 12,070` |

- Every line ending with `|` is treated as a calculation slot.
- The **panel** (sidebar) shows a live 75 / 25 split view — expression on the left, result on the right — updating as you type.
- The **toolbar button** writes calculated results back directly into your note body.

---

## Installation

1. In Joplin, open **Tools → Options → Plugins**.
2. Click **Install from file** and select the `.jpl` file, **or** search for `MathNote` in the plugin marketplace.
3. Restart Joplin when prompted.
4. Two new buttons appear in the **note toolbar** (top of the editor).

---

## Toolbar Buttons

There are two buttons added to the note toolbar:

### 🧮 Toggle Expense Panel

> **Command name:** `mathNote.togglePanel`

Opens or closes the **live 75/25 split panel** in the sidebar. The panel reads your current note and displays every line as a two-column view:

```
┌─────────────────────────────────┬──────────┐
│  Expression                     │  Result  │
├─────────────────────────────────┼──────────┤
│  Coffee  3.5 * 20               │  70      │
│  Groceries  50 + 30 * 2         │  110     │
│  TOTAL                          │  180     │
└─────────────────────────────────┴──────────┘
```

The panel **updates automatically** every time the note content changes — you do not need to click anything to refresh it.

---

### 💰 Calculate Expenses

> **Command name:** `mathNote.calculate`

Evaluates every calculation line in the note and **writes the results back into the note body** next to the `|` character.

- Results are aligned at a fixed pipe column so everything lines up neatly.
- Safe to run multiple times — results are always recalculated fresh, never accumulated.
- Shows a toast notification when done: `✓ Expenses calculated and saved.`

---

## How to Write Expense Lines

The basic pattern for any expense line is:

```
[Optional Label]  [Math Expression]  |
```

The `|` (pipe character) at the end marks a line as a **calculation slot**. Without `|`, the line is treated as plain text and ignored.

```
Groceries  50 + 30 * 2     |        ← will be calculated
This is just a note                  ← ignored, no pipe
```

Spacing is flexible — the plugin finds the first digit and treats everything before it as the label.

---

## Line Types Reference

### `expr` — Expression Line

Any line containing a math expression followed by `|`.

**Pattern:** `[Label]  [expression]  |`

```
Coffee  3.5 * 20           |        → Coffee  3.5 * 20           | 70
Rent    12000              |        → Rent    12000              | 12,000
Taxi    150 + 80 + 60      |        → Taxi    150 + 80 + 60      | 290
Snacks  (20 + 15) * 3      |        → Snacks  (20 + 15) * 3      | 105
```

- The **label** is everything before the first digit (`Coffee`, `Rent`, etc.).
- The **expression** is the numeric math part.
- Existing results after `|` are automatically replaced on recalculation — safe to re-run.

---

### `total` — Section Total

A line containing only the word `total` (or `subtotal`, `sum`) followed by `|`. Sums **all `expr` lines above it** since the last heading or previous total.

**Keywords:** `total`, `Total`, `TOTAL`, `subtotal`, `sum` — case-insensitive.

```
Coffee     3.5 * 20    |        → | 70
Groceries  50 + 30     |        → | 80
Rent       12000       |        → | 12,000
Total                  |        → | 12,150
```

After a `Total` line, the **section sum resets to zero** — the next `Total` will only include lines written after it.

```
# Week 1
Lunch    120 + 90    |          → | 210
Dinner   200         |          → | 200
Total                |          → | 410   ← only Week 1

# Week 2
Lunch    100 + 80    |          → | 180
Dinner   150         |          → | 150
Total                |          → | 330   ← only Week 2
```

---

### `grandtotal` — Grand Total

A line containing `grand total` (or `overall total`) followed by `|`. Sums **all `Total` values** in the note.

**Keywords:** `grand total`, `Grand Total`, `GRAND TOTAL`, `overall total` — case-insensitive.

```
# Food
Groceries  500     |            → | 500
Total              |            → | 500

# Transport
Metro      50 * 22 |            → | 1,100
Uber       300     |            → | 300
Total              |            → | 1,400

Grand Total        |            → | 1,900
```

> **Note:** `Grand Total` adds up `Total` lines only — it does not double-count individual `expr` lines.

---

### `vardef` — Variable Definition

A line of the form `name = value` (no `|` needed). Defines a reusable variable that can be referenced by name in any `expr` line that follows it.

**Pattern:** `variableName = [expression]`

```
tax = 0.18
discount = 0.10
item_price = 2500

Shirt     item_price * (1 - discount)       |    → | 2,250
Tax due   item_price * tax                  |    → | 450
```

- Variable names must start with a letter or `_` and contain only letters, digits, and `_`.
- Variables can reference previously defined variables.
- Variable lines themselves are displayed in the panel but **not** given a pipe result in the note.

```
rate = 50
hours = 8
days = 5

Weekly pay  rate * hours * days    |    → | 2,000
```

---

### `heading` — Markdown Heading

Any standard Markdown heading (`#`, `##`, `###`, etc.). Headings **visually group sections** in the panel and **reset the running section total** — so a `Total` after a heading will only include lines since that heading.

```
# Monthly Budget

# Food & Groceries
Vegetables  200    |
Fruits      150    |
Total              |      ← sums only Food & Groceries section

# Entertainment
Movies  500        |
Games   300        |
Total              |      ← sums only Entertainment section
```

---

### `blank` — Empty Line

A completely empty line. Displayed as a small gap in the panel for readability. Has no effect on calculations.

```
Coffee  120    |

Rent    8000   |      ← blank line above is just spacing, no impact
```

---

### `text` — Plain Text

Any line that has no `|` and is not a variable definition, heading, or blank. These lines are **completely ignored** by the calculator and passed through unchanged. Use them freely for notes, comments, or context.

```
## August Expenses
Note: includes the weekend trip to Pune

Petrol    500 + 200    |    → calculated normally
Hotel     3500         |    → calculated normally

Remember to claim petrol reimbursement from office.   ← plain text, ignored
```

---

## Operators

| Operator | Symbol | Example | Result |
|----------|--------|---------|--------|
| Addition | `+` | `100 + 50` | `150` |
| Subtraction | `-` | `500 - 80` | `420` |
| Multiplication | `*` | `3.5 * 20` | `70` |
| Division | `/` | `1500 / 3` | `500` |
| Modulo | `%` | `100 % 30` | `10` |
| Exponentiation | `^` | `2 ^ 10` | `1,024` |
| Grouping | `( )` | `(50 + 30) * 2` | `160` |

All standard operator precedence rules apply (`*` and `/` before `+` and `-`). Use parentheses to control order.

```
(500 + 200) * 0.18     |    → | 126      ← tax on combined amount
500 + 200 * 0.18       |    → | 536      ← tax on 200 only (precedence)
```

---

## Full Example Note

Here is a complete monthly expense note using every feature:

```markdown
# Monthly Expenses — August 2025

gst = 0.18
discount = 0.05

---

## 🥗 Food

Groceries      50 + 30 * 2 + 10   |
Eating out     120 * 4             |
Coffee         3.5 * 20            |
Total                              |

## 🚗 Transport

Metro pass     550                 |
Petrol         80 * 6              |
Uber rides     150 + 200 + 90      |
Total                              |

## 🛍️ Shopping

Clothes        2500 * (1 - discount)  |
Books          400 + 350              |
Electronics    8000                   |
Total                                 |

---

Grand Total                        |
```

After clicking **💰 Calculate Expenses**:

```markdown
# Monthly Expenses — August 2025

gst = 0.18
discount = 0.05

---

## 🥗 Food

Groceries      50 + 30 * 2 + 10       | 120
Eating out     120 * 4                 | 480
Coffee         3.5 * 20                | 70
Total                                  | 670

## 🚗 Transport

Metro pass     550                     | 550
Petrol         80 * 6                  | 480
Uber rides     150 + 200 + 90          | 440
Total                                  | 1,470

## 🛍️ Shopping

Clothes        2500 * (1 - discount)   | 2,375
Books          400 + 350               | 750
Electronics    8000                    | 8,000
Total                                  | 11,125

---

Grand Total                            | 13,265
```

---

## The Live Panel

The **🧮 Toggle Expense Panel** opens a sidebar panel that shows the same note in a clean 75/25 split layout. It is **read-only** — editing happens in the note itself.

- **Left column (75%)** — shows the label and expression.
- **Right column (25%)** — shows the calculated result, right-aligned.
- **Section Totals** are highlighted in amber.
- **Grand Total** is highlighted in green.
- **Headings** are styled in blue and visually group sections.
- **Variable definitions** appear in a dimmed style — they are context, not expenses.
- The panel refreshes automatically — no manual action needed while typing.

---

## Tips & Tricks

**Re-run freely** — the calculator strips old results before recalculating, so clicking 💰 Calculate multiple times is always safe.

**Labels are optional** — a bare expression works just fine:

```
500 + 200    |    → | 700
```

**Decimals work** — use `.` as the decimal separator:

```
Fuel  1.5 * 92.50    |    → | 138.75
```

**Variables carry down the note** — define once, use anywhere below:

```
price = 999
quantity = 12

Subtotal   price * quantity         |    → | 11,988
Discount   price * quantity * 0.10  |    → | 1,198.80
```

**Use headings to separate months or categories** — each `#` heading resets the section accumulator, so your `Total` lines stay accurate even in long notes.

**The panel works even before you calculate** — open the panel while typing to preview results live without modifying the note body.

---

## License

MIT — free to use, modify, and distribute.