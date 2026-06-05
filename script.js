// Firebase setup
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-database.js";

const map = L.map('map').setView([-33.57, 115.82], 10);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

const pinTypes = {
    camp:    { icon: '', color: '#2d8a4e', label: 'Campsite' },
    caravan: { icon: '', color: '#df1d1d', label: 'Caravan Site' },
    secret:  { icon: '', color: '#520b7e', label: 'Secret Spot' },
    car:     { icon: '', color: '#db21c5', label: 'Good Track' },
    point:   { icon: '', color: '#791a09', label: 'Point of Interest' },
    cafe:    { icon: '', color: '#e4a000', label: 'Cafe / Food' },
    water:   { icon: '', color: '#1a6dd8', label: 'Water Source' },
    dump:    { icon: '', color: '#1f15a8', label: 'Dump Site' },
    warn:    { icon: '', color: '#cc3333', label: 'Warning' },
};

const firebaseConfig = {
    apiKey: "AIzaSyBlFRgfgLIwubKc60ZAjAK8DP4oYyTd9No",
    authDomain: "boodja-42835.firebaseapp.com",
    databaseURL: "https://boodja-42835-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "boodja-42835",
    storageBucket: "boodja-42835.firebasestorage.app",
    messagingSenderId: "913649223248",
    appId: "1:913649223248:web:882cd7fd4ca09e0f2a7355"
};
const firebaseApp = initializeApp(firebaseConfig);
const db = getDatabase(firebaseApp);
const pinsRef = ref(db, 'pins');

let faunaMarkers = [];
let activeLayers = { birds: false, fish: false };
let savedPins = [];
let markers = [];
let pendingLat, pendingLng;

onValue(pinsRef, function(snapshot) {
    const data = snapshot.val();
    savedPins = data ? Object.values(data) : [];
    renderAllPins();
});

function saveToStorage() {
    const pinsObj = {};
    savedPins.forEach(function(pin, i) {
        pinsObj['pin_' + i] = pin;
    });
    set(pinsRef, pinsObj);
}
// Custom icons comma on all except last default emojis which are image based
function makeIcon(type) {
    const customIcons = {
        fish: 'icons/fish.png',
        camp: 'icons/camp.png',
	    caravan: 'icons/caravan.png',
	    secret: 'icons/secret.png',
 	    car: 'icons/car.png',
	    point: 'icons/point.png',
        cafe: 'icons/cafe.png',
	    water: 'icons/water.png',
	    dump: 'icons/dump.png',
	    warn: 'icons/warn.png'
    };
    if (customIcons[type]) {
        return L.divIcon({
            html: '<img src="' + customIcons[type] + '" style="width:45px;height:45px;object-fit:contain;">',
            className: 'emoji-icon',
            iconSize: [45, 45],
            iconAnchor: [15, 30]
        });
    }
    const pinType = pinTypes[type] || pinTypes['point'];
    return L.divIcon({
        html: '<span style="font-size:24px;filter:drop-shadow(1px 1px 1px rgba(0,0,0,0.3));">' + pinType.icon + '</span>',
        className: 'emoji-icon',
        iconSize: [30, 30],
        iconAnchor: [15, 15]
    });
}

function makePopup(p, index) {
    const t = pinTypes[p.type] || pinTypes['point'];
    return '<b>' + t.icon + ' ' + p.name + '</b><br>' +
        '<small>' + t.label + '</small><br><br>' +
        p.note + '<br><br>' +
        '⭐'.repeat(p.stars) + '<br>' +
        '<small>' + p.lat + ', ' + p.lng + '</small><br><br>' +
        (p.url ? '<a href="' + p.url + '" target="_blank">🔗 More info</a><br><br>' : '') +
        (p.photo ? '<img src="' + p.photo + '" style="width:100%;border-radius:8px;margin-bottom:8px;"><br>' : '') +
        '<button onclick="speakPin(' + index + ')" style="padding:8px 14px;border-radius:10px;border:none;background:#333;color:#f2f2f2;font-size:13px;font-weight:600;cursor:pointer;margin-right:4px;">Read</button>' +
        '<button onclick="editPin(' + index + ')" style="padding:8px 14px;border-radius:10px;border:none;background:rgba(214,114,20,0.85);color:white;font-size:13px;font-weight:600;cursor:pointer;margin-right:4px;">Edit</button>' +
        '<button onclick="deletePin(' + index + ')" style="padding:8px 14px;border-radius:10px;border:none;background:#f0f0f0;color:#444;font-size:13px;font-weight:600;cursor:pointer;">Remove</button>';
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
    document.getElementById('pin-form').querySelector('h3').textContent = 'Add Pin';
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
    document.getElementById('pin-address').value = p.address || '';
    document.getElementById('pin-form').style.display = 'block';
    document.getElementById('pin-form').querySelector('h3').textContent = 'Edit Pin';
    if (p.photo) {
    document.getElementById('preview-img').src = p.photo;
    document.getElementById('photo-preview').style.display = 'block';
    document.getElementById('pin-photo').dataset.photo = p.photo;}
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
        address: document.getElementById('pin-address').value || '',
        address: document.getElementById('pin-address').value || '',
        url: document.getElementById('pin-url').value || '',
        photo: document.getElementById('pin-photo').dataset.photo || '',
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
    document.getElementById('pin-address').value = '';
    document.getElementById('pin-address').value = '';
    document.getElementById('pin-url').value = '';
    document.getElementById('edit-index').value = '-1';
    document.getElementById('pin-photo').value = '';
    document.getElementById('pin-photo').dataset.photo = '';
    document.getElementById('photo-preview').style.display = 'none';
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
            getWeather(lat, lng);
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

// top banner seasons moon icon included two sections
const season = getNoogarSeason();
const bar = document.getElementById('season-bar');
document.getElementById('season-text').innerHTML = '<img src="icons/moon.png" style="height:45px;vertical-align:middle;margin-right:4px;">' + season.name;

function getWeather(lat, lng) {
    fetch('https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lng + '&current=temperature_2m,weathercode,windspeed_10m')
        .then(response => response.json())
        .then(data => {
            const temp = data.current.temperature_2m;
            const wind = data.current.windspeed_10m;
            const season = getNoogarSeason();
            const bar = document.getElementById('season-bar');
            document.getElementById('season-text').innerHTML = '<img src="icons/moon.png" style="height:50px;vertical-align:middle;margin-right:4px;">' + season.name + ' · ' + temp + '°C · ' + wind + 'km/h';
        });
}


function toggleLayer(type) {
    if (activeLayers[type]) {
        faunaMarkers.forEach(function(m) { map.removeLayer(m); });
        faunaMarkers = [];
        activeLayers[type] = false;
        document.getElementById('btn-' + type).style.background = 'white';
    } else {
        activeLayers[type] = true;
        document.getElementById('btn-' + type).style.background = '#e0f0e0';
        fetchFauna(type);
    }
}

function fetchFauna(type) {
    const centre = map.getCenter();
    const lat = centre.lat.toFixed(5);
    const lng = centre.lng.toFixed(5);
    const group = type === 'birds' ? 'Birds' : 'Fishes';
    
    fetch('https://biocache-ws.ala.org.au/ws/occurrences/search?q=*&lat=' + lat + '&lon=' + lng + '&radius=20&pageSize=20&fq=species_group:' + group)
        .then(response => response.json())
        .then(data => {
            const seen = new Set();
            data.occurrences.forEach(function(o) {
                if (!o.vernacularName || !o.decimalLatitude) return;
                if (seen.has(o.vernacularName)) return;
                seen.add(o.vernacularName);
                
                const icon = L.divIcon({
    html: '<div style="width:12px;height:12px;background:' + 
          (type === 'birds' ? '#2d8a4e' : '#1a6dd8') + 
          ';border-radius:50%;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3);"></div>',
    className: '',
    iconSize: [12, 12],
    iconAnchor: [6, 6]
});
                
                const marker = L.marker([o.decimalLatitude, o.decimalLongitude], { icon }).addTo(map);
                marker.bindPopup(
                    '<b>' + (type === 'birds' ? '🐦' : '🐟') + ' ' + o.vernacularName + '</b><br>' +
                    '<small><i>' + o.scientificName + '</i></small><br><br>' +
                    (o.year ? 'Recorded: ' + o.year + '<br>' : '') +
                    '<small>Atlas of Living Australia</small>'
                );
                faunaMarkers.push(marker);
            });
        });
}
document.getElementById('pin-photo').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const maxSize = 400;
            let width = img.width;
            let height = img.height;
            if (width > height) {
                if (width > maxSize) { height *= maxSize / width; width = maxSize; }
            } else {
                if (height > maxSize) { width *= maxSize / height; height = maxSize; }
            }
            canvas.width = width;
            canvas.height = height;
            canvas.getContext('2d').drawImage(img, 0, 0, width, height);
            const resized = canvas.toDataURL('image/jpeg', 0.7);
            document.getElementById('preview-img').src = resized;
            document.getElementById('photo-preview').style.display = 'block';
            document.getElementById('pin-photo').dataset.photo = resized;
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

let dfesMarkers = [];
let dfesActive = false;

function toggleDFES() {
    if (dfesActive) {
        dfesMarkers.forEach(function(m) { map.removeLayer(m); });
        dfesMarkers = [];
        dfesActive = false;
        document.getElementById('btn-dfes').style.background = 'white';
    } else {
        dfesActive = true;
        document.getElementById('btn-dfes').style.background = '#ffe0e0';
        fetchDFES();
    }
}

function fetchDFES() {
    fetch('https://corsproxy.io/?' + encodeURIComponent('https://api.emergency.wa.gov.au/v1/incidents'))
        .then(response => response.json())
        .then(data => {
            data.incidents.forEach(function(incident) {
                if (!incident.location || !incident.location.latitude) return;
                
                const lat = incident.location.latitude;
                const lng = incident.location.longitude;
                const name = incident.name || 'Incident';
                const type = incident['incident-type'] || '';
                const status = incident['incident-status'] || '';
                const suburb = incident.suburbs ? incident.suburbs[0] : '';
                
                const iconMap = {
    'ew-other-burn-off': 'ew-prescribed-burn-or-burn-off',
    'ew-other-fire': 'ew-other-fire',
    'ew-structure-fire': 'ew-structure-fire-warning',
    'ew-earthquake': 'ew-earthquake',
    'ew-other-road-crash': 'ew-other-incident',
    'ew-hazmat-general-warning': 'ew-hazmat-general-warning',
    'ew-other-smell-of-gas': 'ew-hazardous-materials',
    'ew-other-active-alarm': 'ew-other-incident',
    'ew-other-report-of-smoke': 'ew-other-incident',
};
const incidentIcon = iconMap[incident['incident-icon']] || 'ew-other-incident';
    const icon = L.divIcon({
    html: '<img src="icons/dfes/' + incidentIcon + '.svg" style="width:36px;height:36px;">',
    className: 'emoji-icon',
    iconSize: [36, 36],
    iconAnchor: [18, 36]
});
                
                const marker = L.marker([lat, lng], { icon }).addTo(map);
                marker.bindPopup(
                    '<b>' + name + '</b><br>' +
                    '<small>' + type + '</small><br><br>' +
                    'Status: ' + status + '<br>' +
                    'Location: ' + suburb + '<br><br>' +
                    '<a href="https://www.emergency.wa.gov.au" target="_blank">🔗 Emergency WA</a>'
                );
                dfesMarkers.push(marker);
            });
        })
        .catch(function(error) {
            console.log('DFES error:', error);
            alert('Could not load DFES data — try again shortly');
        });
}
// Expose functions to global scope for inline HTML onclick handlers
window.savePin = savePin;
window.cancelPin = cancelPin;
window.editPin = editPin;
window.deletePin = deletePin;
window.speakPin = speakPin;
window.toggleLayer = toggleLayer;
window.toggleDFES = toggleDFES;
