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
 * Finds the target node for moving in the given direction.
 * Walks up through parent nodes when the current node has no movable sibling.
 * Includes an attached nested list wrapper when moving down.
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

	// When moving down, include the nested list if it is attached to the adjacent block
	if (direction === 'down') {
		const next = sibling.getNextSibling();
		if ($isNestedListWrapper(next)) return next;
	}

	return sibling;
};

/**
 * Finds the nearest movable block for the node
 */
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

// Drop blocks already covered by a movable ancestor to avoid duplicates
const $hasMovableAncestor = (node: LexicalNode, movable: Set<LexicalNode>) => {
	const parent = node.getParent();
	if (!parent) return false;
	if (movable.has(parent)) return true;

	return $hasMovableAncestor(parent, movable);
};

export const $getBlocksToMove = (selection: RangeSelection, direction: MoveDirection) => {
	const selectedNodes = selection.getNodes();
	const selectedSet = new Set(selectedNodes);

	const findMoveContainer = (node: LexicalNode) =>
		$findMatchingParent(node, (node) => $isListNode(node) || $isQuoteNode(node));

	// Any container whose entire content is covered by the selection moves as
	// one atomic unit — regardless of type or how deep it is nested
	const fullySelectedContainers = new Set<LexicalNode>();
	for (const node of selectedNodes) {
		const container = findMoveContainer(node);
		if (!$isElementNode(container)) continue;

		const children = container.getChildren();
		const isFullySelected =
			children.length > 0 && children.every((child) => selectedSet.has(child));

		if (isFullySelected) {
			// Reject moves targeting only a nested list to prevent detaching it from its
			const parent = container.getParent();
			if (parent && $isListItemNode(parent) && !selectedSet.has(parent)) {
				return null;
			}

			fullySelectedContainers.add(container);
		}
	}

	const blocks = selectedNodes.map((node) => {
		const container = findMoveContainer(node);
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
			const next = block.getNextSibling();
			const nestedList = $isNestedListWrapper(next) ? next : null;

			return nestedList ? [block, nestedList] : [block];
		});
};
