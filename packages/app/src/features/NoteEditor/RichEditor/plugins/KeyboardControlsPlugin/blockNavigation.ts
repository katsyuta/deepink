import {
	$findMatchingParent,
	$isElementNode,
	$isRootNode,
	LexicalNode,
	RangeSelection,
} from 'lexical';
import { $isListItemNode, $isListNode } from '@lexical/list';

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

/**
 * Ascends from node to the block that actually moves, the closest ancestor
 * block with a sibling to swap with, or a top-level block otherwise
 */
const $findBlockToMove = (
	node: LexicalNode,
	direction: MoveDirection,
): LexicalNode | null => {
	const parent = node.getParent();

	if (!$isElementNode(node) || node.isInline()) {
		return parent ? $findBlockToMove(parent, direction) : null;
	}

	if (!parent || $isRootNode(parent) || $getMovableSibling(node, direction)) {
		return node;
	}

	// Moving within a list must not cross the list boundary
	if ($isListItemNode(node) || $isListItemNode(parent)) return null;

	return $findBlockToMove(parent, direction);
};

export const $getBlocksToMove = (selection: RangeSelection, direction: MoveDirection) => {
	const selectedNodes = selection.getNodes();

	// A list only moves as a whole when the selection spans its full range
	const topLevelList = selectedNodes
		.map((node) => $findMatchingParent(node, $isListNode))
		.find((list) => list && $isRootNode(list.getParent()));

	if (topLevelList) {
		const firstItem = topLevelList.getFirstChild();
		const lastItem = topLevelList.getLastChild();

		if (
			$isListItemNode(firstItem) &&
			$isListItemNode(lastItem) &&
			selectedNodes.includes(firstItem) &&
			selectedNodes.includes(lastItem)
		) {
			return [topLevelList];
		}
	}

	// The move is atomic: if any selected node can't move, moving only the
	// rest would change the selection's structure, so bail out entirely
	const blocks = selectedNodes.map((node) => $findBlockToMove(node, direction));
	if (!blocks.every((block) => block !== null)) return null;

	const movableBlocks = new Set(blocks);

	// Drop blocks already covered by a movable ancestor to avoid duplicates
	const hasMovableAncestor = (node: LexicalNode): boolean => {
		const parent = node.getParent();
		if (!parent) return false;
		if (movableBlocks.has(parent)) return true;

		return hasMovableAncestor(parent);
	};

	return Array.from(movableBlocks)
		.filter((node) => !hasMovableAncestor(node))
		.flatMap((block) => {
			const nestedList = $getNestedListSibling(block);
			return nestedList ? [block, nestedList] : [block];
		});
};
