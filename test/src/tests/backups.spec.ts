import Test from '../framework';
import fs from 'fs/promises';

async function deleteBackups () {
	return await fs.rmdir(
		'./backups',
		{ recursive: true }
	);
}

Test.test('Backups | Can make backups and restore from backup', async api => {
	const backupRes = await api('create/backups');
	if (!backupRes.ok) {
		return `Failed to make backup: ${JSON.stringify(backupRes)}`;
	}
	const { id } = backupRes;
	const restoreRes = await api('update/backups/restore-from', {
		backupId: id
	});
	if (!restoreRes.ok) {
		return `Failed to restore from backup: ${JSON.stringify(restoreRes)}`;
	}
	
	await deleteBackups();
	
	return true;
});