const map = L.map('map').setView([-33.57, 115.82], 10);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

const pinTypes = {
    camp:    { icon: '⛺', color: '#2d8a4e', label: 'Campsite' },
    caravan: { icon: '🚐', color: '#df1d1d', label: 'Caravan Site' },
    secret:  { icon: '🌿', color: '#520b7e', label: 'Secret Spot' },
    car:     { icon: '🚗', color: '#db21c5', label: 'Good Track' },
    point:   { icon: '📍', color: '#791a09', label: 'Point of Interest' },
    cafe:    { icon: '☕', color: '#e4a000', label: 'Cafe / Food' },
    water:   { icon: '💧', color: '#1a6dd8', label: 'Water Source' },
    dump:    { icon: '🗑️', color: '#1f15a8', label: 'Dump Site' },
    warn:    { icon: '⚠️', color: '#cc3333', label: 'Warning' },
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
        (p.url ? '<a href="' + p.url + '" target="_blank">🔗 More info</a><br><br>' : '') +
        '<button onclick="speakPin(' + index + ')">🔊 Read</button> ' +
        '<button onclick="editPin(' + index + ')">✏️ Edit</button> ' +
        '<button onclick="deletePin(' + index + ')">🗑️ Remove</button>';
}

function speakPin(index) {
    const p = savedPins[index];
    const t = pinTypes[p.type];
    const text = t.label + '. ' + p.name + '. ' + p.note + '. Rated ' + p.stars + ' stars.';
    speak(text);
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
    document.getElementById('pin-url').value = p.url || '';
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
        stars: document.getElementById('pin-stars').value || '',
        url: document.getElementById('pin-url').value || '',
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
    document.getElementById('pin-url').value = '';
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
            checkProximity(lat, lng);
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
let targetVoice = null;

// Function to load and cache the specific voice
function loadVoice() {
    if (!('speechSynthesis' in window)) return;
    const voices = window.speechSynthesis.getVoices();
    targetVoice = voices.find(v => v.name === 'Google UK English Female') || voices[0];
}

// Trigger loadVoice when the browser finishes loading its voice list
if ('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = loadVoice;
    loadVoice(); // Try loading immediately in case they are already cached
}

function speak(text) {
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;

    // Use the cached voice if found
    if (targetVoice) {
        utterance.voice = targetVoice;
    }

    window.speechSynthesis.speak(utterance);
}
let spokenPins = new Set();
let proximityRadius = 5;

function checkProximity(userLat, userLng) {
    savedPins.forEach(function(p, index) {
        if (spokenPins.has(index)) return;
        
        const dist = getDistance(userLat, userLng, parseFloat(p.lat), parseFloat(p.lng));
        
if (dist <= proximityRadius) {
            spokenPins.add(index);
            const t = pinTypes[p.type];
            const km = dist.toFixed(1);
            const text = t.label + ' ahead. ' + p.name + '. ' + p.note + '. Rated ' + p.stars + ' stars. ' + km + ' kilometres.';
            speak(text);
            setTimeout(function() { spokenPins.delete(index); }, 60000);
        }
    });
}

function getDistance(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
function getNoogarSeason() {
    const month = new Date().getMonth() + 1;
    if (month === 12 || month <= 1) return { name: 'Birak', desc: 'First summer. Hot and dry.', color: '#e4a000' };
    if (month <= 3) return { name: 'Bunuru', desc: 'Second summer. Hottest time.', color: '#cc3333' };
    if (month <= 5) return { name: 'Djeran', desc: 'Autumn. Cooler, calm winds.', color: '#7b3fa0' };
    if (month <= 7) return { name: 'Makuru', desc: 'Fertility season. Cold and wet.', color: '#1a6dd8' };
    if (month <= 9) return { name: 'Djilba', desc: 'First spring. Transitioning.', color: '#2d8a4e' };
    return { name: 'Kambarang', desc: 'Second spring. Wildflowers bloom.', color: '#e4a000' };
}

const season = getNoogarSeason();
const bar = document.getElementById('season-bar');
bar.style.background = season.color;
bar.textContent = '🌙 ' + season.name + ' — ' + season.desc;