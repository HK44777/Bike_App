import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated, TextInput } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

const participantsMock = [
  { id: '1', name: 'Alice', latitude: 12.9345, longitude: 77.6266 },
  { id: '2', name: 'Bob', latitude: 12.936, longitude: 77.622 },
];

export default function MapScreen() {
  const [location, setLocation] = useState(null);
  const [region, setRegion] = useState(null);
  const [destination, setDestination] = useState(null);
  const [tabVisible, setTabVisible] = useState(true);
  const [tabAnim] = useState(new Animated.Value(1));
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const tabBarHeight = useBottomTabBarHeight();

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission to access location was denied');
        return;
      }

      let loc = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = loc.coords;
      setLocation({ latitude, longitude });
      setRegion({
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });

      const dest = await AsyncStorage.getItem('rideDestination');
      if (dest) {
        const parsed = JSON.parse(dest);
        setDestination(parsed);
      }
    })();
  }, [isFocused]);

  const centerOnMe = () => {
    if (location) {
      setRegion({
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  };

  const toggleTabBar = () => {
    Animated.timing(tabAnim, {
      toValue: tabVisible ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setTabVisible(!tabVisible));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>
          Ride to {destination?.name || 'Nandi Hills'}
        </Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity onPress={() => navigation.navigate('Ride')} style={styles.rideButton}>
            <Text style={styles.rideText}>Go to Ride</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={toggleTabBar} style={styles.toggleButton}>
            <Text style={styles.toggleText}>{tabVisible ? '↓' : '↑'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {region && (
        <MapView style={styles.map} region={region} showsUserLocation>
          {participantsMock.map((p) => (
            <Marker
              key={p.id}
              coordinate={{ latitude: p.latitude, longitude: p.longitude }}
              title={p.name}
            />
          ))}
          {location && destination && (
            <Polyline
              coordinates={[
                { latitude: location.latitude, longitude: location.longitude },
                { latitude: destination.latitude, longitude: destination.longitude },
              ]}
              strokeColor="#007AFF"
              strokeWidth={3}
            />
          )}
        </MapView>
      )}

      <Animated.View style={[styles.bottomBar, { opacity: tabAnim }]}>
        <TouchableOpacity style={styles.controlButton} onPress={centerOnMe}>
          <Text style={styles.controlButtonText}>Center on Me</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlButton}>
          <Text style={styles.controlButtonText}>Show Route</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.controlButton, { backgroundColor: 'red' }]}>
          <Text style={styles.controlButtonText}>SOS</Text>
        </TouchableOpacity>
      </Animated.View>

      <Animated.View style={[styles.infoBar, { opacity: tabAnim }]}>
        <Text style={styles.infoText}>ETA: 15 mins</Text>
        <Text style={styles.infoText}>Distance: 12 km</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 50,
    paddingBottom: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rideButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#007AFF',
    borderRadius: 6,
  },
  rideText: {
    color: '#fff',
    fontWeight: '600',
  },
  toggleButton: {
    padding: 8,
    backgroundColor: '#ddd',
    borderRadius: 5,
    marginLeft: 10,
  },
  toggleText: {
    fontSize: 18,
  },
  map: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 10,
    backgroundColor: '#fff',
  },
  controlButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  controlButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  infoBar: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    backgroundColor: '#f0f0f0',
  },
  infoText: {
    fontSize: 16,
  },
});
