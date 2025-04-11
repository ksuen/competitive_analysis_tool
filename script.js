let map;
let competitors = [];
let staticMapUrl = "";
let selectedTreatments = [];
let practiceNameInput = "";
let practiceAddressInput = "";
let treatmentsInput = "";
let placeLibrary;

function showError(message) {
  const errorDiv = document.getElementById("errorMessage");
  errorDiv.style.display = "block";
  errorDiv.innerText = message;
}

async function initMap() {
  const center = { lat: 37.7749, lng: -122.4194 }; // Default SF center
  map = new google.maps.Map(document.getElementById("map"), {
    center: center,
    zoom: 12,
  });
  placeLibrary = await google.maps.importLibrary("places");
}

document.getElementById("dentistForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  practiceNameInput = document.getElementById("practiceName").value;
  practiceAddressInput = document.getElementById("practiceAddress").value;
  treatmentsInput = document.getElementById("treatments").value;

  const typedTreatments = treatmentsInput.split(",").map(t => t.trim().toLowerCase()).filter(t => t.length > 0);
  const checkedBoxes = Array.from(document.querySelectorAll('#keywordSuggestions input[type="checkbox"]:checked'));
  const checkedTreatments = checkedBoxes.map(cb => cb.value.toLowerCase());

  selectedTreatments = typedTreatments.concat(checkedTreatments);

  const geocoder = new google.maps.Geocoder();

  geocoder.geocode({ address: practiceAddressInput }, async function (results, status) {
    if (status === "OK") {
      const location = results[0].geometry.location;
      map.setCenter(location);
      document.getElementById("resultsContainer").style.display = "block";
      document.getElementById("errorMessage").style.display = "none";
      await findCompetitors(location);
    } else {
      showError("Unable to find that address. Please check and try again.");
    }
  });
});

async function findCompetitors(location) {
  try {
    const { Place } = placeLibrary;
    const place = new Place({ locationBias: { center: location, radius: 16093 } });
    const result = await place.searchNearby({ query: "orthodontist" });

    competitors = result.places;
    document.getElementById("resultsList").innerHTML = "";

    competitors.forEach(place => {
      createMarker(place);
    });

    buildStaticMapUrl();
    renderResults();
  } catch (error) {
    showError("Could not find nearby competitors: " + error.message);
  }
}

function buildStaticMapUrl() {
  let baseUrl = "https://maps.googleapis.com/maps/api/staticmap?size=600x300&maptype=roadmap&zoom=12";
  let markers = [];
  markers.push(`color:red|label:P|${encodeURIComponent(practiceAddressInput)}`);
  competitors.slice(0, 20).forEach((place, index) => {
    if (place.location) {
      const lat = place.location.lat;
      const lng = place.location.lng;
      markers.push(`color:blue|label:${index + 1}|${lat},${lng}`);
    }
  });
  staticMapUrl = `${baseUrl}&${markers.map(m => 'markers=' + m).join('&')}&key=YOUR_API_KEY_HERE`;
}

function createMarker(place) {
  new google.maps.marker.AdvancedMarkerElement({
    map: map,
    position: place.location,
    title: place.displayName || "Unknown",
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
    sorted.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''));
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
      <strong>${place.displayName}</strong><br>
      Rating: ${place.rating || 'N/A'}<br>
      Competitive Ranking: ${ranking}<br>
    `;
    resultsDiv.appendChild(div);
  });
}