import os
import random
import geopandas as gpd

# Etsitään gpkg-tiedosto mistä tahansa mahdollisesta sijainnista
gpkg_paths = ["peltolohkot.gpkg", "backend/peltolohkot.gpkg", "../backend/peltolohkot.gpkg"]
gpkg_path = None
for path in gpkg_paths:
    if os.path.exists(path):
        gpkg_path = path
        break

if not gpkg_path:
    print(f"Virhe: Peltolohkotiedostoa ei löytynyt mistään! Etsityt polut: {gpkg_paths}")
    exit(1)

print(f"Luetaan aineisto tiedostosta: {gpkg_path}")
gdf = gpd.read_file(gpkg_path)

if gdf.crs != "EPSG:4326":
    gdf = gdf.to_crs("EPSG:4326")

# Rajataan Raahen alueelle
minx, miny, maxx, maxy = 24.0, 64.3, 25.2, 65.0
gdf = gdf.cx[minx:maxx, miny:maxy]

print(f"Raahen alueelta löytyi {len(gdf)} kohdetta.")

lohko_id_col = gdf['TUNNUS'] if 'TUNNUS' in gdf.columns else gdf.index.astype(str)
pinta_ala_col = gdf['PINTA_ALA'] if 'PINTA_ALA' in gdf.columns else 0.0

# Raahen seudulla yleisiä kasvilajeja
kasvit = [
    "Kevätvehnä", 
    "Rehuohra", 
    "Kaurapelto", 
    "Monivuotinen nurmi", 
    "Öljykasvi (rypsi/rapsi)",
    "Herne"
]
painotukset = [0.25, 0.30, 0.20, 0.15, 0.05, 0.05]

random.seed(42)
kasvilajit = random.choices(kasvit, weights=painotukset, k=len(gdf))

df_to_db = gpd.GeoDataFrame({
    'lohko_id': lohko_id_col,
    'kasvilaji': kasvilajit,
    'pinta_ala': pinta_ala_col.round(2),
    'geometry': gdf['geometry']
}, crs="EPSG:4326")

# Määritellään output-polku oikeaan paikkaan juuresta katsottuna
output_json_path = "frontend/public/fields.json"
if not os.path.exists("frontend"):
    output_json_path = "../frontend/public/fields.json"

os.makedirs(os.path.dirname(output_json_path), exist_ok=True)
print(f"Tallennetaan staattinen GeoJSON kasvilajeilla tiedostoon '{output_json_path}'...")
df_to_db.to_file(output_json_path, driver="GeoJSON")
print("Valmista!")
