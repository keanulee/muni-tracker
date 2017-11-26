'use strict';

let map;
let infowindow;
let documents;
let selectedIndex = 0;
let nextPageToken;

const timePicker = document.getElementById('timePicker');

function initMap() {
  map = new google.maps.Map(document.getElementById('map'), {
    zoom: 12,
    center: {
      lat: 37.7614,
      lng: -122.4487
    },
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

  infowindow = new google.maps.InfoWindow();

  fetch('https://muni-tracker-api.keanulee.com/t?pageSize=10&orderBy=d%20desc')
    .then(res => res.json())
    .then(data => {
      documents = data.documents;
      nextPageToken = data.nextPageToken;
      updateUI();
    });

  window.setInterval(fetchNewestDocument, 60000);
}

const markers = {};

function updateUI() {
  const trains = documents[selectedIndex].t;
  const routeColors = {
    'J': '#cc6600',
    'KT': '#cc0033',
    'L': '#660099',
    'M': '#006633',
    'N': '#003399'
  };
  const oldMarkers = Object.assign({}, markers);

  // trains.forEach(d => {
  for (let id in trains) {
    const t = trains[id];
    // const fields = d.mapValue.fields;
    // const id = fields.id.stringValue;
    // const coords = fields.position.geoPointValue;
    
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

timePicker.addEventListener('change', () => {
  selectedIndex = timePicker.selectedIndex;
  updateUI();
  fetchPreviousDocuments();
});

document.getElementById('backButton').addEventListener('click', () => {
  if (selectedIndex < documents.length - 1) {
    ++selectedIndex;
    updateUI();
    fetchPreviousDocuments();
  }
});

document.getElementById('forwardButton').addEventListener('click', () => {
  if (selectedIndex > 0) {
    --selectedIndex;
    updateUI();
  }
});
