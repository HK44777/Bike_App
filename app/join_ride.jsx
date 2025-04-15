import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

// 🔐 Your Ola Maps API Key
const OLA_API_KEY = 'CornDpxoVHMISlbCN8ePrPdauyrHDeIBZotfvRdy';

// Reusable autocomplete component that fetches suggestions via Ola API
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
        console.error('🚨 Error fetching autocomplete:', error);
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
          // Keep the field fixed by explicitly disabling multiline.
          multiline={false}
        />
      </View>
      {suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          {suggestions.map((item, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => {
                const selectedText = item.description || item.name || '';
                setInput(selectedText);
                setSuggestions([]);
                setHasSelected(true);
                inputRef.current && inputRef.current.blur();
                Keyboard.dismiss();
                // Return an object that includes the location data
                onSelect({
                  latitude: item.lat || item.geometry?.location?.lat || 0,
                  longitude: item.lng || item.geometry?.location?.lng || 0,
                  description: selectedText,
                });
              }}
            >
              <Text style={styles.suggestionText}>{item.description}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

// Custom OTP Input Component for 6-digit join code
const OTPInput = ({ value, onChange, numberOfDigits = 6 }) => {
  const [digits, setDigits] = useState(Array(numberOfDigits).fill(''));
  const inputsRef = useRef([]);

  // Sync parent's value if it changes externally
  useEffect(() => {
    const newDigits = value.split('');
    if (newDigits.length === numberOfDigits) {
      setDigits(newDigits);
    }
  }, [value]);

  const handleChange = (text, index) => {
    // Ensure only one digit is entered
    text = text.slice(-1);
    const newDigits = [...digits];
    newDigits[index] = text;
    setDigits(newDigits);
    onChange(newDigits.join(''));
    // If a digit was entered, move focus to the next field
    if (text && index < numberOfDigits - 1) {
      inputsRef.current[index + 1].focus();
    }
  };

  const handleKeyPress = ({ nativeEvent }, index) => {
    if (nativeEvent.key === 'Backspace' && digits[index] === '' && index > 0) {
      inputsRef.current[index - 1].focus();
    }
  };

  return (
    <View style={styles.otpContainer}>
      {digits.map((digit, index) => (
        <TextInput
          key={index}
          value={digit}
          onChangeText={(text) => handleChange(text, index)}
          onKeyPress={(e) => handleKeyPress(e, index)}
          keyboardType="number-pad"
          maxLength={1}
          style={styles.otpInput}
          ref={(ref) => (inputsRef.current[index] = ref)}
        />
      ))}
    </View>
  );
};

const JoinRideScreen = () => {
  // Instead of a simple string, we store the full location object for pickup.
  const [source, setSource] = useState(null);
  // joinCode will now hold the concatenated OTP digits.
  const [joinCode, setJoinCode] = useState('');
  // Custom Alert state
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  // Reference to clear the autocomplete input if needed.
  const clearSourceRef = useRef(null);

  // Helper to show our custom alert
  const showAlert = (title, message) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertVisible(true);
  };

  const handleJoinRide = () => {
    if (!source || !source.description.trim()) {
      showAlert('Error', 'Pickup location is required.');
      return;
    }
    if (joinCode.length !== 6) {
      showAlert('Error', 'Please enter a valid 6-digit join code.');
      return;
    }
    // Perform your join-ride logic here, then navigate
    router.push('/travel');
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
        <Text style={styles.headerTitle}>Join your ride</Text>
      </View>

      {/* Main Input Panel */}
      <View style={styles.inputPanel}>
        <Text style={styles.label}>Pickup Location</Text>
        <OlaPlacesAutocomplete
          placeholder="Enter pickup location"
          onSelect={setSource}
          clearPickupRef={clearSourceRef}
          initialValue={source ? source.description : ''}
        />

        <Text style={styles.label}>Enter Ride Code</Text>
        {/* Replace text field with OTP input */}
        <OTPInput value={joinCode} onChange={setJoinCode} />

        <TouchableOpacity style={styles.joinRideButton} onPress={handleJoinRide}>
          <Text style={styles.joinRideButtonText}>Join Ride</Text>
        </TouchableOpacity>
      </View>

      {/* Custom Alert Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={alertVisible}
        onRequestClose={() => setAlertVisible(false)}
      >
        <View style={styles.alertOverlay}>
          <View style={styles.alertContainer}>
            <Text style={styles.alertTitle}>{alertTitle}</Text>
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

export default JoinRideScreen;

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
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Poppins',
  },
  // Main Input Panel styles
  inputPanel: {
    marginTop: 30,
    marginHorizontal: 10,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  label: {
    fontFamily: 'Poppins',
    fontWeight: '600',
    marginVertical: 5,
    fontSize: 16,
  },
  input: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    marginVertical: 5,
    fontFamily: 'Poppins',
  },
  joinRideButton: {
    backgroundColor: 'black',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
    marginTop: 20,
    alignSelf: 'center',
    width: '50%',
  },
  joinRideButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins',
    textAlign: 'center',
  },
  // Autocomplete styles
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
  clearButton: {
    marginRight: 5,
  },
  suggestionsContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  suggestionText: {
    padding: 8,
    fontSize: 14,
    fontFamily: 'Poppins',
    borderBottomColor: '#ccc',
    borderBottomWidth: 1,
  },
  // OTP Input styles
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  otpInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    width: 40,
    height: 50,
    textAlign: 'center',
    fontSize: 18,
    fontFamily: 'Poppins',
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
