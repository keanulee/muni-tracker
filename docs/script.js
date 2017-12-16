'use strict';

const host = 'https://muni-tracker-api.keanulee.com';

let map;
let infowindow;
let documents = [];
let selectedIndex = 0;
let nextPageToken;
let timePicker;
let viewSelect;
let fetchTimer;
let buttonTimer;

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

  const backButton = document.createElement('button');
  backButton.innerText = '<';
  backButton.addEventListener('mousedown', backButtonDownHandler);
  backButton.addEventListener('mouseup', buttonUpHandler);
  backButton.addEventListener('touchstart', backButtonDownHandler);
  backButton.addEventListener('touchend', buttonUpHandler);

  const forwardButton = document.createElement('button');
  forwardButton.innerText = '>';
  forwardButton.addEventListener('mousedown', forwardButtonDownHandler);
  forwardButton.addEventListener('mouseup', buttonUpHandler);
  forwardButton.addEventListener('touchstart', forwardButtonDownHandler);
  forwardButton.addEventListener('touchend', buttonUpHandler);

  timePicker = document.createElement('select');
  timePicker.addEventListener('change', timePickerChangeHandler);
  
  const bottomControls = document.createElement('div');
  bottomControls.classList.add('controls');
  bottomControls.appendChild(backButton);
  bottomControls.appendChild(timePicker);
  bottomControls.appendChild(forwardButton);
  map.controls[google.maps.ControlPosition.BOTTOM_CENTER].push(bottomControls);

  const infoButton = document.createElement('button');
  infoButton.classList.add('info');
  infoButton.innerText = 'i';
  infoButton.addEventListener('click', () => {
    window.alert('Homescreen icon made by Freepik from www.flaticon.com is licensed by CC 3.0 BY');
  });
  map.controls[google.maps.ControlPosition.LEFT_BOTTOM].push(infoButton);

  infowindow = new google.maps.InfoWindow();

  fetch(`${host}/t?pageSize=10&orderBy=d%20desc`)
    .then(res => res.json())
    .then(data => {
      documents = data.documents;
      nextPageToken = data.nextPageToken;
      updateUI();
    });

  fetchTimer = window.setInterval(fetchNewestDocument, 60000);
}

const markers = {};
const lines = {};
const routeColors = {
  'J': '#cc6600',
  'KT': '#cc0033',
  'L': '#660099',
  'M': '#006633',
  'N': '#003399'
};

function updateUI() {
  const trains = documents[selectedIndex].t;
  const prevTrains = documents[selectedIndex + 1] ? documents[selectedIndex + 1].t : {};
  const oldMarkers = Object.assign({}, markers);
  const oldLines = Object.assign({}, lines);

  for (let id in trains) {
    const t = trains[id];
    let marker = oldMarkers[id];
    if (marker) {
      delete oldMarkers[id];
    } else {
      markers[id] = marker = new google.maps.Marker({
        map: map,
        title: id,
        label: {
          color: 'orange',
          fontSize: '40px',
          fontWeight: 'bold',
          text: id[0] === '2' ? '*' : ' '
        }
      });
    
      marker.addListener('click', function() {
        infowindow.setContent(id);
        infowindow.open(map, marker);
      });
    }

    if (viewSelect.children[0].selected) {
      marker.setOptions({
        position: { lat: t[1][0], lng: t[1][1] },
        icon: {
          anchor: { x: -1, y: 0 },
          fillColor: routeColors[t[0]] || '#000',
          fillOpacity: t[7] ? 0 : 0.5,
          strokeColor: routeColors[t[0]] || '#000',
          strokeOpacity: t[7] ? 0.5 : 1,
          path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 2,
          rotation: t[2]
        },
        visible: true
      });
    } else {
      marker.setVisible(false);
    }

    let line = oldLines[id];
    if (line) {
      delete oldLines[id];
    } else {
      lines[id] = line = new google.maps.Polyline({
        map: map,
        strokeOpacity: 0.5
      });
    }

    const prevT = prevTrains[id];
    if (viewSelect.children[1].selected && prevT) {
      const path = [
        new google.maps.LatLng({ lat: prevT[1][0], lng: prevT[1][1] }),
        new google.maps.LatLng({ lat: t[1][0], lng: t[1][1] })
      ];
      const heading = google.maps.geometry.spherical.computeHeading(path[0], path[1]);
      const distance = google.maps.geometry.spherical.computeLength(path);
      const time = prevT[5] + 60 - t[5];
      const speedFactor = Math.min(7.5, distance/time);
      line.setOptions({
        path: path.map(point => google.maps.geometry.spherical.computeOffset(point, 20, (heading + 90) % 360)),
        strokeColor: `hsl(${speedFactor * 20}, 100%, 40%)`,
        strokeWeight: Math.max(4, Math.min(7.5 / speedFactor, 10)),
        visible: true
      });
    } else {
      line.setVisible(false);
    }
  }

  for (let id in oldMarkers) {
    oldMarkers[id].setMap(null);
    delete markers[id];
  }
  for (let id in oldLines) {
    oldLines[id].setMap(null);
    delete lines[id];
  }

  timePicker.innerHTML = documents.map(doc => {
    const date = new Date(doc.d * 1000);
    return `<option>${date.toTimeString().slice(0,5)}</option>`;
  });
  timePicker.selectedIndex = selectedIndex;
}

function fetchNewestDocument() {
  fetch(`${host}/t?pageSize=1&orderBy=d%20desc`)
    .then(res => res.json())
    .then(data => {
      const nextDocument = data.documents[0];
      if (nextDocument.d !== documents[0].d) {
        documents.unshift(nextDocument);
        if (selectedIndex !== 0) {
          ++selectedIndex;
        }
        updateUI();
      }
    });
}

function fetchPreviousDocuments() {
  if (selectedIndex === documents.length - 1) {
    fetch(`${host}/t?pageSize=30&orderBy=d%20desc&pageToken=${nextPageToken}`)
    .then(res => res.json())
    .then(data => {
      documents.push(...data.documents);
      nextPageToken = data.nextPageToken;
      updateUI();
    });
  }
}

function moveBack() {
  if (selectedIndex < documents.length - 1) {
    ++selectedIndex;
    updateUI();
    fetchPreviousDocuments();
  }
}

function moveForward() {
  if (selectedIndex > 0) {
    --selectedIndex;
    updateUI();
  } else {
    window.clearInterval(buttonTimer);
    window.clearInterval(fetchTimer);
    fetchNewestDocument();
    fetchTimer = window.setInterval(fetchNewestDocument, 60000);
  }
}

function backButtonDownHandler(e) {
  e.preventDefault();
  buttonTimer = window.setInterval(moveBack, 500);
  moveBack();
}

function forwardButtonDownHandler(e) {
  e.preventDefault();
  buttonTimer = window.setInterval(moveForward, 500);
  moveForward();
}

function buttonUpHandler(e) {
  e.preventDefault();
  window.clearInterval(buttonTimer);
}

function timePickerChangeHandler() {
  selectedIndex = timePicker.selectedIndex;
  updateUI();
  fetchPreviousDocuments();
}

if ('serviceWorker' in window.navigator) {
  window.addEventListener('load', function() {
    window.navigator.serviceWorker.register('sw.js')
  });
}
