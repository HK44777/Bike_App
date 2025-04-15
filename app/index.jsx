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
import img1 from "@/assets/images/icon.png";
import img2 from "@/assets/images/adaptive-icon.png";
import img3 from '@/assets/images/react-logo.png';
import img4 from '@/assets/images/splash-icon.png';
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
    setModalVisible(false);
    // Delay navigation until after the modal closes
    setTimeout(() => {
      router.push('/home');
    }, 300);
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* App Logo */}
      <Image source={img1} style={styles.logo} />
      
      {/* Tagline */}
      <Text style={styles.tagline}>Ride Smart. Ride Together.</Text>
      
      {/* Get Started Button */}
      <TouchableOpacity style={styles.getStartedButton} onPress={handleGetStarted}>
        <Text style={styles.getStartedButtonText}>Get Started</Text>
      </TouchableOpacity>

      {/* App Features in Vertical Stack */}
      <View style={styles.featuresContainer}>
        <View style={styles.featureItem}>
          <Image source={img2} style={styles.featureIcon} />
          <Text style={styles.featureText}>Real-Time Tracking</Text>
        </View>
        <View style={styles.featureItem}>
          <Image source={img3} style={styles.featureIcon} />
          <Text style={styles.featureText}>Group Coordination</Text>
        </View>
        <View style={styles.featureItem}>
          <Image source={img4} style={styles.featureIcon} />
          <Text style={styles.featureText}>Safety Alerts</Text>
        </View>
      </View>


      {/* Modal for Name Input */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enter name</Text>
            <TextInput
              placeholder="Enter your name"
              value={name}
              onChangeText={setName}
              style={styles.input}
              placeholderTextColor="#888"
            />
            <TouchableOpacity style={styles.modalButton} onPress={handleContinue}>
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
    backgroundColor: '#fff', // White background
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
    resizeMode: 'contain',
  },
  tagline: {
    fontFamily: 'Poppins',
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
    marginBottom: 50,
  },
  featuresContainer: {
    flexDirection: 'column', // Vertical stack of features
    alignItems: 'center',
    width: '100%',
    marginTop:20,
    marginBottom: 30,
  },
  featureItem: {
    alignItems: 'center',
    marginBottom: 20,
  },
  featureIcon: {
    width: 50,
    height: 50,
    marginBottom: 10,
    resizeMode: 'contain',
  },
  featureText: {
    fontFamily: 'Poppins',
    fontSize: 16,
    color: '#000',
    textAlign: 'center',
  },
  getStartedButton: {
    backgroundColor: '#000', // Black button background
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    marginBottom: 20,
  },
  getStartedButtonText: {
    fontFamily: 'Poppins',
    fontSize: 18,
    fontWeight: '600',
    color: '#fff', // White text
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontFamily: 'Poppins',
    fontSize: 18,
    fontWeight: '400',
    marginBottom: 20,
    color: '#000',
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 20,
    fontFamily: 'Poppins',
    color: '#000',
  },
  modalButton: {
    backgroundColor: '#000', // Black button
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalButtonText: {
    fontFamily: 'Poppins',
    fontSize: 16,
    color: '#fff', // White text
  },
});

export default SplashScreen;
