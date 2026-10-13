from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import geopandas as gpd
from sqlalchemy import create_engine
import json

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_URL = "postgresql://postgres:postgrespassword@localhost:5432/peltoseuranta"
engine = create_engine(DB_URL)

@app.get("/api/fields")
def get_fields():
    try:
        query = "SELECT lohko_id, kasvilaji, pinta_ala, geometry FROM peltolohkot"
        gdf = gpd.read_postgis(query, engine, geom_col="geometry")

        if gdf.empty:
            return {"type": "FeatureCollection", "features": []}

        if gdf.crs != "EPSG:4326":
            gdf = gdf.to_crs("EPSG:4326")

        return json.loads(gdf.to_json())
    except Exception as e:
        print(f"Virhe tietokannan luvussa: {e}")
        return {"type": "FeatureCollection", "features": []}