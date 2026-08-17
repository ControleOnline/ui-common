import React from 'react';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import DefaultUpload from '@controleonline/ui-default/src/react/components/upload/DefaultUpload';
import { extractFileId, toFileIri, uploadFileToApi } from '@controleonline/ui-default/src/react/components/upload/fileUpload';
import styles from './IntegrationConfigPage.styles';

const FileField = ({ field, value, editable, providerId, updateField }) => (
  <View style={styles.fileFieldWrap}>
    <Text style={styles.fieldHint}>
      {value
        ? `Arquivo vinculado (id: ${String(value).replace(/\D/g, '') || value})`
        : 'Nenhum certificado vinculado.'}
    </Text>
    <DefaultUpload
      relationStoreName="people"
      relationField="people"
      relationResource="people"
      entityId={providerId}
      companyId={providerId}
      context={field.fileContext || 'company_certificate'}
      libraryContexts={[field.fileContext || 'company_certificate']}
      acceptedTypes={field.accept || '.pfx,.p12,application/x-pkcs12'}
      fileType=""
      fileTypeLabel="certificado"
      title={field.label}
      triggerLabel="Gerenciar certificado"
      managerTitle="Gerenciador de arquivos"
      searchPlaceholder="Buscar certificado"
      uploadButtonLabel="Enviar certificado"
      emptyAttachmentLabel="Nenhum certificado anexado."
      emptyLibraryLabel="Nenhum arquivo encontrado."
      uploadSuccessMessage="Certificado enviado."
      attachSuccessMessage="Certificado vinculado."
      removeSuccessMessage="Certificado removido."
      showInlineContent={false}
      uploadResultAlreadyAttached
      requireEntity={false}
      onUploadFile={async ({ file, companyId, context, entityId }) => {
        const uploaded = await uploadFileToApi({
          file,
          context: context || field.fileContext || 'company_certificate',
          peopleId: companyId || providerId,
          entityId: entityId || providerId,
        });
        const id = extractFileId(uploaded);
        const valueToSave = id ? String(id) : toFileIri(uploaded) || '';
        if (!valueToSave) throw new Error('Upload sem identificador de arquivo.');
        updateField(field.key, valueToSave);
        return uploaded;
      }}
      onAttachFile={async fileObj => {
        const id = extractFileId(fileObj);
        const valueToSave = id ? String(id) : toFileIri(fileObj) || '';
        if (!valueToSave) throw new Error('Arquivo sem identificador.');
        updateField(field.key, valueToSave);
        return fileObj;
      }}
      onRemoveAttachment={async () => {
        updateField(field.key, '');
        return true;
      }}
      renderTrigger={({ openManager, uploading }) => (
        <TouchableOpacity
          style={[styles.filePickerButton, !editable && styles.inputDisabled]}
          disabled={!editable || uploading}
          activeOpacity={0.85}
          onPress={openManager}>
          {uploading ? <ActivityIndicator color="#166534" /> : <Icon name="folder" size={16} color="#166534" />}
          <Text style={styles.filePickerButtonText}>
            {value ? 'Trocar certificado (gerenciador)' : 'Selecionar / enviar certificado'}
          </Text>
        </TouchableOpacity>
      )}
    />
  </View>
);

export default function IntegrationConfigFields({
  fields,
  configValues,
  editable,
  embedded,
  providerId,
  updateField,
}) {
  return fields.map(field => {
    const value = configValues[field.key] || '';
    return (
      <View key={field.key} style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>{field.label}</Text>
        {!embedded ? <Text style={styles.fieldKey}>{field.key}</Text> : null}
        {field.type === 'select' ? (
          <View style={styles.selectList}>
            {(field.options || []).map(option => {
              const selected = String(value) === String(option.value);
              return (
                <TouchableOpacity
                  key={String(option.value)}
                  style={[styles.selectOption, selected && styles.selectOptionActive, !editable && styles.inputDisabled]}
                  disabled={!editable}
                  activeOpacity={0.85}
                  onPress={() => updateField(field.key, String(option.value))}>
                  <Text style={[styles.selectOptionText, selected && styles.selectOptionTextActive]}>{option.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : field.type === 'file' ? (
          <FileField field={field} value={value} editable={editable} providerId={providerId} updateField={updateField} />
        ) : (
          <TextInput
            style={[styles.input, !editable && styles.inputDisabled]}
            value={value}
            onChangeText={nextValue => updateField(field.key, nextValue)}
            editable={editable}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry={Boolean(field.secureTextEntry)}
            placeholder={field.placeholder}
          />
        )}
      </View>
    );
  });
}
