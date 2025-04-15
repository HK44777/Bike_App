import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Keyboard,
  Modal,
} from 'react-native';
import MapView, { Marker, Polyline, AnimatedRegion } from 'react-native-maps';
import PolylineDecoder from '@mapbox/polyline';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

// 🔐 Your Ola Maps API Key
const OLA_API_KEY = 'CornDpxoVHMISlbCN8ePrPdauyrHDeIBZotfvRdy';

// Helper function to format duration (in seconds) to a friendly string.
const formatDuration = (durationSec) => {
  if (durationSec < 3600) {
    const minutes = Math.ceil(durationSec / 60);
    return `${minutes} min${minutes > 1 ? 's' : ''}`;
  } else if (durationSec < 86400) {
    const hours = Math.floor(durationSec / 3600);
    const minutes = Math.ceil((durationSec % 3600) / 60);
    return `${hours} hr${hours > 1 ? 's' : ''}${
      minutes > 0 ? ` ${minutes} min${minutes > 1 ? 's' : ''}` : ''
    }`;
  } else {
    const days = Math.floor(durationSec / 86400);
    const remainingSec = durationSec % 86400;
    const hours = Math.floor(remainingSec / 3600);
    return `${days} day${days > 1 ? 's' : ''}${
      hours > 0 ? ` ${hours} hr${hours > 1 ? 's' : ''}` : ''
    }`;
  }
};

const OlaPlacesAutocomplete = ({
  placeholder,
  onSelect,
  clearPickupRef,
  initialValue = '',
}) => {
  // Manage input value, suggestions, and a flag to track selection.
  const [input, setInput] = useState(initialValue);
  const [suggestions, setSuggestions] = useState([]);
  const [hasSelected, setHasSelected] = useState(false);
  const inputRef = useRef(null);

  // Update input and set selection flag if initialValue changes.
  useEffect(() => {
    setInput(initialValue);
    if (initialValue && initialValue.trim().length > 0) {
      setHasSelected(true);
    }
  }, [initialValue]);

  // For pickup, assign clear function reference if provided.
  useEffect(() => {
    if (placeholder.toLowerCase().includes('pickup') && clearPickupRef) {
      clearPickupRef.current = () => {
        setInput('');
        setHasSelected(false);
      };
    }
  }, [clearPickupRef, placeholder]);

  // Fetch suggestions only if the user is typing and no selection was made.
  useEffect(() => {
    if (hasSelected) {
      setSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      if (input.length < 3) {
        setSuggestions([]);
        return;
      }
      try {
        const response = await fetch(
          `https://api.olamaps.io/places/v1/autocomplete?input=${encodeURIComponent(
            input
          )}&api_key=${OLA_API_KEY}`,
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
  }, [input, hasSelected]);

  return (
    <View style={styles.autocompleteContainer}>
      <View style={styles.inputContainer}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder={placeholder}
          value={input}
          onChangeText={(text) => {
            setInput(text);
            setHasSelected(false);
          }}
          // Force the visible selection to the beginning when a selection is made.
          selection={hasSelected ? { start: 0, end: 0 } : undefined}
        />
        {input.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => {
              setInput('');
              setHasSelected(false);
              // Dismiss the keyboard if open.
              Keyboard.dismiss();
            }}
          >
            <Ionicons name="close-circle-outline" size={20} color="gray" />
          </TouchableOpacity>
        )}
      </View>
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
                setHasSelected(true);
                // Blur the input to dismiss suggestions.
                inputRef.current && inputRef.current.blur();
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
  const [isSearchCollapsed, setIsSearchCollapsed] = useState(false);

  // State for custom alert
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  const clearPickupRef = useRef(null);
  const mapRef = useRef(null);
  const userLocationAnim = useRef(
    new AnimatedRegion({
      latitude: 0,
      longitude: 0,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    })
  ).current;

  // Helper to show custom alert
  const showAlert = (title, message) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertVisible(true);
  };

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showAlert('Permission Denied', 'Location permission is required.');
        return;
      }
      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude, heading } = location.coords;
      setUserLocation({ latitude, longitude });
      setHeading(heading || 0);
      userLocationAnim.setValue({ latitude, longitude });

      if (!pickup) {
        setPickup({
          latitude,
          longitude,
          description: 'Current Location',
        });
      }

      Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 3000,
          distanceInterval: 10,
        },
        (loc) => {
          const { latitude, longitude, heading } = loc.coords;
          setUserLocation({ latitude, longitude });
          setHeading(heading || 0);
          userLocationAnim.timing({
            latitude,
            longitude,
            duration: 1000,
            useNativeDriver: false,
          }).start();
        }
      );
    })();
  }, []);

  const addStop = (place) => {
    setStops((prev) => [...prev, place]);
  };

  const removeStop = (indexToRemove) => {
    setStops((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  // Computes a map region that bounds all the points (with added padding).
  const computeRegionForCoordinates = (points) => {
    const lats = points.map((p) => p.latitude);
    const lngs = points.map((p) => p.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const midLat = (minLat + maxLat) / 2;
    const midLng = (minLng + maxLng) / 2;
    const latDelta = (maxLat - minLat) * 1.5 || 0.01;
    const lngDelta = (maxLng - minLng) * 1.5 || 0.01;

    return {
      latitude: midLat,
      longitude: midLng,
      latitudeDelta: latDelta,
      longitudeDelta: lngDelta,
    };
  };

  const fetchRoute = async () => {
    if (!destination) {
      showAlert('Error', 'Please select a destination.');
      return;
    }

    let finalPickup = pickup;
    if (!pickup || !pickup.description || pickup.description.trim() === '') {
      if (userLocation) {
        finalPickup = {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          description: 'Current Location',
        };
        setPickup(finalPickup);
      } else {
        showAlert('Error', 'Current location not available.');
        return;
      }
    }

    try {
      const allLocations = [finalPickup, ...stops, destination];
      const locationStr = allLocations
        .map((loc) => `${loc.latitude},${loc.longitude}`)
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
        showAlert('Error', 'No route found.');
        return;
      }

      const decodedPolyline = PolylineDecoder.decode(route.overview_polyline).map(
        ([lat, lng]) => ({ latitude: lat, longitude: lng })
      );

      const totalDistance =
        route.legs?.reduce((sum, leg) => sum + (leg.distance || 0), 0) || 0;
      const totalDuration =
        route.legs?.reduce((sum, leg) => sum + (leg.duration || 0), 0) || 0;

      const distance = `${(totalDistance / 1000).toFixed(1)} km`;
      const duration = formatDuration(totalDuration);

      setRouteData({
        polyline: decodedPolyline,
        distance,
        duration,
      });

      // Auto-collapse the search panel.
      setIsSearchCollapsed(true);

      // Animate the map to focus on the route.
      if (decodedPolyline.length > 0 && mapRef.current) {
        const region = computeRegionForCoordinates(decodedPolyline);
        mapRef.current.animateToRegion(region, 1000);
      }
    } catch (err) {
      console.error('Error fetching route:', err);
      showAlert('Error', 'Failed to fetch route.');
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
          coordinate={{
            latitude: destination.latitude,
            longitude: destination.longitude,
          }}
          title="Destination"
          pinColor="red"
        />
      );
    }

    stops.forEach((stop, index) => {
      markers.push(
        <Marker
          key={`stop-${index}`}
          coordinate={{
            latitude: stop.latitude,
            longitude: stop.longitude,
          }}
          title={`Stop ${index + 1}`}
          pinColor="orange"
        />
      );
    });

    return markers;
  };

  return (
    <View style={styles.container}>
      {/* Collapsible search panel */}
      {!isSearchCollapsed && (
        <View style={styles.autocompleteWrapper}>
          <Text style={styles.heading}>Source</Text>
          <OlaPlacesAutocomplete
            placeholder="Enter source location"
            onSelect={setPickup}
            clearPickupRef={clearPickupRef}
            initialValue={pickup?.description || ''}
          />

          <Text style={styles.heading}>Destination</Text>
          <OlaPlacesAutocomplete
            placeholder="Enter final location"
            onSelect={setDestination}
            initialValue={destination?.description || ''}
          />

          <Text style={styles.heading}>Stops (optional)</Text>
          {stops.map((stop, index) => (
            <View key={index} style={styles.stopContainer}>
              <Text style={styles.stopText}>
                Stop {index + 1}: {stop.description}
              </Text>
              <TouchableOpacity
                onPress={() => removeStop(index)}
                style={styles.stopCancelButton}
              >
                <Ionicons name="close-circle-outline" size={20} color="black" />
              </TouchableOpacity>
            </View>
          ))}

          {showStopInput ? (
            <OlaPlacesAutocomplete
              placeholder="Enter stop location"
              onSelect={(place) => {
                addStop(place);
                setShowStopInput(false);
              }}
              initialValue={''}
            />
          ) : (
            <TouchableOpacity
              style={styles.addStopButton}
              onPress={() => setShowStopInput(true)}
            >
              <Text style={styles.addStopText}>+ Add a Stop</Text>
            </TouchableOpacity>
          )}

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.routeButton} onPress={fetchRoute}>
              <Text style={styles.routeButtonText}>Show Route</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Button to re-open search panel when collapsed */}
      {isSearchCollapsed && (
        <TouchableOpacity
          style={styles.showButton}
          onPress={() => setIsSearchCollapsed(false)}
        >
          <Text style={styles.showButtonText}>Show Search Panel</Text>
        </TouchableOpacity>
      )}

      {/* Fullscreen Map */}
      <MapView
        ref={mapRef}
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
            <View
              style={{
                width: 20,
                height: 20,
                backgroundColor: 'blue',
                borderRadius: 10,
                borderWidth: 2,
                borderColor: '#fff',
              }}
            />
          </Marker.Animated>
        )}
        {routeData?.polyline && (
          <Polyline
            coordinates={routeData.polyline}
            strokeColor="#007AFF"
            strokeWidth={4}
          />
        )}
      </MapView>

      {routeData && (
        <View style={styles.routeDetails}>
          <Text style={styles.routeText}>Distance: {routeData.distance}</Text>
          <Text style={styles.routeText}>Duration: {routeData.duration}</Text>
        </View>
      )}

      {/* Custom Alert Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={alertVisible}
        onRequestClose={() => setAlertVisible(false)}
      >
        <View style={styles.alertOverlay}>
          <View style={styles.alertContainer}>
            <Text style={styles.alertMessage}>{alertMessage}</Text>
            <TouchableOpacity
              style={styles.alertButton}
              onPress={() => setAlertVisible(false)}
            >
              <Text style={styles.alertButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default MapScreenOla;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  autocompleteWrapper: {
    position: 'absolute',
    top: 40,
    left: 10,
    right: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    zIndex: 10,
  },
  heading: {
    fontFamily: 'Poppins',
    fontWeight: '600',
    marginVertical: 5,
  },
  autocompleteContainer: {
    marginVertical: 5,
    backgroundColor: '#e9e9e9',
    borderRadius: 10,
    paddingHorizontal: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    paddingHorizontal: 8,
    marginVertical: 5,
    borderRadius: 10,
    textAlign: 'left',
  },
  clearButton: {
    marginRight: 5,
  },
  suggestionText: {
    padding: 8,
    fontSize: 14,
    borderBottomColor: '#ccc',
    borderBottomWidth: 1,
  },
  addStopButton: {
    fontFamily: 'Poppins',
    backgroundColor: 'black',
    padding: 10,
    borderRadius: 10,
    marginVertical: 5,
  },
  addStopText: {
    fontFamily: 'Poppins',
    color: '#fff',
    textAlign: 'center',
  },
  stopContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  stopText: {
    fontSize: 14,
  },
  stopCancelButton: {
    marginLeft: 10,
  },
  buttonContainer: {
    fontFamily: 'Poppins',
    backgroundColor: 'black',
    marginVertical: 10,
    borderRadius: 10,
  },
  routeButton: {
    backgroundColor: 'black',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
  },
  routeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Poppins',
    textAlign: 'center',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
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
    zIndex: 5,
  },
  routeText: {
    fontFamily: 'Poppins',
    fontSize: 16,
    fontWeight: '600',
    marginVertical: 2,
  },
  showButton: {
    position: 'absolute',
    top: 40,
    left: 10,
    right: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    zIndex: 10,
    alignItems: 'center',
  },
  showButtonText: {
    fontFamily: 'Poppins',
    color: 'black',
    fontWeight: '600',
  },
  // Custom Alert styles
  alertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Poppins',
    marginBottom: 10,
  },
  alertMessage: {
    fontSize: 16,
    fontFamily: 'Poppins',
    marginBottom: 20,
  },
  alertButton: {
    backgroundColor: 'black',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  alertButtonText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Poppins',
  },
});
