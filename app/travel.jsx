import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Alert, ActivityIndicator, Platform } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PolylineDecoder from '@mapbox/polyline';
import * as Location from 'expo-location';

const OLA_API_KEY = 'CornDpxoVHMISlbCN8ePrPdauyrHDeIBZotfvRdy';

const TravelScreen = () => {
  const [pickup, setPickup] = useState(null);
  const [destination, setDestination] = useState(null);
  const [routeData, setRouteData] = useState(null);
  const [totalDistance, setTotalDistance] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepCoordinates, setStepCoordinates] = useState([]);
  const [traversedPolyline, setTraversedPolyline] = useState([]);


  const mapRef = useRef(null);
  useEffect(() => {
    if (!userLocation || !stepCoordinates.length) return;
  
    const getDistance = (lat1, lon1, lat2, lon2) => {
      const toRad = (value) => (value * Math.PI) / 180;
      const R = 6371e3; // metres
      const φ1 = toRad(lat1);
      const φ2 = toRad(lat2);
      const Δφ = toRad(lat2 - lat1);
      const Δλ = toRad(lon2 - lon1);
  
      const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
      return R * c;
    };
  
    const currentStep = stepCoordinates[currentStepIndex];
    if (!currentStep) return;
  
    const dist = getDistance(
      userLocation.latitude,
      userLocation.longitude,
      currentStep.latitude,
      currentStep.longitude
    );
  
    console.log(
      `🚶 Step ${currentStepIndex + 1}/${stepCoordinates.length}`,
      `Distance to next step: ${dist.toFixed(2)} meters`
    );
  
    if (dist < 30 && currentStepIndex < stepCoordinates.length - 1) {
      console.log('✅ Reached step, moving to next step.');
      setCurrentStepIndex(prev => prev + 1);
    }
  
  }, [userLocation, stepCoordinates, currentStepIndex]);
  
  useEffect(() => {
    const loadData = async () => {
      try {
        const pickupStr = await AsyncStorage.getItem('pickup');
        const destStr = await AsyncStorage.getItem('destination');
        const pickupObj = pickupStr ? JSON.parse(pickupStr) : null;
        const destObj = destStr ? JSON.parse(destStr) : null;

        if (!pickupObj || !destObj) {
          Alert.alert('Missing Data', 'Pickup or Destination not set in AsyncStorage.');
          setLoading(false);
          return;
        }

        setPickup(pickupObj);
        setDestination(destObj);
      } catch (err) {
        console.error('Error loading coordinates:', err);
        setLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    if (pickup && destination) {
      fetchRoute();
    }
  }, [pickup, destination]);

  useEffect(() => {
    const getCurrentLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Location permission is required.');
          return;
        }

        const location = await Location.getCurrentPositionAsync({});
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      } catch (error) {
        console.error('Expo Location error:', error);
        Alert.alert('Error', 'Unable to fetch your location.');
      }
    };

    getCurrentLocation();
  }, []);

  useEffect(() => {
    if (!userLocation || !routeData?.polyline?.length) return;
  
    // Find the index of the closest point on the polyline to the current location
    let closestIndex = 0;
    let minDist = Infinity;
  
    routeData.polyline.forEach((point, idx) => {
      const dist = Math.sqrt(
        Math.pow(point.latitude - userLocation.latitude, 2) +
        Math.pow(point.longitude - userLocation.longitude, 2)
      );
      if (dist < minDist) {
        minDist = dist;
        closestIndex = idx;
      }
    });
  
    // Set the traversed path as everything up to the closest point
    const traversed = routeData.polyline.slice(0, closestIndex + 1);
    setTraversedPolyline(traversed);
  
  }, [userLocation, routeData]);
  

  const fetchRoute = async () => {
    try {
      setLoading(true);
      const url = `https://api.olamaps.io/routing/v1/directions?origin=${pickup.latitude},${pickup.longitude}&destination=${destination.latitude},${destination.longitude}&api_key=${OLA_API_KEY}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'X-Request-Id': 'ride-turn-by-turn',
        },
      });

      const json = await response.json();
      

      const route = json?.routes?.[0];
      if (!route?.overview_polyline) {
        Alert.alert('Route Error', 'No route found.');
        return;
      }

      const decodedPolyline = PolylineDecoder.decode(route.overview_polyline).map(
        ([lat, lng]) => ({
          latitude: lat,
          longitude: lng,
        })
      );

          const totalDist = route.legs?.length
      ? route.legs.reduce((sum, leg) => sum + (leg.distance || 0), 0)
      : route.distance || 0;

    const totalDur = route.legs?.length
      ? route.legs.reduce((sum, leg) => sum + (leg.duration || 0), 0)
      : route.duration || 0;


      const steps = route.legs[0].steps;

      const instructions = steps.map((step) => ({
        instruction: step.instructions || 'Continue',
        distance: step.distance,
        duration: step.duration,
        location: {
          latitude: step.end_location.lat,
          longitude: step.end_location.lng,
        },
      }));

      setRouteData({ polyline: decodedPolyline, instructions });
      setStepCoordinates(instructions.map(step => step.location));
      setTotalDistance(totalDist / 1000); // to km
      setTotalDuration(totalDur); // in seconds (we divide by 60 later)



      if (mapRef.current && decodedPolyline.length > 0) {
        mapRef.current.fitToCoordinates(decodedPolyline, {
          edgePadding: { top: 80, right: 80, bottom: 80, left: 80 },
          animated: true,
        });
      }
    } catch (err) {
      console.error('❌ Error fetching route:', err);
      Alert.alert('API Error', 'Could not fetch route.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={{ flex: 1 }} />
      ) : (
        <MapView
          ref={mapRef}
          style={{ flex: 1 }}
          initialRegion={{
            latitude: userLocation?.latitude || pickup?.latitude || 12.9716,
            longitude: userLocation?.longitude || pickup?.longitude || 77.5946,
            latitudeDelta: 0.08,
            longitudeDelta: 0.08,
          }}
          showsUserLocation={true}
          followsUserLocation={true}
        >
          {pickup && <Marker coordinate={pickup} title="Pickup" pinColor="green" />}
          {destination && <Marker coordinate={destination} title="Destination" pinColor="red" />}
          {traversedPolyline.length > 0 && (
            <Polyline
              coordinates={traversedPolyline}
              strokeColor="#A0A0A0" // Pale gray for completed route
              strokeWidth={4}
            />
          )}

          {routeData?.polyline && (
            <Polyline
              coordinates={routeData.polyline}
              strokeColor="#007AFF" // Main route color
              strokeWidth={4}
            />
          )}

        </MapView>
      )}
          {routeData?.instructions && (
      <View
        style={{
          position: 'absolute',
          top: 50,
          left: 20,
          right: 20,
          backgroundColor: '#000',
          padding: 16,
          borderRadius: 12,
          shadowColor: '#000',
          shadowOpacity: 0.2,
          shadowOffset: { width: 0, height: 4 },
          shadowRadius: 6,
          elevation: 5,
        }}
      >
        <Text style={{ color: 'white', fontSize: 16 }}>
          ➤ {routeData.instructions[currentStepIndex]?.instruction.replace(/<[^>]+>/g, '')}
        </Text>
        {routeData.instructions[currentStepIndex + 1] && (
          <Text style={{ color: '#eee', fontSize: 14, marginTop: 4 }}>
            Then {routeData.instructions[currentStepIndex + 1]?.instruction.replace(/<[^>]+>/g, '')}
          </Text>
        )}
      </View>
    )}



      {!loading && (
        <View
        style={{
          position: 'absolute',
          bottom: 10,
          left: 20,
          right: 20,
          backgroundColor: '#fff',
          padding: 16,
          borderRadius: 12,
          alignItems: 'center',
          shadowColor: '#000',
          shadowOpacity: 0.1,
          shadowOffset: { width: 0, height: 3 },
          shadowRadius: 5,
          elevation: 3,
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#000' }}>
          {Math.round(totalDuration / 60)} min • {totalDistance.toFixed(1)} km
        </Text>
      </View>
      
      )}
    </View>
  );
};

export default TravelScreen;
