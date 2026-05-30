const map = L.map('map').setView([-33.57, 115.82], 10);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

const pinTypes = {
    camp:    { icon: '🟢', label: 'Campsite' },
    cafe:    { icon: '🟡', label: 'Cafe / Food' },
    lookout: { icon: '🔵', label: 'Lookout' },
    warn:    { icon: '🔴', label: 'Warning' },
    secret:  { icon: '🟣', label: 'Secret Spot' }
};

let pendingLat, pendingLng;

map.on('click', function(e) {
    pendingLat = e.latlng.lat.toFixed(5);
    pendingLng = e.latlng.lng.toFixed(5);
    document.getElementById('pin-form').style.display = 'block';
    document.getElementById('pin-name').focus();
});

function savePin() {
    const type = document.getElementById('pin-type').value;
    const name = document.getElementById('pin-name').value || 'My pin';
    const note = document.getElementById('pin-note').value || '';
    const stars = document.getElementById('pin-stars').value;
    const t = pinTypes[type];
    const icon = L.divIcon({
        html: t.icon,
        className: '',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });
    const marker = L.marker([pendingLat, pendingLng], { icon }).addTo(map);
    marker.bindPopup('<b>' + name + '</b><br><small>' + t.label + '</small><br><br>' + note + '<br><br>' + '⭐'.repeat(stars) + '<br><small>' + pendingLat + ', ' + pendingLng + '</small><br><br><button onclick="removeThisMarker()">Remove</button>').openPopup();
    window.removeThisMarker = function() { map.removeLayer(marker); };
    cancelPin();
}

function cancelPin() {
    document.getElementById('pin-form').style.display = 'none';
    document.getElementById('pin-name').value = '';
    document.getElementById('pin-note').value = '';
    document.getElementById('pin-stars').value = '3';
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
            userMarker = L.marker([lat, lng], { icon: gpsIcon }).addTo(map);
            map.setView([lat, lng], 12);
        }
    }, function(error) {
        console.log('GPS error:', error);
    }, { enableHighAccuracy: true, maximumAge: 10000 });
}

startGPS();