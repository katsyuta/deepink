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
 * Checks whether a text-less ListItemNode contains only a nested ListNode, representing the visual nesting of the list item
 */
const $isNestedListWrapper = (node: LexicalNode | null) => {
	if (!$isListItemNode(node)) return false;
	const children = node.getChildren();
	return children.length === 1 && $isListNode(children[0]);
};

/**
 * Finds the block sibling to move relative to, skipping nested-list wrappers
 */
const $getMovableSibling = (node: LexicalNode, direction: MoveDirection) => {
	const sibling =
		direction === 'up' ? node.getPreviousSibling() : node.getNextSibling();
	if (!sibling) return null;

	// Keep a list item and its nested list together
	if (!$isNestedListWrapper(sibling)) return sibling;

	return direction === 'up' ? sibling.getPreviousSibling() : sibling.getNextSibling();
};

/**
 * Finds the sibling to move the block relative to, skipping nested list
 * wrappers to keep the list item and its nested list together.
 */
export const $getMoveTarget = (
	node: LexicalNode,
	direction: MoveDirection,
): LexicalNode | null => {
	const sibling = $getMovableSibling(node, direction);

	// No sibling at this level - continue from the parent
	if (!sibling) {
		const parent = node.getParent();
		return parent && !$isRootNode(parent) ? $getMoveTarget(parent, direction) : null;
	}

	if (direction === 'down') {
		// Include the nested list when moving past its parent item
		return $isNestedListWrapper(sibling.getNextSibling())
			? sibling.getNextSibling()
			: sibling;
	}

	return sibling;
};

/**
 * Walk up the tree from the node to the first block node that has a sibling in the corresponding direction,
 * or to the first top-level node
 */
const $findBlockToMove = (
	node: LexicalNode,
	direction: MoveDirection,
): LexicalNode | null => {
	if ($isElementNode(node) && !node.isInline()) {
		const parent = node.getParent();
		const sibling = $getMovableSibling(node, direction);

		if (sibling || !parent || $isRootNode(parent)) {
			return node;
		}

		// Do not leave the list when moving from its boundary.
		if ($isListItemNode(node)) {
			return null;
		}

		// Do not move outside the nested list - that would change the nesting level
		if ($isListItemNode(parent)) return null;

		return $findBlockToMove(parent, direction);
	}

	const parent = node.getParent();
	return parent ? $findBlockToMove(parent, direction) : null;
};

export const $getBlocksToMove = (selection: RangeSelection, direction: MoveDirection) => {
	const selectedNodes = selection.getNodes();

	// Return the list if it is fully selected
	const topLevelList = selectedNodes
		.map((node) => $findMatchingParent(node, $isListNode))
		.find((list) => list && $isRootNode(list.getParent()));

	if (topLevelList) {
		const firstItem = topLevelList.getFirstChild();
		const lastItem = topLevelList.getLastChild();

		// A whole list is movable only when the selection spans its boundaries
		if (
			$isListItemNode(firstItem) &&
			$isListItemNode(lastItem) &&
			selectedNodes.includes(firstItem) &&
			selectedNodes.includes(lastItem)
		) {
			return [topLevelList];
		}
	}

	// A multi node move must be atomic: if one selected node cannot move,
	// moving only the remaining nodes would change the selection's structure
	const blocks = selectedNodes.map((node) => $findBlockToMove(node, direction));
	if (!blocks.every((block) => block !== null)) return null;

	const movableBlocks = new Set(blocks);

	const hasMovableAncestor = (node: LexicalNode): boolean => {
		const parent = node.getParent();
		if (!parent) return false;
		if (movableBlocks.has(parent)) return true;

		return hasMovableAncestor(parent);
	};

	return Array.from(movableBlocks)
		.filter((node) => !hasMovableAncestor(node))
		.flatMap((block) => {
			if (!$isListItemNode(block)) {
				return [block];
			}

			const nestedList = block.getNextSibling();

			return nestedList && $isNestedListWrapper(nestedList)
				? [block, nestedList]
				: [block];
		});
};
