const map = L.map('map').setView([-33.57, 115.82], 10);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

const pinTypes = {
    camp:    { icon: '⛺', color: '#2d8a4e', label: 'Campsite' },
    cafe:    { icon: '☕', color: '#e4a000', label: 'Cafe / Food' },
    water:   { icon: '💧', color: '#1a6dd8', label: 'Water Source' },
    lookout: { icon: '🔭', color: '#1a6dd8', label: 'Lookout' },
    warn:    { icon: '⚠️', color: '#cc3333', label: 'Warning' },
    secret:  { icon: '🌿', color: '#7b3fa0', label: 'Secret Spot' }
};

let savedPins = JSON.parse(localStorage.getItem('meeka-pins') || '[]');
let markers = [];
let pendingLat, pendingLng;

function saveToStorage() {
    localStorage.setItem('meeka-pins', JSON.stringify(savedPins));
}

function makeIcon(type) {
    return L.divIcon({
        html: '<span style="font-size:24px;filter:drop-shadow(1px 1px 1px rgba(0,0,0,0.3));">' + pinTypes[type].icon + '</span>',
        className: 'emoji-icon',
        iconSize: [30, 30],
        iconAnchor: [15, 15]
    });
}

function makePopup(p, index) {
    const t = pinTypes[p.type];
    return '<b>' + t.icon + ' ' + p.name + '</b><br>' +
        '<small>' + t.label + '</small><br><br>' +
        p.note + '<br><br>' +
        '⭐'.repeat(p.stars) + '<br>' +
        '<small>' + p.lat + ', ' + p.lng + '</small><br><br>' +
        '<button onclick="editPin(' + index + ')">✏️ Edit</button> ' +
        '<button onclick="deletePin(' + index + ')">🗑️ Remove</button>';
}

function renderAllPins() {
    markers.forEach(function(m) { map.removeLayer(m); });
    markers = [];
    savedPins.forEach(function(p, index) {
        const marker = L.marker([p.lat, p.lng], { icon: makeIcon(p.type) }).addTo(map);
        marker.bindPopup(makePopup(p, index));
        markers.push(marker);
    });
}

map.on('click', function(e) {
    pendingLat = e.latlng.lat.toFixed(5);
    pendingLng = e.latlng.lng.toFixed(5);
    document.getElementById('edit-index').value = '-1';
    document.getElementById('pin-form').style.display = 'block';
    document.getElementById('pin-form').querySelector('h3').textContent = '📍 Add pin';
    document.getElementById('pin-name').focus();
});

function editPin(index) {
    const p = savedPins[index];
    document.getElementById('edit-index').value = index;
    document.getElementById('pin-type').value = p.type;
    document.getElementById('pin-name').value = p.name;
    document.getElementById('pin-note').value = p.note;
    document.getElementById('pin-stars').value = p.stars;
    document.getElementById('pin-form').style.display = 'block';
    document.getElementById('pin-form').querySelector('h3').textContent = '✏️ Edit pin';
}

function deletePin(index) {
    savedPins.splice(index, 1);
    saveToStorage();
    renderAllPins();
}

function savePin() {
    const index = parseInt(document.getElementById('edit-index').value);
    const pin = {
        lat: index === -1 ? pendingLat : savedPins[index].lat,
        lng: index === -1 ? pendingLng : savedPins[index].lng,
        type: document.getElementById('pin-type').value,
        name: document.getElementById('pin-name').value || 'My pin',
        note: document.getElementById('pin-note').value || '',
        stars: document.getElementById('pin-stars').value
    };
    if (index === -1) {
        savedPins.push(pin);
    } else {
        savedPins[index] = pin;
    }
    saveToStorage();
    renderAllPins();
    cancelPin();
}

function cancelPin() {
    document.getElementById('pin-form').style.display = 'none';
    document.getElementById('pin-name').value = '';
    document.getElementById('pin-note').value = '';
    document.getElementById('pin-stars').value = '3';
    document.getElementById('edit-index').value = '-1';
}

let userMarker = null;

function startGPS() {
    if (!navigator.geolocation) return;
    navigator.geolocation.watchPosition(function(position) {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        if (userMarker) {
            userMarker.setLatLng([lat, lng]);
        } else {
            userMarker = L.circleMarker([lat, lng], {
                radius: 10,
                fillColor: '#1a6dd8',
                color: 'white',
                weight: 3,
                opacity: 1,
                fillOpacity: 1
            }).addTo(map);
            map.setView([lat, lng], 12);
        }
    }, function(error) {
        console.log('GPS error:', error);
    }, { enableHighAccuracy: true, maximumAge: 10000 });
}

startGPS();
renderAllPins();