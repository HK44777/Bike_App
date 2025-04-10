// 🔄 ... Keep imports as you had them
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Button,
  Alert,
  Keyboard,
  Image,
} from 'react-native';
import MapView, { Marker, Polyline, AnimatedRegion } from 'react-native-maps';
import PolylineDecoder from '@mapbox/polyline';
import * as Location from 'expo-location';

// 🔐 Your Ola Maps API Key
const OLA_API_KEY = 'CornDpxoVHMISlbCN8ePrPdauyrHDeIBZotfvRdy';

const OlaPlacesAutocomplete = ({ placeholder, onSelect, clearPickupRef }) => {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    if (placeholder.toLowerCase().includes('pickup') && clearPickupRef) {
      clearPickupRef.current = () => {
        setInput('');
      };
    }
  }, []);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (input.length < 3) {
        setSuggestions([]);
        return;
      }

      try {
        const response = await fetch(
          `https://api.olamaps.io/places/v1/autocomplete?input=${encodeURIComponent(input)}&api_key=${OLA_API_KEY}`,
          {
            headers: { 'X-Request-Id': 'sample-request-id' },
          }
        );

        const contentType = response.headers.get('Content-Type');
        const isJson = contentType && contentType.includes('application/json');
        const text = await response.text();

        if (isJson) {
          const json = JSON.parse(text);
          const results = json?.predictions || [];
          setSuggestions(results);
        } else {
          console.warn('⚠️ Ola responded with non-JSON:', text.slice(0, 200));
          setSuggestions([]);
        }
      } catch (error) {
        console.error('🚨 Network error fetching autocomplete from Ola:', error);
        setSuggestions([]);
      }
    };

    const debounce = setTimeout(fetchSuggestions, 400);
    return () => clearTimeout(debounce);
  }, [input]);

  return (
    <View style={styles.autocompleteContainer}>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        value={input}
        onChangeText={text => setInput(text)}
      />
      {suggestions.length > 0 && (
        <FlatList
          data={suggestions}
          keyExtractor={(item, index) => index.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => {
                const selectedText = item.description || item.name || '';
                setInput(selectedText);
                setSuggestions([]);
                Keyboard.dismiss();
                onSelect({
                  latitude: item.lat || item.geometry?.location?.lat || 0,
                  longitude: item.lng || item.geometry?.location?.lng || 0,
                  description: selectedText,
                });
              }}
            >
              <Text style={styles.suggestionText}>{item.description}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
};

const MapScreenOla = () => {
  const [pickup, setPickup] = useState(null);
  const [destination, setDestination] = useState(null);
  const [stops, setStops] = useState([]);
  const [showStopInput, setShowStopInput] = useState(false);
  const [routeData, setRouteData] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [heading, setHeading] = useState(0);
  const clearPickupRef = useRef(null);
  const userLocationAnim = useRef(new AnimatedRegion({
    latitude: 0,
    longitude: 0,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  })).current;

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude, heading } = location.coords;

      setUserLocation({ latitude, longitude });
      setHeading(heading || 0);
      userLocationAnim.setValue({ latitude, longitude });

      if (!pickup) {
        setPickup({ latitude, longitude, description: 'Current Location' });
      }

      Location.watchPositionAsync({
        accuracy: Location.Accuracy.High,
        timeInterval: 3000,
        distanceInterval: 10,
      }, loc => {
        const { latitude, longitude, heading } = loc.coords;
        setUserLocation({ latitude, longitude });
        setHeading(heading || 0);
        userLocationAnim.timing({
          latitude,
          longitude,
          duration: 1000,
          useNativeDriver: false,
        }).start();
      });
    })();
  }, []);

  const addStop = place => {
    setStops(prev => [...prev, place]);
  };

  const fetchRoute = async () => {
    if (!destination) {
      Alert.alert('Error', 'Please select a destination.');
      return;
    }
  
    // ✅ Default to current location if pickup is null or empty
    let finalPickup = pickup;
    if (!pickup || !pickup.description || pickup.description.trim() === '') {
      if (userLocation) {
        finalPickup = {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          description: 'Current Location',
        };
        setPickup(finalPickup); // update state as well
      } else {
        Alert.alert('Error', 'Current location not available.');
        return;
      }
    }
  
    try {
      const allLocations = [finalPickup, ...stops, destination];
      const locationStr = allLocations
        .map(loc => `${loc.latitude},${loc.longitude}`)
        .join('|');
  

      const response = await fetch(
        `https://api.olamaps.io/routing/v1/routeOptimizer?locations=${locationStr}&api_key=${OLA_API_KEY}`,
        {
          method: 'POST',
          headers: { 'X-Request-Id': 'request-id-123' },
        }
      );

      const json = await response.json();
      const route = json?.routes?.[0];

      if (!route?.overview_polyline) {
        Alert.alert('Error', 'No route found.');
        return;
      }

      const decodedPolyline = PolylineDecoder.decode(route.overview_polyline).map(
        ([lat, lng]) => ({ latitude: lat, longitude: lng })
      );

      const totalDistance = route.legs?.reduce((sum, leg) => sum + (leg.distance || 0), 0) || 0;
      const totalDuration = route.legs?.reduce((sum, leg) => sum + (leg.duration || 0), 0) || 0;

      const distance = `${(totalDistance / 1000).toFixed(1)} km`;
      const duration = `${Math.ceil(totalDuration / 60)} mins`;

      setRouteData({
        polyline: decodedPolyline,
        distance,
        duration,
      });
    } catch (err) {
      console.error('Error fetching route:', err);
      Alert.alert('Error', 'Failed to fetch route.');
    }
  };

  const renderMarkers = () => {
    const markers = [];

    if (pickup) {
      markers.push(
        <Marker
          key="pickup"
          coordinate={{ latitude: pickup.latitude, longitude: pickup.longitude }}
          title="Pickup"
          pinColor="green"
        />
      );
    }

    if (destination) {
      markers.push(
        <Marker
          key="destination"
          coordinate={{ latitude: destination.latitude, longitude: destination.longitude }}
          title="Destination"
          pinColor="red"
        />
      );
    }

    stops.forEach((stop, index) => {
      markers.push(
        <Marker
          key={`stop-${index}`}
          coordinate={{ latitude: stop.latitude, longitude: stop.longitude }}
          title={`Stop ${index + 1}`}
          pinColor="orange"
        />
      );
    });

    return markers;
  };

  return (
    <View style={styles.container}>
      <View style={styles.autocompleteWrapper}>
        <Text style={styles.heading}>Pickup</Text>
        <OlaPlacesAutocomplete placeholder="Enter pickup location" onSelect={setPickup} clearPickupRef={clearPickupRef} />

        <Text style={styles.heading}>Destination</Text>
        <OlaPlacesAutocomplete placeholder="Enter destination location" onSelect={setDestination} />

        <Text style={styles.heading}>Stops (optional)</Text>
        {stops.map((stop, index) => (
          <Text key={index} style={styles.stopText}>
            Stop {index + 1}: {stop.description}
          </Text>
        ))}

        {showStopInput ? (
          <OlaPlacesAutocomplete
            placeholder="Enter stop location"
            onSelect={place => {
              addStop(place);
              setShowStopInput(false);
            }}
          />
        ) : (
          <TouchableOpacity style={styles.addStopButton} onPress={() => setShowStopInput(true)}>
            <Text style={styles.addStopText}>+ Add a Stop</Text>
          </TouchableOpacity>
        )}

        <View style={styles.buttonContainer}>
          <Button title="Show Route" onPress={fetchRoute} />
        </View>
      </View>

      <MapView
        style={styles.map}
        initialRegion={{
          latitude: pickup?.latitude || 12.9716,
          longitude: pickup?.longitude || 77.5946,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }}
      >
        {renderMarkers()}

        {userLocation && (
          <Marker.Animated
            coordinate={userLocationAnim}
            anchor={{ x: 0.5, y: 0.5 }}
            style={{ transform: [{ rotate: `${heading}deg` }] }}
          >
            <View style={{ width: 20, height: 20, backgroundColor: 'blue', borderRadius: 10, borderWidth: 2, borderColor: '#fff' }} />
          </Marker.Animated>
        )}

        {routeData?.polyline && (
          <Polyline coordinates={routeData.polyline} strokeColor="#007AFF" strokeWidth={4} />
        )}
      </MapView>

      {routeData && (
        <View style={styles.routeDetails}>
          <Text style={styles.routeText}>🛣 Distance: {routeData.distance}</Text>
          <Text style={styles.routeText}>⏱ Duration: {routeData.duration}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  autocompleteWrapper: {
    position: 'absolute',
    top: 40,
    left: 10,
    right: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    zIndex: 10,
  },
  heading: { fontWeight: '600', marginVertical: 5 },
  autocompleteContainer: {
    marginVertical: 5,
    backgroundColor: '#e9e9e9',
    borderRadius: 4,
    paddingHorizontal: 8,
  },
  input: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    paddingHorizontal: 8,
    marginVertical: 5,
    borderRadius: 4,
  },
  suggestionText: {
    padding: 8,
    fontSize: 14,
    borderBottomColor: '#ccc',
    borderBottomWidth: 1,
  },
  addStopButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 4,
    marginVertical: 5,
  },
  addStopText: { color: '#fff', textAlign: 'center' },
  stopText: { fontSize: 14, marginVertical: 2 },
  buttonContainer: { marginVertical: 10 },
  map: { flex: 1, marginTop: 350 },
  routeDetails: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  routeText: { fontSize: 16, fontWeight: '600', marginVertical: 2 },
});

export default MapScreenOla;
