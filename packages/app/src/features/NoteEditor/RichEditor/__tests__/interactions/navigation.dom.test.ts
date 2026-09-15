import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { renderRichEditor } from '../utils/renderRichEditor';
import { selectContent, setCursorPosition } from '../utils/utils';

test('Moves a paragraph up', async () => {
	const user = userEvent.setup();
	await renderRichEditor({
		value: 'The text about some interesting \n\n Boring text',
	});

	const editor = screen.getByRole('textbox');
	const [firstParagraph, secondParagraph] = within(editor).getAllByRole('paragraph');

	expect(firstParagraph).toHaveTextContent('The text about some interesting');
	expect(secondParagraph).toHaveTextContent('Boring text');

	await user.click(secondParagraph);
	setCursorPosition(secondParagraph, 0);
	await user.keyboard('{Alt>}{ArrowUp}{/Alt}');

	const paragraphsAfterMove = within(editor).getAllByRole('paragraph');

	expect(paragraphsAfterMove).toHaveLength(2);
	expect(paragraphsAfterMove[0]).toHaveTextContent('Boring text');
	expect(paragraphsAfterMove[1]).toHaveTextContent('The text about some interesting');
});

test('Moves a paragraph down', async () => {
	const user = userEvent.setup();
	await renderRichEditor({
		value: 'The text about some interesting \n\n Boring text',
	});

	const editor = screen.getByRole('textbox');
	const [firstParagraph, secondParagraph] = within(editor).getAllByRole('paragraph');

	expect(firstParagraph).toHaveTextContent('The text about some interesting');
	expect(secondParagraph).toHaveTextContent('Boring text');

	await user.click(firstParagraph);
	setCursorPosition(firstParagraph, 0);
	await user.keyboard('{Alt>}{ArrowDown}{/Alt}');

	const paragraphsAfterMove = within(editor).getAllByRole('paragraph');

	expect(paragraphsAfterMove).toHaveLength(2);
	expect(paragraphsAfterMove[0]).toHaveTextContent('Boring text');
	expect(paragraphsAfterMove[1]).toHaveTextContent('The text about some interesting');
});

test('Moves a code block up', async () => {
	const user = userEvent.setup();
	await renderRichEditor({
		value: 'Coffee \n\n Milk \n\n ```console.log("One cup")```',
	});

	const editor = screen.getByRole('textbox');
	const [coffeeParagraph, milkParagraph] = within(editor).getAllByRole('paragraph');
	const codeBlock = within(editor).getByRole('code');

	expect(codeBlock).toAppearAfter(milkParagraph);

	await user.click(codeBlock);
	setCursorPosition(codeBlock, 0);
	await user.keyboard('{Alt>}{ArrowUp}{/Alt}');

	const codeAfterMove = within(editor).getByRole('code');
	expect(codeAfterMove).toAppearAfter(coffeeParagraph);
	expect(codeAfterMove).toAppearBefore(milkParagraph);
});

test('Moving a selection down and then back up restores the original order', async () => {
	const user = userEvent.setup();
	await renderRichEditor({ value: 'Green cup \n\n Red cup \n\n Black cup' });

	const editor = screen.getByRole('textbox');
	const paragraphs = within(editor).getAllByRole('paragraph');
	expect(paragraphs).toHaveLength(3);

	expect(paragraphs[0]).toHaveTextContent('Green cup');
	expect(paragraphs[1]).toHaveTextContent('Red cup');
	expect(paragraphs[2]).toHaveTextContent('Black cup');

	await user.click(paragraphs[1]);
	selectContent(editor, 'Green cup', 'Red cup');
	await user.keyboard('{Alt>}{ArrowDown}{/Alt}');

	const paragraphsAfterDown = within(editor).getAllByRole('paragraph');
	expect(paragraphsAfterDown).toHaveLength(3);

	expect(paragraphsAfterDown[0]).toHaveTextContent('Black cup');
	expect(paragraphsAfterDown[1]).toHaveTextContent('Green cup');
	expect(paragraphsAfterDown[2]).toHaveTextContent('Red cup');

	await user.click(paragraphsAfterDown[1]);
	selectContent(editor, 'Green cup', 'Red cup');
	await user.keyboard('{Alt>}{ArrowUp}{/Alt}');

	const paragraphsAfterUp = within(editor).getAllByRole('paragraph');
	expect(paragraphsAfterUp).toHaveLength(3);

	expect(paragraphsAfterUp[0]).toHaveTextContent('Green cup');
	expect(paragraphsAfterUp[1]).toHaveTextContent('Red cup');
	expect(paragraphsAfterUp[2]).toHaveTextContent('Black cup');
});

test('Moves a list item down with its nested list', async () => {
	const user = userEvent.setup();
	await renderRichEditor({
		value: `- First item
    - Nested item
- Third item`,
	});

	const editor = screen.getByRole('textbox');
	expect(within(editor).getAllByRole('list')).toHaveLength(2);

	const items = within(editor).getAllByRole('listitem');
	expect(items).toHaveLength(3);
	expect(items[0]).toContainElement(items[1]);

	expect(items[0]).toHaveTextContent('First item');
	expect(items[1]).toHaveTextContent('Nested item');
	expect(items[2]).toHaveTextContent('Third item');

	await user.click(items[0]);
	setCursorPosition(items[0], 0);
	await user.keyboard('{Alt>}{ArrowDown}{/Alt}');

	const itemsAfterMove = within(editor).getAllByRole('listitem');
	expect(itemsAfterMove).toHaveLength(3);

	expect(itemsAfterMove[0]).toHaveTextContent('Third item');
	expect(itemsAfterMove[1]).toHaveTextContent('First item');
	expect(itemsAfterMove[2]).toHaveTextContent('Nested item');

	expect(itemsAfterMove[1]).toContainElement(itemsAfterMove[2]);
});

test('Moves a list item up with its nested list', async () => {
	const user = userEvent.setup();
	await renderRichEditor({
		value: `- First item
    - Nested item
- Third item`,
	});

	const editor = screen.getByRole('textbox');
	expect(within(editor).getAllByRole('list')).toHaveLength(2);

	const items = within(editor).getAllByRole('listitem');
	expect(items).toHaveLength(3);
	expect(items[0]).toContainElement(items[1]);

	expect(items[0]).toHaveTextContent('First item');
	expect(items[1]).toHaveTextContent('Nested item');
	expect(items[2]).toHaveTextContent('Third item');

	await user.click(items[2]);
	setCursorPosition(items[2], 0);
	await user.keyboard('{Alt>}{ArrowUp}{/Alt}');

	const itemsAfterMove = within(editor).getAllByRole('listitem');
	expect(itemsAfterMove).toHaveLength(3);

	expect(itemsAfterMove[0]).toHaveTextContent('Third item');
	expect(itemsAfterMove[1]).toHaveTextContent('First item');
	expect(itemsAfterMove[2]).toHaveTextContent('Nested item');

	expect(itemsAfterMove[1]).toContainElement(itemsAfterMove[2]);
});

test('Cannot move blocks beyond document boundaries', async () => {
	const user = userEvent.setup();
	await renderRichEditor({ value: 'Green cup \n\n Red cup' });

	const editor = screen.getByRole('textbox');
	const [firstParagraph, secondParagraph] = within(editor).getAllByRole('paragraph');

	await user.click(firstParagraph);
	setCursorPosition(firstParagraph, 0);
	await user.keyboard('{Alt>}{ArrowUp}{/Alt}');

	const paragraphsAfterUp = within(editor).getAllByRole('paragraph');
	expect(paragraphsAfterUp[0]).toHaveTextContent('Green cup');
	expect(paragraphsAfterUp[1]).toHaveTextContent('Red cup');

	await user.click(secondParagraph);
	setCursorPosition(secondParagraph, 0);
	await user.keyboard('{Alt>}{ArrowDown}{/Alt}');

	const paragraphsAfterDown = within(editor).getAllByRole('paragraph');
	expect(paragraphsAfterDown[0]).toHaveTextContent('Green cup');
	expect(paragraphsAfterDown[1]).toHaveTextContent('Red cup');
});

test('Moves whole list up', async () => {
	const user = userEvent.setup();
	await renderRichEditor({ value: 'Green cup \n\n - First item \n\n - Second item' });

	const editor = screen.getByRole('textbox');
	const paragraph = within(editor).getByRole('paragraph');
	expect(paragraph).toHaveTextContent('Green cup');

	const list = within(editor).getByRole('list');
	expect(paragraph).toAppearBefore(list);

	const items = within(editor).getAllByRole('listitem');
	expect(items).toHaveLength(2);

	await user.click(items[0]);
	selectContent(editor, 'First item', 'Second item');
	await user.keyboard('{Alt>}{ArrowUp}{/Alt}');

	const paragraphAfterMove = within(editor).getByRole('paragraph');
	expect(paragraphAfterMove).toHaveTextContent('Green cup');

	const listAfterMove = within(editor).getByRole('list');
	expect(paragraphAfterMove).toAppearAfter(listAfterMove);

	const itemsAfterMove = within(editor).getAllByRole('listitem');
	expect(itemsAfterMove).toHaveLength(2);
	expect(itemsAfterMove[0]).toHaveTextContent('First item');
	expect(itemsAfterMove[1]).toHaveTextContent('Second item');
});

test('Move nested blockquote', async () => {
	const user = userEvent.setup();
	await renderRichEditor({
		value: `> Main quote
>> Nested quote
>>
>> Again quote`,
	});

	const editor = screen.getByRole('textbox');
	const quotes = within(editor).getAllByRole('blockquote');
	expect(quotes).toHaveLength(2);

	const nestedQuote = within(quotes[1]).getAllByRole('paragraph');

	expect(nestedQuote).toHaveLength(2);
	expect(nestedQuote[0]).toHaveTextContent('Nested quote');
	expect(nestedQuote[1]).toHaveTextContent('Again quote');
	expect(nestedQuote[0]).toAppearBefore(nestedQuote[1]);

	await user.click(editor);
	selectContent(editor, 'Again quote');
	await user.keyboard('{Alt>}{ArrowUp}{/Alt}');

	// Nested quote paragraphs should be reordered.
	const quotesAfterMove = within(editor).getAllByRole('blockquote');
	const nestedQuoteAfterMove = within(quotesAfterMove[1]).getAllByRole('paragraph');

	expect(nestedQuoteAfterMove).toHaveLength(2);
	expect(nestedQuoteAfterMove[0]).toHaveTextContent('Again quote');
	expect(nestedQuoteAfterMove[1]).toHaveTextContent('Nested quote');
	expect(nestedQuoteAfterMove[0]).toAppearBefore(nestedQuoteAfterMove[1]);

	// Moving up again should have no effect.
	await user.keyboard('{Alt>}{ArrowUp}{/Alt}');

	const quotesAfterNoop = within(editor).getAllByRole('blockquote');
	const nestedQuoteAfterNoop = within(quotesAfterNoop[1]).getAllByRole('paragraph');

	expect(nestedQuoteAfterNoop).toHaveLength(2);
	expect(nestedQuoteAfterNoop[0]).toHaveTextContent('Again quote');
	expect(nestedQuoteAfterNoop[1]).toHaveTextContent('Nested quote');
	expect(nestedQuoteAfterNoop[0]).toAppearBefore(nestedQuoteAfterNoop[1]);
});
