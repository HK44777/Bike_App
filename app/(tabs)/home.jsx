import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

const App = () => {
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const getUserName = async () => {
      const storedName = await AsyncStorage.getItem('userName');
      if (storedName) {
        setUserName(storedName);
      }
    };
    getUserName();
  }, []);

  const handleCreateRide = () => {
    router.push('/Ride');
  };

  const handleJoinRide = () => {
    router.push('/Ride');
  };

  return (
    <View style={styles.container}>
      {/* Header with user's name */}
      <View style={styles.header}>
        <Text style={styles.headerText}>hi {userName}</Text>
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
