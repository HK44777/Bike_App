import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';

const App = () => {
  const handleCreateRide = () => {
    router.push('/create_ride'); // Navigate to Create Ride screen
  };

  const handleJoinRide = () => {
    router.push('/join_ride'); // Navigate to Join Ride screen
  };

  return (
    <View style={styles.container}>
      {/* Header with 'hi' text */}
      <View style={styles.header}>
        <Text style={styles.headerText}>hi eashan</Text>
      </View>

      {/* Main Screen Content */}
      <View style={styles.content}>
        <TouchableOpacity style={styles.button} onPress={handleCreateRide}>
          <Text style={styles.buttonText}>Create Ride</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={handleJoinRide}>
          <Text style={styles.buttonText}>Join Ride</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default App;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    height: 60,
    justifyContent: 'center',
    paddingHorizontal: 15,
  },
  headerText: {
    fontSize: 20,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 8,
    marginVertical: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
});