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
let typedTreatments = [];
let checkedTreatments = [];

const MAP_ID = 'YOUR_MAP_ID_HERE'; // Replace with your real Map ID

function showError(message) {
  const errorDiv = document.getElementById("errorMessage");
  errorDiv.style.display = "block";
  errorDiv.innerText = message;
}

function initMap(center) {
  map = new google.maps.Map(document.getElementById("map"), {
    center: center,
    zoom: 12,
    mapId: MAP_ID,
  });
}

document.getElementById("dentistForm").addEventListener("submit", function (e) {
  e.preventDefault();

  practiceNameInput = document.getElementById("practiceName").value;
  practiceAddressInput = document.getElementById("practiceAddress").value;
  treatmentsInput = document.getElementById("treatments").value;

  typedTreatments = treatmentsInput.split(",").map(t => t.trim().toLowerCase()).filter(t => t.length > 0);
  checkedTreatments = Array.from(document.querySelectorAll('#keywordSuggestions input[type="checkbox"]:checked')).map(cb => cb.value.toLowerCase());

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
  let baseUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(practiceAddressInput)}&size=600x300&maptype=roadmap&zoom=12`;
  let markers = [];

  markers.push(`color:red|label:P|${encodeURIComponent(practiceAddressInput)}`);

  competitors.slice(0, 20).forEach((place, index) => {
    if (place.geometry && place.geometry.location) {
      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();

      let color = 'red';
      if (place.rating >= 4.5) {
        color = 'green';
      } else if (place.rating >= 4.0) {
        color = 'blue';
      } else if (place.rating >= 3.0) {
        color = 'orange';
      }

      markers.push(`color:${color}|label:${index + 1}|${lat},${lng}`);
    }
  });

  staticMapUrl = `${baseUrl}&${markers.map(m => 'markers=' + m).join('&')}&key=YOUR_API_KEY_HERE`;
}

function createMarker(place) {
  let backgroundColor = 'red';
  if (place.rating >= 4.5) {
    backgroundColor = 'green';
  } else if (place.rating >= 4.0) {
    backgroundColor = 'blue';
  } else if (place.rating >= 3.0) {
    backgroundColor = 'orange';
  }

  const marker = new google.maps.marker.AdvancedMarkerElement({
    map: map,
    position: place.geometry.location,
    title: place.name,
    content: createCustomPin(backgroundColor)
  });
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

  const today = new Date();
  const dateString = today.toLocaleDateString();
  doc.setFontSize(10);
  doc.text(`Date: ${dateString}`, 10, yOffset);
  yOffset += 6;

  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text(`Practice Name: ${practiceNameInput}`, 10, yOffset);
  doc.setFont(undefined, 'normal');
  yOffset += 8;
  doc.text(`Practice Address: ${practiceAddressInput}`, 10, yOffset);
  yOffset += 8;

  doc.setFont(undefined, 'bold');
  doc.text("Treatments Offered:", 10, yOffset);
  doc.setFont(undefined, 'normal');
  yOffset += 6;

  const allTreatments = selectedTreatments.length > 0 ? selectedTreatments.join(', ') : 'N/A';
  doc.text(allTreatments, 10, yOffset);
  yOffset += 10;

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

    doc.setFont(undefined, 'bold');
    doc.text(`${index + 1}. ${place.name}`, 10, yOffset);
    doc.setFont(undefined, 'normal');
    yOffset += 6;
    doc.text(`Address: ${place.vicinity}`, 10, yOffset);
    yOffset += 6;
    doc.text(`Rating: ${place.rating || 'N/A'}`, 10, yOffset);
    yOffset += 6;
    doc.text(`Competitive Ranking: ${ranking}`, 10, yOffset);
    yOffset += 6;
    doc.text(`Matching Treatments: ${matchingTerms.length > 0 ? matchingTerms.join(', ') : 'None'}`, 10, yOffset);

    yOffset += 10;

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
