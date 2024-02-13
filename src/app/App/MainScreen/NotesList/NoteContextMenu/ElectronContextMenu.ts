import { createEvent, Event } from 'effector';

import { ContextMenu } from '../../../../../electron/requests/contextMenu';
import { openContextMenu } from '../../../../../electron/requests/contextMenu/renderer';

type VoidCallback = () => void;

// TODO: implement handle `onClick` events for menu items
export class ElectronContextMenu<T extends string> {
	private menu: ContextMenu;
	private onClosed: Event<void>;
	private onClicked: Event<T>;
	constructor(menu: ContextMenu) {
		this.menu = menu;
		this.onClosed = createEvent();
		this.onClicked = createEvent();
	}

	public open({ x, y }: { x: number; y: number }) {
		openContextMenu({
			menu: this.menu,
			x,
			y,
		}).then((action) => {
			if (action === null) {
				this.onClosed();
			}

			this.onClicked(action as T);
		});
	}

	public onClose(callback: VoidCallback) {
		return this.onClosed.watch(callback);
	}

	public onClick(callback: (action: T) => void) {
		return this.onClicked.watch(callback);
	}
}
