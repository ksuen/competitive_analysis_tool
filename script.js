
// Cleaned and Refactored script.js for Dental Pain Eraser
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

function capitalizeWord(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function capitalizeWords(array) {
  return array.map(capitalizeWord);
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

function fetchPlaceDetailsBatch(places, onComplete) {
  let remaining = places.length;
  const detailedResults = [];

  places.forEach(place => {
    service.getDetails({
      placeId: place.place_id,
      fields: ["name", "formatted_address", "website", "types", "reviews", "editorial_summary"]
    }, (details, status) => {
      detailedResults.push(status === google.maps.places.PlacesServiceStatus.OK ? { ...place, ...details } : place);
      if (--remaining === 0) onComplete(detailedResults);
    });
  });
}

function renderResults() {
  const sortOption = document.getElementById("sortOptions").value;
  const resultsDiv = document.getElementById("resultsList");
  let sorted = [...competitors];

  sorted.sort((a, b) => {
    if (sortOption === "rating-desc") return (b.rating || 0) - (a.rating || 0);
    if (sortOption === "rating-asc") return (a.rating || 0) - (b.rating || 0);
    if (sortOption === "name-asc") return normalizeString(a.name).localeCompare(normalizeString(b.name));
    if (sortOption === "name-desc") return normalizeString(b.name).localeCompare(normalizeString(a.name));
    return 0;
  });

  resultsDiv.innerHTML = "";

  sorted.forEach(place => {
    const color = getColorByRating(place.rating);
    const ranking = getRankingByRating(place.rating);
    const allText = `
      ${place.name || ''} 
      ${place.website || ''} 
      ${place.editorial_summary?.overview || ''} 
      ${place.reviews?.map(r => r.text).join(' ') || ''}
    `.toLowerCase();

    const matchingTerms = selectedTreatments.filter(term => allText.includes(term.toLowerCase()));

    const div = document.createElement("div");
    div.style.marginBottom = "10px";
    div.innerHTML = `
      <span style="display:inline-block; width:12px; height:12px; background-color:${color}; border-radius:50%; margin-right:8px;"></span>
      <strong>${place.name}</strong><br>
      ${place.vicinity}<br>
      Rating: ${place.rating || 'N/A'}<br>
      Competitive Ranking: ${ranking}<br>
      <em>Matching Treatments: ${matchingTerms.length ? matchingTerms.map(term => term.charAt(0).toUpperCase() + term.slice(1)).join(', ') : 'None'}</em>
    `;
    resultsDiv.appendChild(div);
  });
}

document.getElementById("dentistForm").addEventListener("submit", function (e) {
  e.preventDefault();

  practiceNameInput = document.getElementById("practiceName").value;
  practiceAddressInput = document.getElementById("practiceAddress").value;
  const formTreatments = document.getElementById("treatments");

  typedTreatments = formTreatments.value.split(",").map(t => t.trim().toLowerCase()).filter(Boolean);
  checkedTreatments = Array.from(document.querySelectorAll('#keywordSuggestions input[type="checkbox"]:checked')).map(cb => cb.value.toLowerCase());
  selectedTreatments = [...typedTreatments, ...checkedTreatments];

  const geocoder = new google.maps.Geocoder();
  geocoder.geocode({ address: practiceAddressInput }, function (results, status) {
    if (status === "OK" && results?.length > 0) {
      const location = results[0].geometry.location;
      initMap(location);
	  	  
      new google.maps.Marker({
        position: location,
        map: map,
        title: "Your Practice",
        icon: {
          url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png"
        }
      });

      document.getElementById("resultsContainer").style.display = "block";
      document.getElementById("errorMessage").style.display = "none";

      service = new google.maps.places.PlacesService(map);
      service.nearbySearch({
        location,
        radius: '16093',
        keyword: 'orthodontist OR braces OR aligners',
      }, function (results, status) {
        if (status === google.maps.places.PlacesServiceStatus.OK && results?.length > 0) {
          fetchPlaceDetailsBatch(results.slice(0, 15), (detailedResults) => {
            competitors = detailedResults;
            document.getElementById("resultsList").innerHTML = "";
            competitors.forEach(createMarker);
            buildStaticMapUrl();
            renderResults();
          });
        } else {
          document.getElementById("resultsList").innerHTML = "<h3 style='color:red;'>No competitors found.</h3>";
        }
      });
    } else {
      showError("Unable to find that address. Please check and try again.");
    }
  });
});

document.getElementById("sortOptions").addEventListener("change", renderResults);

document.getElementById("downloadPDF").addEventListener("click", function () {
  const { jsPDF } = window.jspdf;
  const today = new Date();
  const dateString = today.toLocaleDateString();
  const doc = new jsPDF();
  let yOffset = 10;

  doc.setFontSize(14);
  doc.text("Dental Pain Eraser - Competitor Analysis Report", 10, yOffset);
  yOffset += 10;

  doc.setFont(undefined, 'bold');
  doc.text("Date:", 10, yOffset);
  doc.setFont(undefined, 'normal');
  doc.text(` ${dateString}`, 25, yOffset);
  yOffset += 8;

  doc.setFont(undefined, 'bold');
  doc.text("Practice Name:", 10, yOffset);
  doc.setFont(undefined, 'normal');
  doc.text(` ${practiceNameInput}`, 48, yOffset);
  yOffset += 8;

  doc.setFont(undefined, 'bold');
  doc.text("Practice Address:", 10, yOffset);
  doc.setFont(undefined, 'normal');
  doc.text(` ${practiceAddressInput}`, 55, yOffset);
  yOffset += 8;

  doc.setFont(undefined, 'bold');
  doc.text("Treatments Offered:", 10, yOffset);
  doc.setFont(undefined, 'normal');
  const allTreatments = selectedTreatments.length ? capitalizeWords(selectedTreatments).join(', ') : 'N/A';

  doc.text(allTreatments, 62, yOffset);
  yOffset += 10;
// Ratings legend (2x2 layout)
  doc.text("Ratings Legend:", 10, yOffset);
  yOffset += 6;

  const legendItems = [
    { color: [0, 128, 0], label: "Excellent (4.5 – 5.0)" },
    { color: [0, 0, 255], label: "Good (4.0 – 4.4)" },
    { color: [255, 165, 0], label: "Fair (3.0 – 3.9)" },
    { color: [255, 0, 0], label: "Poor (< 3.0 or N/A)" }
  ];

  const startX = 12;
  const colSpacing = 100;
  const rowSpacing = 6;

  legendItems.forEach((item, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = startX + col * colSpacing;
    const y = yOffset + row * rowSpacing;

    doc.setFillColor(...item.color);
    doc.circle(x, y - 1.5, 2, 'F');
    doc.setTextColor(0);
    doc.text(item.label, x + 6, y);
  });

  yOffset += rowSpacing * 2 + 4;

  if (staticMapUrl) {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = staticMapUrl;
    img.onload = () => {
      try {
        doc.addImage(img, 'PNG', 10, yOffset, 190, 100);
        addCompetitorsToPDF(doc, yOffset + 110);
      } catch (error) {
        console.error("Error adding map image to PDF:", error);
        doc.text("Static map could not be loaded.", 10, yOffset);
        addCompetitorsToPDF(doc, yOffset + 10);
      }
    };
    img.onerror = () => {
      doc.text("Static map could not be loaded.", 10, yOffset);
      addCompetitorsToPDF(doc, yOffset + 10);
    };
  } else {
    doc.text("Static map URL not set.", 10, yOffset);
    addCompetitorsToPDF(doc, yOffset + 10);
  }
});

function addCompetitorsToPDF(doc, yOffset) {
  doc.setFontSize(12);

  const sortOption = document.getElementById("sortOptions").value;
  let sorted = [...competitors];

  sorted.sort((a, b) => {
    if (sortOption === "rating-desc") return (b.rating || 0) - (a.rating || 0);
    if (sortOption === "rating-asc") return (a.rating || 0) - (b.rating || 0);
    if (sortOption === "name-asc") return normalizeString(a.name).localeCompare(normalizeString(b.name));
    if (sortOption === "name-desc") return normalizeString(b.name).localeCompare(normalizeString(a.name));
    return 0;
  });

  sorted.forEach((place, index) => {
    const ranking = getRankingByRating(place.rating);
    const allText = `
      ${place.name || ''} 
      ${place.website || ''} 
      ${place.editorial_summary?.overview || ''} 
      ${place.reviews?.map(r => r.text).join(' ') || ''}
    `.toLowerCase();

    const matchingTerms = selectedTreatments.filter(term => allText.includes(term.toLowerCase()));

    const label = `${index + 1}.`;
    doc.setFont(undefined, 'bold');
    doc.text(label, 10, yOffset);

    const labelWidth = doc.getTextWidth(label);
    const dotX = 11 + labelWidth + 2;

    if (place.rating >= 4.5) doc.setFillColor(0, 128, 0);      // Green
    else if (place.rating >= 4.0) doc.setFillColor(0, 0, 255); // Blue
    else if (place.rating >= 3.0) doc.setFillColor(255, 165, 0); // Orange
    else doc.setFillColor(255, 0, 0);                          // Red

    doc.circle(dotX, yOffset - 1.5, 2, 'F');
    doc.setTextColor(0);
    doc.setFont(undefined, 'bold');
    doc.text(`${place.name}`, dotX + 3, yOffset);
    doc.setFont(undefined, 'normal');
    yOffset += 6;
    doc.text(`Address: ${place.vicinity}`, 10, yOffset);
    yOffset += 6;
    doc.text(`Rating: ${place.rating || 'N/A'}`, 10, yOffset);
    yOffset += 6;
    doc.text(`Competitive Ranking: ${ranking}`, 10, yOffset);
    yOffset += 6;
    doc.text(`Matching Treatments: ${matchingTerms.length ? matchingTerms.map(term => term.charAt(0).toUpperCase() + term.slice(1)).join(', ') : 'None'}`, 10, yOffset);
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