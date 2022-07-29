/**
 * @license Copyright (c) 2003-2022, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see https://ckeditor.com/legal/ckeditor-oss-license
 */

CKEDITOR.editorConfig = function( config ) {
	// Define changes to default configuration here.
	// For complete reference see:
	// https://ckeditor.com/docs/ckeditor4/latest/api/CKEDITOR_config.html

	// The toolbar groups arrangement, optimized for two toolbar rows.
	config.extraPlugins = 'colorbutton';
	config.toolbarGroups = [
		{ name: 'clipboard',   groups: [ 'clipboard', 'undo' ] },
		{ name: 'editing',     groups: [ 'find', 'selection', 'spellchecker' ] },
		{ name: 'links' },
		{ name: 'insert' },
		{ name: 'forms' },
		{ name: 'tools' },
		{ name: 'document',	   groups: [ 'mode', 'document', 'doctools' ] },
		{ name: 'others' },
		'/',
		{ name: 'basicstyles', groups: [ 'basicstyles', 'cleanup' ] },
		{ name: 'paragraph',   groups: [ 'list', 'indent', 'blocks', 'align', 'bidi' ] },
		{ name: 'styles' },
		{ name: 'colors' },
		{ name: 'about' }
	];

	// Remove some buttons provided by the standard plugins, which are
	// not needed in the Standard(s) toolbar.
	config.removeButtons = 'Underline,Subscript,Superscript';

	// Set the most common block elements.
	config.format_tags = 'p;h1;h2;h3;pre';

	// Simplify the dialog windows.
	config.removeDialogTabs = 'image:advanced;link:advanced';
    config.height = '380px';
};

CKEDITOR.on('dialogDefinition', function (ev) {
    var dialogName = ev.data.name;
    var dialogDefinition = ev.data.definition;

    if (dialogName === 'image') {
        var uploadTab = dialogDefinition.getContents('Upload');
        if (uploadTab) {
            var upload = uploadTab.get('upload');
            if (upload) upload.label = '画像を選択してください';

            var uploadButton = uploadTab.get('uploadButton');
            if (uploadButton) uploadButton.label = 'アップロード';
        }

        var infoTab = dialogDefinition.getContents('info');
        if (infoTab) {
            infoTab.remove('txtAlt');
            infoTab.get('txtUrl')['hidden'] = true;
            infoTab.remove('txtHSpace');
            infoTab.remove('txtVSpace');
            infoTab.remove('txtBorder');
            infoTab.remove('cmbAlign');

            var browse = infoTab.get('browse');
            if (browse) browse.label = 'アップロード済みの画像を選択';
        }

        // remove unnecessary tabs
        if (dialogDefinition.getContents('Link')) dialogDefinition.removeContents('Link');
        if (dialogDefinition.getContents('advanced')) dialogDefinition.removeContents('advanced');
    }
});
