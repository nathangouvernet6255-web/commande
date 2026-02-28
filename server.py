from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import jwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Secret
JWT_SECRET = os.environ.get('JWT_SECRET', 'artisan-orders-secret-key-2024')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'admin123')

# Security
security = HTTPBearer()

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Models
class OrderStatus:
    PENDING = "pending"
    READY = "ready"
    DELIVERED = "delivered"

class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    phone: str
    details: str
    price: float
    status: str = OrderStatus.PENDING
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class OrderCreate(BaseModel):
    client_name: str
    phone: str
    details: str
    price: float

class OrderStatusUpdate(BaseModel):
    status: str

class LoginRequest(BaseModel):
    password: str

class LoginResponse(BaseModel):
    token: str
    message: str

# Auth helpers
def create_token():
    payload = {
        "sub": "admin",
        "exp": datetime.now(timezone.utc).timestamp() + 86400 * 7  # 7 days
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expiré")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token invalide")

# Routes
@api_router.get("/")
async def root():
    return {"message": "API Gestion de Commandes Artisanales"}

@api_router.post("/auth/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    if request.password == ADMIN_PASSWORD:
        token = create_token()
        return LoginResponse(token=token, message="Connexion réussie")
    raise HTTPException(status_code=401, detail="Mot de passe incorrect")

@api_router.get("/auth/verify")
async def verify_auth(payload: dict = Depends(verify_token)):
    return {"valid": True, "user": payload.get("sub")}

@api_router.post("/orders", response_model=Order)
async def create_order(order_data: OrderCreate, payload: dict = Depends(verify_token)):
    order = Order(**order_data.model_dump())
    doc = order.model_dump()
    await db.orders.insert_one(doc)
    return order

@api_router.get("/orders", response_model=List[Order])
async def get_orders(payload: dict = Depends(verify_token)):
    orders = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return orders

@api_router.get("/orders/search", response_model=List[Order])
async def search_orders(q: str, payload: dict = Depends(verify_token)):
    if not q:
        return []
    orders = await db.orders.find(
        {"client_name": {"$regex": q, "$options": "i"}},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return orders

@api_router.get("/orders/{order_id}", response_model=Order)
async def get_order(order_id: str, payload: dict = Depends(verify_token)):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Commande non trouvée")
    return order

@api_router.put("/orders/{order_id}/status", response_model=Order)
async def update_order_status(order_id: str, status_update: OrderStatusUpdate, payload: dict = Depends(verify_token)):
    valid_statuses = [OrderStatus.PENDING, OrderStatus.READY, OrderStatus.DELIVERED]
    if status_update.status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Statut invalide")
    
    result = await db.orders.find_one_and_update(
        {"id": order_id},
        {"$set": {"status": status_update.status}},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Commande non trouvée")
    
    result.pop("_id", None)
    return result

@api_router.delete("/orders/{order_id}")
async def delete_order(order_id: str, payload: dict = Depends(verify_token)):
    result = await db.orders.delete_one({"id": order_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Commande non trouvée")
    return {"message": "Commande supprimée"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
