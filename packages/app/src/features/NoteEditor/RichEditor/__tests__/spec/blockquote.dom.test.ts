import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { renderRichEditor } from '../utils/renderRichEditor';
import { selectContent } from '../utils/utils';

test('Blockquote is removed when backspace is pressed', async () => {
	const user = userEvent.setup();
	await renderRichEditor({ value: '>' });

	const editor = screen.getByRole('textbox');
	const quote = within(editor).getByRole('blockquote');

	await user.click(quote);
	await user.keyboard('{Backspace}');

	expect(within(editor).queryByRole('blockquote')).not.toBeInTheDocument();
	expect(within(editor).queryByRole('paragraph')).toHaveTextContent('');
});

test('Blockquote with text is removed when backspace is pressed', async () => {
	const user = userEvent.setup();
	await renderRichEditor({ value: '> text' });

	const editor = screen.getByRole('textbox');
	const quote = within(editor).getByRole('blockquote');

	await user.click(quote);
	selectContent(quote, 'text');

	// First delete text, then blockquote
	await user.keyboard('{Backspace}');
	await user.keyboard('{Backspace}');

	expect(within(editor).queryByRole('blockquote')).not.toBeInTheDocument();
	expect(within(editor).queryByText('text')).not.toBeInTheDocument();
});

test('Removed nested blockquote', async () => {
	const user = userEvent.setup();
	await renderRichEditor({ value: '>>' });

	const editor = screen.getByRole('textbox');
	const quotes = within(editor).getAllByRole('blockquote');
	expect(quotes).toHaveLength(2);

	// Delete nested quote
	await user.click(quotes[1]);
	await user.keyboard('{Backspace}');

	expect(quotes[1]).not.toBeInTheDocument();
	expect(within(editor).getAllByRole('blockquote')).toHaveLength(1);

	// Delete external quote
	await user.keyboard('{Backspace}');
	expect(within(editor).queryAllByRole('blockquote')).toHaveLength(0);
});

test.fails(
	'deletes nested empty blockquote on backspace instead of jumping cursor to previous line',
	async () => {
		const user = userEvent.setup();
		await renderRichEditor({ value: `> foo\n>> bar` });

		const editor = screen.getByRole('textbox');
		let quotes = within(editor).getAllByRole('blockquote');
		expect(quotes).toHaveLength(2);

		await user.click(quotes[1]);
		selectContent(quotes[1], 'bar');

		await user.keyboard('{Backspace}');
		await user.keyboard('{Backspace}');

		quotes = within(editor).getAllByRole('blockquote');
		expect(quotes).toHaveLength(2);
		expect(quotes[1]).toHaveTextContent('');

		await user.keyboard('{Backspace}');

		quotes = within(editor).getAllByRole('blockquote');

		expect(quotes).toHaveLength(1);
		expect(editor).toHaveTextContent('foo');

		const selection = window.getSelection();
		expect(selection?.anchorNode?.textContent).toBe('foo');
		expect(selection?.anchorOffset).toBe(3);
	},
);
