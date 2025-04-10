import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  TextInput,
  FlatList,
  Keyboard,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

const participantsMock = [
  { id: '1', name: 'Alice', latitude: 12.9345, longitude: 77.6266 },
  { id: '2', name: 'Bob', latitude: 12.936, longitude: 77.622 },
];

const ORS_API_KEY = '5b3ce3597851110001cf624832e01e5eb3c043189d21f885ad759b38';

export default function MapScreen() {
  const [location, setLocation] = useState(null);
  const [region, setRegion] = useState(null);
  const [destination, setDestination] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
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

  useEffect(() => {
    if (location && destination) {
      fetchRoute();
    }
  }, [location, destination]);

  const fetchRoute = async () => {
    try {
      const response = await fetch(
        'https://api.openrouteservice.org/v2/directions/driving-car/geojson',
        {
          method: 'POST',
          headers: {
            'Authorization': ORS_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            coordinates: [
              [location.longitude, location.latitude],
              [destination.longitude, destination.latitude],
            ],
          }),
        }
      );
      const data = await response.json();
      const coords = data.features[0].geometry.coordinates.map(([lng, lat]) => ({
        latitude: lat,
        longitude: lng,
      }));
      setRouteCoords(coords);
    } catch (error) {
      console.error('Error fetching route:', error);
      alert('Error fetching route');
    }
  };

  const handleSearchChange = async (text) => {
    setSearchQuery(text);
    if (!text) return setSuggestions([]);

    try {
      const res = await fetch(
        `https://api.openrouteservice.org/geocode/autocomplete?api_key=${ORS_API_KEY}&text=${encodeURIComponent(
          text
        )}&boundary.country=IN`
      );
      const data = await res.json();
      setSuggestions(data.features || []);
    } catch (err) {
      console.error('Autocomplete error:', err);
    }
  };

  const handleSuggestionSelect = (place) => {
    const [lng, lat] = place.geometry.coordinates;
    const placeName = place.properties.label;

    const newDestination = {
      latitude: lat,
      longitude: lng,
      name: placeName,
    };

    setDestination(newDestination);
    setRegion({
      latitude: lat,
      longitude: lng,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });
    setSuggestions([]);
    setSearchQuery('');
    Keyboard.dismiss();
  };

  return (
    <View style={styles.container}>
      {/* Search and Ride button */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search for a place"
          value={searchQuery}
          onChangeText={handleSearchChange}
        />
      </View>

      {/* Autocomplete suggestions */}
      {suggestions.length > 0 && (
        <FlatList
          data={suggestions}
          keyExtractor={(item) => item.properties.id}
          style={styles.suggestionsList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.suggestionItem}
              onPress={() => handleSuggestionSelect(item)}
            >
              <Text>{item.properties.label}</Text>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Map */}
      {region && (
        <MapView style={styles.map} region={region} showsUserLocation>
          {participantsMock.map((p) => (
            <Marker
              key={p.id}
              coordinate={{ latitude: p.latitude, longitude: p.longitude }}
              title={p.name}
            />
          ))}
          {routeCoords.length > 0 && (
            <Polyline coordinates={routeCoords} strokeColor="#007AFF" strokeWidth={3} />
          )}
        </MapView>
      )}

      {/* Bottom Control Bar */}
      <Animated.View style={[styles.bottomBar, { opacity: tabAnim }]}>
        <TouchableOpacity onPress={() => navigation.navigate('Ride')} style={styles.controlButton}>
          <Text style={styles.controlButtonText}>Go to Ride</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.controlButton, { backgroundColor: 'red' }]}>
          <Text style={styles.controlButtonText}>SOS</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchContainer: {
    position: 'absolute',
    top: 50,
    left: 10,
    right: 10,
    zIndex: 1000,
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
    elevation: 5,
  },
  searchInput: {
    flex: 1,
    height: 45,
    fontSize: 16,
  },
  rideButton: {
    marginLeft: 10,
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  rideText: {
    color: '#fff',
    fontWeight: '600',
  },
  suggestionsList: {
    position: 'absolute',
    top: 100,
    left: 10,
    right: 10,
    backgroundColor: '#fff',
    zIndex: 1000,
    maxHeight: 200,
    borderRadius: 8,
    elevation: 3,
  },
  suggestionItem: {
    padding: 12,
    borderBottomColor: '#eee',
    borderBottomWidth: 1,
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
    justifyContent: 'space-evenly',
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
});
