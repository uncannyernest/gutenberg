/**
 * External dependencies
 */
import { omit } from 'lodash';

/**
 * WordPress dependencies
 */
import { unwrap, insertAfter, remove } from '@wordpress/utils';

/**
 * Browser dependencies
 */
const { ELEMENT_NODE, TEXT_NODE } = window.Node;

/**
 * Get schema of possible paths for phrasing content.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/Guide/HTML/Content_categories#Phrasing_content
 *
 * @return {Object} Schema.
 */
export function getPhrasingContentSchema() {
	const phrasingContentSchema = {
		strong: {},
		em: {},
		del: {},
		ins: {},
		a: { attributes: [ 'href' ] },
		code: {},
		abbr: { attributes: [ 'title' ] },
		sub: {},
		sup: {},
		br: {},
		[ TEXT_NODE ]: {},
	};

	// Recursion is needed.
	// Possible: strong > em > strong.
	// Impossible: strong > strong.
	[ 'strong', 'em', 'del', 'ins', 'a', 'code', 'abbr', 'sub', 'sup' ].forEach( ( tag ) => {
		phrasingContentSchema[ tag ].children = omit( phrasingContentSchema, tag );
	} );

	return phrasingContentSchema;
}

/**
 * Find out whether or not the given node is phrasing content.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/Guide/HTML/Content_categories#Phrasing_content
 *
 * @param {Element} node The node to test.
 *
 * @return {boolean} True if phrasing content, false if not.
 */
export function isPhrasingContent( node ) {
	const tag = node.nodeName.toLowerCase();
	return getPhrasingContentSchema().hasOwnProperty( tag ) || tag === 'span';
}

export function getBlockContentSchema( transforms ) {
	return transforms.reduce( ( accu, { schema = {} } ) => {
		Object.keys( schema ).forEach( ( tag ) => {
			if ( accu[ tag ] ) {
				if ( accu[ tag ].children || schema[ tag ].children ) {
					accu[ tag ].children = {
						...accu[ tag ].children,
						...schema[ tag ].children,
					};
				}

				accu[ tag ].attributes = [
					...( accu[ tag ].attributes || [] ),
					...( schema[ tag ].attributes || [] ),
				];

				accu[ tag ].require = [
					...( accu[ tag ].require || [] ),
					...( schema[ tag ].require || [] ),
				];
			} else {
				accu = { ...accu, [ tag ]: schema[ tag ] };
			}
		} );

		return accu;
	}, {} );
}

export function isEmpty( element ) {
	if ( ! element.hasChildNodes() ) {
		return true;
	}

	return Array.from( element.childNodes ).every( ( node ) => {
		if ( node.nodeType === TEXT_NODE ) {
			return ! node.nodeValue.trim();
		}

		if ( node.nodeType === ELEMENT_NODE ) {
			if ( node.nodeName === 'BR' ) {
				return true;
			} else if ( node.hasAttributes() ) {
				return false;
			}

			return isEmpty( node );
		}

		return true;
	} );
}

export function isPlain( HTML ) {
	const doc = document.implementation.createHTMLDocument( '' );

	doc.body.innerHTML = HTML;

	const brs = doc.querySelectorAll( 'br' );

	// Remove all BR nodes.
	Array.from( brs ).forEach( ( node ) => {
		node.parentNode.replaceChild( doc.createTextNode( '\n' ), node );
	} );

	// Merge all text nodes.
	doc.body.normalize();

	// If it's plain text, there should only be one node left.
	return doc.body.childNodes.length === 1 && doc.body.firstChild.nodeType === TEXT_NODE;
}

/**
 * Given node filters, deeply filters and mutates a NodeList.
 *
 * @param {NodeList} nodeList The nodeList to filter.
 * @param {Array}    filters  An array of functions that can mutate with the provided node.
 * @param {Document} doc      The document of the nodeList.
 * @param {Object}   schema   The schema to use.
 */
export function deepFilterNodeList( nodeList, filters, doc, schema ) {
	Array.from( nodeList ).forEach( ( node ) => {
		deepFilterNodeList( node.childNodes, filters, doc, schema );

		filters.forEach( ( item ) => {
			// Make sure the node is still attached to the document.
			if ( ! doc.contains( node ) ) {
				return;
			}

			item( node, doc, schema );
		} );
	} );
}

/**
 * Given node filters, deeply filters HTML tags.
 * Filters from the deepest nodes to the top.
 *
 * @param {string} HTML    The HTML to filter.
 * @param {Array}  filters An array of functions that can mutate with the provided node.
 * @param {Object} schema  The schema to use.
 *
 * @return {string} The filtered HTML.
 */
export function deepFilterHTML( HTML, filters = [], schema ) {
	const doc = document.implementation.createHTMLDocument( '' );

	doc.body.innerHTML = HTML;

	deepFilterNodeList( doc.body.childNodes, filters, doc, schema );

	return doc.body.innerHTML;
}

/**
 * Given a schema, unwraps or removes nodes, attributes and classes on a node
 * list.
 *
 * @param {NodeList} nodeList The nodeList to filter.
 * @param {Document} doc      The document of the nodeList.
 * @param {Object}   schema   An array of functions that can mutate with the provided node.
 * @param {Object}   inline   Whether to clean for inline mode.
 */
function cleanNodeList( nodeList, doc, schema, inline ) {
	Array.from( nodeList ).forEach( ( node ) => {
		const tag = node.nodeName.toLowerCase();

		// It's a valid child.
		if ( schema.hasOwnProperty( tag ) || schema.hasOwnProperty( node.nodeType ) ) {
			if ( node.nodeType === ELEMENT_NODE ) {
				const { attributes = [], classes = [], children, require = [] } = schema[ tag ];

				// If the node is empty and it's supposed to have children,
				// remove the node.
				if ( isEmpty( node ) && children ) {
					remove( node );
					return;
				}

				// Strip invalid attributes.
				Array.from( node.attributes ).forEach( ( { name } ) => {
					if ( name === 'class' || attributes.indexOf( name ) !== -1 ) {
						return;
					}

					node.removeAttribute( name );
				} );

				// Strip invalid classes.
				const oldClasses = node.getAttribute( 'class' ) || '';
				const newClasses = oldClasses
					.split( ' ' )
					.filter( ( name ) => name && classes.indexOf( name ) !== -1 )
					.join( ' ' );

				if ( newClasses.length ) {
					node.setAttribute( 'class', newClasses );
				} else {
					node.removeAttribute( 'class' );
				}

				if ( node.hasChildNodes() ) {
					// Contine if the node is supposed to have children.
					if ( children ) {
						// If a parent requires certain children, but it does
						// not have them, drop the parent and continue.
						if ( require.length && ! node.querySelector( require.join( ',' ) ) ) {
							cleanNodeList( node.childNodes, doc, schema, inline );
							unwrap( node );
						}

						cleanNodeList( node.childNodes, doc, children, inline );
					// Remove children if the node is not supposed to have any.
					} else {
						while ( node.firstChild ) {
							node.removeNode( node.firstChild );
						}
					}
				}
			}
		// Invalid child. Continue with schema at the same place and unwrap.
		} else {
			cleanNodeList( node.childNodes, doc, schema, inline );

			// For inline mode, insert a line break when unwrapping nodes that
			// are not phrasing content.
			if ( inline && ! isPhrasingContent( node ) && node.nextElementSibling ) {
				insertAfter( doc.createElement( 'br' ), node );
			}

			unwrap( node );
		}
	} );
}

/**
 * Given a schema, unwraps or removes nodes, attributes and classes on HTML.
 *
 * @param {string} HTML   The HTML to clean up.
 * @param {Object} schema Schema for the HTML.
 * @param {Object} inline Whether to clean for inline mode.
 *
 * @return {string} The cleaned up HTML.
 */
export function removeInvalidHTML( HTML, schema, inline ) {
	const doc = document.implementation.createHTMLDocument( '' );

	doc.body.innerHTML = HTML;

	cleanNodeList( doc.body.childNodes, doc, schema, inline );

	return doc.body.innerHTML;
}
