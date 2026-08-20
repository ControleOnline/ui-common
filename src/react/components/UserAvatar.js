import React, {useEffect, useMemo, useState} from 'react';
import {Image, Platform, StyleSheet, Text, View} from 'react-native';
import {env as APP_ENV} from '@env';
import {getGravatarUrl, getUserInitials} from '../utils/userAvatar';

const normalizeUrl = value => String(value || '').trim();

const isGravatarUrl = uri =>
  /gravatar\.com\/avatar\//i.test(String(uri || ''));

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

/**
 * Resolve display URI.
 * - Backend /files/.../download on web: authenticated blob fetch.
 * - Gravatar (d=404): HEAD/GET probe first so the browser never issues a
 *   failing <img> request that pollutes the console with expected 404s.
 * - Other URLs: pass through.
 */
const useDisplayUri = uri => {
  const [displayUri, setDisplayUri] = useState('');

  useEffect(() => {
    let cancelled = false;
    let objectUrl = '';
    const next = normalizeUrl(uri);

    const run = async () => {
      if (!next) {
        if (!cancelled) setDisplayUri('');
        return;
      }

      const isBackendDownload = /\/files\/[^/?#]+\/download/i.test(next);
      const token = readSessionToken();

      // Authenticated backend download on web
      if (isBackendDownload && Platform.OS === 'web' && token) {
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
        return;
      }

      // Gravatar with intentional d=404: probe before exposing to <img>
      if (isGravatarUrl(next) && Platform.OS === 'web') {
        try {
          // Prefer HEAD to avoid body; some CDNs still allow it.
          let response = await fetch(next, {
            method: 'HEAD',
            mode: 'cors',
            cache: 'force-cache',
          });
          // Fallback GET if HEAD not allowed
          if (response.status === 405 || response.status === 501) {
            response = await fetch(next, {
              method: 'GET',
              mode: 'cors',
              cache: 'force-cache',
            });
          }
          if (response.ok) {
            if (!cancelled) setDisplayUri(next);
          } else {
            // Expected 404 → fall through to initials (empty displayUri)
            if (!cancelled) setDisplayUri('');
          }
        } catch {
          // Network / CORS failure → treat as missing, use initials
          if (!cancelled) setDisplayUri('');
        }
        return;
      }

      // Default: use as-is (native or non-special URLs)
      if (!cancelled) setDisplayUri(next);
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
  useGravatar = true,
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

  // When probe clears a gravatar (404), advance to next source / initials
  useEffect(() => {
    if (!currentSource) return;
    if (displayUri) return;
    // Probe finished with empty → try next source (or initials)
    if (isGravatarUrl(currentSource) || /\/files\/[^/?#]+\/download/i.test(currentSource)) {
      setSourceIndex(index => {
        if (index + 1 < sources.length) return index + 1;
        return index; // stay; initials will render because displayUri empty
      });
    }
  }, [currentSource, displayUri, sources.length]);

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
