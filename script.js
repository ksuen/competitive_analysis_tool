// script.js
let map;
let service;
let infowindow;
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

function initMap(center) {
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
      initMap(location);

      document.getElementById("resultsContainer").style.display = "block";
      document.getElementById("errorMessage").style.display = "none";

      const request = {
        locationBias: { center: location, radius: 16093 },
        includedTypes: ["dentist"],
        query: "orthodontist OR braces OR aligners"
      };

      const placesService = new google.maps.places.Place();
      placesService.searchNearby(request, (results, status) => {
        if (status === "OK") {
          competitors = [];
          document.getElementById("resultsList").innerHTML = "";
          results.forEach(place => {
            competitors.push(place);
            createMarker(place);
          });
          buildStaticMapUrl();
          renderResults();
        } else {
          document.getElementById("resultsList").innerHTML = "<h3 style='color:red;'>No competitors found.</h3>";
        }
      });
    } else {
      showError("Unable to find that address. Please check and try again.");
    }
  });
});

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
  let color = 'red';
  if (place.rating >= 4.5) {
    color = 'green';
  } else if (place.rating >= 4.0) {
    color = 'blue';
  } else if (place.rating >= 3.0) {
    color = 'orange';
  }

  const marker = new google.maps.marker.AdvancedMarkerElement({
    map: map,
    position: place.geometry.location,
    title: place.name,
  });

  marker.addListener("click", () => {
    if (!infowindow) {
      infowindow = new google.maps.InfoWindow();
    }
    infowindow.setContent(
      `<strong>${place.name}</strong><br>${place.vicinity}<br>Rating: ${place.rating || 'N/A'}`
    );
    infowindow.open(map, marker);
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

    let matchingTerms = [];
    selectedTreatments.forEach(term => {
      if (place.name && place.name.toLowerCase().includes(term)) {
        matchingTerms.push(term);
      }
    });

    const div = document.createElement("div");
    div.style.marginBottom = "10px";
    div.innerHTML = `
      <span style="display:inline-block; width:12px; height:12px; background-color:${color}; border-radius:50%; margin-right:8px;"></span>
      <strong>${place.name}</strong><br>
      ${place.vicinity}<br>
      Rating: ${place.rating || 'N/A'}<br>
      Competitive Ranking: ${ranking}<br>
      <em>Matching Treatments: ${matchingTerms.length > 0 ? matchingTerms.join(', ') : 'None'}</em>
    `;
    resultsDiv.appendChild(div);
  });
}

document.getElementById("sortOptions").addEventListener("change", renderResults);

window.onerror = function(message, source, lineno, colno, error) {
  showError("Oops! Something went wrong. Please reload the page and try again.");
  console.error("Global Error:", message, "at", source + ":" + lineno + ":" + colno);
};
