/**
 * Internal dependencies
 */
import embeddedContentReducer from '../embedded-content-reducer';
import { deepFilterHTML } from '../utils';

describe( 'embeddedContentReducer', () => {
	const schema = {
		figure: {
			children: {
				img: {},
			},
		},
	};

	it( 'should move embedded content from paragraph', () => {
		const input = '<p><strong>test<img class="one"></strong><img class="two"></p>';
		const output = '<figure><img class="one"></figure><figure><img class="two"></figure><p><strong>test</strong></p>';

		expect( deepFilterHTML( input, [ embeddedContentReducer ], schema ) ).toEqual( output );
	} );

	it( 'should move an anchor with just an image from paragraph', () => {
		const input = '<p><a href="#"><img class="one"></a><strong>test</strong></p>';
		const output = '<figure><a href="#"><img class="one"></a></figure><p><strong>test</strong></p>';

		expect( deepFilterHTML( input, [ embeddedContentReducer ], schema ) ).toEqual( output );
	} );

	it( 'should move multiple images', () => {
		const input = '<p><a href="#"><img class="one"></a><img class="two"><strong>test</strong></p>';
		const output = '<figure><a href="#"><img class="one"></a></figure><figure><img class="two"></figure><p><strong>test</strong></p>';

		expect( deepFilterHTML( input, [ embeddedContentReducer ], schema ) ).toEqual( output );
	} );
} );
