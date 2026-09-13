import React from 'react';
import { Image, StyleSheet } from 'react-native';

const runnerPng = require('../../assets/images/runner.png');

/**
 * Runner icon cropped from the app icon.
 * Uses tintColor to recolor at runtime.
 */
export function RunnerIcon({
  size = 26,
  color = '#2DB526',
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Image
      source={runnerPng}
      style={[
        styles.img,
        { width: size, height: size, tintColor: color },
      ]}
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({
  img: {
    // tintColor recolors the PNG at runtime — works because runner.png is green on transparent
  },
});
