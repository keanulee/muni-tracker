'use strict';

const HOST = 'https://muni-tracker-api.keanulee.com';
const INFO_MSG = `Legend:
Star - LRV4
Short arrow - Bus shuttle
Faded - Trailing vehicle

Homescreen icon made by Freepik from www.flaticon.com is licensed by CC 3.0 BY`;
const SNAPSHOT = {
  TIME: 'd',
  TRAINS: 't'
};
const TRAIN = {
  ROUTE_TAG: 0,
  COORDS: 1,
  HEADING: 2,
  SPEED_KM_HR: 3,
  PREDICTABLE: 4,
  SECS_SINCE_REPORT: 5,
  DIR_TAG: 6,
  LEADING_VEHICLE_ID: 7
};
const COORDS = {
  LAT: 0,
  LNG: 1
};

let map;
let infowindow;
let viewSelect;
let fetchTimer;
let buttonTimer;
let state = {
  nextPageToken: '',
  selectedIndex: 0,
  snapshots: []
};


function initMap() {
  map = new google.maps.Map(document.getElementById('map'), {
    zoom: 12,
    center: {
      lat: 37.7614,
      lng: -122.4487
    },
    mapTypeControl: false,
    streetViewControl: false,
    styles: [
      {
        featureType: 'water',
        elementType: 'geometry',
        stylers: [
          { color: '#e9e9e9' },
          { lightness: 17 }
        ]
      },
      {
        featureType: 'landscape',
        elementType: 'geometry',
        stylers: [
          { color: '#f5f5f5' },
          { lightness: 20 }
        ]
      },
      {
        featureType: 'road.highway',
        elementType: 'geometry.fill',
        stylers: [
          { color: '#ffffff' },
          { lightness: 17 }
        ]
      },
      {
        featureType: 'road.highway',
        elementType: 'geometry.stroke',
        stylers: [
          { color: '#ffffff' },
          { lightness: 29 },
          { weight: 0.2 }
        ]
      },
      {
        featureType: 'road.arterial',
        elementType: 'geometry',
        stylers: [
          { color: '#ffffff' },
          { lightness: 18 }
        ]
      },
      {
        featureType: 'road.local',
        elementType: 'geometry',
        stylers: [
          { color: '#ffffff' },
          { lightness: 16 }
        ]
      },
      {
        featureType: 'poi',
        elementType: 'geometry',
        stylers: [
          { color: '#f5f5f5' },
          { lightness: 21 }
        ]
      },
      {
        featureType: 'poi.park',
        elementType: 'geometry',
        stylers: [
          { color: '#dedede' },
          { lightness: 21 }
        ]
      },
      {
        featureType: 'poi.business',
        stylers: [
          { visibility: 'off' }
        ]
      },
      {
        elementType: 'labels.text.stroke',
        stylers: [
          { visibility: 'on' },
          { color: '#ffffff' },
          { lightness: 16 }
        ]
      },
      {
        elementType: 'labels.text.fill',
        stylers: [
          {
            'saturation': 36
          },
          { color: '#333333' },
          { lightness: 40 }
        ]
      },
      {
        elementType: 'labels.icon',
        stylers: [
          { visibility: 'off' }
        ]
      },
      {
        featureType: 'administrative',
        elementType: 'geometry.fill',
        stylers: [
          { color: '#fefefe' },
          { lightness: 20 }
        ]
      },
      {
        featureType: 'administrative',
        elementType: 'geometry.stroke',
        stylers: [
          { color: '#fefefe' },
          { lightness: 17 },
          { weight: 1.2 }
        ]
      }
    ]
  });

  viewSelect = document.createElement('select');
  viewSelect.multiple = true;
  viewSelect.innerHTML = `
  <option selected>Positions</option>
  <option>Traffic</option>`;
  viewSelect.addEventListener('change', updateUI);

  const topControls = document.createElement('div');
  topControls.classList.add('controls');
  topControls.appendChild(viewSelect);
  map.controls[google.maps.ControlPosition.LEFT_TOP].push(topControls);

  backButton.addEventListener('mousedown', backButtonDownHandler);
  backButton.addEventListener('mouseup', buttonUpHandler);
  backButton.addEventListener('touchstart', backButtonDownHandler);
  backButton.addEventListener('touchend', buttonUpHandler);

  forwardButton.addEventListener('mousedown', forwardButtonDownHandler);
  forwardButton.addEventListener('mouseup', buttonUpHandler);
  forwardButton.addEventListener('touchstart', forwardButtonDownHandler);
  forwardButton.addEventListener('touchend', buttonUpHandler);

  timePicker.addEventListener('change', timePickerChangeHandler);

  infoButton.addEventListener('click', () => {
    window.alert(INFO_MSG);
  });

  infowindow = new google.maps.InfoWindow();

  fetch(`${HOST}/t?pageSize=30&orderBy=d%20desc`)
    .then(res => res.json())
    .then(data => {
      state = {
        ...state,
        nextPageToken: data.nextPageToken,
        snapshots: data.documents
      };
      updateUI();
    });

  fetchTimer = window.setInterval(fetchLiveSnapshot, 30000);
}

const lines = {};
const routeColors = {
  'J': '#cc6600',
  'KT': '#cc0033',
  'L': '#660099',
  'M': '#006633',
  'N': '#003399',
  'S': '#ffcc00',
  'T': '#cc0033',
  'KJ': '#cc6600',
  'JBUS': '#cc6600',
  'KBUS': '#cc0033',
  'LBUS': '#660099',
  'MBUS': '#006633',
  'NBUS': '#003399',
  'SBUS': '#ffcc00',
  'TBUS': '#cc0033',
};

function updateUI() {
  const snapshot = state.snapshots[state.selectedIndex];
  const prevSnapshot = state.snapshots[state.selectedIndex + 1];
  const trains = snapshot[SNAPSHOT.TRAINS];
  const prevTrains = prevSnapshot ? prevSnapshot[SNAPSHOT.TRAINS] : {};
  const oldLines = Object.assign({}, lines);

  for (let id in trains) {
    let line = oldLines[id];
    if (line) {
      delete oldLines[id];
    } else {
      lines[id] = line = new google.maps.Polyline({
        map: map,
        strokeOpacity: 0.5
      });
    }

    const train = trains[id];
    const currentPosition = new google.maps.LatLng({
      lat: train[TRAIN.COORDS][COORDS.LAT],
      lng: train[TRAIN.COORDS][COORDS.LNG]
    });
    const positionsSelected = viewSelect.children[0].selected;
    const trafficSelected = viewSelect.children[1].selected;
    const prevTrain = prevTrains[id];
    let pathHeading = train[TRAIN.HEADING];
    let path;
    let strokeColor = 'transparent';
    let strokeWeight = 4;
    if (trafficSelected && prevTrain) {
      const prevPosition = new google.maps.LatLng({
        lat: prevTrain[TRAIN.COORDS][COORDS.LAT],
        lng: prevTrain[TRAIN.COORDS][COORDS.LNG]
      });
      path = [
        prevPosition,
        currentPosition
      ];
      const distance = google.maps.geometry.spherical.computeLength(path);
      if (distance > 0) {
        const time = snapshot[SNAPSHOT.TIME] - train[TRAIN.SECS_SINCE_REPORT] -
            prevSnapshot[SNAPSHOT.TIME] + prevTrain[TRAIN.SECS_SINCE_REPORT];
        const speedFactor = Math.min(7.5, distance/time);
        strokeColor = `hsl(${speedFactor * 20}, 100%, 40%)`;
        strokeWeight = Math.max(4, Math.min(7.5 / speedFactor, 10));
        pathHeading = google.maps.geometry.spherical.computeHeading(prevPosition, currentPosition);
      } else {
        path = [
          google.maps.geometry.spherical.computeOffset(currentPosition, 20, (pathHeading + 180) % 360),
          currentPosition
        ];
      }
    } else {
      path = [
        google.maps.geometry.spherical.computeOffset(currentPosition, 20, (pathHeading + 180) % 360),
        currentPosition
      ];
    }

    const svg =
      id[0] === '2' ? 'M -2,5 0,0 2,5 M 6,-3.5 6,3.5 M 3,-2 9,2 M 9,-2 3,2' :
      train[TRAIN.ROUTE_TAG].length === 4 ? 'M -2,3 0,0 2,3' :
      'M -2,5 0,0 2,5';
    line.setOptions({
      path: path.map(point => google.maps.geometry.spherical.computeOffset(point, 20, (pathHeading + 90) % 360)),
      strokeColor: strokeColor,
      strokeWeight: strokeWeight,
      icons: positionsSelected ? [
        {
          icon: {
            fillColor: routeColors[train[TRAIN.ROUTE_TAG]] || '#000',
            fillOpacity: train[TRAIN.LEADING_VEHICLE_ID] ? 0 : 0.5,
            strokeColor: routeColors[train[TRAIN.ROUTE_TAG]] || '#000',
            strokeOpacity: train[TRAIN.LEADING_VEHICLE_ID] ? 0.5 : 1,
            path: svg,
            scale: 2,
            rotation: train[TRAIN.HEADING] - pathHeading
          }
        }
      ] : []
    });
  }

  for (let id in oldLines) {
    oldLines[id].setMap(null);
    delete lines[id];
  }

  timePicker.innerHTML = state.snapshots.map(snapshot => {
    const date = new Date(snapshot[SNAPSHOT.TIME] * 1000);
    return `<option>${date.toTimeString().slice(0,8)}</option>`;
  });
  timePicker.selectedIndex = state.selectedIndex;
}

function fetchLiveSnapshot() {
  fetch('https://test.nextbus.com/service/publicJSONFeed?command=vehicleLocations&a=sf-muni')
    .then(res => res.json())
    .then(data => {
      if (data.vehicle) {
        const latestSnapshot = state.snapshots[0];
        const time = Math.round(parseInt(data.lastTime.time, 10) / 1000);
        if (!latestSnapshot || time !== latestSnapshot[SNAPSHOT.TIME]) {
          state = {
            ...state,
            selectedIndex: state.selectedIndex === 0 ? 0 : state.selectedIndex + 1,
            snapshots: [
              {
                [SNAPSHOT.TIME]: time,
                [SNAPSHOT.TRAINS]: data.vehicle.reduce((t, v) => {
                  if (routeColors[v.routeTag]) {
                    t[v.id] = [
                      v.routeTag, 
                      [parseFloat(v.lat), parseFloat(v.lon)],
                      parseInt(v.heading, 10),
                      parseFloat(v.speedKmHr),
                      v.predictable === 'true',
                      parseInt(v.secsSinceReport, 10),
                      v.dirTag || '',
                      v.leadingVehicleId || ''
                    ];
                  }
                  return t;
                }, {})
              },
              ...state.snapshots
            ]
          };
          updateUI();
        }
      }
    });
}

function fetchPreviousSnapshots() {
  if (state.selectedIndex === state.snapshots.length - 1) {
    fetch(`${HOST}/t?pageSize=30&orderBy=d%20desc&pageToken=${state.nextPageToken}`)
    .then(res => res.json())
    .then(data => {
      state = {
        ...state,
        nextPageToken: data.nextPageToken,
        snapshots: [...state.snapshots, ...data.documents]
      };
      updateUI();
    });
  }
}

function moveBack() {
  if (state.selectedIndex < state.snapshots.length - 1) {
    state = {
      ...state,
      selectedIndex: state.selectedIndex + 1
    };
    updateUI();
    fetchPreviousSnapshots();
  }
}

function moveForward() {
  if (state.selectedIndex > 0) {
    state = {
      ...state,
      selectedIndex: state.selectedIndex - 1
    };
    updateUI();
  } else {
    window.clearInterval(buttonTimer);
    window.clearInterval(fetchTimer);
    fetchLiveSnapshot();
    fetchTimer = window.setInterval(fetchLiveSnapshot, 30000);
  }
}

function backButtonDownHandler(e) {
  e.preventDefault();
  window.clearInterval(buttonTimer);
  buttonTimer = window.setInterval(moveBack, 500);
  moveBack();
}

function forwardButtonDownHandler(e) {
  e.preventDefault();
  window.clearInterval(buttonTimer);
  buttonTimer = window.setInterval(moveForward, 500);
  moveForward();
}

function buttonUpHandler(e) {
  e.preventDefault();
  window.clearInterval(buttonTimer);
}

function timePickerChangeHandler() {
  state = {
    ...state,
    selectedIndex: timePicker.selectedIndex
  };
  updateUI();
  fetchPreviousSnapshots();
}

if ('serviceWorker' in window.navigator) {
  window.addEventListener('load', function() {
    window.navigator.serviceWorker.register('sw.js')
  });
}
