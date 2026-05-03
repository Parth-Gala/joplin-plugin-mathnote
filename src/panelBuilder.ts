/**
 * panelBuilder.ts — Generates the HTML for the 75/25 MathNote panel.
 * No Joplin API imports — pure HTML/CSS string builder.
 */

import { ParsedLine, fmtNum } from "./calc_new";

// ─── HTML helpers ─────────────────────────────────────────────────────────────

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─── Row renderers ────────────────────────────────────────────────────────────

function rowBlank(): string {
  return `<div class="row blank" aria-hidden="true"></div>`;
}

function rowHeading(p: ParsedLine): string {
  // Strip leading # symbols for display
  const text = p.label.replace(/^#{1,6}\s*/, "");
  return `
<div class="row heading">
  <div class="left"><span class="heading-text">${esc(text)}</span></div>
  <div class="right"></div>
</div>`;
}

function rowText(p: ParsedLine): string {
  return `
<div class="row text">
  <div class="left"><span class="text-content">${esc(p.label)}</span></div>
  <div class="right"></div>
</div>`;
}

function rowVarDef(p: ParsedLine): string {
  return `
<div class="row vardef">
  <div class="left">
    <span class="var-name">${esc(p.label)}</span>
    <span class="var-eq"> = </span>
    <span class="var-expr">${esc(p.expression)}</span>
  </div>
  <div class="right"><span class="var-result">${p.result !== null ? fmtNum(p.result) : ""}</span></div>
</div>`;
}

function rowExpr(p: ParsedLine): string {
  const labelHtml = p.label
    ? `<span class="expr-label">${esc(p.label)}</span><span class="expr-sep">  </span>`
    : "";
  return `
<div class="row expr">
  <div class="left">${labelHtml}<span class="expr-math">${esc(p.expression)}</span></div>
  <div class="right"><span class="expr-result">${p.result !== null ? fmtNum(p.result) : ""}</span></div>
</div>`;
}

function rowTotal(p: ParsedLine): string {
  return `
<div class="row total">
  <div class="left"><span class="total-label">${esc(p.label)}</span></div>
  <div class="right"><span class="total-result">${p.result !== null ? fmtNum(p.result) : ""}</span></div>
</div>`;
}

function rowGrandTotal(p: ParsedLine): string {
  return `
<div class="row grandtotal">
  <div class="left"><span class="grand-label">${esc(p.label)}</span></div>
  <div class="right"><span class="grand-result">${p.result !== null ? fmtNum(p.result) : ""}</span></div>
</div>`;
}

// ─── CSS ─────────────────────────────────────────────────────────────────────

const CSS = `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

/*
 * SCROLL FIX:
 * html + body fill the viewport exactly. The panel wrapper is the sole
 * scroll container — the sticky header stays pinned inside it while the
 * rows list scrolls independently. This works on desktop Joplin (webview)
 * and on mobile (Joplin Android/iOS uses the same embedded webview).
 */
html, body {
	height: 100%;
	overflow: hidden;          /* prevent double-scrollbars */
}

body {
	font-family: 'SF Mono', 'Fira Code', 'JetBrains Mono', 'Cascadia Code', 'Consolas', monospace;
	font-size: 13px;
	line-height: 1.5;
	background: transparent;
	color: var(--joplin-color, #cdd6f4);
}

/* ── Scroll wrapper — THE scroll container ── */
#panel-wrap {
	display: flex;
	flex-direction: column;
	height: 100vh;             /* fill the webview exactly */
	overflow: hidden;
}

/* ── Sticky header — stays fixed at top of #panel-wrap ── */
.panel-header {
	flex-shrink: 0;            /* never squish */
	display: flex;
	align-items: center;
	padding: 6px 14px 6px 16px;
	background: var(--joplin-background-color2, rgba(49, 50, 68, 0.97));
	border-bottom: 1px solid var(--joplin-divider-color, rgba(255,255,255,0.1));
	user-select: none;
	/* No position:sticky needed — flexbox handles it */
}
.panel-header .h-left  {
	width: 75%;
	font-size: 10px;
	text-transform: uppercase;
	letter-spacing: 1px;
	color: var(--joplin-color-faded, #585b70);
}
.panel-header .h-right {
	width: 25%;
	font-size: 10px;
	text-transform: uppercase;
	letter-spacing: 1px;
	color: var(--joplin-color-faded, #585b70);
	text-align: right;
}

/* ── Scrollable rows area ── */
#rows-scroll {
	flex: 1 1 0;               /* take all remaining height */
	overflow-y: auto;          /* THIS is what enables scrolling */
	overflow-x: hidden;
	/* Smooth momentum scrolling on iOS/Android */
	-webkit-overflow-scrolling: touch;
	overscroll-behavior: contain;
}

/* ── Scrollbar styling (desktop Chromium webview) ── */
#rows-scroll::-webkit-scrollbar        { width: 5px; }
#rows-scroll::-webkit-scrollbar-track  { background: transparent; }
#rows-scroll::-webkit-scrollbar-thumb  {
	background: rgba(255,255,255,0.15);
	border-radius: 3px;
}
#rows-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.28); }

/* ── Rows ── */
.row {
	display: flex;
	align-items: center;
	min-height: 28px;
	border-bottom: 1px solid transparent;
}
.row:hover { background: rgba(255,255,255,0.035); }

.left {
	width: 75%;
	padding: 4px 6px 4px 16px;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
	min-width: 0;              /* allow flex children to shrink below content size */
}
.right {
	flex-shrink: 0;
	width: 25%;
	padding: 4px 14px 4px 6px;
	text-align: right;
	border-left: 1px solid var(--joplin-divider-color, rgba(255, 255, 255, 0.96));
	font-variant-numeric: tabular-nums;
	word-break: break-all;     /* prevent long numbers overflowing on small screens */
}

/* ── Row types ── */
.row.blank   { min-height: 10px; }
.row.vardef  { border-bottom: 1px dashed rgba(255,255,255,0.06); }
.row.heading {
	margin-top: 12px;
	border-bottom: 1px solid rgba(137, 180, 250, 0.25);
}

.heading-text { font-size: 13px; font-weight: 700; color: #89b4fa; letter-spacing: 0.3px; }
.text-content { color: var(--joplin-color-faded, #585b70); font-style: italic; }
.expr-label   { color: #89dceb; }
.expr-sep     { white-space: pre; }
.expr-math    { color: #cba6f7; }
.expr-result  { color: #cdd6f4; font-weight: 600; }
.var-name     { color: #89b4fa; }
.var-eq       { color: #6c7086; }
.var-expr     { color: #f38ba8; }
.var-result   { color: #6c7086; font-size: 11px; }

.row.total {
	margin-top: 2px;
	border-top: 1px solid rgba(249, 226, 175, 0.3);
	border-bottom: 1px solid rgba(249, 226, 175, 0.15);
	background: rgba(249, 226, 175, 0.04);
}
.row.total:hover    { background: rgba(249, 226, 175, 0.08); }
.total-label        { color: #f9e2af; font-weight: 600; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; }
.total-result       { color: #f9e2af; font-weight: 700; font-size: 14px; }

.row.grandtotal {
	margin-top: 4px;
	border-top: 2px solid rgba(166, 227, 161, 0.4);
	border-bottom: 2px solid rgba(166, 227, 161, 0.2);
	background: rgba(166, 227, 161, 0.06);
}
.row.grandtotal:hover { background: rgba(166, 227, 161, 0.1); }
.grand-label  { color: #a6e3a1; font-weight: 700; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }
.grand-result { color: #a6e3a1; font-weight: 700; font-size: 16px; }

/* ── Empty state ── */
.empty-state {
	padding: 48px 16px;
	text-align: center;
	color: var(--joplin-color-faded, #585b70);
}
.empty-icon  { font-size: 32px; margin-bottom: 12px; }
.empty-title { font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #9CA0B6; }
.empty-hint  {
	font-size: 11px; color: #6c7086; line-height: 1.8;
	font-family: var(--joplin-font-family, sans-serif);
}
code {
	font-family: 'Fira Code', monospace;
	background: rgba(255,255,255,0.7);
	padding: 1px 5px;
	border-radius: 4px;
	font-size: 14px;
	color: #000000;
}

/* ── Mobile: narrow panels / small screens ── */
@media (max-width: 320px) {
	body             { font-size: 11px; }
	.left            { padding-left: 10px; }
	.right           { padding-right: 10px; width: 30%; font-size: 12px; }
	.left            { width: 70%; }
	.panel-header .h-left  { width: 70%; }
	.panel-header .h-right { width: 30%; }
	.total-result    { font-size: 12px; }
	.grand-result    { font-size: 13px; }
}

@media (max-width: 240px) {
	/* Ultra-narrow: stack expression above result */
	.row             { flex-direction: column; align-items: flex-start; min-height: auto; padding: 4px 10px; }
	.left, .right    { width: 100%; padding: 2px 0; }
	.right           { border-left: none; border-top: 1px solid rgba(255,255,255,0.06); text-align: left; }
	.panel-header    { flex-direction: column; align-items: flex-start; gap: 2px; }
	.panel-header .h-left,
	.panel-header .h-right { width: 100%; text-align: left; }
}
`;

// ─── Empty state ──────────────────────────────────────────────────────────────

const EMPTY_HTML = `
<div class="empty-state">
  <div class="empty-icon">🧮 MathNote </div>
  <div class="empty-title">No expense lines found</div>
  <div class="empty-hint">
    Write lines like:<br><br>
    <code>Coffee  3.5 * 20        |</code><br>
    <code>Groceries  50 + 30 * 2  |</code><br>
    <code>Total                   |</code><br><br>
    Then click <strong>$ Calculate</strong> in the toolbar,<br>
    or the panel updates live as you type.
  </div>
</div>`;

// ─── Main builder ─────────────────────────────────────────────────────────────

export function buildPanelHtml(lines: ParsedLine[]): string {
  // Only render rows that are meaningful to show
  const hasContent = lines.some(
    (p) => p.kind === "expr" || p.kind === "total" || p.kind === "grandtotal",
  );

  const bodyHtml = !hasContent
    ? EMPTY_HTML
    : lines
        .map((p): string => {
          switch (p.kind) {
            case "blank":
              return rowBlank();
            case "heading":
              return rowHeading(p);
            case "text":
              return rowText(p);
            case "vardef":
              return rowVarDef(p);
            case "expr":
              return rowExpr(p);
            case "total":
              return rowTotal(p);
            case "grandtotal":
              return rowGrandTotal(p);
            default:
              return rowText(p);
          }
        })
        .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <style>${CSS}</style>
</head>
<body>
  <div id="panel-wrap">
    <div class="panel-header">
      <div class="h-left">Expression</div>
      <div class="h-right">Result</div>
    </div>
    <div id="rows-scroll">
      ${bodyHtml}
    </div>
  </div>
</body>
</html>`;
}
