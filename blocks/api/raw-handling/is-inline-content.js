/**
 * External dependencies
 */
import { includes } from 'lodash';

/**
 * Internal dependencies
 */
import { isPhrasingContent } from './utils';

/**
 * An array of tag groups used by isInlineForTag function.
 * If tagName and nodeName are present in the same group, the node should be treated as inline.
 * @type {Array}
 */
const inlineWhitelistTagGroups = [
	[ 'ul', 'li', 'ol' ],
	[ 'h1', 'h2', 'h3', 'h4', 'h5', 'h6' ],
];

/**
 * Checks if nodeName should be treated as inline when being added to tagName.
 * This happens if nodeName and tagName are in the same group defined in phrasingContentTagGroups.
 *
 * @param {string} nodeName Node name.
 * @param {string} tagName  Tag name.
 *
 * @return {boolean} True if nodeName is inline in the context of tagName and
 *                    false otherwise.
 */
function isInlineForTag( nodeName, tagName ) {
	if ( ! tagName || ! nodeName ) {
		return false;
	}
	return inlineWhitelistTagGroups.some( ( tagGroup ) =>
		includes( tagGroup, nodeName ) && includes( tagGroup, tagName )
	);
}

function isInline( node, tagName ) {
	const nodeName = node.nodeName.toLowerCase();
	return isPhrasingContent( node ) || isInlineForTag( nodeName, tagName );
}

function deepCheck( nodes, tagName ) {
	return nodes.every( ( node ) =>
		isInline( node, tagName ) && deepCheck( Array.from( node.children ), tagName )
	);
}

function isDoubleBR( node ) {
	return node.nodeName === 'BR' && node.previousSibling && node.previousSibling.nodeName === 'BR';
}

export default function( HTML, tagName ) {
	const doc = document.implementation.createHTMLDocument( '' );

	doc.body.innerHTML = HTML;

	const nodes = Array.from( doc.body.children );

	return ! nodes.some( isDoubleBR ) && deepCheck( nodes, tagName );
}
