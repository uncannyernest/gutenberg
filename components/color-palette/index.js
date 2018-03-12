/**
 * External dependencies
 */
import classnames from 'classnames';
import { ChromePicker } from 'react-color';
import { map } from 'lodash';

/**
 * WordPress dependencies
 */
import { __, sprintf } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import './style.scss';
import Dropdown from '../dropdown';

export default function ColorPalette( { colors, disableCustomColors = false, value, onChange } ) {
	function applyOrUnset( color ) {
		return () => onChange( value === color ? undefined : color );
	}

	return (
		<div className="components-color-palette">
			{ map( colors, ( color ) => {
				const style = { color: color };
				const className = classnames( 'components-color-palette__item', { 'is-active': value === color } );

				return (
					<div key={ color } className="components-color-palette__item-wrapper">
						<button
							type="button"
							className={ className }
							style={ style }
							onClick={ applyOrUnset( color ) }
							aria-label={ sprintf( __( 'Color: %s' ), color ) }
							aria-pressed={ value === color }
						/>
					</div>
				);
			} ) }

			{ ! disableCustomColors &&
				<Dropdown
					className="components-color-palette__item-wrapper components-color-palette__custom-color"
					contentClassName="components-color-palette__picker "
					renderToggle={ ( { isOpen, onToggle } ) => (
						<button
							type="button"
							aria-expanded={ isOpen }
							className="components-color-palette__item"
							onClick={ onToggle }
							aria-label={ __( 'Custom color picker' ) }
						>
							<span className="components-color-palette__custom-color-gradient" />
						</button>
					) }
					renderContent={ () => (
						<ChromePicker
							color={ value }
							onChangeComplete={ ( color ) => onChange( color.hex ) }
							style={ { width: '100%' } }
							disableAlpha
						/>
					) }
				/>
			}

			<button
				className="button-link components-color-palette__clear"
				type="button"
				onClick={ () => onChange( undefined ) }
			>
				{ __( 'Clear' ) }
			</button>
		</div>
	);
}
