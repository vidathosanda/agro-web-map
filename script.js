let geoLayer; // to store the loaded GeoJSON layer

// Initialize map
var map = L.map('map').setView([7.8, 80.2], 9);

// Add base map
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 18,
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Load GeoJSON
fetch('data/Landuse_geoJson.geojson_4326.geojson')
  .then(res => res.json())
  .then(data => {
    geoLayer = L.geoJSON(data, {
      style: function(feature) {
        const update = getUpdate(feature.properties.ID);
        let type = feature.properties.DESCRIPTIO;

        if (update) {
          type = update.status === "Change" ? update.newCrop :
                 update.status === "Abandoned" ? "Abandoned" :
                 update.status === "Built-up" ? "Built-up" : type;
          feature.properties.updated = update.updated;
        }

        return {
          fillColor: getColor(type),
          color: 'white',
          weight: 1,
          fillOpacity: 0.6
        };
      },
      onEachFeature: function(feature, layer) {
  layer.on({
    click: function () {
      openFormPopup(layer, feature);
    },
    mouseover: function (e) {
      e.target.setStyle({
        weight: 2,
        color: '#000',
        fillOpacity: 0.9
      });
    },
    mouseout: function (e) {
      geoLayer.resetStyle(e.target);
    }
  });
}

    }).addTo(map);
  });

// Color logic
function getColor(type) {
  switch (type) {
    case 'Paddy': return 'green';
    case 'Rubber': return 'yellow';
    case 'Coconut': return 'blue';
    case 'Chena': return 'orange';
    case 'Other Plantation': return 'gray';
    case 'Abandoned': return 'red';
    case 'Tea': return 'brown';
    default: return 'black';
  }
}

// Get local update
function getUpdate(id) {
  const data = localStorage.getItem(`land_${id}`);
  return data ? JSON.parse(data) : null;
}

// Popup form with abandonment reason logic
function openFormPopup(layer, feature) {
  const props = feature.properties;
  const id = props.ID;
const originalCrop = props.DESCRIPTIO || 'Unknown';
const update = getUpdate(id);

// Determine the actual land use (updated if exists, otherwise original)
let crop;
if (update) {
  if (update.status === "Change" && update.newCrop) {
    crop = update.newCrop;
  } else if (update.status === "Built-up") {
    crop = "Built-up";
  } else if (update.status === "Abandoned") {
    crop = "Abandoned";
  } else {
    crop = originalCrop;
  }
} else {
  crop = originalCrop;
}

const updated = update ? update.updated : 'Not yet';
const abandonReason = update && update.status === "Abandoned" ? update.abandonReason : null;
const comment = update && update.comment ? update.comment : null;


  const formHTML = `
    <b>Land ID:</b> ${id}<br>
    <b>Current Land Use:</b> ${crop}<br>
    <b>Last Updated:</b> ${updated}<br><br>

    ${update ? `
  ${abandonReason ? `<b>Abandonment Reason:</b> ${abandonReason}<br>` : ''}
  ${comment ? `<b>User Comment:</b> ${comment}<br>` : ''}
  <br>
` : ''}

    <label>New Land Status:</label><br>
    <select id="status" onchange="toggleInputs(this.value)">
      <option value="">--Select--</option>
      <option value="Abandoned">Abandoned</option>
      <option value="Built-up">Built-up</option>
      <option value="Change">Changed Crop Type</option>
    </select><br><br>

    <div id="abandonReasonDiv" style="display:none">
      <label>Reason for Abandonment:</label><br>
      <select id="abandonReason">
        <option value="">--Select Reason--</option>
        <option value="Water shortage">Water shortage</option>
        <option value="Labor issue">Labor issue</option>
        <option value="Low market price">Low market price</option>
        <option value="Other">Other</option>
      </select><br><br>
    </div>

    <div id="newCropDiv" style="display:none">
     <label>New Crop Type:</label><br>
     <select id="newCrop">
     <option value="">--Select New Crop Type--</option>
     <option value="Paddy">Paddy</option>
     <option value="Rubber">Rubber</option>
     <option value="Tea">Tea</option>
     <option value="Coconut">Coconut</option>
     <option value="Chena">Chena</option>
     <option value="Other Plantation">Other Plantation</option>
     </select><br><br>
    </div>


    <label>Comment:</label><br>
    <textarea id="comment" rows="2" cols="20"></textarea><br><br>

    <button onclick="submitEdit(${id})">Submit</button>
  `;

  layer.bindPopup(formHTML).openPopup();
}

// Toggle fields dynamically
function toggleInputs(value) {
  document.getElementById("newCropDiv").style.display = value === "Change" ? "block" : "none";
  document.getElementById("abandonReasonDiv").style.display = value === "Abandoned" ? "block" : "none";
}

// Submit update
function submitEdit(id) {
  const status = document.getElementById("status").value;
  const comment = document.getElementById("comment").value;

  let newCrop = null;
  if (status === "Change") {
    const selected = document.getElementById("newCrop").value;
    if (selected === "Other") {
      newCrop = document.getElementById("customCrop").value;
      if (!newCrop) {
        alert("Please enter the custom crop type.");
        return;
      }
    } else {
      newCrop = selected;
    }
  }

  const abandonReason = status === "Abandoned" ? document.getElementById("abandonReason").value : null;
  if (status === "Abandoned" && !abandonReason) {
    alert("Please select a reason for abandonment.");
    return;
  }

  if (!status) {
    alert("Please select a land status.");
    return;
  }

  const update = {
    id: id,
    status: status,
    newCrop: newCrop,
    abandonReason: abandonReason,
    comment: comment,
    updated: new Date().toLocaleDateString()
  };

  localStorage.setItem(`land_${id}`, JSON.stringify(update));
  alert("Update saved!");

  // Refresh map and zoom to this feature
  refreshMapAndZoomTo(id);
}

function refreshMapAndZoomTo(targetID) {
  if (geoLayer) {
    map.removeLayer(geoLayer); // remove current layer
  }

  fetch('data/Landuse_geoJson.geojson_4326.geojson') // 🔁 Use your actual path
    .then(res => res.json())
    .then(data => {
      geoLayer = L.geoJSON(data, {
        style: function(feature) {
          const update = getUpdate(feature.properties.ID);
          let type = feature.properties.DESCRIPTIO;

          if (update) {
            type = update.status === "Change" ? update.newCrop :
                   update.status === "Abandoned" ? "Abandoned" :
                   update.status === "Built-up" ? "Built-up" : type;
            feature.properties.updated = update.updated;
          }

          return {
            fillColor: getColor(type),
            color: 'white',
            weight: 1,
            fillOpacity: 0.6
          };
        },
        onEachFeature: function(feature, layer) {
          layer.on('click', function () {
            openFormPopup(layer, feature);
          });

          // Zoom to the updated feature
          if (feature.properties.ID === targetID) {
            const bounds = layer.getBounds();
map.flyToBounds(bounds, {
  duration: 1.5,
  easeLinearity: 0.25,
  maxZoom: 15
});
setTimeout(() => {
  layer.openPopup();
}, 1600); // Wait until animation ends
          }
        }
      }).addTo(map);
    });
}


// Add Legend
const legend = L.control({ position: 'bottomright' });

legend.onAdd = function () {
  const div = L.DomUtil.create('div', 'legend');
  div.innerHTML += '<h4>Land Use Legend</h4>';
  div.innerHTML += '<i style="background: green"></i> Paddy<br>';
  div.innerHTML += '<i style="background: yellow"></i> Rubber<br>';
  div.innerHTML += '<i style="background: orange"></i> Chena<br>';
  div.innerHTML += '<i style="background: brown"></i> Tea<br>';
  div.innerHTML += '<i style="background: blue"></i> Coconut<br>';
  div.innerHTML += '<i style="background: gray"></i> Other Plantation<br>';
  div.innerHTML += '<i style="background: red"></i> Abandoned<br>';
  div.innerHTML += '<i style="background: black"></i> Built-up<br>';
  return div;
};

legend.addTo(map);


