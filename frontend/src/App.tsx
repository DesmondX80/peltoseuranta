import { useEffect } from 'react';
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
      const kasvi = (feature.properties?.kasvilaji || '').toLowerCase();
      let fillColor = '#228B22'; // oletus vihreä
      if (kasvi.includes('ohra')) fillColor = '#e6b800'; // keltainen
      else if (kasvi.includes('vehnä')) fillColor = '#d9822b'; // oranssi
      else if (kasvi.includes('nurmi') || kasvi.includes('heinä')) fillColor = '#55a630'; // vaaleanvihreä
      else if (kasvi.includes('kaura')) fillColor = '#f4a261';
      else if (kasvi.includes('herne')) fillColor = '#2a9d8f';

      return {
        color: '#004d00',
        weight: 2,
        fillColor: fillColor,
        fillOpacity: 0.7
      };
    };

    // Lisätään aikaleima osoitteeseen, jotta selain ei lataa vanhaa versiota välimuistista
    const jsonUrl = `${import.meta.env.BASE_URL}fields.json?v=${Date.now()}`;

    fetch(jsonUrl)
      .then(res => res.json())
      .then(data => {
        const geoLayer = L.geoJSON(data, {
          style: getFeatureStyle,
          onEachFeature: (feature, layer) => {
            if (feature.properties) {
              const props = feature.properties;
              const lohkoId = props.lohko_id || props.TUNNUS || 'Tuntematon';
              const pintaAla = props.pinta_ala ? `${props.pinta_ala} ha` : 'Ei tietoa';
              const kasvilaji = props.kasvilaji || 'Ei määritelty';

              layer.bindPopup(
                `<strong>Lohko ID:</strong> ${lohkoId}<br/>` +
                `<strong>Pinta-ala:</strong> ${pintaAla}<br/>` +
                `<strong>Kasvilaji:</strong> ${kasvilaji}`
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
