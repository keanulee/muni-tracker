'use strict';

let map;
let infowindow;
let documents = [];
let selectedIndex = 0;
let nextPageToken;
let timePicker;
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
  
  const controls = document.createElement('div');
  controls.classList.add('controls');
  controls.appendChild(backButton);
  controls.appendChild(timePicker);
  controls.appendChild(forwardButton);

  map.controls[google.maps.ControlPosition.BOTTOM_CENTER].push(controls);

  const infoButton = document.createElement('button');
  infoButton.classList.add('info');
  infoButton.innerText = 'i';
  infoButton.addEventListener('click', () => {
    window.alert('Homescreen icon made by Freepik from www.flaticon.com is licensed by CC 3.0 BY');
  });
  map.controls[google.maps.ControlPosition.LEFT_BOTTOM].push(infoButton);

  infowindow = new google.maps.InfoWindow();

  fetch('https://muni-tracker-api.keanulee.com/t?pageSize=10&orderBy=d%20desc')
    .then(res => res.json())
    .then(data => {
      documents = data.documents;
      nextPageToken = data.nextPageToken;
      updateUI();
    });

  fetchTimer = window.setInterval(fetchNewestDocument, 60000);
}

const markers = {};
const routeColors = {
  'J': '#cc6600',
  'KT': '#cc0033',
  'L': '#660099',
  'M': '#006633',
  'N': '#003399'
};

function updateUI() {
  const trains = documents[selectedIndex].t;
  const oldMarkers = Object.assign({}, markers);

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

    marker.setPosition({
      lat: t[1][0],
      lng: t[1][1]
    });
    marker.setIcon({
      anchor: { x: -1, y: 0 },
      fillColor: routeColors[t[0]] || '#000',
      fillOpacity: t[7] ? 0 : 0.5,
      strokeColor: routeColors[t[0]] || '#000',
      strokeOpacity: t[7] ? 0.5 : 1,
      path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
      scale: 2,
      rotation: t[2]
    });
  }

  for (let id in oldMarkers) {
    oldMarkers[id].setMap(null);
    delete markers[id];
  }

  timePicker.innerHTML = documents.map(doc => {
    const date = new Date(doc.d * 1000);
    return `<option>${date.toTimeString().slice(0,5)}</option>`;
  });
  timePicker.selectedIndex = selectedIndex;
}

function fetchNewestDocument() {
  fetch('https://muni-tracker-api.keanulee.com/t?pageSize=1&orderBy=d%20desc')
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
    fetch(`https://muni-tracker-api.keanulee.com/t?pageSize=30&orderBy=d%20desc&pageToken=${nextPageToken}`)
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
