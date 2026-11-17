/*
 * @agents E-mail connection (connections.channel = email): IMAP to read customer e-mails and SMTP to
 * answer them. Credentials go to channel_config (write-only on the API; never read back).
 * Inbound polling runs with the `email:fetch` cron job (api-platform-integration).
 */
import React, {useState} from 'react';
import {ActivityIndicator, Modal, ScrollView, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {useStore} from '@store';

const FIELDS = [
  ['name', 'Nome da conexão', 'Atendimento por e-mail'],
  ['from_address', 'E-mail de atendimento', 'atendimento@empresa.com.br'],
  ['from_name', 'Nome do remetente', 'Equipe Empresa'],
  ['username', 'Usuário (login)', 'atendimento@empresa.com.br'],
  ['password', 'Senha / senha de app', ''],
  ['imap_host', 'Servidor IMAP', 'imap.gmail.com'],
  ['imap_port', 'Porta IMAP', '993'],
  ['smtp_host', 'Servidor SMTP', 'smtp.gmail.com'],
  ['smtp_port', 'Porta SMTP', '587'],
];
const TYPES = [
  ['support', 'Suporte'],
  ['relationship', 'Comercial'],
];

export default function EmailConnectionModal({visible, peopleIri, onClose, onSaved}) {
  const connectionsStore = useStore('connections');
  const [form, setForm] = useState({imap_port: '993', smtp_port: '587', type: 'support'});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = key => value => setForm(prev => ({...prev, [key]: value}));

  const save = async () => {
    const required = ['from_address', 'username', 'password', 'imap_host', 'smtp_host'];
    if (required.some(k => !String(form[k] || '').trim())) {
      setError('Preencha e-mail, usuário, senha, IMAP e SMTP.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await connectionsStore.actions.saveEmailConnection({...form, people: peopleIri});
      setForm({imap_port: '993', smtp_port: '587', type: 'support'});
      onSaved?.();
    } catch (e) {
      setError(e?.message || 'Não foi possível salvar a conexão.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={s.card}>
          <Text style={s.title}>Conexão de e-mail</Text>
          <Text style={s.text}>
            E-mails recebidos viram conversas: a IA atende (se configurada) e a equipe responde pelo CRM ou Suporte.
            As respostas saem por este endereço.
          </Text>
          <ScrollView style={s.scroll}>
            <View style={s.typeRow}>
              {TYPES.map(([value, label]) => (
                <TouchableOpacity key={value} onPress={() => set('type')(value)} style={[s.chip, form.type === value && s.chipActive]}>
                  <Text style={[s.chipText, form.type === value && s.chipTextActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {FIELDS.map(([key, label, placeholder]) => (
              <View key={key} style={s.field}>
                <Text style={s.label}>{label}</Text>
                <TextInput
                  style={s.input}
                  value={String(form[key] || '')}
                  onChangeText={set(key)}
                  placeholder={placeholder}
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={key === 'password'}
                  autoCapitalize="none"
                  keyboardType={key.endsWith('port') ? 'number-pad' : 'default'}
                />
              </View>
            ))}
          </ScrollView>
          {error ? <Text style={s.error}>{error}</Text> : null}
          <View style={s.actions}>
            <TouchableOpacity onPress={onClose} style={s.ghost} disabled={saving}>
              <Text style={s.ghostText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={save} style={s.primary} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryText}>Salvar</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = {
  backdrop: {flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'center', alignItems: 'center', padding: 16},
  card: {width: '100%', maxWidth: 520, maxHeight: '90%', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, gap: 10},
  title: {fontSize: 17, fontWeight: '700', color: '#0F172A'},
  text: {fontSize: 13, color: '#475569', lineHeight: 18},
  scroll: {flexGrow: 0},
  typeRow: {flexDirection: 'row', gap: 8, marginBottom: 8},
  chip: {borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6},
  chipActive: {backgroundColor: '#2563EB', borderColor: '#2563EB'},
  chipText: {color: '#334155', fontSize: 12},
  chipTextActive: {color: '#FFFFFF'},
  field: {marginBottom: 8},
  label: {fontSize: 12, color: '#334155', marginBottom: 4, fontWeight: '600'},
  input: {borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, color: '#0F172A'},
  error: {color: '#DC2626', fontSize: 12},
  actions: {flexDirection: 'row', justifyContent: 'flex-end', gap: 8},
  ghost: {borderWidth: 1, borderColor: '#2563EB', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9},
  ghostText: {color: '#2563EB', fontWeight: '600'},
  primary: {backgroundColor: '#2563EB', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 9, minWidth: 90, alignItems: 'center'},
  primaryText: {color: '#FFFFFF', fontWeight: '700'},
};
