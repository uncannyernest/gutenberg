/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { IconButton } from '@wordpress/components';
import {
	PostPreviewButton,
	PostSavedState,
	PostPublishPanelToggle,
} from '@wordpress/editor';
import { withDispatch, withSelect } from '@wordpress/data';
import { compose } from '@wordpress/element';

/**
 * Internal dependencies
 */
import './style.scss';
import MoreMenu from './more-menu';
import HeaderToolbar from './header-toolbar';

function Header( {
	isEditorSidebarOpened,
	openGeneralSidebar,
	closeGeneralSidebar,
	isPublishSidebarOpened,
	togglePublishSidebar,
	hasActiveMetaboxes,
	isSaving,
} ) {
	const toggleGeneralSidebar = isEditorSidebarOpened ? closeGeneralSidebar : openGeneralSidebar;

	return (
		<div
			role="region"
			aria-label={ __( 'Editor toolbar' ) }
			className="edit-post-header"
			tabIndex="-1"
		>
			<HeaderToolbar />
			{ ! isPublishSidebarOpened && (
				<div className="edit-post-header__settings">
					<PostSavedState
						forceIsDirty={ hasActiveMetaboxes }
						forceIsSaving={ isSaving }
					/>
					<PostPreviewButton />
					<PostPublishPanelToggle
						isOpen={ isPublishSidebarOpened }
						onToggle={ togglePublishSidebar }
						forceIsDirty={ hasActiveMetaboxes }
						forceIsSaving={ isSaving }
					/>
					<IconButton
						icon="admin-generic"
						onClick={ toggleGeneralSidebar }
						isToggled={ isEditorSidebarOpened }
						label={ __( 'Settings' ) }
						aria-expanded={ isEditorSidebarOpened }
					/>
					<MoreMenu key="more-menu" />
				</div>
			) }
		</div>
	);
}

export default compose(
	withSelect( ( select ) => ( {
		isEditorSidebarOpened: select( 'core/edit-post' ).isEditorSidebarOpened(),
		isPublishSidebarOpened: select( 'core/edit-post' ).isPublishSidebarOpened(),
		hasActiveMetaboxes: select( 'core/edit-post' ).hasMetaBoxes(),
		isSaving: select( 'core/edit-post' ).isSavingMetaBoxes(),
	} ) ),
	withDispatch( ( dispatch ) => ( {
		openGeneralSidebar: () => dispatch( 'core/edit-post' ).openGeneralSidebar( 'edit-post/document' ),
		closeGeneralSidebar: dispatch( 'core/edit-post' ).closeGeneralSidebar,
		togglePublishSidebar: dispatch( 'core/edit-post' ).togglePublishSidebar,
	} ) ),
)( Header );
