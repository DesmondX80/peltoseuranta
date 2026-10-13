import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export default function App() {
  const [selectedCrop, setSelectedCrop] = useState<string>('Kaikki');
  const [availableCrops, setAvailableCrops] = useState<string[]>([]);
  
  const mapRef = useRef<L.Map | null>(null);
  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);
  const rawDataRef = useRef<any>(null);

  useEffect(() => {
    // Alustetaan kartta vain kerran
    if (!mapRef.current) {
      const map = L.map('map').setView([64.68, 24.47], 11);
      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      // Haetaan data
      const jsonUrl = `${import.meta.env.BASE_URL}fields.json?v=${Date.now()}`;
      fetch(jsonUrl)
        .then(res => res.json())
        .then(data => {
          rawDataRef.current = data;

          // Kerätään uniikit kasvilajit pudotusvalikkoa varten
          const crops = new Set<string>();
          data.features.forEach((f: any) => {
            if (f.properties?.kasvilaji) {
              crops.add(f.properties.kasvilaji);
            }
          });
          setAvailableCrops(Array.from(crops).sort());

          // Piirretään aluksi kaikki
          renderFilteredLayer(data, 'Kaikki');
        })
        .catch(err => console.error('Virhe peltolohkojen haussa:', err));
    }
  }, []);

  // Funktio, joka piirtää tai päivittää kartan kerroksen suodatuksen mukaan
  const renderFilteredLayer = (data: any, cropFilter: string) => {
    const map = mapRef.current;
    if (!map) return;

    // Poistetaan vanha kerros kartalta, jos sellainen on
    if (geoJsonLayerRef.current) {
      map.removeLayer(geoJsonLayerRef.current);
    }

    // Suodatetaan featurit
    const filteredFeatures = data.features.filter((feature: any) => {
      if (cropFilter === 'Kaikki') return true;
      return feature.properties?.kasvilaji === cropFilter;
    });

    const filteredData = {
      ...data,
      features: filteredFeatures
    };

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

    const newGeoLayer = L.geoJSON(filteredData, {
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

    geoJsonLayerRef.current = newGeoLayer;

    // Sovitetaan näkymä suodatettuihin kohteisiin, jos niitä on
    if (filteredFeatures.length > 0) {
      map.fitBounds(newGeoLayer.getBounds(), { padding: [50, 50] });
    }
  };

  // Käsittele valinnan muutos
  const handleCropChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedCrop(val);
    if (rawDataRef.current) {
      renderFilteredLayer(rawDataRef.current, val);
    }
  };

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', margin: 0, padding: 0 }}>
      {/* Suodatuskontrolli kartan päällä oikeassa yläkulmassa */}
      <div style={{
        position: 'absolute',
        top: '15px',
        right: '15px',
        zIndex: 1000,
        backgroundColor: 'white',
        padding: '10px 14px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
        fontFamily: 'sans-serif',
        fontSize: '14px'
      }}>
        <label htmlFor="crop-select" style={{ fontWeight: 'bold', marginRight: '8px', color: '#333' }}>
          Kasvilaji:
        </label>
        <select
          id="crop-select"
          value={selectedCrop}
          onChange={handleCropChange}
          style={{
            padding: '6px 10px',
            borderRadius: '4px',
            border: '1px solid #ccc',
            backgroundColor: '#f9f9f9',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          <option value="Kaikki">Kaikki kasvilajit</option>
          {availableCrops.map(crop => (
            <option key={crop} value={crop}>
              {crop}
            </option>
          ))}
        </select>
      </div>

      {/* Karttaelementti */}
      <div id="map" style={{ width: '100vw', height: '100vh', margin: 0, padding: 0 }} />
    </div>
  );
}
