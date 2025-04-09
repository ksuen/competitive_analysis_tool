// script.js

let map;
let service;
let infowindow;
let competitors = []; // Store competitors globally

function initMap(center) {
  map = new google.maps.Map(document.getElementById("map"), {
    center: center,
    zoom: 13,
  });
}

document.getElementById("dentistForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const practiceName = document.getElementById("practiceName").value;
  const practiceAddress = document.getElementById("practiceAddress").value;

  const geocoder = new google.maps.Geocoder();

  geocoder.geocode({ address: practiceAddress }, function (results, status) {
    if (status === "OK") {
      const location = results[0].geometry.location;
      initMap(location);

      const request = {
        location: location,
        radius: '16093', // 10 miles in meters
        keyword: 'orthodontist OR braces OR aligners',
      };

      service = new google.maps.places.PlacesService(map);
      service.nearbySearch(request, function (results, status) {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
          competitors = []; // Clear previous competitors
          document.getElementById("resultsList").innerHTML = ""; // Clear previous results
          results.forEach(place => {
            competitors.push(place); // Store each place
            createMarker(place);     // Create map marker
          });
          renderResults(); // Render the results list
        } else {
          document.getElementById("resultsList").innerHTML = "<h3>No competitors found.</h3>";
        }
      });
    } else {
      alert("Geocode was not successful for the following reason: " + status);
    }
  });
});

function createMarker(place) {
  let color = 'red'; // Default Poor
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
  let sorted = [...competitors]; // Clone array

  if (sortOption === "rating-desc") {
    sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  } else if (sortOption === "rating-asc") {
    sorted.sort((a, b) => (a.rating || 0) - (b.rating || 0));
  } else if (sortOption === "name-asc") {
    sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }

  const resultsDiv = document.getElementById("resultsList");
  resultsDiv.innerHTML = ""; // Clear current list

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
      ${place.vicinity}<br>
      Rating: ${place.rating || 'N/A'}<br>
      Competitive Ranking: ${ranking}
    `;
    resultsDiv.appendChild(div);
  });
}

// Listen for sort option change
document.getElementById("sortOptions").addEventListener("change", renderResults);
