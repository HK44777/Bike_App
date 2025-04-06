import React, { useRef, useEffect } from 'react';
import { View, Text, Platform, Animated, StyleSheet } from 'react-native';
import { useLinkBuilder, useTheme } from '@react-navigation/native';
import { Pressable } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

export default function TabBar({ state, descriptors, navigation }) {
  const { colors } = useTheme();
  const { buildHref } = useLinkBuilder();
  const scaleAnimations = useRef(state.routes.map(() => new Animated.Value(1))).current;

  useEffect(() => {
    scaleAnimations.forEach((anim, index) => {
      Animated.spring(anim, {
        toValue: state.index === index ? 1.2 : 1,
        friction: 4,
        tension: 100,
        useNativeDriver: true,
      }).start();
    });
  }, [state.index]);

  // ✅ Must be placed AFTER all hooks
  const focusedRouteName = state.routes[state.index]?.name;
  const shouldHideTabBar = focusedRouteName === 'Map';

  if (shouldHideTabBar) return null;

  return (
    <View style={styles.floatingContainer}>
      <View style={styles.tabContainer}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label =
            options.tabBarLabel ?? options.title ?? route.name;

          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          const renderIcon = () => {
            if (route.name === 'Ride') {
              return (
                <MaterialCommunityIcons
                  name="motorbike"
                  size={26}
                  color={isFocused ? colors.primary : '#666'}
                />
              );
            }
            if (route.name === 'Home') {
              return (
                <Ionicons
                  name="home"
                  size={26}
                  color={isFocused ? colors.primary : '#666'}
                />
              );
            }
            return (
              <Ionicons
                name="map-outline"
                size={26}
                color={isFocused ? colors.primary : '#666'}
              />
            );
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.tabButton}
            >
              <Animated.View style={[styles.iconContainer, { transform: [{ scale: scaleAnimations[index] }] }]}>
                {renderIcon()}
                <Text style={[styles.label, { color: isFocused ? colors.primary : '#666' }]}>
                  {label}
                </Text>
              </Animated.View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    backgroundColor: 'transparent',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 18 : 12,
    borderRadius: 30,
  },
  tabButton: {
    flex: 1,
    borderRadius: 20,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  label: {
    fontSize: 12,
    marginTop: 4,
  },
});
