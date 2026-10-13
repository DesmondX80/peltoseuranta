import os
import random
import geopandas as gpd
from sqlalchemy import create_engine

DB_URL = "postgresql://postgres:postgrespassword@localhost:5432/peltoseuranta"
engine = create_engine(DB_URL)

gpkg_path = "backend/peltolohkot.gpkg"

if not os.path.exists(gpkg_path):
    print(f"Tiedostoa {gpkg_path} ei löytynyt!")
    exit(1)

print("Luetaan aitoa aineistoa tiedostosta...")
gdf = gpd.read_file(gpkg_path)

if gdf.crs != "EPSG:4326":
    gdf = gdf.to_crs("EPSG:4326")

# Rajataan Raahen alueelle
minx, miny, maxx, maxy = 24.0, 64.3, 25.2, 65.0
gdf = gdf.cx[minx:maxx, miny:maxy]

print(f"Raahen alueelta löytyi {len(gdf)} kohdetta.")

lohko_id_col = 'TUNNUS' if 'TUNNUS' in gdf.columns else gdf.index.astype(str)
pinta_ala_col = gdf['PINTA_ALA'] if 'PINTA_ALA' in gdf.columns else 0.0

# Määritellään Raahen seudulla yleisiä kasvilajeja painotuksineen
kasvit = [
    "Kevätvehnä", 
    "Rehuohra", 
    "Kaurapelto", 
    "Monivuotinen nurmi", 
    "Öljykasvi (rypsi/rapsi)",
    "Herne"
]
painotukset = [0.25, 0.30, 0.20, 0.15, 0.05, 0.05]

# Asetetaan satunnaislukugeneraattorille siemen, jotta kasvit pysyvät samoina päivitysten välillä
random.seed(42)
kasvilajit = random.choices(kasvit, weights=painotukset, k=len(gdf))

df_to_db = gpd.GeoDataFrame({
    'lohko_id': gdf[lohko_id_col] if isinstance(lohko_id_col, str) else lohko_id_col,
    'kasvilaji': kasvilajit,
    'pinta_ala': pinta_ala_col.round(2),
    'geometry': gdf['geometry']
}, crs="EPSG:4326")

# Viedään suoraan frontendin public-kansioon staattiseksi GeoJSON-tiedostoksi
output_json_path = "frontend/public/fields.json"
os.makedirs(os.path.dirname(output_json_path), exist_ok=True)
print(f"Tallennetaan staattinen GeoJSON kasvilajeilla tiedostoon '{output_json_path}'...")
df_to_db.to_file(output_json_path, driver="GeoJSON")

print("Valmista! Peltotiedot kasvilajeineen päivitetty.")
