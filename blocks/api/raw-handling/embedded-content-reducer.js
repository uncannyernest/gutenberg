/**
 * Internal dependencies
 */
import { isPhrasingContent } from './utils';

/**
 * Browser dependencies
 */
const { ELEMENT_NODE } = window.Node;

/**
 * Whether or not the given node is embedded content.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/Guide/HTML/Content_categories#Embedded_content
 *
 * @param {Node}   node   The node to check.
 * @param {Object} schema The schema to use.
 *
 * @return {boolean} True if embedded content, false if not.
 */
function isEmbedded( node, schema ) {
	const tag = node.nodeName.toLowerCase();

	if ( ! schema.figure || tag === 'figcaption' || isPhrasingContent( node ) ) {
		return false;
	}

	return schema.figure.children.hasOwnProperty( tag );
}

/**
 * This filter takes embedded content out of paragraphs.
 *
 * @param {Node}     node   The node to filter.
 * @param {Document} doc    The document of the node.
 * @param {Object}   schema The schema to use.
 *
 * @return {void}
 */
export default function( node, doc, schema ) {
	if ( node.nodeType !== ELEMENT_NODE ) {
		return;
	}

	if ( ! isEmbedded( node, schema ) ) {
		return;
	}

	let nodeToInsert = node;

	// if the embedded is an image and its parent is an anchor with just the image
	// take the anchor out instead of just the image
	if (
		'IMG' === node.nodeName &&
		1 === node.parentNode.childNodes.length &&
		'A' === node.parentNode.nodeName
	) {
		nodeToInsert = node.parentNode;
	}

	let wrapper = nodeToInsert;

	while ( wrapper && wrapper.nodeName !== 'P' ) {
		wrapper = wrapper.parentElement;
	}

	const figure = doc.createElement( 'figure' );

	if ( wrapper ) {
		wrapper.parentNode.insertBefore( figure, wrapper );
	} else {
		nodeToInsert.parentNode.insertBefore( figure, nodeToInsert );
	}

	figure.appendChild( nodeToInsert );
}
