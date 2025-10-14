// --- Initialize map centered on your requested coordinates ---
const DEFAULT_CENTER = [52.37947358742472, -113.83430777461079];
const map = L.map('map').setView(DEFAULT_CENTER, 16);

// --- Satellite & Labels tile layers ---
const esriSat = L.tileLayer(
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  {
    attribution: 'Imagery: Tiles © Esri',
    maxZoom: 20
  }
).addTo(map);

// Reference (labels) layer overlaid for text
const esriLabels = L.tileLayer(
  'https://services.arcgisonline.com/arcgis/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
  {
    attribution: 'Labels: Esri',
    maxZoom: 20
  }
).addTo(map);

// --- Feature group to hold drawn polygons ---
const drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

const drawControl = new L.Control.Draw({
  draw: {
    polygon: true,
    marker: false,
    polyline: false,
    rectangle: false,
    circle: false,
    circlemarker: false
  },
  edit: { featureGroup: drawnItems }
});
map.addControl(drawControl);

let boundaryGeoJSON = null;

// --- Show/update live blue location dot ---
function updateUserDot(lat, lng) {
  if (window.userDot) map.removeLayer(window.userDot);
  window.userDot = L.circleMarker([lat, lng], {
    color: "#2986ff",
    fillColor: "#2986ff",
    fillOpacity: 0.8,
    radius: 9
  }).addTo(map);
}

// --- Handle drawing a new polygon boundary ---
map.on(L.Draw.Event.CREATED, function (e) {
  drawnItems.clearLayers();
  drawnItems.addLayer(e.layer);
  boundaryGeoJSON = e.layer.toGeoJSON();
  document.getElementById('status').innerHTML = "Boundary drawn. Allow GPS to check location.";
});

// --- Check location function ---
function checkLocation(lat, lng) {
  updateUserDot(lat, lng); // always update blue dot
  if (!boundaryGeoJSON) {
    document.getElementById('status').innerHTML = "Draw a boundary first!";
    return;
  }
  const userPoint = turf.point([lng, lat]);
  const polygon = boundaryGeoJSON.geometry;
  const isInside = turf.booleanPointInPolygon(userPoint, polygon);
  const dist = turf.pointToLineDistance(userPoint, turf.polygonToLine(boundaryGeoJSON), { units: 'meters' });

  const statusDiv = document.getElementById('status');
  if (isInside) {
    statusDiv.innerHTML = `<span class="inside">You are INSIDE the area.</span><br>Distance from edge: ${Math.abs(dist).toFixed(2)} m`;
  } else {
    statusDiv.innerHTML = `<span class="outside">You are OUTSIDE the area.</span><br>Nearest distance: ${dist.toFixed(2)} m`;
  }
}

// --- Geolocation Fetching ---
async function startLocationTracking() {
  if (!navigator.geolocation) {
    document.getElementById('status').innerHTML = "Geolocation not supported!";
    return;
  }
  if (navigator.permissions) {
    try {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      if (result.state === "granted" || result.state === "prompt") {
        fetchLocation();
        window.geoInterval = setInterval(fetchLocation, 3000);
      } else if (result.state === "denied") {
        document.getElementById('status').innerHTML = "Location access denied. Enable it in browser settings.";
      }
      result.onchange = () => startLocationTracking();
    } catch (e) {
      document.getElementById('status').innerHTML = "Error checking geolocation permission.";
    }
  } else {
    fetchLocation();
    window.geoInterval = setInterval(fetchLocation, 3000);
  }
}

function fetchLocation() {
  navigator.geolocation.getCurrentPosition(
    pos => checkLocation(pos.coords.latitude, pos.coords.longitude),
    err => {
      document.getElementById('status').innerHTML = `GPS Error: ${err.message}`;
      if (window.geoInterval) clearInterval(window.geoInterval);
    }
  );
}

// --- Start location tracking on load ---
window.onload = startLocationTracking;
