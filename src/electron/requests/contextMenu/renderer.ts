import { ipcRendererFetcher } from '../../utils/ipc/ipcRendererFetcher';

import { ContextMenu, contextMenuChannel } from '.';

export type ContextMenuRequestProps = {
	menu: ContextMenu;
	x: number;
	y: number;
};

export const { open: openContextMenu } = contextMenuChannel.client(ipcRendererFetcher);
