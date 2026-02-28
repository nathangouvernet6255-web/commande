import { useState, useEffect, useCallback, useRef } from "react";
import "@/App.css";
import axios from "axios";
import { Search, Plus, Package, Phone, Clock, CheckCircle2, Truck, LogOut, X, Loader2, Undo2, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Toaster, toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Status configurations
const STATUS_CONFIG = {
  pending: {
    label: "En attente",
    icon: Clock,
    bgClass: "bg-amber-50",
    textClass: "text-amber-700",
    borderClass: "border-amber-200",
    dotClass: "bg-amber-500"
  },
  ready: {
    label: "Prête",
    icon: CheckCircle2,
    bgClass: "bg-emerald-50",
    textClass: "text-emerald-700",
    borderClass: "border-emerald-200",
    dotClass: "bg-emerald-500"
  },
  delivered: {
    label: "Livrée",
    icon: Truck,
    bgClass: "bg-slate-100",
    textClass: "text-slate-600",
    borderClass: "border-slate-200",
    dotClass: "bg-slate-400"
  }
};

// Login Page Component
const LoginPage = ({ onLogin }) => {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      const response = await axios.post(`${API}/auth/login`, { password });
      localStorage.setItem("token", response.data.token);
      onLogin(response.data.token);
      toast.success("Connexion réussie !");
    } catch (err) {
      setError("Mot de passe incorrect");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container" data-testid="login-page">
      <div className="login-card animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Mes Commandes</h1>
          <p className="text-slate-500 mt-2">Produits Artisanaux</p>
        </div>
        
        <form onSubmit={handleLogin}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="password" className="text-slate-700 font-medium">
                Mot de passe
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Entrez votre mot de passe"
                className="mt-2 h-12 rounded-xl border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                data-testid="login-password-input"
                autoFocus
              />
            </div>
            
            {error && (
              <p className="text-red-500 text-sm" data-testid="login-error">{error}</p>
            )}
            
            <Button
              type="submit"
              className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-all active:scale-95"
              disabled={loading}
              data-testid="login-submit-btn"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Se connecter"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Order Card Component
const OrderCard = ({ order, onStatusChange, onUndo, onDelete, countdown }) => {
  const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const StatusIcon = status.icon;
  
  const getNextStatus = (currentStatus) => {
    if (currentStatus === "pending") return "ready";
    if (currentStatus === "ready") return "delivered";
    return null;
  };
  
  const getPreviousStatus = (currentStatus) => {
    if (currentStatus === "ready") return "pending";
    if (currentStatus === "delivered") return "ready";
    return null;
  };
  
  const nextStatus = getNextStatus(order.status);
  const previousStatus = getPreviousStatus(order.status);
  const nextStatusConfig = nextStatus ? STATUS_CONFIG[nextStatus] : null;

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isDelivered = order.status === "delivered";
  const progressPercent = countdown ? (countdown / 60) * 100 : 0;

  return (
    <div className={`order-card relative ${isDelivered ? 'delivered-card' : ''}`} data-testid={`order-card-${order.id}`}>
      {/* Countdown progress bar for delivered orders */}
      {isDelivered && countdown !== undefined && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-slate-200 rounded-t-xl overflow-hidden">
          <div 
            className="h-full bg-red-500 transition-all duration-1000 ease-linear"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}
      
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg text-slate-900 truncate" data-testid={`order-name-${order.id}`}>
            {order.client_name}
          </h3>
          <div className="flex items-center gap-2 mt-1 text-slate-500">
            <Phone className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm" data-testid={`order-phone-${order.id}`}>{order.phone}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Countdown timer display */}
          {isDelivered && countdown !== undefined && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold bg-red-100 text-red-600 border border-red-200" data-testid={`order-countdown-${order.id}`}>
              <Timer className="w-4 h-4" />
              {countdown}s
            </div>
          )}
          
          <div className={`status-badge inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border ${status.bgClass} ${status.textClass} ${status.borderClass}`} data-testid={`order-status-${order.id}`}>
            <span className={`w-2 h-2 rounded-full ${status.dotClass}`}></span>
            {status.label}
          </div>
        </div>
      </div>
      
      <div className="mt-3 p-3 bg-slate-50 rounded-lg">
        <p className="text-sm text-slate-600" data-testid={`order-details-${order.id}`}>{order.details}</p>
      </div>
      
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
        <div>
          <span className="text-2xl font-bold text-indigo-600" data-testid={`order-price-${order.id}`}>
            {order.price.toFixed(2)} €
          </span>
          <p className="text-xs text-slate-400 mt-0.5">{formatDate(order.created_at)}</p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Undo button - show for ready and delivered orders */}
          {previousStatus && (
            <Button
              onClick={() => onUndo(order.id, previousStatus)}
              variant="outline"
              className="h-10 px-3 rounded-xl font-medium transition-all active:scale-95 border-slate-300 text-slate-600 hover:bg-slate-100"
              data-testid={`order-undo-btn-${order.id}`}
            >
              <Undo2 className="w-4 h-4 mr-1" />
              Annuler
            </Button>
          )}
          
          {/* Next status button */}
          {nextStatus && (
            <Button
              onClick={() => onStatusChange(order.id, nextStatus)}
              className={`h-10 px-4 rounded-xl font-medium transition-all active:scale-95 ${
                nextStatus === "ready" 
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white" 
                  : "bg-slate-600 hover:bg-slate-700 text-white"
              }`}
              data-testid={`order-status-btn-${order.id}`}
            >
              <StatusIcon className="w-4 h-4 mr-2" />
              {nextStatusConfig.label}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

// New Order Modal Component
const NewOrderModal = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    client_name: "",
    phone: "",
    details: "",
    price: ""
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    await onSubmit({
      ...formData,
      price: parseFloat(formData.price) || 0
    });
    
    setFormData({ client_name: "", phone: "", details: "", price: "" });
    setLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md rounded-2xl" data-testid="new-order-modal">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900">
            Nouvelle Commande
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <Label htmlFor="client_name" className="text-slate-700 font-medium">
              Nom du client
            </Label>
            <Input
              id="client_name"
              value={formData.client_name}
              onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
              placeholder="Jean Dupont"
              className="mt-1.5 h-12 rounded-xl"
              required
              data-testid="new-order-name-input"
            />
          </div>
          
          <div>
            <Label htmlFor="phone" className="text-slate-700 font-medium">
              Téléphone
            </Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="06 12 34 56 78"
              className="mt-1.5 h-12 rounded-xl"
              required
              data-testid="new-order-phone-input"
            />
          </div>
          
          <div>
            <Label htmlFor="details" className="text-slate-700 font-medium">
              Détails de la commande
            </Label>
            <textarea
              id="details"
              value={formData.details}
              onChange={(e) => setFormData({ ...formData, details: e.target.value })}
              placeholder="2x Bol en céramique bleu, 1x Vase artisanal..."
              className="mt-1.5 w-full min-h-[100px] px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 resize-none transition-all"
              required
              data-testid="new-order-details-input"
            />
          </div>
          
          <div>
            <Label htmlFor="price" className="text-slate-700 font-medium">
              Prix (€)
            </Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              min="0"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="45.00"
              className="mt-1.5 h-12 rounded-xl"
              required
              data-testid="new-order-price-input"
            />
          </div>
          
          <DialogFooter className="gap-2 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-11 px-6 rounded-xl"
              data-testid="new-order-cancel-btn"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              className="h-11 px-6 bg-indigo-600 hover:bg-indigo-700 rounded-xl"
              disabled={loading}
              data-testid="new-order-submit-btn"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Créer la commande"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Dashboard Component
const Dashboard = ({ token, onLogout }) => {
  const [orders, setOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [countdowns, setCountdowns] = useState({});
  const countdownRefs = useRef({});

  const authHeaders = { Authorization: `Bearer ${token}` };

  const fetchOrders = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/orders`, { headers: authHeaders });
      setOrders(response.data);
    } catch (err) {
      if (err.response?.status === 401) {
        onLogout();
      }
      toast.error("Erreur lors du chargement des commandes");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    return () => {
      Object.values(countdownRefs.current).forEach(clearInterval);
    };
  }, []);

  const startCountdown = (orderId) => {
    if (countdownRefs.current[orderId]) {
      clearInterval(countdownRefs.current[orderId]);
    }

    setCountdowns(prev => ({ ...prev, [orderId]: 60 }));

    countdownRefs.current[orderId] = setInterval(() => {
      setCountdowns(prev => {
        const newValue = (prev[orderId] || 60) - 1;
        
        if (newValue <= 0) {
          clearInterval(countdownRefs.current[orderId]);
          delete countdownRefs.current[orderId];
          handleDeleteOrder(orderId);
          const { [orderId]: removed, ...rest } = prev;
          return rest;
        }
        
        return { ...prev, [orderId]: newValue };
      });
    }, 1000);
  };

  const stopCountdown = (orderId) => {
    if (countdownRefs.current[orderId]) {
      clearInterval(countdownRefs.current[orderId]);
      delete countdownRefs.current[orderId];
    }
    setCountdowns(prev => {
      const { [orderId]: removed, ...rest } = prev;
      return rest;
    });
  };

  const handleDeleteOrder = async (orderId) => {
    try {
      await axios.delete(`${API}/orders/${orderId}`, { headers: authHeaders });
      toast.success("Commande archivée automatiquement");
      fetchOrders();
    } catch (err) {
      console.error("Error deleting order:", err);
    }
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }
    
    try {
      const response = await axios.get(`${API}/orders/search?q=${encodeURIComponent(query)}`, {
        headers: authHeaders
      });
      setSearchResults(response.data);
    } catch (err) {
      toast.error("Erreur lors de la recherche");
    }
  };

  const handleCreateOrder = async (orderData) => {
    try {
      await axios.post(`${API}/orders`, orderData, { headers: authHeaders });
      toast.success("Commande créée avec succès !");
      setIsModalOpen(false);
      fetchOrders();
    } catch (err) {
      toast.error("Erreur lors de la création de la commande");
    }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await axios.put(`${API}/orders/${orderId}/status`, { status: newStatus }, { headers: authHeaders });
      toast.success(`Statut mis à jour: ${STATUS_CONFIG[newStatus].label}`);
      
      if (newStatus === "delivered") {
        startCountdown(orderId);
      }
      
      fetchOrders();
      
      if (searchResults) {
        handleSearch(searchQuery);
      }
    } catch (err) {
      toast.error("Erreur lors de la mise à jour du statut");
    }
  };

  const handleUndo = async (orderId, previousStatus) => {
    try {
      stopCountdown(orderId);
      
      await axios.put(`${API}/orders/${orderId}/status`, { status: previousStatus }, { headers: authHeaders });
      toast.info(`Retour au statut: ${STATUS_CONFIG[previousStatus].label}`);
      fetchOrders();
      
      if (searchResults) {
        handleSearch(searchQuery);
      }
    } catch (err) {
      toast.error("Erreur lors de l'annulation");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    onLogout();
    toast.info("Déconnexion réussie");
  };

  const displayedOrders = searchResults !== null ? searchResults : orders;
  
  const filteredOrders = activeFilter === "all" 
    ? displayedOrders 
    : displayedOrders.filter(o => o.status === activeFilter);

  const orderCounts = {
    all: orders.length,
    pending: orders.filter(o => o.status === "pending").length,
    ready: orders.filter(o => o.status === "ready").length,
    delivered: orders.filter(o => o.status === "delivered").length
  };

  return (
    <div className="app-container" data-testid="dashboard">
      <header className="dashboard-header">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                <Package className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h1 className="font-bold text-lg text-slate-900">Mes Commandes</h1>
                <p className="text-xs text-slate-500">Produits Artisanaux</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl"
              data-testid="logout-btn"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
          
          <div className="search-container">
            <Search className="search-icon w-5 h-5" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Rechercher un client..."
              className="search-input pl-12 h-12 rounded-xl border-slate-200 bg-white shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
              data-testid="search-input"
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(""); setSearchResults(null); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                data-testid="clear-search-btn"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            { key: "all", label: "Toutes" },
            { key: "pending", label: "En attente" },
            { key: "ready", label: "Prêtes" },
            { key: "delivered", label: "Livrées" }
          ].map((filter) => (
            <button
              key={filter.key}
              onClick={() => setActiveFilter(filter.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                activeFilter === filter.key
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
              data-testid={`filter-${filter.key}`}
            >
              {filter.label}
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                activeFilter === filter.key ? "bg-indigo-500" : "bg-slate-100"
              }`}>
                {orderCounts[filter.key]}
              </span>
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 pb-24">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12" data-testid="empty-state">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="font-semibold text-slate-900">
              {searchQuery ? "Aucun résultat" : "Aucune commande"}
            </h3>
            <p className="text-slate-500 mt-1">
              {searchQuery 
                ? `Aucune commande trouvée pour "${searchQuery}"` 
                : "Créez votre première commande"}
            </p>
          </div>
        ) : (
          <div className="space-y-3" data-testid="orders-list">
            {filteredOrders.map((order, index) => (
              <div key={order.id} className="animate-slide-in" style={{ animationDelay: `${index * 50}ms` }}>
                <OrderCard 
                  order={order} 
                  onStatusChange={handleStatusChange}
                  onUndo={handleUndo}
                  onDelete={handleDeleteOrder}
                  countdown={countdowns[order.id]}
                />
              </div>
            ))}
          </div>
        )}
      </main>

      <button
        onClick={() => setIsModalOpen(true)}
        className="fab"
        data-testid="add-order-fab"
      >
        <Plus className="w-6 h-6" />
      </button>

      <NewOrderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateOrder}
      />
    </div>
  );
};

function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    const verifyToken = async () => {
      const storedToken = localStorage.getItem("token");
      if (!storedToken) {
        setIsVerifying(false);
        return;
      }

      try {
        await axios.get(`${API}/auth/verify`, {
          headers: { Authorization: `Bearer ${storedToken}` }
        });
        setToken(storedToken);
      } catch (err) {
        localStorage.removeItem("token");
        setToken(null);
      } finally {
        setIsVerifying(false);
      }
    };

    verifyToken();
  }, []);

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-center" richColors />
      {token ? (
        <Dashboard token={token} onLogout={() => setToken(null)} />
      ) : (
        <LoginPage onLogin={setToken} />
      )}
    </>
  );
}

export default App;
