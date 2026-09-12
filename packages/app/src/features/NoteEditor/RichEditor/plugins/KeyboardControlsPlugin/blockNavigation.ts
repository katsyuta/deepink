import { $isElementNode, $isRootNode, LexicalNode, RangeSelection } from 'lexical';
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
 * Finds the sibling to move the block relative to, skipping nested list
 * wrappers to keep the list item and its nested list together.
 */
export const $getMoveTarget = (node: LexicalNode, direction: MoveDirection) => {
	const sibling =
		direction === 'up' ? node.getPreviousSibling() : node.getNextSibling();
	if (!sibling) return null;

	if (direction === 'up' && $isNestedListWrapper(sibling)) {
		return sibling.getPreviousSibling();
	}

	if (direction === 'down' && $isNestedListWrapper(sibling.getNextSibling())) {
		return sibling.getNextSibling();
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
		const sibling =
			direction === 'up' ? node.getPreviousSibling() : node.getNextSibling();

		if (sibling || !parent || $isRootNode(parent)) {
			return node;
		}

		return $findBlockToMove(parent, direction);
	}

	const parent = node.getParent();
	return parent ? $findBlockToMove(parent, direction) : null;
};

export const $getBlocksToMove = (selection: RangeSelection, direction: MoveDirection) => {
	const movableBlocks = new Set<LexicalNode>();

	selection.getNodes().forEach((node) => {
		const block = $findBlockToMove(node, direction);

		if (block) {
			movableBlocks.add(block);
		}
	});

	if (!movableBlocks.size) return null;

	const hasMovableAncestor = (node: LexicalNode): boolean => {
		const parent = node.getParent();

		if (!parent) return false;
		if (movableBlocks.has(parent)) return true;

		return hasMovableAncestor(parent);
	};

	return (
		Array.from(movableBlocks)
			// Filter out nested blocks because moving their parent also moves them.
			.filter((node) => !hasMovableAncestor(node))
			.flatMap((block) => {
				if (!$isListItemNode(block)) return [block];

				// A text-less ListItemNode containing only a nested ListNode represents the nesting of block
				// It must move with `block`, otherwise the nested list would be left behind and appear orphaned
				const nextSibling = block.getNextSibling();
				if (nextSibling && $isNestedListWrapper(nextSibling)) {
					return [block, nextSibling];
				}

				return [block];
			})
	);
};
