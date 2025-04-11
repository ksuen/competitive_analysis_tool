// script.js
let map;
let competitors = [];
let staticMapUrl = "";
let selectedTreatments = [];
let practiceNameInput = "";
let practiceAddressInput = "";
let treatmentsInput = "";

function showError(message) {
  const errorDiv = document.getElementById("errorMessage");
  errorDiv.style.display = "block";
  errorDiv.innerText = message;
}

function initMap() {
  const center = { lat: 37.7749, lng: -122.4194 }; // Default center (San Francisco)
  map = new google.maps.Map(document.getElementById("map"), {
    center: center,
    zoom: 12,
  });
}

document.getElementById("dentistForm").addEventListener("submit", function (e) {
  e.preventDefault();

  practiceNameInput = document.getElementById("practiceName").value;
  practiceAddressInput = document.getElementById("practiceAddress").value;
  treatmentsInput = document.getElementById("treatments").value;

  const typedTreatments = treatmentsInput.split(",").map(t => t.trim().toLowerCase()).filter(t => t.length > 0);
  const checkedBoxes = Array.from(document.querySelectorAll('#keywordSuggestions input[type="checkbox"]:checked'));
  const checkedTreatments = checkedBoxes.map(cb => cb.value.toLowerCase());

  selectedTreatments = typedTreatments.concat(checkedTreatments);

  const geocoder = new google.maps.Geocoder();

  geocoder.geocode({ address: practiceAddressInput }, function (results, status) {
    if (status === "OK") {
      const location = results[0].geometry.location;
      map.setCenter(location);
      document.getElementById("resultsContainer").style.display = "block";
      document.getElementById("errorMessage").style.display = "none";
      findCompetitors(location);
    } else {
      showError("Unable to find that address. Please check and try again.");
    }
  });
});

function findCompetitors(location) {
  const service = new google.maps.places.PlacesService(document.getElementById("map"));

  service.nearbySearch({
    location: location,
    radius: 16093,
    keyword: "orthodontist"
  }, (results, status) => {
    if (status === google.maps.places.PlacesServiceStatus.OK) {
      competitors = results;
      document.getElementById("resultsList").innerHTML = "";
      competitors.forEach(place => {
        createMarker(place);
      });
      buildStaticMapUrl();
      renderResults();
    } else {
      showError("No competitors found.");
    }
  });
}

function buildStaticMapUrl() {
  let baseUrl = "https://maps.googleapis.com/maps/api/staticmap?size=600x300&maptype=roadmap&zoom=12";
  let markers = [];

  markers.push(`color:red|label:P|${encodeURIComponent(practiceAddressInput)}`);

  competitors.slice(0, 20).forEach((place, index) => {
    if (place.geometry && place.geometry.location) {
      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      markers.push(`color:blue|label:${index + 1}|${lat},${lng}`);
    }
  });

  staticMapUrl = `${baseUrl}&${markers.map(m => 'markers=' + m).join('&')}&key=YOUR_API_KEY_HERE`;
}

function createMarker(place) {
  new google.maps.marker.AdvancedMarkerElement({
    map: map,
    position: place.geometry.location,
    title: place.name || "Unknown",
  });
}

function renderResults() {
  const sortOption = document.getElementById("sortOptions").value;
  let sorted = [...competitors];

  if (sortOption === "rating-desc") {
    sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  } else if (sortOption === "rating-asc") {
    sorted.sort((a, b) => (a.rating || 0) - (b.rating || 0));
  } else if (sortOption === "name-asc") {
    sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }

  const resultsDiv = document.getElementById("resultsList");
  resultsDiv.innerHTML = "";

  sorted.forEach(place => {
    let color = 'red';
    let ranking = 'Poor';
    if (place.rating >= 4.5) {
      color = 'green';
      ranking = 'Excellent';
    } else if (place.rating >= 4.0) {
      color = 'blue';
      ranking = 'Good';
    } else if (place.rating >= 3.0) {
      color = 'orange';
      ranking = 'Fair';
    }

    const div = document.createElement("div");
    div.style.marginBottom = "10px";
    div.innerHTML = `
      <span style="display:inline-block; width:12px; height:12px; background-color:${color}; border-radius:50%; margin-right:8px;"></span>
      <strong>${place.name}</strong><br>
      Rating: ${place.rating || 'N/A'}<br>
      Competitive Ranking: ${ranking}<br>
    `;
    resultsDiv.appendChild(div);
  });
}

document.getElementById("sortOptions").addEventListener("change", renderResults);

window.onerror = function(message, source, lineno, colno, error) {
  showError("Oops! Something went wrong. Please reload the page and try again.");
  console.error("Global Error:", message, "at", source + ":" + lineno + ":" + colno);
};