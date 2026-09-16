import {
	$findMatchingParent,
	$isElementNode,
	$isRootNode,
	LexicalNode,
	RangeSelection,
} from 'lexical';
import { $isListItemNode, $isListNode } from '@lexical/list';
import { $isQuoteNode } from '@lexical/rich-text';

export type MoveDirection = 'up' | 'down';

/**
 * A ListItemNode with no text of its own, wrapping only a nested ListNode
 * This is how Lexical represents list nesting, it is not a
 * real item that should ever be selected as a move target on its own
 */
const $isNestedListWrapper = (node: LexicalNode | null) => {
	if (!$isListItemNode(node)) return false;
	const children = node.getChildren();
	return children.length === 1 && $isListNode(children[0]);
};

/**
 * The nested list attached to a list item, if any must travel together
 * with the item whenever it moves
 */
const $getNestedListSibling = (node: LexicalNode): LexicalNode | null => {
	if (!$isListItemNode(node)) return null;
	const next = node.getNextSibling();
	return $isNestedListWrapper(next) ? next : null;
};

/**
 * Sibling in the given direction, skipping nested-list wrappers so they are
 * never picked as a standalone move target
 */
const $getMovableSibling = (
	node: LexicalNode,
	direction: MoveDirection,
): LexicalNode | null => {
	const sibling =
		direction === 'up' ? node.getPreviousSibling() : node.getNextSibling();
	if (!sibling || !$isNestedListWrapper(sibling)) return sibling;

	return direction === 'up' ? sibling.getPreviousSibling() : sibling.getNextSibling();
};

/**
 * The node to swap places with, walking up through parents when the block
 * is at the edge of its container
 */
export const $getMoveTarget = (
	node: LexicalNode,
	direction: MoveDirection,
): LexicalNode | null => {
	const sibling = $getMovableSibling(node, direction);

	if (!sibling) {
		const parent = node.getParent();
		return parent && !$isRootNode(parent) ? $getMoveTarget(parent, direction) : null;
	}

	// Moving down past a list item must bring its nested list along
	if (direction === 'down') {
		return $getNestedListSibling(sibling) ?? sibling;
	}

	return sibling;
};

const $findBlockToMove = (
	node: LexicalNode,
	direction: MoveDirection,
): LexicalNode | null => {
	if (!$isElementNode(node) || node.isInline()) {
		const parent = node.getParent();
		return parent ? $findBlockToMove(parent, direction) : null;
	}

	// Normal block movement within the current container
	if ($getMovableSibling(node, direction)) {
		return node;
	}

	// If this block is inside a top-level quote, move the whole quote
	const parent = node.getParent();
	if ($isQuoteNode(parent) && $isRootNode(parent.getParent())) {
		return $getMovableSibling(parent, direction) ? parent : null;
	}

	return null;
};

const $isFullySelectedContainer = (
	container: LexicalNode,
	selectedNodes: LexicalNode[],
) => {
	if (!$isElementNode(container)) return false;
	const children = container.getChildren();
	return (
		children.length > 0 && children.every((child) => selectedNodes.includes(child))
	);
};

const $findMoveContainer = (node: LexicalNode) =>
	$findMatchingParent(node, (node) => $isListNode(node) || $isQuoteNode(node));

// Drop blocks already covered by a movable ancestor to avoid duplicates
const $hasMovableAncestor = (node: LexicalNode, movable: Set<LexicalNode>) => {
	const parent = node.getParent();
	if (!parent) return false;
	if (movable.has(parent)) return true;
	return $hasMovableAncestor(parent, movable);
};

export const $getBlocksToMove = (selection: RangeSelection, direction: MoveDirection) => {
	const selectedNodes = selection.getNodes();

	// Any container whose entire content is covered by the selection moves as
	// one atomic unit — regardless of type or how deep it is nested
	const fullySelectedContainers = new Set<LexicalNode>();
	for (const node of selectedNodes) {
		const container = $findMoveContainer(node);
		if (container && $isFullySelectedContainer(container, selectedNodes)) {
			fullySelectedContainers.add(container);
		}
	}

	const blocks = selectedNodes.map((node) => {
		const container = $findMoveContainer(node);
		if (container && fullySelectedContainers.has(container)) {
			return container;
		}
		return $findBlockToMove(node, direction);
	});

	if (!blocks.every((block) => block !== null)) return null;

	const movableBlocks = new Set(blocks);
	return Array.from(movableBlocks)
		.filter((node) => !$hasMovableAncestor(node, movableBlocks))
		.flatMap((block) => {
			const nestedList = $getNestedListSibling(block);
			return nestedList ? [block, nestedList] : [block];
		});
};
