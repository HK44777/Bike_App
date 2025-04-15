// app/layout.jsx
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TurboModuleRegistry } from 'react-native';

export default function Layout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false, // Remove the top header bar
        tabBarActiveTintColor: '#000', // Active icon color set to black
        tabBarInactiveTintColor: '#000', // Inactive icon color set to black
        tabBarActiveBackgroundColor: '#fff', // Light grey background for active tab
        tabBarInactiveBackgroundColor: '#e6e6e6', // White background for inactive tabs
        tabBarStyle: {
          backgroundColor: '#fff', // Overall tab bar background
          borderTopColor: '#ddd',
        },
        // Prevent the tab bar from hiding when the keyboard is open.
        tabBarHideOnKeyboard: TurboModuleRegistry,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
          title: '',
        }}
      />
      <Tabs.Screen
        name="maps"
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="map-outline" size={size} color={color} />
          ),
          title: '',
        }}
      />
    </Tabs>
  );
}
