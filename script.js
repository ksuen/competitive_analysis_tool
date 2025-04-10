
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
    zoom: 13,
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

      staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(practiceAddressInput)}&zoom=13&size=600x300&maptype=roadmap&key=AIzaSyAc8CsjTFsv9ajuALZ95JCWwS_rcpl0SOU&visible=${encodeURIComponent(practiceAddressInput)}`;

      const request = {
        location: location,
        radius: '16093',
        keyword: 'orthodontist OR braces OR aligners',
      };

      service = new google.maps.places.PlacesService(map);
      service.nearbySearch(request, function (results, status) {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
          competitors = [];
          document.getElementById("resultsList").innerHTML = "";
          results.forEach(place => {
            competitors.push(place);
            createMarker(place);
          });
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

function createMarker(place) {
  let color = 'red';
  if (place.rating >= 4.5) {
    color = 'green';
  } else if (place.rating >= 4.0) {
    color = 'blue';
  } else if (place.rating >= 3.0) {
    color = 'orange';
  }

  const marker = new google.maps.Marker({
    map: map,
    position: place.geometry.location,
    icon: {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 8,
      fillColor: color,
      fillOpacity: 1,
      strokeWeight: 1,
    },
  });

  google.maps.event.addListener(marker, "click", function () {
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

// Global error handler
window.onerror = function(message, source, lineno, colno, error) {
  showError("Oops! Something went wrong. Please reload the page and try again.");
  console.error("Global Error:", message, "at", source + ":" + lineno + ":" + colno);
};
