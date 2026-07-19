import React, {useEffect, useMemo, useState} from 'react';
import {Image, StyleSheet, Text, View} from 'react-native';
import {getGravatarUrl, getUserInitials} from '../utils/userAvatar';

const normalizeUrl = value => String(value || '').trim();

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
}) => {
  const sources = useMemo(
    () => [normalizeUrl(imageUrl), getGravatarUrl(email, Math.max(size * 2, 80))].filter(Boolean),
    [email, imageUrl, size],
  );
  const [sourceIndex, setSourceIndex] = useState(0);

  useEffect(() => {
    setSourceIndex(0);
  }, [sources]);

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
  const currentSource = sources[sourceIndex];

  return (
    <View style={containerStyle}>
      {currentSource ? (
        <Image
          source={{uri: currentSource}}
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
