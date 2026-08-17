import { useEffect, useState } from 'react';
import { WorkspaceEvents } from '@api/events/workspace';
import { NoteId } from '@core/features/notes';
import { useEventBus } from '@features/App/Workspace/WorkspaceProvider';

import { useNotesData } from './useNotesData';

/**
 * Temporarily overrides the pin state until notes data is updated
 *
 * After pinning a note, the list is reordered immediately, while notes data
 * is updated with a delay. This can cause the note to briefly render with a stale pin state.
 */
export const useOptimisticPinOverride = (notesData: ReturnType<typeof useNotesData>) => {
	const [pinOverride, setPinOverride] = useState<{
		noteId: NoteId;
		isPinned: boolean;
	} | null>(null);

	const eventBus = useEventBus();
	useEffect(() => {
		return eventBus.listen(WorkspaceEvents.NOTE_UPDATED, ({ noteId, reason }) => {
			if (reason !== 'pin') return;

			setPinOverride({
				noteId,
				isPinned: !(notesData.get(noteId)?.isPinned ?? false),
			});
		});
	}, [eventBus, notesData]);

	useEffect(() => {
		if (!pinOverride) return;

		// Clear the override once notesData is updated
		const actualPinned = notesData.get(pinOverride.noteId)?.isPinned;
		if (actualPinned === pinOverride.isPinned) {
			setPinOverride(null);
		}
	}, [notesData, pinOverride]);

	return pinOverride;
};
