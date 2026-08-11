import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  buildAddressSavePayload,
  listCountries,
  listStates,
  lookupPostalCode,
} from '../../services/addressGeo';

const emptyForm = {
  nickname: '',
  cep: '',
  street: '',
  number: '',
  complement: '',
  district: '',
  city: '',
  uf: '',
  stateName: '',
  countryCode: 'BR',
  countryName: 'Brazil',
  latitude: null,
  longitude: null,
  mapStaticUrl: null,
  facadeUrl: null,
  provider: null,
};

const hydrateFromRow = row => {
  if (!row || typeof row !== 'object') {
    return {...emptyForm};
  }
  const street = row?.street?.street || row?.street || '';
  const district = row?.street?.district?.district || row?.district || '';
  const city = row?.street?.district?.city?.city || row?.city || '';
  const stateEntity = row?.street?.district?.city?.state || row?.state;
  const countryEntity = stateEntity?.country || row?.country;
  return {
    ...emptyForm,
    nickname: row?.nickname || '',
    cep: String(row?.street?.cep?.cep || row?.cep || row?.postal_code || ''),
    street: typeof street === 'string' ? street : '',
    number: row?.number != null ? String(row.number) : '',
    complement: row?.complement || '',
    district,
    city,
    uf: stateEntity?.uf || row?.uf || '',
    stateName: stateEntity?.state || '',
    countryCode: countryEntity?.countrycode || countryEntity?.code || 'BR',
    countryName: countryEntity?.countryname || countryEntity?.name || 'Brazil',
    latitude: row?.latitude ?? null,
    longitude: row?.longitude ?? null,
  };
};

/**
 * Modern address form: country/state dropdowns, CEP via backend balancer,
 * optional map + facade when Maps key is present.
 */
export default function AddressForm({
  row = null,
  peopleIri,
  mode = 'create',
  onCancel,
  onSaved,
  saveAction,
  onFormChange = null,
  hideActions = false,
  submitLabel = 'Salvar',
}) {
  const [form, setForm] = useState(() => hydrateFromRow(row));
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [loadingCep, setLoadingCep] = useState(false);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showCountryList, setShowCountryList] = useState(false);
  const [showStateList, setShowStateList] = useState(false);

  function hydrateFromProps(r) {
    return hydrateFromRow(r);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingMeta(true);
      try {
        const [c, s] = await Promise.all([
          listCountries(''),
          listStates(form.countryCode || 'BR'),
        ]);
        if (!cancelled) {
          setCountries(c);
          setStates(s);
        }
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Falha ao carregar país/estado');
      } finally {
        if (!cancelled) setLoadingMeta(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onChange = useCallback((key, value) => {
    setForm(prev => {
      const next = {...prev, [key]: value};
      onFormChange?.(next);
      return next;
    });
  }, [onFormChange]);

  const onSelectCountry = useCallback(async item => {
    setForm(prev => ({
      ...prev,
      countryCode: item.code,
      countryName: item.name,
      uf: '',
      stateName: '',
    }));
    setShowCountryList(false);
    try {
      const s = await listStates(item.code);
      setStates(s);
    } catch (e) {
      setError(e?.message || 'Falha ao carregar estados');
    }
  }, []);

  const onSelectState = useCallback(item => {
    setForm(prev => ({
      ...prev,
      uf: item.uf,
      stateName: item.name,
    }));
    setShowStateList(false);
  }, []);

  const onCepBlur = useCallback(async () => {
    const digits = String(form.cep || '').replace(/\D+/g, '');
    if (digits.length !== 8) return;
    setLoadingCep(true);
    setError(null);
    try {
      const data = await lookupPostalCode(digits);
      setForm(prev => {
        const next = {
          ...prev,
          cep: digits,
          street: data.street || prev.street,
          district: data.district || prev.district,
          city: data.city || prev.city,
          uf: data.uf || data.state || prev.uf,
          stateName: data.state || prev.stateName,
          countryCode:
            data.country === 'Brasil' || data.country === 'Brazil'
              ? 'BR'
              : data.country || prev.countryCode,
          countryName:
            data.country === 'Brasil' ? 'Brazil' : data.country || prev.countryName,
          latitude: data.latitude ?? data.map?.latitude ?? prev.latitude,
          longitude: data.longitude ?? data.map?.longitude ?? prev.longitude,
          mapStaticUrl: data.map?.staticUrl || null,
          facadeUrl: data.facade?.streetViewUrl || null,
          provider: data.provider || null,
        };
        onFormChange?.(next);
        return next;
      });
      if (data.uf || data.state) {
        const s = await listStates(
          data.country === 'Brasil' || data.country === 'Brazil'
            ? 'BR'
            : data.country || 'BR',
        );
        setStates(s);
      }
    } catch (e) {
      setError(e?.message || 'Falha ao consultar CEP');
    } finally {
      setLoadingCep(false);
    }
  }, [form.cep]);

  const handleSave = useCallback(async () => {
    if (!peopleIri && mode === 'create') {
      setError('Pessoa/empresa obrigatória');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = buildAddressSavePayload(form, peopleIri);
      if (mode === 'edit' && row) {
        payload.id = row['@id'] || row.id;
      }
      const saved = await saveAction(payload);
      onSaved?.(saved);
    } catch (e) {
      setError(e?.message || 'Falha ao salvar endereço');
    } finally {
      setSaving(false);
    }
  }, [form, peopleIri, mode, row, saveAction, onSaved]);

  const countryLabel = useMemo(
    () => form.countryName || form.countryCode || 'Selecione o país',
    [form.countryCode, form.countryName],
  );
  const stateLabel = useMemo(
    () =>
      form.stateName
        ? `${form.stateName} (${form.uf})`
        : form.uf || 'Selecione o estado',
    [form.stateName, form.uf],
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {form.provider ? (
        <Text style={styles.hint}>CEP via: {form.provider}</Text>
      ) : null}

      <Field label="Apelido">
        <TextInput
          style={styles.input}
          value={form.nickname}
          onChangeText={v => onChange('nickname', v)}
          placeholder="Apelido do endereço"
        />
      </Field>

      <Field label="CEP">
        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.flex]}
            value={form.cep}
            onChangeText={v => onChange('cep', v)}
            onBlur={onCepBlur}
            keyboardType="number-pad"
            maxLength={9}
            placeholder="00000-000"
          />
          {loadingCep ? <ActivityIndicator style={styles.loader} /> : null}
        </View>
      </Field>

      <Field label="País">
        <TouchableOpacity
          style={styles.select}
          onPress={() => setShowCountryList(s => !s)}
          disabled={loadingMeta}>
          <Text>{countryLabel}</Text>
        </TouchableOpacity>
        {showCountryList ? (
          <View style={styles.dropdown}>
            {countries.map(item => (
              <TouchableOpacity
                key={item.id || item.code}
                style={styles.option}
                onPress={() => onSelectCountry(item)}>
                <Text>
                  {item.name} ({item.code})
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      </Field>

      <Field label="Estado">
        <TouchableOpacity
          style={styles.select}
          onPress={() => setShowStateList(s => !s)}
          disabled={loadingMeta}>
          <Text>{stateLabel}</Text>
        </TouchableOpacity>
        {showStateList ? (
          <View style={styles.dropdown}>
            {states.map(item => (
              <TouchableOpacity
                key={item.id || item.uf}
                style={styles.option}
                onPress={() => onSelectState(item)}>
                <Text>
                  {item.name} ({item.uf})
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      </Field>

      <Field label="Cidade">
        <TextInput
          style={styles.input}
          value={form.city}
          onChangeText={v => onChange('city', v)}
        />
      </Field>
      <Field label="Bairro">
        <TextInput
          style={styles.input}
          value={form.district}
          onChangeText={v => onChange('district', v)}
        />
      </Field>
      <Field label="Logradouro">
        <TextInput
          style={styles.input}
          value={form.street}
          onChangeText={v => onChange('street', v)}
        />
      </Field>
      <Field label="Número">
        <TextInput
          style={styles.input}
          value={form.number}
          onChangeText={v => onChange('number', v)}
          keyboardType="number-pad"
        />
      </Field>
      <Field label="Complemento">
        <TextInput
          style={styles.input}
          value={form.complement}
          onChangeText={v => onChange('complement', v)}
        />
      </Field>

      {form.mapStaticUrl ? (
        <View style={styles.mapBox}>
          <Text style={styles.mapTitle}>Mapa</Text>
          <Image
            source={{uri: form.mapStaticUrl}}
            style={styles.mapImage}
            resizeMode="cover"
          />
        </View>
      ) : null}
      {form.facadeUrl ? (
        <View style={styles.mapBox}>
          <Text style={styles.mapTitle}>Fachada</Text>
          <Image
            source={{uri: form.facadeUrl}}
            style={styles.mapImage}
            resizeMode="cover"
          />
        </View>
      ) : null}

      {!hideActions ? (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.btnSecondary} onPress={onCancel}>
            <Text>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={handleSave}
            disabled={saving}>
            <Text style={styles.btnPrimaryText}>
              {saving ? 'Salvando…' : submitLabel}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </ScrollView>
  );
}

function Field({label, children}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {padding: 16, gap: 8},
  field: {marginBottom: 10},
  label: {fontSize: 13, fontWeight: '600', marginBottom: 4, color: '#334155'},
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  select: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#F8FAFC',
  },
  dropdown: {
    maxHeight: 180,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    marginTop: 4,
    backgroundColor: '#fff',
  },
  option: {paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9'},
  row: {flexDirection: 'row', alignItems: 'center'},
  flex: {flex: 1},
  loader: {marginLeft: 8},
  error: {color: '#B91C1C', marginBottom: 8},
  hint: {color: '#64748B', marginBottom: 8, fontSize: 12},
  mapBox: {marginVertical: 10},
  mapTitle: {fontWeight: '600', marginBottom: 6},
  mapImage: {width: '100%', height: 180, borderRadius: 8, backgroundColor: '#E2E8F0'},
  actions: {flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 16},
  btnSecondary: {paddingHorizontal: 16, paddingVertical: 12},
  btnPrimary: {
    backgroundColor: '#1D4ED8',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 8,
  },
  btnPrimaryText: {color: '#fff', fontWeight: '600'},
});
