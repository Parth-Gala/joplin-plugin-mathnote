/**
 * index.ts — Joplin plugin entry point.
 *
 * Features:
 *  - Creates a side panel with a live 75/25 MathNote-style view.
 *  - Panel auto-refreshes when note selection or note content changes.
 *  - Toolbar button writes calculated results back into the note body.
 *  - Toggle panel visibility with the toolbar button.
 */

import joplin from 'api';
import { ToolbarButtonLocation } from 'api/types';
import { parseNote, writeBack } from './calc_new';
import { buildPanelHtml } from './panelBuilder';

joplin.plugins.register({
	onStart: async function () {

		// Create the side panel
		const panel = await joplin.views.panels.create('mathNotePanel');

		// Show the placeholder HTML immediately so the panel is not blank
		await joplin.views.panels.setHtml(panel, buildPanelHtml([]));

		// Refresh helper
		/**
		 * Reads the currently selected note, parses it, and updates the panel.
		 * Does nothing (shows empty state) if no note is open.
		 */
		async function refreshPanel(): Promise<void> {
			try {
				const note = await joplin.workspace.selectedNote();
				if (!note || !note.body) {
					await joplin.views.panels.setHtml(panel, buildPanelHtml([]));
					return;
				}
				const parsed = parseNote(note.body);
				await joplin.views.panels.setHtml(panel, buildPanelHtml(parsed));
			} catch (err) {
				// Fail silently — never crash the plugin
				console.error('MathNote: panel refresh error', err);
			}
		}

		// ── Auto-refresh on note events ────────────────────────────────────
		// Fires when the user selects a different note
		await joplin.workspace.onNoteSelectionChange(async () => {
			await refreshPanel();
		});

		// Fires when the current note's content is modified
		await joplin.workspace.onNoteChange(async () => {
			await refreshPanel();
		});

		// Initial load
		await refreshPanel();

		// ── Write-back command (toolbar button) ────────────────────────────
		await joplin.commands.register({
			name:  'mathNote.calculate',
			label: '💰 Calculate Expenses',
			iconName: 'fas fa-dollar-sign',

			execute: async (): Promise<void> => {
				const note = await joplin.workspace.selectedNote();

				if (!note || !note.body) {
					await joplin.views.dialogs.showToast({
						message: 'MathNote: No note is selected or the note is empty.',
					});
					return;
				}

				const parsed  = parseNote(note.body);
				const updated = writeBack(parsed);

				if (updated === note.body) {
					await joplin.views.dialogs.showToast({
						message: 'MathNote: Nothing to update. Add lines ending with | to calculate.',
					});
					return;
				}

				// Write results back into the note
				await joplin.data.put(['notes', note.id], null, { body: updated });

				await joplin.views.dialogs.showToast({
					message: '✓ Expenses calculated and saved.',
				});
			},
		});

		// ── Toggle panel command ───────────────────────────────────────────
		await joplin.commands.register({
			name:  'mathNote.togglePanel',
			label: '🧮 Toggle Expense Panel',
			iconName: 'fas fa-calculator',

			execute: async (): Promise<void> => {
				const visible = await joplin.views.panels.visible(panel);
				await joplin.views.panels.show(panel, !visible);
				if (!visible) {
					// Re-render in case note changed while panel was hidden
					await refreshPanel();
				}
			},
		});

		// ── Toolbar buttons ────────────────────────────────────────────────
		// Button 1: Toggle panel
		await joplin.views.toolbarButtons.create(
			'mathNoteTogglePanelBtn',
			'mathNote.togglePanel',
			ToolbarButtonLocation.NoteToolbar,
		);

		// Button 2: Write results to note
		await joplin.views.toolbarButtons.create(
			'mathNoteCalculateBtn',
			'mathNote.calculate',
			ToolbarButtonLocation.NoteToolbar,
		);
	},
});