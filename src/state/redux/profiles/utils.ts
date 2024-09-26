import { INote, NoteId } from '@core/features/notes';
import { createSelector } from '@reduxjs/toolkit';

import { WorkspaceData } from './profiles';

export const createWorkspaceSelector = createSelector.withTypes<WorkspaceData>();

export const selectWorkspaceRoot = (workspace: WorkspaceData | null) => workspace;

/**
 * Find a note near current, but except current note in edge cases
 */
export const findNearNote = (notes: INote[], noteId: NoteId) => {
	const currentNoteIndex = notes.findIndex((note) => note.id === noteId);
	if (currentNoteIndex === -1) {
		return notes.length === 0 ? null : notes.at(-1) ?? null;
	}

	if (notes.length === 1) return null;

	const prevIndex = currentNoteIndex - 1;
	const nextIndex = currentNoteIndex + 1;
	return notes[prevIndex] ?? notes[nextIndex] ?? null;
};
