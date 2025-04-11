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
        location: location,
        radius: '16093', // 10 miles in meters
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

document.getElementById("downloadPDF").addEventListener("click", function () {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  let yOffset = 10;

  doc.setFontSize(14);
  doc.text("Dental Pain Eraser - Competitor Analysis Report", 10, yOffset);

  yOffset += 10;
  doc.setFontSize(12);
  doc.text(`Practice Name: ${practiceNameInput}`, 10, yOffset);
  yOffset += 8;
  doc.text(`Practice Address: ${practiceAddressInput}`, 10, yOffset);
  yOffset += 8;
  doc.text(`Treatments Offered: ${selectedTreatments.join(', ') || 'None'}`, 10, yOffset);
  yOffset += 12;

  if (staticMapUrl) {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = staticMapUrl;
    img.onload = function () {
      doc.addImage(img, 'PNG', 10, yOffset, 190, 100);
      continueWithCompetitors(doc, yOffset + 110);
    };
    img.onerror = function () {
      doc.text("Static map could not be loaded.", 10, yOffset);
      continueWithCompetitors(doc, yOffset + 10);
    };
  } else {
    doc.text("Static map URL not set.", 10, yOffset);
    continueWithCompetitors(doc, yOffset + 10);
  }
});

function continueWithCompetitors(doc, yOffset) {
  doc.setFontSize(12);

  competitors.forEach((place, index) => {
    let ranking = 'Poor';
    if (place.rating >= 4.5) {
      ranking = 'Excellent';
    } else if (place.rating >= 4.0) {
      ranking = 'Good';
    } else if (place.rating >= 3.0) {
      ranking = 'Fair';
    }

    let matchingTerms = [];
    selectedTreatments.forEach(term => {
      if (place.name && place.name.toLowerCase().includes(term)) {
        matchingTerms.push(term);
      }
    });

    const text = `${index + 1}. ${place.name}\nAddress: ${place.vicinity}\nRating: ${place.rating || 'N/A'}\nCompetitive Ranking: ${ranking}\nMatching Treatments: ${matchingTerms.length > 0 ? matchingTerms.join(', ') : 'None'}\n\n`;

    doc.text(text, 10, yOffset);
    yOffset += 25;
    if (yOffset > 270) {
      doc.addPage();
      yOffset = 20;
    }
  });

  doc.save('Competitor_Analysis_Report.pdf');
}

window.onerror = function(message, source, lineno, colno, error) {
  showError("Oops! Something went wrong. Please reload the page and try again.");
  console.error("Global Error:", message, "at", source + ":" + lineno + ":" + colno);
};