/**
 * calc.ts — Pure math engine. Zero Joplin API imports.
 *
 * Supported note syntax (MathNote style):
 *
 *   Groceries  50 + 30 * 2         |        → evaluated on calculate
 *   Rent       1200                |        → single number is valid
 *   Coffee     3.50 * 20           | 70     → existing result is replaced
 *   Total                          |        → sums all expr lines above since last heading/total
 *   Grand Total                    |        → sums all section totals
 *
 *   # Heading                               → resets current section sum
 *   budget = 5000                           → variable definition (no pipe needed)
 *   Any text without | or math              → ignored (passed through unchanged)
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type LineKind =
	| 'expr'        // has a math expression + result slot
	| 'total'       // "Total" keyword → sum of section
	| 'grandtotal'  // "Grand Total" keyword → sum of all section totals
	| 'vardef'      // variable assignment, e.g.  tax = 0.18
	| 'heading'     // markdown heading  # H1
	| 'blank'       // empty line
	| 'text';       // everything else — no pipe, no math

export interface ParsedLine {
	/** Original unmodified line */
	raw: string;
	kind: LineKind;
	/** Human-readable label (text before expression, or heading text) */
	label: string;
	/** Extracted math expression string */
	expression: string;
	/** Evaluated numeric result, or null if not applicable */
	result: number | null;
}

// ─── Safe evaluator ───────────────────────────────────────────────────────────

/** Chars allowed inside a math expression */
const SAFE_EXPR_RE = /^[\d\s().+\-*/%^]+$/;

/**
 * Safely evaluate a purely numeric expression.
 * Returns null for anything that isn't clean math.
 */
export function safeEval(expr: string, vars: Record<string, number> = {}): number | null {
	// Joplin's markdown renderer escapes * as \* in the stored note body.
	// Unescape it before anything else so "30 \* 5" evaluates identically to "30 * 5".
	let e = expr.trim().replace(/\\\*/g, '*');
	if (!e) return null;

	// Substitute variables (longest name first to avoid partial matches)
	const entries = Object.entries(vars).sort((a, b) => b[0].length - a[0].length);
	for (const [name, value] of entries) {
		e = e.replace(new RegExp(`\\b${name}\\b`, 'g'), String(value));
	}

	if (!SAFE_EXPR_RE.test(e)) return null;

	try {
		const normalised = e.replace(/\^/g, '**');
		// eslint-disable-next-line no-new-func
		const result = new Function(`"use strict"; return (${normalised})`)();
		if (typeof result === 'number' && Number.isFinite(result)) {
			return Math.round(result * 1e10) / 1e10; // eliminate float noise
		}
	} catch {
		// malformed — swallow
	}
	return null;
}

/** Format a number: comma-thousands, up to 2 decimal places, no trailing zeros */
export function fmtNum(n: number): string {
	const rounded = Math.round(n * 100) / 100;
	return rounded.toLocaleString('en-IN', {
		minimumFractionDigits: 0,
		maximumFractionDigits: 2,
	});
}

// ─── Line parser ─────────────────────────────────────────────────────────────

/** Strip an existing pipe result from the end of a raw line, e.g. "expr  | 123" → "expr"
 *  Also normalises \* → * so the stored expression stays clean. */
function stripExistingResult(s: string): string {
	return s.replace(/\s*\|\s*-?[\d,. ]+\s*$/, '').replace(/\\\*/g, '*').trimEnd();
}

/** Remove markdown bold/italic markers and trim */
function stripMarkdown(s: string): string {
	return s.replace(/\*+|_+/g, '').trim();
}

/**
 * Given the text BEFORE the pipe, extract:
 *   - label      : the human prefix (may be empty)
 *   - expression : the numeric/variable math expression
 *
 * We pass `vars` so that variable names are substituted before the safe-eval
 * check — otherwise "food 30 + 40 - tisha + 40" fails SAFE_EXPR_RE because
 * "tisha" is a letter sequence, even though it resolves to a number.
 */
function extractMath(
	before: string,
	vars: Record<string, number> = {},
): { label: string; expression: string } | null {
	const s = before.trim();

	// Must contain at least one digit OR a known variable name
	const hasDigit   = /\d/.test(s);
	const varNames   = Object.keys(vars);
	const hasVarName = varNames.some(name => new RegExp(`\\b${name}\\b`).test(s));
	if (!hasDigit && !hasVarName) return null;

	// Split at whichever comes first: a digit, or a known variable name
	let splitIdx = hasDigit ? s.search(/\d/) : s.length;
	for (const name of varNames) {
		const idx = s.search(new RegExp(`\\b${name}\\b`));
		if (idx !== -1 && idx < splitIdx) splitIdx = idx;
	}

	const label   = s.slice(0, splitIdx).trim();
	const rawExpr = s.slice(splitIdx).trim();

	// Validate by attempting evaluation with vars substituted
	if (safeEval(rawExpr, vars) === null) return null;

	return { label, expression: rawExpr };
}

// ─── Note parser ──────────────────────────────────────────────────────────────

/**
 * Parse every line in a note body into a structured `ParsedLine`.
 * Also resolves Total / Grand Total values by accumulating section sums.
 */
export function parseNote(body: string, vars: Record<string, number> = {}): ParsedLine[] {
	const lines = body.split('\n');
	const parsed: ParsedLine[] = [];

	let sectionSum   = 0;   // running total for current section
	let allTotalsSum = 0;   // accumulates each section's Total for Grand Total

	for (const raw of lines) {
		// Normalise: Joplin sometimes emits &nbsp; for visually blank lines
		const trimmed = raw.trim().replace(/^(&nbsp;|\u00a0)+$/i, '');

		// ── Blank ──────────────────────────────────────────────────────────
		if (!trimmed) {
			parsed.push({ raw, kind: 'blank', label: '', expression: '', result: null });
			continue;
		}

		// ── Markdown heading ───────────────────────────────────────────────
		if (/^#{1,6}\s/.test(trimmed)) {
			sectionSum = 0; // headings reset the section accumulator
			parsed.push({ raw, kind: 'heading', label: trimmed, expression: '', result: null });
			continue;
		}

		// ── Variable definition  (no pipe, form: name = expr) ─────────────
		// Only recognise if there is NO pipe on this line
		if (!raw.includes('|')) {
			const varMatch = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)$/);
			if (varMatch) {
				const varName = varMatch[1];
				const varExpr = varMatch[2].trim();
				const value   = safeEval(varExpr, vars);
				if (value !== null) {
					vars[varName] = value;
					parsed.push({ raw, kind: 'vardef', label: varName, expression: varExpr, result: value });
					continue;
				}
			}
		}

		// ── Lines with a pipe  ────────────────────────────────────────────
		if (raw.includes('|')) {
			const pipeIdx = raw.lastIndexOf('|');
			const before  = raw.slice(0, pipeIdx);
			const cleaned = stripMarkdown(before.trim()).toLowerCase();

			// Grand Total
			if (/^(grand\s*total|overall\s*total|=+\s*total)$/.test(cleaned)) {
				parsed.push({
					raw,
					kind: 'grandtotal',
					label: before.trim().replace(/\*+|_+/g, '').trim(),
					expression: '',
					result: allTotalsSum,
				});
				continue;
			}

			// Section Total / Subtotal
			if (/^(total|subtotal|sub-total|sum)$/.test(cleaned)) {
				allTotalsSum += sectionSum;
				parsed.push({
					raw,
					kind: 'total',
					label: before.trim().replace(/\*+|_+/g, '').trim(),
					expression: '',
					result: sectionSum,
				});
				sectionSum = 0;
				continue;
			}

			// Expression line
			const beforeStripped = stripExistingResult(before);
			const math = extractMath(beforeStripped, vars);
			if (math) {
				const result = safeEval(math.expression, vars);
				if (result !== null) {
					sectionSum += result;
					parsed.push({ raw, kind: 'expr', label: math.label, expression: math.expression, result });
					continue;
				}
			}
		}

		// ── Non-math text ─────────────────────────────────────────────────
		parsed.push({ raw, kind: 'text', label: trimmed, expression: '', result: null });
	}

	return parsed;
}

// ─── Write-back ──────────────────────────────────────────────────────────────

/** Target column for the pipe character when writing results back to the note */
const PIPE_COL = 48;

/**
 * Rebuild note body with calculated results embedded.
 * Non-math lines are returned completely unchanged.
 */
export function writeBack(parsed: ParsedLine[]): string {
	return parsed
		.map((p): string => {
			// Lines with no result — preserve exactly
			if (p.result === null) return p.raw;

			let leftText: string;

			if (p.kind === 'total' || p.kind === 'grandtotal') {
				leftText = p.label;
			} else if (p.kind === 'vardef') {
				return p.raw; // variable defs don't get a pipe written back
			} else {
				// expr: "Label  expression"
				leftText = p.label ? `${p.label}  ${p.expression}` : p.expression;
			}

			// Align pipe at PIPE_COL (or at least 2 spaces gap)
			const gap = Math.max(2, PIPE_COL - leftText.length);
			return `${leftText}${' '.repeat(gap)}| ${fmtNum(p.result)}`;
		})
		.join('\n');
}
