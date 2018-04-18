/**
 * External dependencies
 */
import showdown from 'showdown';
import { find, flatMap, filter } from 'lodash';

/**
 * WordPress dependencies
 */
import { unwrap } from '@wordpress/utils';

/**
 * Internal dependencies
 */
import { createBlock, getBlockTransforms } from '../factory';
import { getBlockType } from '../registration';
import { getBlockAttributes, parseWithGrammar } from '../parser';
import normaliseBlocks from './normalise-blocks';
import specialCommentConverter from './special-comment-converter';
import isInlineContent from './is-inline-content';
import phrasingContentReducer from './phrasing-content-reducer';
import msListConverter from './ms-list-converter';
import listReducer from './list-reducer';
import imageCorrector from './image-corrector';
import blockquoteNormaliser from './blockquote-normaliser';
import embeddedContentReducer from './embedded-content-reducer';
import shortcodeConverter from './shortcode-converter';
import slackMarkdownVariantCorrector from './slack-markdown-variant-corrector';
import {
	deepFilterHTML,
	isPlain,
	removeInvalidHTML,
	getPhrasingContentSchema,
	getBlockContentSchema,
} from './utils';

export { getPhrasingContentSchema };

/**
 * Converts a piece of text into HTML based on any Markdown present.
 * Also decodes any encoded HTML.
 *
 * @param {string} text The plain text to convert.
 *
 * @return {string} HTML.
 */
function convertMarkdown( text ) {
	const converter = new showdown.Converter();

	converter.setOption( 'noHeaderId', true );
	converter.setOption( 'tables', true );
	converter.setOption( 'literalMidWordUnderscores', true );
	converter.setOption( 'omitExtraWLInCodeBlocks', true );
	converter.setOption( 'simpleLineBreaks', true );

	text = slackMarkdownVariantCorrector( text );

	return converter.makeHtml( text );
}

/**
 * Filters HTML to only contain phrasing content.
 *
 * @param {string} HTML The HTML to filter.
 *
 * @return {string} HTML only containing phrasing content.
 */
function filterInlineHTML( HTML ) {
	HTML = deepFilterHTML( HTML, [ phrasingContentReducer ] );
	HTML = removeInvalidHTML( HTML, getPhrasingContentSchema(), { inline: true } );

	// Allows us to ask for this information when we get a report.
	window.console.log( 'Processed inline HTML:\n\n', HTML );

	return HTML;
}

function getRawTransformations() {
	return filter( getBlockTransforms( 'from' ), { type: 'raw' } )
		.map( ( transform ) => ( {
			isMatch: ( node ) => transform.selector && node.matches( transform.selector ),
			...transform,
		} ) );
}

/**
 * Converts an HTML string to known blocks. Strips everything else.
 *
 * @param {string}  [options.HTML]                     The HTML to convert.
 * @param {string}  [options.plainText]                Plain text version.
 * @param {string}  [options.mode]                     Handle content as blocks or inline content.
 *                                                     * 'AUTO': Decide based on the content passed.
 *                                                     * 'INLINE': Always handle as inline content, and return string.
 *                                                     * 'BLOCKS': Always handle as blocks, and return array of blocks.
 * @param {Array}   [options.tagName]                  The tag into which content will be inserted.
 * @param {boolean} [options.canUserUseUnfilteredHTML] Whether or not the user can use unfiltered HTML.
 *
 * @return {Array|string} A list of blocks or a string, depending on `handlerMode`.
 */
export default function rawHandler( { HTML = '', plainText = '', mode = 'AUTO', tagName, canUserUseUnfilteredHTML = false } ) {
	// First of all, strip any meta tags.
	HTML = HTML.replace( /<meta[^>]+>/, '' );

	// If we detect block delimiters, parse entirely as blocks.
	if ( mode !== 'INLINE' && HTML.indexOf( '<!-- wp:' ) !== -1 ) {
		return parseWithGrammar( HTML );
	}

	// Parse Markdown (and encoded HTML) if:
	// * There is a plain text version.
	// * There is no HTML version, or it has no formatting.
	if ( plainText && ( ! HTML || isPlain( HTML ) ) ) {
		HTML = convertMarkdown( plainText );

		// Switch to inline mode if:
		// * The current mode is AUTO.
		// * The original plain text had no line breaks.
		// * The original plain text was not an HTML paragraph.
		// * The converted text is just a paragraph.
		if (
			mode === 'AUTO' &&
			plainText.indexOf( '\n' ) === -1 &&
			plainText.indexOf( '<p>' ) !== 0 &&
			HTML.indexOf( '<p>' ) === 0
		) {
			mode = 'INLINE';
		}
	}

	// An array of HTML strings and block objects. The blocks replace matched
	// shortcodes.
	const pieces = shortcodeConverter( HTML );

	// The call to shortcodeConverter will always return more than one element
	// if shortcodes are matched. The reason is when shortcodes are matched
	// empty HTML strings are included.
	const hasShortcodes = pieces.length > 1;

	if ( mode === 'INLINE' ) {
		return filterInlineHTML( HTML );
	}

	if ( mode === 'AUTO' && ! hasShortcodes && isInlineContent( HTML, tagName ) ) {
		return filterInlineHTML( HTML );
	}

	const rawTransformations = getRawTransformations();
	const phrasingContentSchema = getPhrasingContentSchema();
	const blockContentSchema = getBlockContentSchema( rawTransformations );

	return flatMap( pieces, ( piece ) => {
		// Already a block from shortcode.
		if ( typeof piece !== 'string' ) {
			return piece;
		}

		const filters = [
			msListConverter,
			listReducer,
			imageCorrector,
			phrasingContentReducer,
			specialCommentConverter,
			embeddedContentReducer,
			blockquoteNormaliser,
		];

		if ( ! canUserUseUnfilteredHTML ) {
			filters.unshift( ( node ) =>
				node.nodeName === 'iframe' && unwrap( node )
			);
		}

		const schema = {
			...blockContentSchema,
			// Keep top-level phrasing content, normalised by `normaliseBlocks`.
			...phrasingContentSchema,
		};

		piece = deepFilterHTML( piece, filters, blockContentSchema );
		piece = removeInvalidHTML( piece, schema );
		piece = normaliseBlocks( piece );

		// Allows us to ask for this information when we get a report.
		window.console.log( 'Processed HTML piece:\n\n', piece );

		const doc = document.implementation.createHTMLDocument( '' );

		doc.body.innerHTML = piece;

		return Array.from( doc.body.children ).map( ( node ) => {
			const { transform, blockName } =
				find( rawTransformations, ( { isMatch } ) => isMatch( node ) );

			if ( transform ) {
				return transform( node );
			}

			return createBlock(
				blockName,
				getBlockAttributes(
					getBlockType( blockName ),
					node.outerHTML
				)
			);
		} );
	} );
}
