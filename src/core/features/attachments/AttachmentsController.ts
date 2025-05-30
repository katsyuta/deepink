import { v4 as uuid4 } from 'uuid';

import { SQLiteDatabase } from '../../storage/database/SQLiteDatabase/SQLiteDatabase';

/**
 * attachments manager, to track attachments usage and to keep consistency
 */
export class AttachmentsController {
	private db;
	private readonly workspace;
	constructor(db: SQLiteDatabase, workspace: string) {
		this.db = db;
		this.workspace = workspace;
	}

	public async set(targetId: string, attachments: string[]) {
		const db = this.db.get();

		if (attachments.length === 0) {
			db.prepare('DELETE FROM attachments WHERE workspace_id=? AND note=?').run(
				this.workspace,
				targetId,
			);
		} else {
			const valuesPlaceholders = attachments.map(() => `(?, ?, ?, ?)`).join(', ');

			const placeholdersData: string[] = [];
			attachments.forEach((attachmentId) => {
				placeholdersData.push(uuid4());
				placeholdersData.push(this.workspace);
				placeholdersData.push(targetId);
				placeholdersData.push(attachmentId);
			});

			db.transaction(() => {
				db.prepare('DELETE FROM attachments WHERE workspace_id=? AND note=?').run(
					this.workspace,
					targetId,
				);
				db.prepare(
					`INSERT INTO attachments ("id", "workspace_id", "note", "file") VALUES ${valuesPlaceholders};`,
				).run(placeholdersData);
			})();
		}
	}

	public async get(targetId: string): Promise<string[]> {
		const db = this.db.get();

		return db
			.prepare(
				'SELECT file FROM attachments WHERE workspace_id=? AND note=? ORDER BY rowid',
			)
			.all(this.workspace, targetId)
			.map((row) => (row as { file: string }).file);
	}

	public async delete(resources: string[]) {
		const db = this.db.get();

		const placeholders = Array(resources.length).fill('?').join(',');
		db.prepare(
			`DELETE FROM attachments WHERE workspace_id=? AND file IN (${placeholders})`,
		).run(this.workspace, ...resources);
	}

	/**
	 * Return array with ids of resources that not in use
	 */
	public async findOrphanedResources(resources: string[]) {
		const db = this.db.get();

		const placeholders = Array(resources.length).fill('?').join(',');
		const attached = db
			.prepare(
				`SELECT file as id FROM attachments WHERE workspace_id=? AND file IN (${placeholders})`,
			)
			.all(this.workspace, ...resources) as Array<{ id: string }>;

		return resources.filter((id) =>
			attached.every((attachment) => attachment.id !== id),
		);
	}
}
