import { useCallback } from 'react';
import saveAs from 'file-saver';
import { getAppResourceDataInUrl } from '@core/features/links';
import { openLink } from '@electron/requests/interactions/renderer';
import { useFilesRegistry } from '@features/App/Workspace/WorkspaceProvider';
import { useNotesControl } from '@features/MainScreen/useNotesControl';

/**
 * Returns callback to open any links, including links with application defined protocols
 * @returns callback that handle link, and return `true` in case link has been handled and `false` otherwise
 */
export const useUrlOpener = () => {
	const filesRegistry = useFilesRegistry();
	const notesControl = useNotesControl();

	return useCallback(
		async (url: string) => {
			const resourceData = getAppResourceDataInUrl(url);
			if (resourceData) {
				switch (resourceData.type) {
					case 'resource': {
						const file = await filesRegistry.get(resourceData.id);
						if (!file) return false;

						const buffer = await file.arrayBuffer();
						saveAs(new Blob([buffer]), file.name);
						return true;
					}
					case 'note': {
						notesControl.open(resourceData.id);
						return true;
					}
				}
			}

			try {
				const urlObject = new URL(url);
				if (/^https?:$/.test(urlObject.protocol)) {
					openLink(url);
					return true;
				}
			} catch (error) {
				console.error(error);
				return false;
			}

			return false;
		},
		[filesRegistry, notesControl],
	);
};
