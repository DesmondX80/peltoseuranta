import React, { useEffect } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export default function App() {
  useEffect(() => {
    const mapContainer = document.getElementById('map');
    if (!mapContainer || (mapContainer as any)._leaflet_id) return;

    const map = L.map('map').setView([64.68, 24.47], 11);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    const getFeatureStyle = (feature: any) => {
      const kasvi = feature.properties?.kasvilaji?.toLowerCase() || '';
      let fillColor = '#228B22';
      if (kasvi.includes('ohra')) fillColor = '#e6b800';
      else if (kasvi.includes('vehnä')) fillColor = '#d9822b';
      else if (kasvi.includes('nurmi') || kasvi.includes('heinä')) fillColor = '#55a630';

      return {
        color: '#004d00',
        weight: 2,
        fillColor: fillColor,
        fillOpacity: 0.7
      };
    };

    const jsonUrl = `${import.meta.env.BASE_URL}fields.json`;

    fetch(jsonUrl)
        .then(res => res.json())
        .then(data => {
          const geoLayer = L.geoJSON(data, {
            style: getFeatureStyle,
            onEachFeature: (feature, layer) => {
              if (feature.properties) {
                const props = feature.properties;
                layer.bindPopup(
                    `<strong>Lohko ID:</strong> ${props.lohko_id || props.TUNNUS}<br/>` +
                    `<strong>Pinta-ala:</strong> ${props.pinta_ala ? props.pinta_ala + ' ha' : 'Ei tietoa'}<br/>` +
                    `<strong>Kasvilaji:</strong> ${props.kasvilaji || 'Ei määritelty'}`
                );
              }
            }
          }).addTo(map);

          if (data.features && data.features.length > 0) {
            map.fitBounds(geoLayer.getBounds(), { padding: [50, 50] });
          }
        })
        .catch(err => console.error('Virhe peltolohkojen haussa:', err));

  }, []);

  return (
      <div id="map" style={{ width: '100vw', height: '100vh', margin: 0, padding: 0 }} />
  );
}