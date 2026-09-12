import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { renderRichEditor } from '../utils/renderRichEditor';
import { selectContent, setCursorPosition } from '../utils/utils';

test('Ctrl+ArrowUp moves a paragraph up', async () => {
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
	await user.keyboard('{Control>}{ArrowUp}{/Control}');

	const paragraphsAfterMove = within(editor).getAllByRole('paragraph');

	expect(paragraphsAfterMove).toHaveLength(2);
	expect(paragraphsAfterMove[0]).toHaveTextContent('Boring text');
	expect(paragraphsAfterMove[1]).toHaveTextContent('The text about some interesting');
});

test('Ctrl+ArrowDown moves a paragraph down', async () => {
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
	await user.keyboard('{Control>}{ArrowDown}{/Control}');

	const paragraphsAfterMove = within(editor).getAllByRole('paragraph');

	expect(paragraphsAfterMove).toHaveLength(2);
	expect(paragraphsAfterMove[0]).toHaveTextContent('Boring text');
	expect(paragraphsAfterMove[1]).toHaveTextContent('The text about some interesting');
});

test('Ctrl+ArrowUp moves a code block above the previous paragraph', async () => {
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
	await user.keyboard('{Control>}{ArrowUp}{/Control}');

	const codeAfterMove = within(editor).getByRole('code');
	expect(codeAfterMove).toAppearAfter(coffeeParagraph);
	expect(codeAfterMove).toAppearBefore(milkParagraph);
});

test('Move selected blocks together', async () => {
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
	await user.keyboard('{Control>}{ArrowDown}{/Control}');

	const paragraphsAfterDown = within(editor).getAllByRole('paragraph');
	expect(paragraphsAfterDown).toHaveLength(3);

	expect(paragraphsAfterDown[0]).toHaveTextContent('Black cup');
	expect(paragraphsAfterDown[1]).toHaveTextContent('Green cup');
	expect(paragraphsAfterDown[2]).toHaveTextContent('Red cup');

	await user.click(paragraphsAfterDown[1]);
	selectContent(editor, 'Green cup', 'Red cup');
	await user.keyboard('{Control>}{ArrowUp}{/Control}');

	const paragraphsAfterUp = within(editor).getAllByRole('paragraph');
	expect(paragraphsAfterUp).toHaveLength(3);

	expect(paragraphsAfterUp[0]).toHaveTextContent('Green cup');
	expect(paragraphsAfterUp[1]).toHaveTextContent('Red cup');
	expect(paragraphsAfterUp[2]).toHaveTextContent('Black cup');
});

test('Ctrl+ArrowDown moves a list item together with its nested list', async () => {
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
	await user.keyboard('{Control>}{ArrowDown}{/Control}');

	const itemsAfterMove = within(editor).getAllByRole('listitem');
	expect(itemsAfterMove).toHaveLength(3);

	expect(itemsAfterMove[0]).toHaveTextContent('Third item');
	expect(itemsAfterMove[1]).toHaveTextContent('First item');
	expect(itemsAfterMove[2]).toHaveTextContent('Nested item');

	expect(itemsAfterMove[1]).toContainElement(itemsAfterMove[2]);
});

test('Ctrl+ArrowUp moves a list item past an item that owns a nested list, without disturbing the nested list', async () => {
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
	await user.keyboard('{Control>}{ArrowUp}{/Control}');

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
	await user.keyboard('{Control>}{ArrowUp}{/Control}');

	const paragraphsAfterUp = within(editor).getAllByRole('paragraph');
	expect(paragraphsAfterUp[0]).toHaveTextContent('Green cup');
	expect(paragraphsAfterUp[1]).toHaveTextContent('Red cup');

	await user.click(secondParagraph);
	setCursorPosition(secondParagraph, 0);
	await user.keyboard('{Control>}{ArrowDown}{/Control}');

	const paragraphsAfterDown = within(editor).getAllByRole('paragraph');
	expect(paragraphsAfterDown[0]).toHaveTextContent('Green cup');
	expect(paragraphsAfterDown[1]).toHaveTextContent('Red cup');
});
