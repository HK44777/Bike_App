import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

export default function Ride() {
  const [mode, setMode] = useState('create');
  const [rideCode, setRideCode] = useState('');
  const [destination, setDestination] = useState('');
  const [rideStarted, setRideStarted] = useState(false);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [participants, setParticipants] = useState([
    { id: '1', name: 'Alice' },
    { id: '2', name: 'Bob' },
    { id: '3', name: 'Charlie' },
  ]);

  const navigation = useNavigation();

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const json = await AsyncStorage.getItem('rideSession');
        if (json) {
          const session = JSON.parse(json);
          setRideCode(session.rideCode);
          setDestination(session.destination);
          setIsOrganizer(session.isOrganizer);
          setRideStarted(true);
        }
      } catch (e) {
        console.error('Failed to load session', e);
      }
    };
    restoreSession();
  }, []);

  const saveSession = async (session) => {
    try {
      await AsyncStorage.setItem('rideSession', JSON.stringify(session));
    } catch (e) {
      console.error('Failed to save session', e);
    }
  };

  const clearSession = async () => {
    try {
      await AsyncStorage.removeItem('rideSession');
    } catch (e) {
      console.error('Failed to clear session', e);
    }
  };

  const handleCreateRide = async () => {
    if (!destination.trim()) {
      alert('Please enter a destination');
      return;
    }
    const generatedCode = 'ABC123';
    setRideCode(generatedCode);
    setIsOrganizer(true);
    setRideStarted(true);
    await saveSession({
      rideCode: generatedCode,
      destination,
      isOrganizer: true,
    });
  };

  const handleJoinRide = async () => {
    if (rideCode.trim()) {
      setIsOrganizer(false);
      setRideStarted(true);
      await saveSession({
        rideCode,
        destination: '',
        isOrganizer: false,
      });
    }
  };

  const handleLeaveConfirmed = async () => {
    setShowLeaveModal(false);
    setRideCode('');
    setDestination('');
    setIsOrganizer(false);
    setRideStarted(false);
    await clearSession();
  };

  const showRideDetails = rideStarted;

  return (
    <View style={styles.container}>
      {!showRideDetails && (
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleButton, mode === 'create' && styles.activeTab]}
            onPress={() => setMode('create')}
          >
            <Text style={styles.toggleText}>Create Ride</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, mode === 'join' && styles.activeTab]}
            onPress={() => setMode('join')}
          >
            <Text style={styles.toggleText}>Join Ride</Text>
          </TouchableOpacity>
        </View>
      )}

      {!showRideDetails ? (
        <>
          {mode === 'create' ? (
            <>
              <Text style={styles.title}>Enter Destination</Text>
              <TextInput
                placeholder="e.g., Nandi Hills"
                style={styles.input}
                value={destination}
                onChangeText={setDestination}
              />
              <TouchableOpacity style={styles.button} onPress={handleCreateRide}>
                <Text style={styles.buttonText}>Create Ride</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.title}>Enter Ride Code</Text>
              <TextInput
                placeholder="e.g., ABC123"
                style={styles.input}
                value={rideCode}
                onChangeText={setRideCode}
              />
              <TouchableOpacity style={styles.button} onPress={handleJoinRide}>
                <Text style={styles.buttonText}>Join Ride</Text>
              </TouchableOpacity>
            </>
          )}
        </>
      ) : (
        <View style={styles.details}>
          <Text style={styles.title}>🚴 Ride Details</Text>
          <Text>Ride Code: {rideCode}</Text>
          <Text>Destination: {destination || 'Not set'}</Text>
          <Text>Role: {isOrganizer ? 'Organizer' : 'Participant'}</Text>

          <Text style={[styles.title, { marginTop: 20 }]}>Participants:</Text>
          <FlatList
            data={participants}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <Text>• {item.name}</Text>}
          />

          <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Map')}>
            <Text style={styles.buttonText}>Go to Map</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: 'red', marginTop: 10 }]}
            onPress={() => setShowLeaveModal(true)}
          >
            <Text style={styles.buttonText}>Leave Ride</Text>
          </TouchableOpacity>
        </View>
      )}

      {showLeaveModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Leave Ride?</Text>
            <Text style={styles.modalText}>
              Are you sure you want to leave this ride? Your progress will be cleared.
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: '#ccc', flex: 1, marginRight: 5 }]}
                onPress={() => setShowLeaveModal(false)}
              >
                <Text style={{ textAlign: 'center' }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, { backgroundColor: 'red', flex: 1, marginLeft: 5 }]}
                onPress={handleLeaveConfirmed}
              >
                <Text style={styles.buttonText}>Leave</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 18, fontWeight: 'bold', marginVertical: 10 },
  input: {
    borderWidth: 1, borderColor: '#ccc', borderRadius: 8,
    padding: 10, marginBottom: 10
  },
  button: {
    backgroundColor: '#007AFF', padding: 12,
    borderRadius: 8, marginTop: 10
  },
  buttonText: { color: '#fff', textAlign: 'center' },
  toggleContainer: {
    flexDirection: 'row', justifyContent: 'center',
    marginBottom: 20
  },
  toggleButton: {
    flex: 1, padding: 10,
    borderBottomWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center'
  },
  activeTab: {
    borderColor: '#007AFF'
  },
  toggleText: {
    fontSize: 16, fontWeight: '600'
  },
  details: {
    marginTop: 30
  },
  modalOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalText: {
    fontSize: 14,
    color: '#444',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
