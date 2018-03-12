/**
 * External dependencies
 */
import { omit } from 'lodash';

/**
 * WordPress dependencies
 */
import { ifCondition, PanelColor as PanelColorComponent } from '@wordpress/components';
import { compose } from '@wordpress/element';

/**
 * Internal dependencies
 */
import ColorPalette from '../color-palette';
import withColorContext from '../with-color-context';

function PanelColor( { title, value, ...props } ) {
	return (
		<PanelColorComponent title={ title } colorValue={ value }>
			<ColorPalette
				value={ value }
				{ ...omit( props, [ 'disableCustomColors', 'colors' ] ) }
			/>
		</PanelColorComponent>
	);
}

export default compose( [
	withColorContext,
	ifCondition( ( { hasColorsToChoose } ) => hasColorsToChoose ),
] )( PanelColor );
