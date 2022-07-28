CKEDITOR.editorConfig = function( config ) {
	config.toolbar = [
		{ name: 'basicstyles', items: [ 'Bold', 'Italic', 'Underline', 'Strike', 'Subscript', 'Superscript', '-', 'RemoveFormat' ] },
		{ name: 'paragraph', items: [ 'NumberedList', 'BulletedList', '-', 'Outdent', 'Indent', '-', 'Blockquote', '-', 'JustifyLeft', 'JustifyCenter', 'JustifyRight', 'JustifyBlock'] },
		'/',
		{ name: 'links', items: [ 'Link', 'Unlink' ] },
		{ name: 'styles', items: [ 'Styles', 'Format', 'Font', 'FontSize' ] },
		'/',
		{ name: 'colors', items: [ 'TextColor', 'BGColor' ] },
		{ name: 'insert', items: [ 'Table', 'HorizontalRule',  'SpecialChar'] },
		{ name: 'tools', items: [ 'ShowBlocks' ] },
		{ name: 'document', items: [ 'Source' ] },
	];
	config.allowedContent = true;
};