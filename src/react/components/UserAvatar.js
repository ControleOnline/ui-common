import React, {useEffect, useMemo, useState} from 'react';
import {Image, Platform, StyleSheet, Text, View} from 'react-native';
import {env as APP_ENV} from '@env';
import {getGravatarUrl, getUserInitials} from '../utils/userAvatar';

const normalizeUrl = value => String(value || '').trim();
const isBackendDownloadUrl = value => /\/files\/[^/?#]+\/download/i.test(normalizeUrl(value));
const shouldProxyBackendDownload = value => Platform.OS === 'web' && isBackendDownloadUrl(value);

const readSessionToken = () => {
  if (typeof localStorage === 'undefined' || !localStorage?.getItem) {
    return '';
  }

  try {
    const session = JSON.parse(localStorage.getItem('session') || '{}');
    return normalizeUrl(session?.api_key || session?.token);
  } catch {
    return '';
  }
};

const resolveInitialDisplayUri = uri => {
  const normalizedUri = normalizeUrl(uri);

  return shouldProxyBackendDownload(normalizedUri) ? '' : normalizedUri;
};

const useDisplayUri = uri => {
  const [displayUri, setDisplayUri] = useState(resolveInitialDisplayUri(uri));

  useEffect(() => {
    let cancelled = false;
    let objectUrl = '';
    const next = normalizeUrl(uri);

    const run = async () => {
      if (!next) {
        setDisplayUri('');
        return;
      }

      const token = readSessionToken();

      if (!shouldProxyBackendDownload(next)) {
        setDisplayUri(next);
        return;
      }

      if (!token) {
        setDisplayUri('');
        return;
      }

      try {
        const headers = {
          Accept: '*/*',
          'API-TOKEN': token,
        };
        const host =
          normalizeUrl(APP_ENV?.DOMAIN) ||
          (typeof location !== 'undefined' ? location.host : '');
        if (host) {
          headers['App-Domain'] = host;
        }

        const response = await fetch(next, {method: 'GET', headers});
        if (!response.ok) {
          if (!cancelled) setDisplayUri('');
          return;
        }

        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) setDisplayUri(objectUrl);
      } catch {
        if (!cancelled) setDisplayUri('');
      }
    };

    run();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [uri]);

  return displayUri;
};

const UserAvatar = ({
  imageUrl,
  email,
  name,
  size = 40,
  backgroundColor,
  borderColor,
  borderWidth = 1,
  textColor,
  style,
  useGravatar = false,
}) => {
  const sources = useMemo(
    () =>
      [
        normalizeUrl(imageUrl),
        useGravatar ? getGravatarUrl(email, Math.max(size * 2, 80)) : '',
      ].filter(Boolean),
    [email, imageUrl, size, useGravatar],
  );
  const [sourceIndex, setSourceIndex] = useState(0);

  useEffect(() => {
    setSourceIndex(0);
  }, [sources]);

  const currentSource = sources[sourceIndex];
  const displayUri = useDisplayUri(currentSource);

  const containerStyle = [
    styles.container,
    style,
    {
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor,
      borderColor,
      borderWidth,
    },
  ];

  return (
    <View style={containerStyle}>
      {displayUri ? (
        <Image
          source={{uri: displayUri}}
          style={styles.image}
          onError={() => setSourceIndex(index => index + 1)}
        />
      ) : (
        <Text
          style={[
            styles.initials,
            {color: textColor, fontSize: Math.max(Math.round(size * 0.38), 14)},
          ]}>
          {getUserInitials({name, email})}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  initials: {
    fontWeight: '700',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
});

export default UserAvatar;
