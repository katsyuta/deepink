import React, { useEffect, useRef } from 'react';
import { NoteId } from '@core/features/notes';
import { useWorkspaceSelector } from '@state/redux/profiles/hooks';
import { selectNotesView } from '@state/redux/profiles/selectors/view';
import { Virtualizer } from '@tanstack/react-virtual';
import { isElementInViewport } from '@utils/dom/isElementInViewport';

import { scrollAlignment } from './NotesList';

export const useScrollToActiveNote = ({
	virtualizer,
	noteIds,
	activeNoteId,
	activeNoteRef,
}: {
	virtualizer: Virtualizer<any, any>;
	noteIds: NoteId[];
	activeNoteId: NoteId | null;
	activeNoteRef: React.RefObject<HTMLDivElement | null>;
}) => {
	// Reset the scroll bar after a view change
	const notesView = useWorkspaceSelector(selectNotesView);
	useEffect(() => {
		virtualizer.scrollToOffset(0);

		// We need to reset scroll only when notes view changes
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [notesView]);

	const isScrollFixNeededRef = useRef(false);
	useEffect(() => {
		if (!activeNoteId) return;

		const noteIndex = noteIds.indexOf(activeNoteId);
		if (noteIndex === -1) return;

		// Skip if active note is in viewport
		if (activeNoteRef.current && isElementInViewport(activeNoteRef.current)) return;

		isScrollFixNeededRef.current = true;
		virtualizer.scrollToIndex(noteIndex, {
			align: scrollAlignment,
		});

		// We need to focus note only when active note or noteIds have been changed
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [activeNoteId, noteIds]);

	// Edge case fix. When we scroll to the last note, its content is a bit over scroll.
	// The cause is difficult to debug, but the point is a notes after loading takes a space.
	// Here we wait a note will be loaded after scroll, and assume that all other notes,
	// will be loaded too, so last note will be shifted. Then we scroll to note again.
	// We no need deps array here, since we have early return guards
	useEffect(() => {
		if (!isScrollFixNeededRef.current) return;
		if (!activeNoteId || !activeNoteRef.current) return;

		const isLoading = activeNoteRef.current.dataset.loading !== undefined;
		if (isLoading) return;

		isScrollFixNeededRef.current = false;

		const index = noteIds.indexOf(activeNoteId);
		if (index === -1) return;

		virtualizer.scrollToIndex(index, {
			align: scrollAlignment,
		});
	});
};
