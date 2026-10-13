import os
import json
import geopandas as gpd
from sqlalchemy import create_engine

DB_URL = "postgresql://postgres:postgrespassword@localhost:5432/peltoseuranta"
engine = create_engine(DB_URL)

gpkg_path = "peltolohkot.gpkg"

if not os.path.exists(gpkg_path):
    print(f"Tiedostoa {gpkg_path} ei löytynyt backend-kansiosta!")
    exit(1)

print(f"Luetaan aitoa aineistoa tiedostosta '{gpkg_path}'...")
gdf = gpd.read_file(gpkg_path)

if gdf.crs != "EPSG:4326":
    gdf = gdf.to_crs("EPSG:4326")

# Rajataan Raahen alueelle
minx, miny, maxx, maxy = 24.0, 64.3, 25.2, 65.0
gdf = gdf.cx[minx:maxx, miny:maxy]

print(f"Raahen alueelta löytyi {len(gdf)} kohdetta.")

lohko_id_col = 'TUNNUS' if 'TUNNUS' in gdf.columns else gdf.index.astype(str)
pinta_ala_col = gdf['PINTA_ALA'] if 'PINTA_ALA' in gdf.columns else 0.0

df_to_db = gpd.GeoDataFrame({
    'lohko_id': gdf[lohko_id_col] if isinstance(lohko_id_col, str) else lohko_id_col,
    'kasvilaji': 'Ei määritelty',
    'pinta_ala': pinta_ala_col.round(2),
    'geometry': gdf['geometry']
}, crs="EPSG:4326")

# 1. Tallennetaan tietokantaan (paikallista kehitystä varten)
print("Tallennetaan tietokantaan...")
df_to_db.to_postgis('peltolohkot', engine, if_exists='replace', index=False)

# 2. Viedään suoraan frontendin public-kansioon staattiseksi GeoJSON-tiedostoksi
output_json_path = "../frontend/public/fields.json"
os.makedirs(os.path.dirname(output_json_path), exist_ok=True)
print(f"Tallennetaan staattinen GeoJSON tiedostoon '{output_json_path}'...")
df_to_db.to_file(output_json_path, driver="GeoJSON")

print("Valmista! Peltotiedot päivitetty kantaan ja frontendin käyttöön.")