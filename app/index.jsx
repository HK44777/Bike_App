import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Animated,
} from 'react-native';
import img1 from "@/assets/images/icon.png"
import img2 from "@/assets/images/adaptive-icon.png"
import img3 from '@/assets/images/react-logo.png'
import img4 from '@/assets/images/splash-icon.png'
import { router } from 'expo-router';

const SplashScreen = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    // Fade-in animation for the entire splash screen
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 2000,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const handleGetStarted = () => {
    setModalVisible(true);
  };

const handleContinue = () => {
    setModalVisible(false); // Close the modal
    // Wait for the modal to close (adjust delay as needed) then navigate
    setTimeout(() => {
      router.push('/home');
    }, 300);
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* App Logo and Tagline */}
      <Image source={img1} style={styles.logo} />
      <Text style={styles.tagline}>Ride Smart. Ride Together.</Text>

      {/* Display App Features */}
      <View style={styles.featuresContainer}>
        <View style={styles.featureItem}>
          <Image
            source={img2}
            style={styles.featureIcon}
          />
          <Text style={styles.featureText}>Real-Time Tracking</Text>
        </View>
        <View style={styles.featureItem}>
          <Image
            source={img3}
            style={styles.featureIcon}
          />
          <Text style={styles.featureText}>Group Coordination</Text>
        </View>
        <View style={styles.featureItem}>
          <Image
            source={img4}
            style={styles.featureIcon}
          />
          <Text style={styles.featureText}>Safety Alerts</Text>
        </View>
      </View>

      {/* Get Started Button */}
      <TouchableOpacity style={styles.getStartedButton} onPress={handleGetStarted}>
        <Text style={styles.getStartedButtonText}>Get Started</Text>
      </TouchableOpacity>

      {/* Modal for Name Input */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Welcome!</Text>
            <TextInput
              placeholder="Enter your name"
              value={name}
              onChangeText={setName}
              style={styles.input}
            />
            <TouchableOpacity
  style={styles.modalButton}
  onPress={handleContinue}
>
  <Text style={styles.modalButtonText}>Continue</Text>
</TouchableOpacity>

          </View>
        </View>
      </Modal>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff', // Customize as needed
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  logo: {
    width: 150,
    height: 150,
    marginBottom: 20,
    resizeMode: 'contain',
  },
  tagline: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginBottom: 30,
    textAlign: 'center',
  },
  featuresContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 30,
  },
  featureItem: {
    alignItems: 'center',
    width: '30%',
  },
  featureIcon: {
    width: 50,
    height: 50,
    marginBottom: 10,
    resizeMode: 'contain',
  },
  featureText: {
    fontSize: 14,
    textAlign: 'center',
    color: '#555',
  },
  getStartedButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  getStartedButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    width: '80%',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 20,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 5,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
  },
});

export default SplashScreen;
