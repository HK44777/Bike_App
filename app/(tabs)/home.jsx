// app/home.jsx
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView, 
  Modal 
} from 'react-native';
import { router } from 'expo-router';

const App = () => {
  const [isCurrentRideModalVisible, setIsCurrentRideModalVisible] = useState(false);

  const handleCreateRide = () => {
    router.push('/create_ride');
  };

  // Updated to redirect to the Join Ride screen.
  const handleJoinRide = () => {
    router.push('/join_ride');
  };

  // Function to open the modal for current ride
  const handleCurrentRide = () => {
    setIsCurrentRideModalVisible(true);
  };

  // Function to close the modal
  const handleCloseModal = () => {
    setIsCurrentRideModalVisible(false);
  };

  // Navigation or logic for resuming a ride
  const handleResumeRide = () => {
    router.push('/resume_ride');
    setIsCurrentRideModalVisible(false);
  };

  // Navigation or logic for finishing a ride
  const handleFinishRide = () => {
    router.push('/finish_ride');
    setIsCurrentRideModalVisible(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerText}>Good Morning, Eashan</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <TouchableOpacity style={styles.button} onPress={handleCreateRide}>
          <Text style={styles.buttonText}>Create Ride</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleJoinRide}>
          <Text style={styles.buttonText}>Join Ride</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleCurrentRide}>
          <Text style={styles.buttonText}>Current Ride</Text>
        </TouchableOpacity>
      </View>

      {/* Modal for Current Ride Options */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isCurrentRideModalVisible}
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>

            <TouchableOpacity style={styles.modalButton} onPress={handleResumeRide}>
              <Text style={styles.modalButtonText}>Resume Ride</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalButton} onPress={handleFinishRide}>
              <Text style={styles.modalButtonText}>Finish Ride</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalCancelButton} onPress={handleCloseModal}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default App;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff', // White background
    alignItems: 'center',
  },
  header: {
    width: '100%',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    alignItems: 'center',
  },
  headerText: {
    fontFamily: 'Poppins',
    fontSize: 20,
    fontWeight: '700',
    color: '#000', // Black text
  },
  content: {
    flex: 1,
    width: '100%',
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#000', // Black button background
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 30,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonText: {
    fontFamily: 'Poppins',
    fontSize: 18,
    fontWeight: '600',
    color: '#fff', // White text
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: 'rgba(0,0,0,0.5)', // Semi-transparent overlay
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontFamily: 'Poppins',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 50,
    color: '#000',
  },
  modalButton: {
    backgroundColor: '#000',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 30,
    marginBottom: 10,
  },
  modalButtonText: {
    fontFamily: 'Poppins',
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  modalCancelButton: {
    marginTop: 20,
  },
  modalCancelText: {
    fontFamily: 'Poppins',
    fontSize: 16,
    color: '#000',
  },
});
