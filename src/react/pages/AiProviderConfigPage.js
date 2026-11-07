/**
 * @agents Single AI provider config (Grok/OpenAI/Gemini/Claude) for Integrations hub.
 * Uses /mcp/chat/config; keys stay server-side (masked on GET).
 */
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect} from '@react-navigation/native';

import {api} from '@controleonline/ui-common/src/api';
import useToastMessage from '@controleonline/ui-crm/src/react/hooks/useToastMessage';
import {useStore} from '@store';
import {colors} from '@controleonline/../../src/styles/colors';
import {resolveThemePalette} from '@controleonline/../../src/styles/branding';

const PROVIDER_TITLES = {
  grok: 'Grok (xAI)',
  openai: 'Codex / OpenAI',
  gemini: 'Gemini',
  claude: 'Claude',
};

const ALL_KEYS = ['grok', 'openai', 'gemini', 'claude'];

const emptyProvider = () => ({
  enabled: false,
  model: '',
  base_url: '',
  system_prompt: '',
  api_key: '',
  workspace_id: '',
  has_key: false,
  api_key_masked: null,
});

export default function AiProviderConfigPage({route}) {
  const providerKey = String(
    route?.params?.providerKey || route?.params?.provider || '',
  )
    .trim()
    .toLowerCase();

  const peopleStore = useStore('people');
  const themeStore = useStore('theme');
  const {currentCompany} = peopleStore.getters || {};
  const {colors: themeColors} = themeStore.getters || {};
  const brand = resolveThemePalette(themeColors || colors || {});
  const {showError, showSuccess} = useToastMessage();

  const companyId = currentCompany?.id || null;
  const title = PROVIDER_TITLES[providerKey] || providerKey || 'IA';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [allProviders, setAllProviders] = useState(() => {
    const init = {};
    ALL_KEYS.forEach(k => {
      init[k] = emptyProvider();
    });
    return init;
  });

  const provider = allProviders[providerKey] || emptyProvider();

  const styles = useMemo(
    () => ({
      container: {flex: 1, backgroundColor: brand.background || '#F8FAFC'},
      scroll: {padding: 16, paddingBottom: 40},
      card: {
        backgroundColor: brand.surface || '#FFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: brand.border || '#E2E8F0',
        padding: 16,
        marginBottom: 12,
      },
      title: {
        fontSize: 18,
        fontWeight: '700',
        color: brand.text || '#0F172A',
        marginBottom: 4,
      },
      helper: {fontSize: 13, color: brand.textSecondary || '#64748B', marginBottom: 16},
      label: {
        fontSize: 13,
        fontWeight: '600',
        color: brand.textSecondary || '#64748B',
        marginBottom: 6,
        marginTop: 12,
      },
      input: {
        borderWidth: 1,
        borderColor: brand.border || '#E2E8F0',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        color: brand.text || '#0F172A',
        backgroundColor: brand.inputBackground || '#FFF',
      },
      row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
      },
      button: {
        marginTop: 20,
        backgroundColor: brand.primary || '#2563EB',
        borderRadius: 10,
        paddingVertical: 14,
        alignItems: 'center',
      },
      buttonText: {color: '#FFF', fontWeight: '700', fontSize: 15},
      center: {flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24},
    }),
    [brand],
  );

  const load = useCallback(async () => {
    if (!companyId || !providerKey || !ALL_KEYS.includes(providerKey)) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await api.fetch('/mcp/chat/config', {
        params: {company_id: Number(companyId)},
      });
      const remote = res?.providers || {};
      const next = {};
      ALL_KEYS.forEach(k => {
        const r = remote[k] || {};
        next[k] = {
          enabled: !!r.enabled,
          model: String(r.model || ''),
          base_url: String(r.base_url || ''),
          system_prompt: String(r.system_prompt || ''),
          api_key: '',
          workspace_id: String(r.workspace_id || ''),
          has_key: !!r.has_key,
          api_key_masked: r.api_key_masked || null,
        };
      });
      setAllProviders(next);
    } catch (e) {
      showError(e?.message || 'Falha ao carregar configuracao de IA');
    } finally {
      setLoading(false);
    }
  }, [companyId, providerKey, showError]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const updateField = (field, value) => {
    setAllProviders(prev => ({
      ...prev,
      [providerKey]: {...(prev[providerKey] || emptyProvider()), [field]: value},
    }));
  };

  const save = useCallback(async () => {
    if (!companyId || !providerKey) {
      showError('Empresa ou provider invalido.');
      return;
    }
    setSaving(true);
    try {
      const payload = {};
      ALL_KEYS.forEach(k => {
        const p = allProviders[k] || emptyProvider();
        payload[k] = {
          enabled: !!p.enabled,
          model: String(p.model || '').trim(),
          base_url: String(p.base_url || '').trim(),
          system_prompt: String(p.system_prompt || ''),
          api_key: String(p.api_key || '').trim(),
          workspace_id: String(p.workspace_id || '').trim(),
        };
      });
      await api.put('/mcp/chat/config', {
        company_id: Number(companyId),
        providers: payload,
      });
      showSuccess(`${title} salvo.`);
      await load();
    } catch (e) {
      showError(e?.message || 'Falha ao salvar');
    } finally {
      setSaving(false);
    }
  }, [allProviders, companyId, load, providerKey, showError, showSuccess, title]);

  if (!providerKey || !ALL_KEYS.includes(providerKey)) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.center}>
          <Text style={styles.title}>Provider de IA invalido</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!companyId) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.center}>
          <Text style={styles.title}>Selecione uma empresa</Text>
          <Text style={styles.helper}>A configuracao de IA e por empresa ativa.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={brand.primary || '#2563EB'} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.title}>{title}</Text>
            <Switch
              value={!!provider.enabled}
              onValueChange={v => updateField('enabled', v)}
              disabled={saving}
            />
          </View>
          <Text style={styles.helper}>
            Chave e prompt usados no chat /ai. A chave nao retorna em claro apos salvar.
          </Text>

          <Text style={styles.label}>API key</Text>
          <TextInput
            style={styles.input}
            value={provider.api_key}
            onChangeText={v => updateField('api_key', v)}
            placeholder={
              provider.has_key
                ? provider.api_key_masked || '•••• (cadastrada)'
                : 'Cole a API key'
            }
            secureTextEntry
            autoCapitalize="none"
            editable={!saving}
          />

          <Text style={styles.label}>Modelo</Text>
          <TextInput
            style={styles.input}
            value={provider.model}
            onChangeText={v => updateField('model', v)}
            placeholder="ex.: grok-4, gpt-4.1, gemini-2.0-flash"
            autoCapitalize="none"
            editable={!saving}
          />

          <Text style={styles.label}>Base URL (opcional)</Text>
          <TextInput
            style={styles.input}
            value={provider.base_url}
            onChangeText={v => updateField('base_url', v)}
            placeholder="https://..."
            autoCapitalize="none"
            editable={!saving}
          />

          {providerKey === 'claude' ? (
            <>
              <Text style={styles.label}>Workspace ID (Anthropic)</Text>
              <TextInput
                style={styles.input}
                value={provider.workspace_id}
                onChangeText={v => updateField('workspace_id', v)}
                placeholder="wrkspc_01JwQvzr7rXLA5AGx3HKfFUJ"
                autoCapitalize="none"
                editable={!saving}
              />
              <Text style={styles.helper}>
                Formato wrkspc_... (nao e o UUID da organizacao). Console → Settings → Workspaces → coluna ID. Obrigatorio para keys service (sk-ant-svc-...).
              </Text>
            </>
          ) : null}

          <Text style={styles.label}>Prompt inicial (system)</Text>
          <TextInput
            style={[styles.input, {minHeight: 100, textAlignVertical: 'top'}]}
            value={provider.system_prompt}
            onChangeText={v => updateField('system_prompt', v)}
            placeholder="Instrucoes enviadas em toda conversa"
            multiline
            editable={!saving}
          />

          <TouchableOpacity
            style={[styles.button, saving && {opacity: 0.6}]}
            onPress={save}
            disabled={saving}>
            <Text style={styles.buttonText}>{saving ? 'Salvando...' : 'Salvar'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
