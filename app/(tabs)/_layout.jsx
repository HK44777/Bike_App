// app/(tabs)/layout.jsx

import React from 'react';
import { Tabs, usePathname } from 'expo-router';
import TabBar from '../../components/tabBar';

export default function TabLayout() {
  const pathname = usePathname();

  const hideTabBar = pathname === '/map'; // Adjust path if necessary

  return (
    <Tabs
      initialRouteName="home"
      screenOptions={{
        headerShown: false,
        tabBarStyle: hideTabBar ? { display: 'none' } : {}, // Hides tab bar on Map
      }}
      tabBar={(props) => <TabBar {...props} />}
    >
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="Map" options={{ title: 'Map' }} />
      <Tabs.Screen name="Ride" options={{ title: 'Ride' }} />
    </Tabs>
  );
}
