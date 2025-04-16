// script.js (Lightly Refactored and Polished)
let map;
let service;
let competitors = [];
let staticMapUrl = "";
let selectedTreatments = [];
let practiceNameInput = "";
let practiceAddressInput = "";
let typedTreatments = [];
let checkedTreatments = [];

const MAP_ID = 'YOUR_MAP_ID_HERE';

function showError(message) {
  const errorDiv = document.getElementById("errorMessage");
  errorDiv.style.display = "block";
  errorDiv.innerText = message;
}

function normalizeString(str) {
  return (str || '').toLowerCase().trim();
}

function initMap(center) {
  map = new google.maps.Map(document.getElementById("map"), {
    center,
    zoom: 12,
    mapId: MAP_ID,
  });
}

function getColorByRating(rating) {
  if (rating >= 4.5) return 'green';
  if (rating >= 4.0) return 'blue';
  if (rating >= 3.0) return 'orange';
  return 'red';
}

function getRankingByRating(rating) {
  if (rating >= 4.5) return 'Excellent';
  if (rating >= 4.0) return 'Good';
  if (rating >= 3.0) return 'Fair';
  return 'Poor';
}

function createCustomPin(color) {
  const pin = document.createElement('div');
  pin.style.backgroundColor = color;
  pin.style.width = '20px';
  pin.style.height = '20px';
  pin.style.borderRadius = '50%';
  pin.style.border = '2px solid white';
  pin.style.boxShadow = '0 0 3px rgba(0,0,0,0.5)';
  return pin;
}

function createMarker(place) {
  const color = getColorByRating(place.rating);
  new google.maps.marker.AdvancedMarkerElement({
    map,
    position: place.geometry.location,
    title: place.name,
    content: createCustomPin(color)
  });
}

function buildStaticMapUrl() {
  const baseUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(practiceAddressInput)}&size=600x300&maptype=roadmap&zoom=12`;
  const markers = [`color:red|label:P|${encodeURIComponent(practiceAddressInput)}`];

  competitors.slice(0, 20).forEach((place, index) => {
    if (place.geometry?.location) {
      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      const color = getColorByRating(place.rating);
      markers.push(`color:${color}|label:${index + 1}|${lat},${lng}`);
    }
  });

  staticMapUrl = `${baseUrl}&${markers.map(m => 'markers=' + m).join('&')}&key=YOUR_API_KEY_HERE`;
}

// ... (unchanged up to fetchPlaceDetailsBatch)

function fetchPlaceDetailsBatch(places, onComplete) {
  console.log("[DEBUG] Fetching place details for", places.length, "places.");
  let remaining = places.length;
  const detailedResults = [];

  places.forEach((place, i) => {
    console.log(`[DEBUG] Requesting details for place #${i + 1}:`, place.name);

    service.getDetails(
      {
        placeId: place.place_id,
        fields: [
          "name",
          "formatted_address",
          "website",
          "types",
          "reviews",
          "editorial_summary"
        ],
      },
      (details, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
          console.log(`[DEBUG] Got details for: ${details.name}`);
          detailedResults.push({ ...place, ...details });
        } else {
          console.warn(`[WARN] Failed to get details for: ${place.name}`, status);
          detailedResults.push(place);
        }

        remaining--;
        if (remaining === 0) {
          console.log("[DEBUG] All place detail fetches complete.");
          onComplete(detailedResults);
        }
      }
    );
  });
}

// ... renderResults() modified to include debug
function renderResults() {
  console.log("[DEBUG] Rendering results. Treatments:", selectedTreatments);
  const sortOption = document.getElementById("sortOptions").value;
  const resultsDiv = document.getElementById("resultsList");
  let sorted = [...competitors];

  if (sortOption === "rating-desc") sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  if (sortOption === "rating-asc") sorted.sort((a, b) => (a.rating || 0) - (b.rating || 0));
  if (sortOption === "name-asc") sorted.sort((a, b) => normalizeString(a.name).localeCompare(normalizeString(b.name)));
  if (sortOption === "name-desc") sorted.sort((a, b) => normalizeString(b.name).localeCompare(normalizeString(a.name)));

  resultsDiv.innerHTML = "";

  sorted.forEach((place, index) => {
    const color = getColorByRating(place.rating);
    const ranking = getRankingByRating(place.rating);
    const lowerCaseTerms = selectedTreatments.map(term => term.toLowerCase());

    const allText = `
      ${place.name || ''} 
      ${place.website || ''} 
      ${place.editorial_summary?.overview || ''} 
      ${place.reviews?.map(r => r.text).join(' ') || ''}
    `.toLowerCase();

    const matchingTerms = lowerCaseTerms.filter(term => allText.includes(term));

    console.log(`[DEBUG] Competitor ${index + 1}: ${place.name}`);
    console.log(`        Matching Treatments:`, matchingTerms);
    console.log(`        Searched Text Snippet:`, allText.substring(0, 100), "...");

    const div = document.createElement("div");
    div.style.marginBottom = "10px";
    div.innerHTML = `
      <span style="display:inline-block; width:12px; height:12px; background-color:${color}; border-radius:50%; margin-right:8px;"></span>
      <strong>${place.name}</strong><br>
      ${place.vicinity}<br>
      Rating: ${place.rating || 'N/A'}<br>
      Competitive Ranking: ${ranking}<br>
      <em>Matching Treatments: ${matchingTerms.length ? matchingTerms.join(', ') : 'None'}</em>
    `;
    resultsDiv.appendChild(div);
  });
}

// Add console logging to the submit handler
document.getElementById("dentistForm").addEventListener("submit", function (e) {
  e.preventDefault();
  const formPracticeName = document.getElementById("practiceName");
  const formPracticeAddress = document.getElementById("practiceAddress");
  const formTreatments = document.getElementById("treatments");

  practiceNameInput = formPracticeName.value;
  practiceAddressInput = formPracticeAddress.value;

  typedTreatments = formTreatments.value.split(",").map(t => t.trim().toLowerCase()).filter(Boolean);
  checkedTreatments = Array.from(document.querySelectorAll('#keywordSuggestions input[type="checkbox"]:checked')).map(cb => cb.value.toLowerCase());
  selectedTreatments = [...typedTreatments, ...checkedTreatments];

  console.log("[DEBUG] Form submitted:");
  console.log("  Practice Name:", practiceNameInput);
  console.log("  Address:", practiceAddressInput);
  console.log("  Selected Treatments:", selectedTreatments);

  const geocoder = new google.maps.Geocoder();
  geocoder.geocode({ address: practiceAddressInput }, function (results, status) {
    if (status === "OK" && results?.length > 0) {
      const location = results[0].geometry.location;
      console.log("[DEBUG] Geocoded Address:", location.toString());
      initMap(location);

      document.getElementById("resultsContainer").style.display = "block";
      document.getElementById("errorMessage").style.display = "none";

      service = new google.maps.places.PlacesService(map);
      service.nearbySearch({
        location,
        radius: '16093',
        keyword: 'orthodontist OR braces OR aligners',
      }, function (results, status) {
        if (status === google.maps.places.PlacesServiceStatus.OK && results?.length > 0) {
          console.log("[DEBUG] Nearby Search Results:", results);
          fetchPlaceDetailsBatch(results.slice(0, 15), (detailedResults) => {
            competitors = detailedResults;
            document.getElementById("resultsList").innerHTML = "";
            competitors.forEach(createMarker);
            buildStaticMapUrl();
            renderResults();
          });
        } else {
          console.warn("[WARN] Nearby search returned no results or failed.", status);
          document.getElementById("resultsList").innerHTML = "<h3 style='color:red;'>No competitors found.</h3>";
        }
      });
    } else {
      showError("Unable to find that address. Please check and try again.");
      console.error("[ERROR] Geocode failed:", status);
    }
  });
});
