import { ipcRendererFetcher } from '../../utils/ipc/ipcRendererFetcher';

import { filesChannel } from '.';

export const { importNotes, selectDirectory, getUserDataPath, getResourcesPath } =
	filesChannel.client(ipcRendererFetcher);
