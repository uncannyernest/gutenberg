/**
  * WordPress dependencies
  */
import { Component } from '@wordpress/element';

/**
 * Internal dependencies
 */
import ModalHeader from './modalHeader';

/**
 * External dependencies
 */
import ReactModal from 'react-modal';
import { noop } from 'lodash';

ReactModal.setAppElement( document.getElementById( 'wpwrap' ) );

class Modal extends Component {
	constructor( props ) {
		super( props );

		this.state = {
			isOpen: true,
			height: window.innerHeight - 32,
		};

		this.updateWindowHeight = this.updateWindowHeight.bind(this);
		this.onClose = this.onClose().bind(this);
	}

	componentDidMount() {
		window.addEventListener( 'resize', this.updateWindowHeight );
	}

	componentWillUnmount() {
		window.removeEventListener( 'resize', this.updateWindowHeight );
	}

	updateWindowHeight() {
		this.setState( {
			height: window.innerHeight - 32,
		} );
	}

	onClose() {
		this.setState( {
			isOpen: false,
		} );
	}

	render() {
		const { height } = this.state;
		const { icon, title, children, onRequestClose, render, shouldCloseOnEsc, shouldCloseOnClickOutside, parentSelector } = this.props;
		return <ReactModal
			isOpen={ this.state.isOpen }
			className={ 'edit-post-plugin-screen-takeover__editor-screen-takeover' }
			overlayClassName={ 'edit-post-plugin-screen-takeover__editor-screen-takeover-overlay' }
			parentSelector={ parentSelector }
			render={ render }
			onRequestClose={ onRequestClose ? onRequestClose : this.onClose }
			shouldCloseOnEsc={ shouldCloseOnEsc }
			shouldCloseOnClickOutside={ shouldCloseOnClickOutside }
			style={ {
				overlay: {
					height: height,
				},
			} }
		>
			<ModalHeader icon={ icon } title={ title } onClose={ this.onClose } />
			<div className="edit-post-plugin-screen-takeover__editor-screen-takeover-content" aria-labelledby="modalID">
				{ children }
			</div>
		</ReactModal>;
	}
}

Modal.defaultProps = {
	className: null,
	overlayClassName: null,
	onRequestClose: this.onClose,
	render: true,
	shouldCloseOnEsc: true,
	shouldCloseOnClickOutside: true,
	parentSelector: () => document.getElementsByClassName( 'gutenberg' )[ 0 ],
	/* accessibility */
	contentLabel: null,
	aria: {
		labelledby: null,
		describedby: null,
	},
};

export default Modal;
