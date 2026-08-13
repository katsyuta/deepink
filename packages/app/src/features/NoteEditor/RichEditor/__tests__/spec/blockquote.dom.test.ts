import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { renderRichEditor } from '../utils/renderRichEditor';
import { selectContent, setCursorPosition } from '../utils/utils';

test('Creates a quote from selected text', async () => {
	const richEditor = await renderRichEditor({ value: 'cat' });

	const editor = screen.getByRole('textbox');
	selectContent(editor, 'cat');
	await richEditor.insert({ type: 'quote' });

	expect(within(editor).getByRole('blockquote')).toHaveTextContent('cat');
});

test('Removes an empty quote', async () => {
	const user = userEvent.setup();
	await renderRichEditor({ value: '>' });

	const editor = screen.getByRole('textbox');
	const quote = within(editor).getByRole('blockquote');

	await user.click(quote);
	await user.keyboard('{Backspace}');

	expect(within(editor).queryByRole('blockquote')).not.toBeInTheDocument();
	expect(editor).toHaveTextContent('');
});

test('Removes a quote while preserving its text', async () => {
	const user = userEvent.setup();
	await renderRichEditor({ value: '> Bob' });

	const editor = screen.getByRole('textbox');
	const quote = within(editor).getByRole('blockquote');

	// Set the cursor position at the start of the text
	await user.click(quote);
	setCursorPosition(quote, 0);
	await user.keyboard('{Backspace}');

	expect(within(editor).queryByRole('blockquote')).not.toBeInTheDocument();
	expect(editor).toHaveTextContent('Bob');
});

test('Removes an empty quote after deleting its text', async () => {
	const user = userEvent.setup();
	await renderRichEditor({ value: '> text' });

	const editor = screen.getByRole('textbox');
	const quote = within(editor).getByRole('blockquote');
	expect(quote).toHaveTextContent('text');

	// Select the text for deletion
	await user.click(quote);
	selectContent(quote, 'text');

	// The first press deletes the text; the second press removes the quote
	await user.keyboard('{Backspace}');
	expect(within(editor).queryByText('text')).not.toBeInTheDocument();
	expect(within(editor).getByRole('blockquote')).toHaveTextContent('');

	await user.keyboard('{Backspace}');
	expect(within(editor).queryByRole('blockquote')).not.toBeInTheDocument();
});

test('Removes one quote nesting level at a time', async () => {
	const user = userEvent.setup();
	await renderRichEditor({ value: '>>>' });

	const editor = screen.getByRole('textbox');
	const quotes = within(editor).getAllByRole('blockquote');
	expect(quotes).toHaveLength(3);

	await user.click(quotes[2]);
	await user.keyboard('{Backspace}');
	expect(within(editor).getAllByRole('blockquote')).toHaveLength(2);

	await user.keyboard('{Backspace}');
	expect(within(editor).queryAllByRole('blockquote')).toHaveLength(1);

	await user.keyboard('{Backspace}');
	expect(within(editor).queryAllByRole('blockquote')).toHaveLength(0);
});

test('Removes an empty nested quote after deleting its text', async () => {
	const user = userEvent.setup();
	await renderRichEditor({ value: `> foo\n>> bar` });

	const editor = screen.getByRole('textbox');
	const quotes = within(editor).getAllByRole('blockquote');
	expect(quotes).toHaveLength(2);

	await user.click(quotes[1]);
	selectContent(quotes[1], 'bar');

	// Delete the text
	await user.keyboard('{Backspace}');
	expect(quotes[1]).toHaveTextContent('');
	expect(within(editor).getAllByRole('blockquote')).toHaveLength(2);

	// The second press should remove the nested quote
	await user.keyboard('{Backspace}');
	expect(within(editor).getAllByRole('blockquote')).toHaveLength(1);
	expect(within(editor).getByRole('blockquote')).toHaveTextContent('foo');
});

test('Reduces quote nesting level while preserving its text', async () => {
	const user = userEvent.setup();
	await renderRichEditor({ value: `> foo\n>> bar` });

	const editor = screen.getByRole('textbox');
	const quotes = within(editor).getAllByRole('blockquote');
	expect(quotes).toHaveLength(2);

	// Set the cursor position at the start of the text
	await user.click(quotes[1]);
	setCursorPosition(quotes[1], 0);
	await user.keyboard('{Backspace}');

	expect(within(editor).getAllByRole('blockquote')).toHaveLength(1);

	const [quote] = within(editor).getAllByRole('blockquote');
	expect(quote).toHaveTextContent('foo');
	expect(quote).toHaveTextContent('bar');
});
