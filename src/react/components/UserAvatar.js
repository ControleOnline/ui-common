import React, {useEffect, useMemo, useState} from 'react';
import {Image, Platform, StyleSheet, Text, View} from 'react-native';
import {env as APP_ENV} from '@env';
import {getGravatarUrl, getUserInitials} from '../utils/userAvatar';

const normalizeUrl = value => String(value || '').trim();

const isGravatarUrl = uri =>
  /gravatar\.com\/avatar\//i.test(String(uri || ''));

const isBackendDownloadUrl = uri =>
  /\/files\/[^/?#]+\/download/i.test(String(uri || ''));

/** Session cache: gravatar URL → true (ok) | false (missing). Avoids repeat probes. */
const gravatarProbeCache = new Map();

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
 * Probe Gravatar (d=404) via fetch BEFORE exposing URL to <Image>.
 * Browser "Failed to load resource" for <img> 404 is avoided; XHR 404 is
 * expected once per unique hash and cached for the session.
 */
const probeGravatar = async url => {
  if (gravatarProbeCache.has(url)) {
    return gravatarProbeCache.get(url);
  }

  try {
    let response = await fetch(url, {
      method: 'HEAD',
      mode: 'cors',
      cache: 'force-cache',
    });
    if (response.status === 405 || response.status === 501) {
      response = await fetch(url, {
        method: 'GET',
        mode: 'cors',
        cache: 'force-cache',
      });
    }
    const ok = response.ok;
    gravatarProbeCache.set(url, ok);
    return ok;
  } catch {
    gravatarProbeCache.set(url, false);
    return false;
  }
};

/**
 * Resolve display URI.
 * - Backend /files/.../download on web: authenticated blob fetch.
 * - Gravatar (d=404) on web: probe first; never set <img src> on expected 404.
 * - Other URLs / native: pass through (native Image onError handles 404).
 */
const useDisplayUri = uri => {
  const [displayUri, setDisplayUri] = useState('');
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let objectUrl = '';
    const next = normalizeUrl(uri);

    setResolved(false);
    setDisplayUri('');

    const run = async () => {
      if (!next) {
        if (!cancelled) {
          setDisplayUri('');
          setResolved(true);
        }
        return;
      }

      const token = readSessionToken();

      // Authenticated backend download on web
      if (isBackendDownloadUrl(next) && Platform.OS === 'web' && token) {
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
            if (!cancelled) {
              setDisplayUri('');
              setResolved(true);
            }
            return;
          }

          const blob = await response.blob();
          objectUrl = URL.createObjectURL(blob);
          if (!cancelled) {
            setDisplayUri(objectUrl);
            setResolved(true);
          }
        } catch {
          if (!cancelled) {
            setDisplayUri('');
            setResolved(true);
          }
        }
        return;
      }

      // Gravatar d=404: probe on web so <img> never receives a known-missing URL
      if (isGravatarUrl(next) && Platform.OS === 'web') {
        const ok = await probeGravatar(next);
        if (!cancelled) {
          setDisplayUri(ok ? next : '');
          setResolved(true);
        }
        return;
      }

      // Default: use as-is (native, or non-special web URLs)
      if (!cancelled) {
        setDisplayUri(next);
        setResolved(true);
      }
    };

    run();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [uri]);

  return {displayUri, resolved};
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
  const {displayUri, resolved} = useDisplayUri(currentSource);

  // After probe resolves empty for gravatar/backend → try next source or initials
  useEffect(() => {
    if (!currentSource || !resolved || displayUri) {
      return;
    }
    if (
      isGravatarUrl(currentSource) ||
      isBackendDownloadUrl(currentSource)
    ) {
      setSourceIndex(index =>
        index + 1 < sources.length ? index + 1 : index,
      );
    }
  }, [currentSource, displayUri, resolved, sources.length]);

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
