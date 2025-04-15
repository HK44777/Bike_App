import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Keyboard,
  ScrollView,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import PolylineDecoder from '@mapbox/polyline';
import { Ionicons } from '@expo/vector-icons';

// 🔐 Your Ola Maps API Key – replace with your actual key.
const OLA_API_KEY = 'CornDpxoVHMISlbCN8ePrPdauyrHDeIBZotfvRdy';

// Coordinates for Bangalore and Hyderabad.
const ORIGIN_COORDS = { latitude: 12.9716, longitude: 77.5946 };    // Bangalore
const DESTINATION_COORDS = { latitude: 17.3850, longitude: 78.4867 }; // Hyderabad

// Helper: Format duration (in seconds) to a readable string.
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

// Compute a region that covers an array of coordinates.
const computeRegionForCoordinates = (points) => {
  if (!points || points.length === 0) {
    return {
      latitude: ORIGIN_COORDS.latitude,
      longitude: ORIGIN_COORDS.longitude,
      latitudeDelta: 0.1,
      longitudeDelta: 0.1,
    };
  }
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
  return { latitude: midLat, longitude: midLng, latitudeDelta: latDelta, longitudeDelta: lngDelta };
};

const TravelScreen = () => {
  const [origin] = useState(ORIGIN_COORDS);
  const [destination] = useState(DESTINATION_COORDS);
  const [routeData, setRouteData] = useState(null);
  const [progressFactor, setProgressFactor] = useState(0);
  
  // Raw route stats
  const [totalDistance, setTotalDistance] = useState(0); // in km
  const [totalDuration, setTotalDuration] = useState(0); // in sec
  
  // Alert for errors.
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  
  // New states for our modals.
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showRideDetailsModal, setShowRideDetailsModal] = useState(false);

  const mapRef = useRef(null);

  const showAlert = (message) => {
    setAlertMessage(message);
    setAlertVisible(true);
  };

  // Fetch the route from Ola Maps API.
  const fetchRoute = async (from, to) => {
    try {
      const locationsStr = `${from.latitude},${from.longitude}|${to.latitude},${to.longitude}`;
      const response = await fetch(
        `https://api.olamaps.io/routing/v1/routeOptimizer?locations=${locationsStr}&api_key=${OLA_API_KEY}`,
        { method: 'POST', headers: { 'X-Request-Id': 'request-id-123' } }
      );
      const json = await response.json();
      const route = json?.routes?.[0];

      if (!route?.overview_polyline) {
        showAlert('No route found.');
        return;
      }

      // Decode polyline into coordinates.
      const decodedPolyline = PolylineDecoder.decode(route.overview_polyline).map(
        ([lat, lng]) => ({ latitude: lat, longitude: lng })
      );

      // Calculate total distance and duration.
      const rawDistance = route.legs?.reduce((sum, leg) => sum + (leg.distance || 0), 0) || 0;
      const rawDuration = route.legs?.reduce((sum, leg) => sum + (leg.duration || 0), 0) || 0;
      
      setTotalDistance(rawDistance / 1000);  // km
      setTotalDuration(rawDuration);

      const distanceStr = `${(rawDistance / 1000).toFixed(1)} km`;
      const durationStr = formatDuration(rawDuration);

      // Extract directions.
      const directions = [];
      if (route.legs && route.legs.length > 0) {
        route.legs.forEach((leg) => {
          if (leg.steps && Array.isArray(leg.steps)) {
            leg.steps.forEach((step) => {
              if (step.instruction) {
                directions.push(step.instruction);
              }
            });
          }
        });
      }

      setRouteData({
        polyline: decodedPolyline,
        instructions: directions,
        distanceStr,
        durationStr,
      });

      if (decodedPolyline.length > 0 && mapRef.current) {
        const region = computeRegionForCoordinates(decodedPolyline);
        mapRef.current.animateToRegion(region, 1000);
      }
    } catch (err) {
      console.error('Error fetching route:', err);
      showAlert('Failed to fetch route.');
    }
  };

  useEffect(() => {
    fetchRoute(origin, destination);
  }, []);

  // Simulate navigation updates.
  const simulateProgress = () => {
    setProgressFactor((prev) => {
      const next = Math.min(prev + 0.1, 1);
      return next;
    });
  };

  const remainingDistance = totalDistance ? (totalDistance * (1 - progressFactor)).toFixed(1) : '0';
  const remainingDuration = totalDuration ? formatDuration(totalDuration * (1 - progressFactor)) : '';

  const currentStepIndex =
    routeData && routeData.instructions && routeData.instructions.length > 0
      ? Math.min(routeData.instructions.length - 1, Math.floor(progressFactor * routeData.instructions.length))
      : 0;
  const currentInstruction =
    routeData && routeData.instructions && routeData.instructions.length > 0
      ? routeData.instructions[currentStepIndex]
      : '';

  // Render markers.
  const renderMarkers = () => (
    <>
      <Marker key="origin" coordinate={origin} title="Bangalore" pinColor="green" />
      <Marker key="destination" coordinate={destination} title="Hyderabad" pinColor="red" />
    </>
  );

  // Navigation overlay (live navigation card).
  const renderNavigationOverlay = () => (
    <View style={styles.navigationOverlay}>
      <Text style={styles.navTitle}>Navigation</Text>
      <Text style={styles.navInstruction}>{currentInstruction || 'Calculating route...'}</Text>
      <View style={styles.navStats}>
        <Text style={styles.statText}>Distance Left: {remainingDistance} km</Text>
        <Text style={styles.statText}>Time Left: {remainingDuration}</Text>
      </View>
      <TouchableOpacity style={styles.simulateButton} onPress={simulateProgress}>
        <Text style={styles.simulateButtonText}>Simulate Update</Text>
      </TouchableOpacity>
    </View>
  );

  // Full turn‑by‑turn directions overlay.
  const renderDirections = () => {
    if (routeData && routeData.instructions && routeData.instructions.length > 0) {
      return (
        <View style={styles.directionsOverlay}>
          <Text style={styles.directionsHeader}>Turn‑by‑turn Directions</Text>
          <ScrollView>
            {routeData.instructions.map((instruction, index) => (
              <View key={index} style={styles.directionItem}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.directionText}>{instruction}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      );
    }
    return null;
  };

  // Render modals
  const renderOptionsModal = () => (
    <Modal
      visible={showOptionsModal}
      animationType="slide"
      transparent
      onRequestClose={() => setShowOptionsModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Options</Text>
          <TouchableOpacity
            style={styles.modalButton}
            onPress={() => {
              setShowOptionsModal(false);
              console.log('Finish Ride pressed');
            }}
          >
            <Text style={styles.modalButtonText}>Finish Ride</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.modalButton}
            onPress={() => {
              setShowOptionsModal(false);
              console.log('Pause Ride pressed');
            }}
          >
            <Text style={styles.modalButtonText}>Pause Ride</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.modalButton}
            onPress={() => {
              setShowOptionsModal(false);
              console.log('Cancel Ride pressed');
            }}
          >
            <Text style={styles.modalButtonText}>Cancel Ride</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.modalCloseButton} onPress={() => setShowOptionsModal(false)}>
            <Text style={styles.modalCloseButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderRideDetailsModal = () => {
    // Calculate average speed (km/h) if duration is available.
    const avgSpeed =
      totalDuration > 0 ? ((totalDistance * 3600) / totalDuration).toFixed(1) : 'N/A';
    // For demonstration, using a static ride code.
    const rideCode = 'RIDE123';
    return (
      <Modal
        visible={showRideDetailsModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowRideDetailsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Ride Details</Text>
            <Text style={styles.detailText}>Ride Code: {rideCode}</Text>
            <Text style={styles.detailText}>Distance Traveled: {totalDistance} km</Text>
            <Text style={styles.detailText}>Average Speed: {avgSpeed} km/h</Text>
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setShowRideDetailsModal(false)}>
              <Text style={styles.modalCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      {/* Map view with polyline route */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: ORIGIN_COORDS.latitude,
          longitude: ORIGIN_COORDS.longitude,
          latitudeDelta: 1.5,
          longitudeDelta: 1.5,
        }}
      >
        {renderMarkers()}
        {routeData?.polyline && (
          <Polyline coordinates={routeData.polyline} strokeColor="#007AFF" strokeWidth={4} />
        )}
      </MapView>

      {/* Top overlay for live navigation */}
      {renderNavigationOverlay()}

      {/* Bottom overlay for full directions */}
      {renderDirections()}

      {/* Left overlay icons */}
      <View style={styles.leftOverlay}>
        <TouchableOpacity style={styles.circularIcon} onPress={() => console.log('SOS pressed')}>
          <Ionicons name="alert" size={24} color="red" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.circularIcon} onPress={() => console.log('Emergency Stop pressed')}>
          <Ionicons name="hand-left" size={24} color="orange" />
        </TouchableOpacity>
        {/* Info icon for ride details modal */}
        <TouchableOpacity style={styles.circularIcon} onPress={() => setShowRideDetailsModal(true)}>
          <Ionicons name="information-circle" size={24} color="blue" />
        </TouchableOpacity>
      </View>

      {/* Right overlay icons */}
      <View style={styles.rightOverlay}>
        {/* Options icon: triggers options modal */}
        <TouchableOpacity style={styles.circularIcon} onPress={() => setShowOptionsModal(true)}>
          <Ionicons name="ellipsis-horizontal" size={24} color="black" />
        </TouchableOpacity>
        {/* Offline maps icon */}
        <TouchableOpacity style={styles.circularIcon} onPress={() => console.log('Offline Maps pressed')}>
          <Ionicons name="cloud-download-outline" size={24} color="green" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.circularIcon} onPress={() => console.log('Mic toggled')}>
          <Ionicons name="mic-off" size={24} color="gray" />
        </TouchableOpacity>
      </View>

      {/* Render Modals */}
      {renderOptionsModal()}
      {renderRideDetailsModal()}

      {/* Custom Alert Modal for errors */}
      <Modal
        animationType="fade"
        transparent
        visible={alertVisible}
        onRequestClose={() => setAlertVisible(false)}
      >
        <View style={styles.alertOverlay}>
          <View style={styles.alertContainer}>
            <Text style={styles.alertMessage}>{alertMessage}</Text>
            <TouchableOpacity
              style={styles.alertButton}
              onPress={() => {
                setAlertVisible(false);
                Keyboard.dismiss();
              }}
            >
              <Text style={styles.alertButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default TravelScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  navigationOverlay: {
    position: 'absolute',
    top: 40,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.75)',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  navTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 5,
  },
  navInstruction: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 10,
    textAlign: 'center',
  },
  navStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 10,
  },
  statText: {
    color: '#fff',
    fontSize: 14,
  },
  simulateButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 5,
  },
  simulateButtonText: {
    color: '#fff',
    fontSize: 14,
  },
  directionsOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 20,
    right: 20,
    maxHeight: 200,
    backgroundColor: 'rgba(255,255,255,0.95)',
    padding: 10,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    elevation: 5,
  },
  directionsHeader: {
    fontSize: 16,
    fontWeight: '700',
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderColor: '#ccc',
    marginBottom: 5,
  },
  directionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 4,
  },
  stepNumber: {
    backgroundColor: '#007AFF',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  stepNumberText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  directionText: {
    flex: 1,
    fontSize: 14,
  },
  leftOverlay: {
    position: 'absolute',
    top: 150,
    left: 10,
    justifyContent: 'space-between',
    height: 180,
  },
  rightOverlay: {
    position: 'absolute',
    top: 150,
    right: 10,
    justifyContent: 'space-between',
    height: 150,
  },
  circularIcon: {
    backgroundColor: '#fff',
    width: 50,
    height: 50,
    borderRadius: 25,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
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
  alertMessage: {
    fontSize: 16,
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
  },
  // Modal styles for options and ride details:
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 15,
  },
  modalButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginVertical: 5,
    width: '100%',
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  modalCloseButton: {
    marginTop: 15,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 5,
    backgroundColor: '#aaa',
    width: '100%',
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  // Styles for ride details inside modal.
  detailText: {
    fontSize: 16,
    marginVertical: 4,
  },
});

