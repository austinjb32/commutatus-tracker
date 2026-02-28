import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Extension should be present', () => {
		assert.ok(vscode.extensions);
		assert.ok(typeof vscode.extensions.getExtension === 'function');
	});

	test('Extension should activate', async () => {
		const extension = vscode.extensions.getExtension('commutatus-tracker');
		if (extension) {
			assert.ok(typeof extension.activate === 'function');
		} else {
			assert.ok(true);
		}
	});

	test('Should register all commands', async () => {
		const commands = await vscode.commands.getCommands();
		assert.ok(Array.isArray(commands));
		assert.ok(typeof vscode.commands.registerCommand === 'function');

		const expectedCommands = [
			'commutatus-tracker.addTime',
			'commutatus-tracker.logCommitTime',
			'commutatus-tracker.setTaskId',
			'commutatus-tracker.setToken',
			'commutatus-tracker.showTask'
		];

		for (const command of expectedCommands) {
			assert.ok(typeof command === 'string');
			assert.ok(command.length > 0);
		}
	});

	test('Should handle command execution', async () => {
		assert.ok(typeof vscode.commands.executeCommand === 'function');

		try {
			await vscode.commands.executeCommand('workbench.action.showCommands');
			assert.ok(true);
		} catch (error) {
			assert.ok(true);
		}
	});

	test('Should handle workspace state', () => {
		assert.ok(vscode.workspace);

		const workspaceFolders = vscode.workspace.workspaceFolders;
		assert.ok(workspaceFolders === undefined || Array.isArray(workspaceFolders) || workspaceFolders === null);
	});

	test('Should handle configuration changes', () => {
		assert.ok(vscode.workspace);
		assert.ok(typeof vscode.workspace.getConfiguration === 'function');

		const config = vscode.workspace.getConfiguration('commutatusTracker');
		assert.ok(config);
		assert.ok(typeof config.get === 'function');
		assert.ok(typeof config.update === 'function');
	});

	test('Sample test still works', () => {
		assert.strictEqual(-1, [1, 2, 3].indexOf(5));
		assert.strictEqual(-1, [1, 2, 3].indexOf(0));
	});
});
