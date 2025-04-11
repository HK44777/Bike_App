import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Button,
  Alert,
} from 'react-native';
import MapView, { Marker,Polyline} from 'react-native-maps';
import { Keyboard } from 'react-native';
import PolylineDecoder from '@mapbox/polyline';



const OLA_API_KEY = 'CornDpxoVHMISlbCN8ePrPdauyrHDeIBZotfvRdy';

const OlaPlacesAutocomplete = ({ placeholder, onSelect }) => {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);

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
            headers: {
              'X-Request-Id': 'sample-request-id', // Optional
            },
          }
        );

        const json = await response.json();
        console.log('Autocomplete response:', json);

        const results = json?.predictions || [];
        setSuggestions(results);
      } catch (error) {
        console.error('Error fetching autocomplete from Ola:', error);
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
              setInput(selectedText);         // ✅ Set the selected value in the input
              setSuggestions([]);             // ✅ Clear the suggestions
              Keyboard.dismiss();             // ✅ Hide the keyboard
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

  const addStop = place => {
    setStops(prev => [...prev, place]);
  };



const fetchRoute = async () => {
  if (!pickup || !destination) {
    Alert.alert('Error', 'Please select both pickup and destination locations.');
    return;
  }

  try {
    const allLocations = [pickup, ...stops, destination];
    const locationStr = allLocations
      .map(loc => `${loc.latitude},${loc.longitude}`)
      .join('|');

    const response = await fetch(
      `https://api.olamaps.io/routing/v1/routeOptimizer?locations=${locationStr}&api_key=${OLA_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'X-Request-Id': 'XXX',
        },
      }
    );

    const json = await response.json();
    console.log('Route Optimizer response:', json);

    const encodedPolyline = json?.routes?.[0]?.overview_polyline;

    if (!encodedPolyline) {
      Alert.alert('Error', 'No route found.');
      return;
    }

    const decodedPolyline = PolylineDecoder.decode(encodedPolyline).map(([lat, lng]) => ({
      latitude: lat,
      longitude: lng,
    }));

    setRouteData({
      polyline: decodedPolyline,
      distance: 'N/A', // You can parse and show this from json.routes[0].legs if needed
      duration: 'N/A',
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
        <OlaPlacesAutocomplete
          placeholder="Enter pickup location"
          onSelect={place => setPickup(place)}
        />

        <Text style={styles.heading}>Destination</Text>
        <OlaPlacesAutocomplete
          placeholder="Enter destination location"
          onSelect={place => setDestination(place)}
        />

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
        {routeData?.polyline && (
          <Polyline coordinates={routeData.polyline} strokeColor="#000" strokeWidth={3} />
        )}
      </MapView>

      {routeData && (
        <View style={styles.routeDetails}>
          <Text style={styles.routeText}>Distance: {routeData.distance}</Text>
          <Text style={styles.routeText}>Duration: {routeData.duration}</Text>
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
  heading: {
    fontWeight: '600',
    marginVertical: 5,
  },
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
  addStopText: {
    color: '#fff',
    textAlign: 'center',
  },
  stopText: {
    fontSize: 14,
    marginVertical: 2,
  },
  buttonContainer: { marginVertical: 10 },
  map: {
    flex: 1,
    marginTop: 350,
  },
  routeDetails: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 12,
    borderRadius: 8,
  },
  routeText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

export default MapScreenOla;
