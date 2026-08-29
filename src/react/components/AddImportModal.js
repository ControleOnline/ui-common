import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
} from 'react-native';

import Icon from 'react-native-vector-icons/MaterialIcons';
import { useStore } from '@store';
import AnimatedModal from './AnimatedModal';
import { useMessage } from '@controleonline/ui-common/src/react/components/MessageService';
import DefaultUpload from '@controleonline/ui-default/src/react/components/upload/DefaultUpload';
import { resolveSystemErrorMessage } from '@controleonline/ui-common/src/react/utils/systemErrorMessage';
import styles from './AddImportModal.styles';

const AddImportModal = ({
    visible,
    onClose,
    onSuccess,
    context = {},
    allowedExtensions = [], // default will be set to ['csv'] if empty
    // acceptedTypes will be derived from allowedExtensions for security
    helperLabel,
    modalTitle,
    fileLabel,
    selectFileLabel,
    cancelLabel,
    importSuccessLabel,
    importErrorLabel,
    importType = null,
}) => {
    const fallbackModalTitle = global.t?.t('imports', 'title', 'new_import');
    const fallbackFileLabel = global.t?.t('imports', 'label', 'file');
    const fallbackSelectFileLabel = global.t?.t('imports', 'button', 'select_file');
    const fallbackCancelLabel = global.t?.t('imports', 'button', 'cancel');
    const fallbackSuccessLabel = global.t?.t('imports', 'success', 'import_sent_successfully');
    const fallbackErrorLabel = global.t?.t('imports', 'error', 'error_sending_import');
    const fallbackInvalidFileLabel = global.t?.t('imports', 'message', 'invalid_file_extension');
    const _modalTitle = modalTitle ?? fallbackModalTitle;
    const _fileLabel = fileLabel ?? fallbackFileLabel;
    const _selectFileLabel = selectFileLabel ?? fallbackSelectFileLabel;
    const _cancelLabel = cancelLabel ?? fallbackCancelLabel;
    const _importSuccessLabel = importSuccessLabel ?? fallbackSuccessLabel;
    const _importErrorLabel = importErrorLabel ?? fallbackErrorLabel;
    const _helperLabel = helperLabel ?? fallbackInvalidFileLabel;
    // Resolve allowed extensions securely – default to CSV only
    const _allowedExtensions = (allowedExtensions && allowedExtensions.length > 0) ? allowedExtensions : ['csv'];
    // Build acceptedTypes string for file input (e.g., ".csv,.xml,.zip")
    const _acceptedTypes = _allowedExtensions.map(ext => `.${ext}`).join(',');
    // Determine import type: prioritize prop, then infer from allowed extensions, default to 'csv'
    const _importType = importType ?? (_allowedExtensions.includes('xml') ? 'xml' : (_allowedExtensions.includes('zip') ? 'zip' : 'csv'));
    const { showError, showSuccess } = useMessage();
    const peopleStore = useStore('people');
    const importsStore = useStore('imports');
    const themeStore = useStore('theme');
    const getters = peopleStore.getters;
    const { currentCompany } = getters;
    const importActions = importsStore.actions || {};
    const themeColors = themeStore?.getters?.colors || {};
    const buttonPalette = {
        buttonBackground: themeColors.buttonBackground,
        buttonBorder: themeColors.buttonBorder,
        buttonText: themeColors.buttonText,
        buttonIcon: themeColors.buttonIcon || themeColors.buttonText,
    };



    const handleUploadImportFile = async ({ file }) => {
        if (_allowedExtensions.length > 0) {
            const extensionRegex = new RegExp(`\\.(${_allowedExtensions.join('|')})$`, 'i');
            if (!file?.name?.toLowerCase().match(extensionRegex)) {
                throw new Error(_helperLabel);
            }
        }

        try {
            await importActions.uploadImportFile({
                file,
                importType: _importType,
                peopleId: currentCompany.id,
            });
            showSuccess(_importSuccessLabel);
            if (onSuccess) onSuccess();
            handleClose();
            return file;
        } catch (error) {
            const importFeedback =
                resolveSystemErrorMessage(error) || _importErrorLabel;
            showError(importFeedback);
            throw new Error(importFeedback);
        }
    };

    const handleClose = () => {
        onClose();
    };

    return (
        <AnimatedModal
            visible={visible}
            onRequestClose={handleClose}
            style={styles.modalAlignEnd}
        >
            <View style={styles.sheet}>
                <View style={styles.header}>
                    <Text style={styles.title}>{_modalTitle}</Text>
                    <TouchableOpacity onPress={handleClose}>
                        <Icon name="close" size={24} />
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.content}>
                    <Text style={styles.label}>{_fileLabel}</Text>
                    <DefaultUpload
                        relationField="import"
                        relationResource="imports"
                        entityId={context.context || 'import'}
                        companyId={currentCompany.id}
                        context={`imports-${context.context || 'default'}`}
                        libraryContexts={[`imports-${context.context || 'default'}`]}
                        acceptedTypes={_acceptedTypes}
                        fileType=""
                        title={_fileLabel}
                        triggerLabel={_selectFileLabel}
                        managerTitle={_modalTitle}
                        searchPlaceholder={_selectFileLabel}
                        uploadButtonLabel={_selectFileLabel}
                        emptyAttachmentLabel=""
                        emptyLibraryLabel={_selectFileLabel}
                        showInlineContent={false}
                        uploadResultAlreadyAttached
                        requireEntity={false}
                        onUploadFile={handleUploadImportFile}
                        renderTrigger={({openManager, uploading}) => (
                            <TouchableOpacity
                                onPress={openManager}
                                disabled={uploading}
                                style={[
                                    styles.filePicker,
                                    {
                                        backgroundColor: buttonPalette.buttonBackground,
                                        borderColor: buttonPalette.buttonBorder,
                                    },
                                ]}
                            >
                                <Text numberOfLines={1} style={[styles.fileName, { color: buttonPalette.buttonText }]}>
                                    {selectFileLabel}
                                </Text>
                                {uploading ? (
                                    <ActivityIndicator color={buttonPalette.buttonIcon} />
                                ) : (
                                    <Icon name="upload-file" size={22} color={buttonPalette.buttonIcon} />
                                )}
                            </TouchableOpacity>
                        )}
                    />

                </ScrollView>

                <View style={styles.footer}>
                    <TouchableOpacity onPress={handleClose} style={styles.secondaryButton}>
                        <Text>{_cancelLabel}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </AnimatedModal>
    );
};

export default AddImportModal;
// TODO(store-first): quando este arquivo for mexido, mover a leitura para stores e evitar chamadas HTTP diretas quando o store ja resolver isso.
