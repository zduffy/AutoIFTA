/**
 * AutoIFTA
 * https://iftaauto.com
 * By: ZDuffy Productions
 * @format
 * @flow
 * @lint-ignore-every XPLATJSCOPYRIGHT1
 */

import React from "react";

import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform,
  PermissionsAndroid,
  Button,
  NetInfo
} from "react-native";
import MapView, {
  Marker,
  AnimatedRegion,
  Polyline,
  PROVIDER_GOOGLE
} from "react-native-maps";
import MapStyles from './MapStyles/silver.json';
import haversine from "haversine";
import DeviceInfo from 'react-native-device-info';

const Realm = require('realm');



// const LATITUDE = 29.95539;
// const LONGITUDE = 78.07513;
const LATITUDE_DELTA = 0.009;
const LONGITUDE_DELTA = 0.009;
const LATITUDE = 37.176825;
const LONGITUDE = -113.363353;

const uniqueId = DeviceInfo.getUniqueID();
var d = new Date();
var curr_date = d.getDate();
var curr_month = d.getMonth() + 1; //Months are zero based
var curr_year = d.getFullYear();

const date = curr_year + "-" + curr_month + "-" + curr_date;

class AnimatedMarkers extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      connection_Status : "",
      realm: null,
      latitude: LATITUDE,
      longitude: LONGITUDE,
      routeCoordinates: [],
      distanceTravelled: 0,
      prevLatLng: {},
      coordinate: new AnimatedRegion({
        latitude: LATITUDE,
        longitude: LONGITUDE,
        latitudeDelta: 0,
        longitudeDelta: 0

      })
    };
  }

  componentDidMount() {



    const { coordinate } = this.state;

    this.requestCameraPermission();

    this.watchID = navigator.geolocation.watchPosition(
      position => {
        const { routeCoordinates, distanceTravelled } = this.state;
        const { latitude, longitude } = position.coords;

        const newCoordinate = {
          latitude,
          longitude
        };
        console.log({ newCoordinate });


NetInfo.isConnected.addEventListener(
        'connectionChange',
        this._handleConnectivityChange

    );

    NetInfo.isConnected.fetch().done((isConnected) => {

      if(isConnected == true)
      {
        this.setState({connection_Status : "Online"})
        console.log('Were Online');

        async function fetchState() {


          let response = await fetch('https://nominatim.openstreetmap.org/reverse?format=json&lat=' + latitude + '&lon=' + longitude);

          let geocode = await response.json();

          return geocode;

        }
        fetchState()
           .then(geocode => {


             var stateResponse = geocode.address.state
             var data = {
               latitude,
                longitude,
                uniqueId,
                date,
               stateResponse
                 };
                 try {
                  let response = fetch(
                   "https://auto-ifta-1551930191526.firebaseio.com/" + uniqueId + ".json",
                   {
                     method: "POST",
                     headers: {
                      "Accept": "application/json",
                      "Content-Type": "application/json"
                     },
                    body: JSON.stringify(data)
                  }
                 );
                  if (response.status >= 200 && response.status < 300) {
                     alert("posted successfully!!!");
                  }
                } catch (errors) {

                  alert(errors);
                 }




             })
           .catch(reason => console.log(reason.message))



      }
      else
      {
        this.setState({connection_Status : "Offline"})
        console.log('Were Offline.. saving to local database');

        const randomString = Math.random().toString(19).replace(/[^a-z]+/g, '').substr(0, 19);
        const GeoCodeSchema = {
          name: uniqueId,
          properties: {
            date:  {type: 'date'},
            latitude: {type: 'float'},
            longitude: {type: 'float'},
            stateResponse: {type: 'string'},
            uniqueId: {type: 'string'}
          }
        };
        const databaseOptions = {
          path: 'geocode.realm',
          schema: [GeoCodeSchema],
          schemaVersion: 0
        };


          Realm.open(databaseOptions).then(realm => {
                realm.write(() => {
            try{
                  realm.create(uniqueId, {
                    date: d,
                    latitude: latitude,
                    longitude: longitude,
                    stateResponse: 'Offline',
                    uniqueId: uniqueId
                    });
            }catch(error){
              console.log(error);
            }

                });
                this.setState({ realm });
              }).catch(error => {
                console.log('Failed saving to local database' + error);
                });

      }

    });



        if (Platform.OS === "android") {
          if (this.marker) {
            this.marker._component.animateMarkerToCoordinate(
              newCoordinate,
              500
            );
          }
        } else {
          coordinate.timing(newCoordinate).start();
        }

        this.setState({
          latitude,
          longitude,
          routeCoordinates: routeCoordinates.concat([newCoordinate]),
          distanceTravelled:
            distanceTravelled + this.calcDistance(newCoordinate),
          prevLatLng: newCoordinate

        });
      },
      error => console.log(error),
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 1000,
        distanceFilter: 10
      }
    );
  }

  componentWillUnmount() {
    navigator.geolocation.clearWatch(this.watchID);

    NetInfo.isConnected.removeEventListener(
       'connectionChange',
       this._handleConnectivityChange

   );
  }

  getMapRegion = () => ({
    latitude: this.state.latitude,
    longitude: this.state.longitude,
    latitudeDelta: LATITUDE_DELTA,
    longitudeDelta: LONGITUDE_DELTA
  });

  calcDistance = newLatLng => {
    const { prevLatLng } = this.state;
    return haversine(prevLatLng, newLatLng) || 0;
  };

  requestCameraPermission = async () => {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: "Location Access Permission",
          buttonNeutral: "Ask Me Later",
          buttonNegative: "Cancel",
          buttonPositive: "OK"
        }
      );
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        console.log("You can use the camera");
      } else {
        console.log("Camera permission denied");
      }
    } catch (err) {
      console.warn(err);
    }
  };

  _handleConnectivityChange = (isConnected) => {

      if(isConnected == true)
        {
          this.setState({connection_Status : "Online"})
        }
        else
        {
          this.setState({connection_Status : "Offline"})
        }
    };

  render() {
    const info = this.state.realm

      ? 'Number of dogs in this Realm: ' + this.state.realm.objects(uniqueId).length
      : 'Loading...';
    return (


      <View style={styles.container}>

        <MapView
          style={styles.map}
          customMapStyle={ MapStyles }
          provider={PROVIDER_GOOGLE}
          showUserLocation
          followUserLocation
          loadingEnabled
          region={this.getMapRegion()}
        >
          <Polyline coordinates={this.state.routeCoordinates} strokeWidth={5} />

          <Marker.Animated
            ref={marker => {
              this.marker = marker;
            }}
            coordinate={this.state.coordinate}
          />
        </MapView>
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={[styles.bubble, styles.button]}>
            <Text style={styles.bottomBarContent}>
              {parseFloat(this.state.distanceTravelled).toFixed(2) * 0.62137} Miles
            </Text>
          </TouchableOpacity>
        </View>
    <View style={styles.buttonControlContainer}>
       <View style={styles.buttonStart}>
        <Button

  title={`Start\nTracking`}
  color="#000000"
  accessibilityLabel="Start Tracking Your Location"
/>
</View>

<View style={styles.buttonStop}>
        <Button

  title={`Stop\nTracking`}
  color="#000000"
  accessibilityLabel="Stop Tracking Your Location"
/>
</View>
</View>
<View style={styles.container}>
        <Text style={styles.welcome}>
          {info}
        </Text>
      </View>
<View style={{position: 'absolute', top: 80, backgroundColor: 'rgba(255,255,255,1)', alignSelf: 'stretch', textAlign: 'center'}}><Text>Auto IFTA - IFTA Reports Made Easy</Text></View>
      </View>

    );
  }
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    alignItems: "center"
  },
  map: {
    ...StyleSheet.absoluteFillObject
  },
  bubble: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.7)",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 20
  },
  latlng: {
    width: 200,
    alignItems: "stretch"
  },
  button: {
    width: 80,
    paddingHorizontal: 12,
    alignItems: "center",
    marginHorizontal: 10
  },
  buttonContainer: {
    flexDirection: "row",
    marginVertical: 5,
    backgroundColor: "transparent"
  },
  buttonControlContainer: {
  flexDirection: "row",
    marginVertical: 50
  },
  buttonStart: {
    backgroundColor: "rgba(66,244,69,0.7)",
    borderRadius:10,
    marginRight: 20
  },
  buttonStop: {
    backgroundColor: "rgba(191,63,63,0.7)",
    borderRadius:10
  }
});

export default AnimatedMarkers;
