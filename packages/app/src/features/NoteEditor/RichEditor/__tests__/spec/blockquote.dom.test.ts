import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { renderRichEditor } from '../utils/renderRichEditor';
import { selectContent } from '../utils/utils';

test('Insert blockquote', async () => {
	const richEditor = await renderRichEditor({ value: 'cat' });

	const editor = screen.getByRole('textbox');
	selectContent(editor, 'cat');
	await richEditor.insert({ type: 'quote' });

	expect(within(editor).getByRole('blockquote')).toHaveTextContent('cat');

	selectContent(editor, 'cat');
	await richEditor.insert({ type: 'quote' });

	const quotes = within(editor).getAllByRole('blockquote');
	expect(quotes).toHaveLength(2);
	expect(quotes[1]).toHaveTextContent('cat');
});

test('Empty blockquote is removed when backspace is pressed', async () => {
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

test('Removes nested blockquote after deleting its text with backspace', async () => {
	const user = userEvent.setup();
	await renderRichEditor({ value: `> foo\n>> bar` });

	const editor = screen.getByRole('textbox');
	const quotes = within(editor).getAllByRole('blockquote');
	expect(quotes).toHaveLength(2);

	await user.click(quotes[1]);
	selectContent(quotes[1], 'bar');

	// First remove the text
	await user.keyboard('{Backspace}');
	expect(within(editor).queryByText('bar')).not.toBeInTheDocument();

	// Second press remove the blockquote
	await user.keyboard('{Backspace}');
	expect(within(editor).getAllByRole('blockquote')).toHaveLength(1);

	selectContent(quotes[0], 'foo');

	await user.keyboard('{Backspace}');
	await user.keyboard('{Backspace}');

	expect(within(editor).queryByText('foo')).not.toBeInTheDocument();
	expect(within(editor).queryByRole('blockquote')).not.toBeInTheDocument();
});
