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
  Share,
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router'; // For navigation
import AsyncStorage from '@react-native-async-storage/async-storage';

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

// Reusable autocomplete component
const OlaPlacesAutocomplete = ({
  placeholder,
  onSelect,
  clearPickupRef,
  initialValue = '',
}) => {
  const [input, setInput] = useState(initialValue);
  const [suggestions, setSuggestions] = useState([]);
  const [hasSelected, setHasSelected] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    setInput(initialValue);
    if (initialValue && initialValue.trim().length > 0) {
      setHasSelected(true);
    }
  }, [initialValue]);

  useEffect(() => {
    if (placeholder.toLowerCase().includes('pickup') && clearPickupRef) {
      clearPickupRef.current = () => {
        setInput('');
        setHasSelected(false);
      };
    }
  }, [clearPickupRef, placeholder]);

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
          { headers: { 'X-Request-Id': 'sample-request-id' } }
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
          selection={hasSelected ? { start: 0, end: 0 } : undefined}
        />
        {input.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => {
              setInput('');
              setHasSelected(false);
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

const LocationInputScreen = () => {
  const [pickup, setPickup] = useState(null);
  const [destination, setDestination] = useState(null);
  const [stops, setStops] = useState([]);
  const [showStopInput, setShowStopInput] = useState(false);
  const [routeDetails, setRouteDetails] = useState(null);
  const [isRouteModalVisible, setIsRouteModalVisible] = useState(false);
  const [generatedCode, setGeneratedCode] = useState(null);

  // Custom Alert state
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  // For clearing pickup input if necessary.
  const clearPickupRef = useRef(null);

  // Helper to show our custom alert
  const showAlert = (title, message) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertVisible(true);
  };

  // Get user's current location to pre-fill pickup
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showAlert('Permission Denied', 'Location permission is required.');
        return;
      }
      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      if (!pickup) {
        setPickup({
          latitude,
          longitude,
          description: 'Current Location',
        });
      }
    })();
  }, []);

  const addStop = (place) => {
    setStops((prev) => [...prev, place]);
  };

  const removeStop = (indexToRemove) => {
    setStops((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  // Compute route details and display them in a modal.
  const handleShowDetails = async () => {
    if (!destination) {
      showAlert('Error', 'Please select a destination.');
      return;
    }
    if (!pickup || !pickup.description?.trim()) {
      showAlert('Error', 'Pickup location is required.');
      return;
    }
    try {
      const allLocations = [pickup, ...stops, destination];
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
      if (!route) {
        showAlert('Error', 'No route found.');
        return;
      }
      const totalDistance =
        route.legs?.reduce((sum, leg) => sum + (leg.distance || 0), 0) || 0;
      const totalDuration =
        route.legs?.reduce((sum, leg) => sum + (leg.duration || 0), 0) || 0;
      const distance = `${(totalDistance / 1000).toFixed(1)} km`;
      const duration = formatDuration(totalDuration);
      setRouteDetails({ distance, duration });
      setIsRouteModalVisible(true);
    } catch (error) {
      console.error('Error fetching route details:', error);
      showAlert('Error', 'Failed to fetch route details.');
    }
  };

  // Generate a random 6-digit code.
  const handleGenerateCode = () => {
    if (!destination) {
      showAlert('Error', 'Destination has not been set.');
      return;
    }
    if (!routeDetails) {
      showAlert(
        'Error',
        'Route details have not been computed yet. Please click "Show Details" first.'
      );
      return;
    }
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedCode(code);
  };

  // Share the generated code via the native share dialog.
  const handleShareCode = async () => {
    if (!generatedCode) return;
    try {
      await Share.share({ message: `Your ride code is: ${generatedCode}` });
    } catch (error) {
      console.error('Error sharing code:', error);
    }
  };

  const saveRideCoordinates = async () => {
    if (pickup && destination) {
      try {
        if (!destination) {
          showAlert('Error', 'Destination has not been set.');
          return;
        }
        if (!routeDetails) {
          showAlert(
            'Error',
            'Route details have not been computed yet. Please click "Show Details" first.'
          );
          return;
        }
        // Save pickup and destination coordinates to AsyncStorage
        await AsyncStorage.setItem('pickup', JSON.stringify(pickup));
        await AsyncStorage.setItem('destination', JSON.stringify(destination));
        console.log('Coordinates saved successfully!');
      } 
      catch (error) {
        console.error('Error saving coordinates to AsyncStorage:', error);
      }
    } router.push('/travel');
  };

  return (
    <View style={styles.container}>
      {/* Header Row */}
      <View style={styles.headerContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push('/home')}
        >
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Set your ride</Text>
      </View>

      {/* Main Input Panel */}
      <View style={styles.autocompleteWrapper}>
        <Text style={styles.heading}>Source</Text>
        <OlaPlacesAutocomplete
          placeholder="Enter starting location"
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
          <>
            <OlaPlacesAutocomplete
              placeholder="Enter stop location"
              onSelect={(place) => {
                addStop(place);
                setShowStopInput(false);
              }}
              initialValue={''}
            />
            <TouchableOpacity
              style={styles.cancelStopButton}
              onPress={() => setShowStopInput(false)}
            >
              <Text style={styles.cancelStopText}>Cancel</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={styles.addStopButton}
            onPress={() => setShowStopInput(true)}
          >
            <Text style={styles.addStopText}>+ Add a Stop</Text>
          </TouchableOpacity>
        )}

        {/* Show Details Button */}
        <TouchableOpacity
          style={styles.showDetailsButton}
          onPress={handleShowDetails}
        >
          <Text style={styles.showDetailsButtonText}>Show Details</Text>
        </TouchableOpacity>
      </View>

      {/* Combined Code Generation and Start Ride Section */}
      <View style={styles.actionContainer}>
        {generatedCode ? (
          <View style={styles.codeContainer}>
            <Text style={styles.generatedCodeText}>{generatedCode}</Text>
            <TouchableOpacity
              style={styles.shareButton}
              onPress={handleShareCode}
            >
              <Text style={styles.shareButtonText}>Share</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.generateCodeButton}
            onPress={handleGenerateCode}
          >
            <Text style={styles.generateCodeText}>Generate Code</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.startRideButton}
          onPress={saveRideCoordinates}
        >
          <Text style={styles.startRideText}>Start Ride</Text>
        </TouchableOpacity>
      </View>

      {/* Modal to Display Route Details */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isRouteModalVisible}
        onRequestClose={() => setIsRouteModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeading}>Route Details</Text>
            {routeDetails && (
              <>
                <Text style={styles.modalText}>
                  Distance: {routeDetails.distance}
                </Text>
                <Text style={styles.modalText}>
                  Duration: {routeDetails.duration}
                </Text>
              </>
            )}
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setIsRouteModalVisible(false)}
            >
              <Text style={styles.modalCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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



const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  // Header styles
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  backButton: {
    marginRight: -15,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    textAlign: 'center',
    fontWeight: '650',
    fontFamily: 'Poppins',
  },
  // Autocomplete and input styles
  autocompleteWrapper: {
    marginTop: 20,
    marginHorizontal: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  heading: {
    fontFamily: 'Poppins',
    fontWeight: '600',
    marginVertical: 5,
    fontSize: 16,
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
    backgroundColor: 'black',
    padding: 10,
    borderRadius: 10,
    marginVertical: 5,
  },
  addStopText: {
    color: '#fff',
    textAlign: 'center',
    fontFamily: 'Poppins',
  },
  cancelStopButton: {
    backgroundColor: '#ccc',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignSelf: 'center',
    marginVertical: 5,
  },
  cancelStopText: {
    color: '#000',
    fontFamily: 'Poppins',
  },
  stopContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  stopText: {
    fontSize: 14,
    fontFamily: 'Poppins',
  },
  stopCancelButton: {
    marginLeft: 10,
  },
  showDetailsButton: {
    backgroundColor: 'black',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
    marginTop: 15,
  },
  showDetailsButtonText: {
    color: '#fff',
    fontFamily: 'Poppins',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Combined action container for code and start ride
  actionContainer: {
    marginTop: 20,
    marginHorizontal: 10,
    alignItems: 'center',
  },
  generateCodeButton: {
    backgroundColor: 'black',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
    width: '50%',
    alignSelf: 'center',
    marginBottom: 15,
  },
  generateCodeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Poppins',
    textAlign: 'center',
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  generatedCodeText: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'Poppins',
    marginRight: 20,
  },
  shareButton: {
    backgroundColor: 'black',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  shareButtonText: {
    color: '#fff',
    fontFamily: 'Poppins',
    fontWeight: '600',
  },
  startRideButton: {
    backgroundColor: 'black',marginTop: 15,
    marginHorizontal: 10,
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
    width: '50%',
    alignSelf: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  startRideText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins',
    textAlign: 'center',
  },
  // Modal for route details
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 30,
    width: '100%',
    alignItems: 'center',
  },
  modalHeading: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Poppins',
    marginBottom: 20,
  },
  modalText: {
    fontSize: 16,
    fontFamily: 'Poppins',
    fontWeight: '800',
    marginVertical: 8,
  },
  modalCloseButton: {
    marginTop: 25,
    backgroundColor: 'black',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
  },
  modalCloseButtonText: {
    color: '#fff',
    fontFamily: 'Poppins',
    fontSize: 14,
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
  generateCodeButton: {
    backgroundColor: 'black',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
    marginVertical: 10,
  },
  generateCodeText: {
    color: '#fff',
    fontFamily: 'Poppins',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  generatedCodeText: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Poppins',
    marginRight: 10,
  },
  shareButton: {
    backgroundColor: '#1E90FF',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
  },
  shareButtonText: {
    color: '#fff',
    fontFamily: 'Poppins',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  startRideButton: {
    backgroundColor: 'green',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
    marginTop: 15,
  },
  startRideText: {
    color: '#fff',
    fontFamily: 'Poppins',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
  },
  modalHeading: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Poppins',
    marginBottom: 10,
  },
  modalText: {
    fontSize: 16,
    fontFamily: 'Poppins',
    marginBottom: 5,
  },
  modalCloseButton: {
    marginTop: 20,
    backgroundColor: '#1E90FF',
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 10,
  },
  modalCloseButtonText: {
    color: '#fff',
    fontFamily: 'Poppins',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  alertOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  alertContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
  },
  alertMessage: {
    fontSize: 16,
    fontFamily: 'Poppins',
    marginBottom: 20,
  },
  alertButton: {
    backgroundColor: '#FF6347',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  alertButtonText: {
    color: '#fff',
    fontFamily: 'Poppins',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default LocationInputScreen;
