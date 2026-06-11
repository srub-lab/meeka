// Firebase setup


const map = L.map('map').setView([-33.57, 115.82], 10);

const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
});

const stadiaOutdoors = L.tileLayer('https://tiles.stadiamaps.com/tiles/outdoors/{z}/{x}/{y}{r}.png', {
    attribution: '© Stadia Maps © OpenMapTiles © OpenStreetMap contributors'
});

const stadiaSatellite = L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_satellite/{z}/{x}/{y}{r}.jpg', {
    attribution: '© Stadia Maps © OpenMapTiles © OpenStreetMap contributors'
});

const stadiaDark = L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png', {
    attribution: '© Stadia Maps © OpenMapTiles © OpenStreetMap contributors'
});

stadiaOutdoors.addTo(map);
let currentLayer = stadiaOutdoors;



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
const firebaseApp = firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const pinsRef = db.ref('pins');

let savedPins = [];
let markers = [];
let pendingLat, pendingLng;

pinsRef.on('value', function(snapshot) {
    const data = snapshot.val();
    savedPins = data ? Object.values(data) : [];
    savedPins.forEach(function(pin) {
    if (!pin.id) pin.id = 'pin_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
});
    renderAllPins();
});

function saveToStorage() {
    if (savedPins.length === 0) return;
    const pinsObj = {};
    savedPins.forEach(function(pin) {
        if (!pin.id) pin.id = 'pin_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        pinsObj[pin.id] = pin;
    });
    pinsRef.set(pinsObj);
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

let speechUnlocked = false;



let longPressTimer = null;
let longPressFired = false;
let touchStartX = 0;
let touchStartY = 0;

map.getContainer().style.webkitUserSelect = 'none';
map.getContainer().style.userSelect = 'none';

map.getContainer().addEventListener('touchstart', function(e) {
    if (e.touches.length > 1) {
        clearTimeout(longPressTimer);
        return;
    }
    longPressFired = false;
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    longPressTimer = setTimeout(function() {
        longPressFired = true;
        const rect = map.getContainer().getBoundingClientRect();
        const latlng = map.containerPointToLatLng(L.point(touchStartX - rect.left, touchStartY - rect.top));
        if (!speechUnlocked) {
            const unlock = new SpeechSynthesisUtterance('');
            window.speechSynthesis.speak(unlock);
            speechUnlocked = true;
        }
        pendingLat = latlng.lat.toFixed(5);
        pendingLng = latlng.lng.toFixed(5);
        document.getElementById('edit-index').value = '-1';
        document.getElementById('pin-form').style.display = 'block';
        document.getElementById('pin-form').querySelector('h3').textContent = 'Add Pin';
        document.getElementById('pin-name').focus();
    }, 600);
}, { passive: false });

map.getContainer().addEventListener('touchend', function() {
    clearTimeout(longPressTimer);
});

map.getContainer().addEventListener('touchmove', function(e) {
    if (longPressFired) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartX;
    const dy = touch.clientY - touchStartY;
    if (Math.sqrt(dx * dx + dy * dy) > 10) {
        clearTimeout(longPressTimer);
        longPressFired = false;
    }
});

map.getContainer().addEventListener('touchcancel', function() {
    clearTimeout(longPressTimer);
    longPressFired = false;
});

map.getContainer().addEventListener('contextmenu', function(e) {
    e.preventDefault();
});

map.on('mousedown', function(e) {
    if (e.originalEvent.touches && e.originalEvent.touches.length > 1) return;
    if (e.originalEvent.button !== 0) return;
    longPressFired = false;
    const startLatLng = e.latlng;
    longPressTimer = setTimeout(function() {
        longPressFired = true;
        map.dragging.disable();
        if (!speechUnlocked) {
            const unlock = new SpeechSynthesisUtterance('');
            window.speechSynthesis.speak(unlock);
            speechUnlocked = true;
        }
        pendingLat = startLatLng.lat.toFixed(5);
        pendingLng = startLatLng.lng.toFixed(5);
        document.getElementById('edit-index').value = '-1';
        document.getElementById('pin-form').style.display = 'block';
        document.getElementById('pin-form').querySelector('h3').textContent = 'Add Pin';
        document.getElementById('pin-name').focus();
    }, 600);
});

map.on('mouseup', function() {
    clearTimeout(longPressTimer);
    map.dragging.enable();
});

map.on('mousemove', function() {
    clearTimeout(longPressTimer);
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
        phone: document.getElementById('pin-phone').value || '',
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
        updateGPSIndicator(position.coords.accuracy);
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
            checkProximity(lat, lng);
            checkProximity(lat, lng);
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
    window.speechSynthesis.resume();
    window.speechSynthesis.resume();
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

function updateGPSIndicator(accuracy) {
    let color, label;
    if (accuracy <= 20) { color = '#4ade80'; label = 'GPS'; }
    else if (accuracy <= 100) { color = '#fb923c'; label = 'GPS'; }
    else if (accuracy <= 500) { color = '#f87171'; label = 'GPS'; }
    else { color = '#6b7280'; label = 'GPS'; }
    const indicator = document.getElementById('gps-indicator');
    if (indicator) indicator.innerHTML = 
        '<span style="width:7px;height:7px;border-radius:50%;background:' + color + ';display:inline-block;margin-right:3px;"></span>' +
        '<span style="font-size:11px;color:' + color + ';">' + label + '</span>';
}

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
        document.getElementById('btn-dfes').style.opacity = '1';
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
let waCampMarkers = [];
let waCampsActive = false;

function toggleWACamps() {
    const btn = document.getElementById('btn-wacamps');
    if (waCampsActive) {
        waCampMarkers.forEach(m => map.removeLayer(m));
        waCampMarkers = [];
        waCampsActive = false;
        btn.style.background = 'white';
        btn.style.opacity = '1';
    } else {
        waCampsActive = true;
        btn.style.background = '#ffe0b2';
        fetchWACamps();
    }
}

function fetchWACamps() {
    if (!waCampsActive) return;
    waCampMarkers.forEach(m => map.removeLayer(m));
    waCampMarkers = [];
    const centre = map.getCenter();
    const lat = centre.lat.toFixed(5);
    const lng = centre.lng.toFixed(5);
    fetch('https://overpass-api.de/api/interpreter?data=[out:json];node[tourism=camp_site](around:50000,' + lat + ',' + lng + ');out;')
        .then(r => r.json())
        .then(data => {
            data.elements.forEach(function(e) {
                if (!e.lat || !e.lon) return;
                const name = e.tags.name || 'Campsite';
                const icon = L.divIcon({
                    html: '<div style="width:12px;height:12px;background:#d67214;border-radius:50%;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3);"></div>',
                    className: '',
                    iconSize: [12, 12],
                    iconAnchor: [6, 6]
                });
                const marker = L.marker([e.lat, e.lon], { icon }).addTo(map);
                marker.bindPopup(
                    '<b>' + name + '</b><br>' +
                    '<small>WA Campsite</small><br><br>' +
                    (e.tags.fee ? 'Fee: ' + e.tags.fee + '<br>' : '') +
                    (e.tags.toilets ? 'Toilets: ' + e.tags.toilets + '<br>' : '') +
                    (e.tags.shower ? 'Shower: ' + e.tags.shower + '<br>' : '') +
                    (e.tags.water ? 'Water: ' + e.tags.water + '<br>' : '') +
                    (e.tags.caravans ? 'Caravans: ' + e.tags.caravans + '<br>' : '') +
                    (e.tags.website ? '<br><a href="' + e.tags.website + '" target="_blank">More info</a>' : '') +
                    '<br><small>© OpenStreetMap</small>'
                );
                waCampMarkers.push(marker);
            });
        });
}

let fuelMarkers = [];
let fuelActive = false;

function toggleFuel() {
    const btn = document.getElementById('btn-fuel');
    if (fuelActive) {
        fuelMarkers.forEach(m => map.removeLayer(m));
        fuelMarkers = [];
        fuelActive = false;
        btn.style.background = 'white';
        btn.style.opacity = '1';
    } else {
        fuelActive = true;
        btn.style.background = '#d67214';
        fetchOSMLayer('amenity=fuel', fuelMarkers, '#e63946', 'Fuel Station');
    }
}

let waterMarkers = [];
let waterActive = false;

function toggleWater() {
    const btn = document.getElementById('btn-water');
    if (waterActive) {
        waterMarkers.forEach(m => map.removeLayer(m));
        waterMarkers = [];
        waterActive = false;
        btn.style.background = 'white';
        btn.style.opacity = '1';
    } else {
        waterActive = true;
        btn.style.background = '#1a6dd8';
        fetchOSMLayer('amenity=drinking_water', waterMarkers, '#1a6dd8', 'Drinking Water');
    }
}

function fetchOSMLayer(tag, markersArray, colour, label) {
    const centre = map.getCenter();
    const lat = centre.lat.toFixed(5);
    const lng = centre.lng.toFixed(5);
    fetch('https://overpass-api.de/api/interpreter?data=[out:json];node[' + tag + '](around:50000,' + lat + ',' + lng + ');out;')
        .then(r => r.json())
        .then(data => {
            markersArray.length = 0;
            data.elements.forEach(function(e) {
                if (!e.lat || !e.lon) return;
                const name = e.tags.name || label;
                const icon = L.divIcon({
                    html: '<div style="width:12px;height:12px;background:' + colour + ';border-radius:50%;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3);"></div>',
                    className: '',
                    iconSize: [12, 12],
                    iconAnchor: [6, 6]
                });
                const marker = L.marker([e.lat, e.lon], { icon }).addTo(map);
                marker.bindPopup(
                    '<b>' + name + '</b><br>' +
                    '<small>' + label + '</small><br>' +
                    (e.tags.brand ? e.tags.brand + '<br>' : '') +
                    (e.tags.opening_hours ? 'Hours: ' + e.tags.opening_hours + '<br>' : '') +
                    (e.tags.website ? '<br><a href="' + e.tags.website + '" target="_blank">More info</a>' : '') +
                    '<br><small>© OpenStreetMap</small>'
                );
                markersArray.push(marker);
            });
        });
}

map.on('moveend', function() {
    fetchWACamps();
    if (fuelActive) { fuelMarkers.forEach(m => map.removeLayer(m)); fuelMarkers.length = 0; fetchOSMLayer('amenity=fuel', fuelMarkers, '#e63946', 'Fuel Station'); }
    if (waterActive) { waterMarkers.forEach(m => map.removeLayer(m)); waterMarkers.length = 0; fetchOSMLayer('amenity=drinking_water', waterMarkers, '#1a6dd8', 'Drinking Water'); }
});

// Lighthouse layer
let lighthouseMarkers = [];
let lighthousesActive = false;
let lighthouseData = null;

function toggleLighthouses() {
    const btn = document.getElementById('btn-lighthouses');
    if (lighthousesActive) {
        lighthouseMarkers.forEach(m => map.removeLayer(m));
        lighthouseMarkers = [];
        lighthousesActive = false;
        btn.classList.remove('active');
    } else {
        lighthousesActive = true;
        btn.classList.add('active');
        if (lighthouseData) {
            renderLighthouses();
        } else {
            fetch('lighthouses.geojson')
                .then(r => r.json())
                .then(data => { lighthouseData = data; renderLighthouses(); })
                .catch(function() { console.log('Could not load lighthouse data'); });
        }
    }
}

function renderLighthouses() {
    lighthouseData.features.forEach(function(f) {
        const p = f.properties;
        const icon = L.divIcon({
            html: '<img src="icons/lighthouse.png" style="width:24px;height:24px;object-fit:contain;">',
            className: 'emoji-icon',
            iconSize: [24, 24],
            iconAnchor: [12, 24]
        });
        const marker = L.marker([f.geometry.coordinates[1], f.geometry.coordinates[0]], { icon }).addTo(map);
        marker.bindPopup(
            '<b>🔦 ' + p.name + '</b><br>' +
            '<small>Established ' + p.established + '</small><br><br>' +
            (p.construction ? 'Construction: ' + p.construction + '<br>' : '') +
            (p.height ? 'Height: ' + p.height + '<br>' : '') +
            'Status: ' + p.status + '<br>' +
            (p.access ? 'Access: ' + p.access + '<br>' : '') +
            (p.remarks ? '<br><small>' + p.remarks + '</small>' : '')
        );
        lighthouseMarkers.push(marker);
    });
}

// ── Trail layers (walk, 2x2, paddle) ──
let trailPins = { walk: [], paddle: [], '2x2': [] };
let trailLines = { walk: {}, paddle: {}, '2x2': {} };
let trailActive = { walk: false, paddle: false, '2x2': false };
let trailIndex = null;

const trailConfig = {
    'walk':   { color: '#2d8a4e', label: '🥾 Walk',   type: 'Walking Trail' },
    'paddle': { color: '#1a6dd8', label: '🚣 Paddle', type: 'Paddle Trail'   },
    '2x2':    { color: '#7b2d8b', label: '🚙 2x2',    type: '2x2 Track'      }
};

function cleanTrailName(filename) {
    return filename
        .split('/').pop()
        .replace('.kml', '')
        .replace(/ Trail$/, '')
        .replace(/ Paddle$/, '')
        .replace(/ 2x2$/, '')
        .trim();
}

function toggleTrailLayer(category) {
    const btn = document.getElementById('btn-' + category);
    if (trailActive[category]) {
        trailPins[category].forEach(function(m) { map.removeLayer(m); });
        trailPins[category] = [];
        Object.values(trailLines[category]).forEach(function(l) { map.removeLayer(l); });
        trailLines[category] = {};
        trailActive[category] = false;
        if (btn) btn.classList.remove('active');
    } else {
        trailActive[category] = true;
        if (btn) btn.classList.add('active');
        if (trailIndex) {
            loadTrailPins(category);
        } else {
            fetch('trails-index.json')
                .then(r => r.json())
                .then(function(data) {
                    trailIndex = data;
                    loadTrailPins(category);
                })
                .catch(function(err) { console.log('Trail index error:', err); });
        }
    }
}

function loadTrailPins(category) {
    const files = trailIndex[category] || [];
    const cfg = trailConfig[category];
    files.forEach(function(file) {
        fetch(file)
            .then(r => r.text())
            .then(function(kmlText) {
                const parser = new DOMParser();
                const kml = parser.parseFromString(kmlText, 'text/xml');
                const coordNodes = kml.getElementsByTagName('coordinates');
                if (!coordNodes.length) return;
                const name = cleanTrailName(file);
                const raw = coordNodes[0].textContent.trim().split(/[\s]+/);
                const latlngs = raw.map(function(c) {
                    const parts = c.split(',');
                    return [parseFloat(parts[1]), parseFloat(parts[0])];
                }).filter(function(ll) { return !isNaN(ll[0]) && !isNaN(ll[1]); });
                if (latlngs.length < 2) return;
                const pinIcon = L.divIcon({
                    html: '<div style="width:14px;height:14px;background:' + cfg.color + ';border-radius:50%;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.4);"></div>',
                    className: '',
                    iconSize: [14, 14],
                    iconAnchor: [7, 7]
                });
                const marker = L.marker(latlngs[0], { icon: pinIcon }).addTo(map);
                const popupDiv = document.createElement('div');
                popupDiv.innerHTML = '<b>' + cfg.label + ' — ' + name + '</b><br><small>' + cfg.type + '</small><br><br>';
                const routeBtn = document.createElement('button');
                routeBtn.textContent = 'Show Route';
                routeBtn.style.cssText = 'padding:7px 14px;border-radius:8px;border:none;background:' + cfg.color + ';color:white;font-size:13px;font-weight:600;cursor:pointer;';
                routeBtn.addEventListener('click', function() { showTrailRoute(category, file, latlngs); });
                popupDiv.appendChild(routeBtn);
                marker.bindPopup(popupDiv);
                marker._trailLatlngs = latlngs;
                marker._trailKey = file;
                trailPins[category].push(marker);
            })
            .catch(function(err) { console.log('Trail load error:', file, err); });
    });
}

function showTrailRoute(category, fileKey, latlngs) {
    if (trailLines[category][fileKey]) {
        map.removeLayer(trailLines[category][fileKey]);
        delete trailLines[category][fileKey];
        return;
    }
    const line = L.polyline(latlngs, {
        color: trailConfig[category].color,
        weight: 3,
        opacity: 0.85
    }).addTo(map);
    trailLines[category][fileKey] = line;
    map.fitBounds(line.getBounds(), { padding: [40, 40] });
}

function toggle2x2() { toggleTrailLayer('2x2'); }
function show2x2Route() {}


// Expose functions to global scope for inline HTML onclick handlers
window.savePin = savePin;
window.cancelPin = cancelPin;
window.editPin = editPin;
window.deletePin = deletePin;
window.speakPin = speakPin;
window.toggleDFES = toggleDFES;
window.toggleWACamps = toggleWACamps;
window.toggleFuel = toggleFuel;
window.toggleWater = toggleWater;
window.toggleLighthouses = toggleLighthouses;
window.toggle2x2 = toggle2x2;
window.show2x2Route = show2x2Route;
window.toggleTrailLayer = toggleTrailLayer;
