import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Home,
  Users,
  Calendar,
  TrendingUp,
  Star,
  Clock,
  MessageCircle,
  Settings,
  Bell,
  Search,
  Filter,
  Plus,
  Wifi,
  Car,
  Utensils,
  Dumbbell,
  Coffee,
  Shield,
  Calculator,
  FileText,
  Zap,
  ArrowRight,
  Eye,
  Edit,
  Trash2,
  Heart,
  Share2,
  User,
  ChevronRight,
  DollarSign,
  MapPin,
  Building,
  CheckCircle,
  AlertCircle,
  XCircle,
  BarChart3,
  LogOut,
  CreditCard,
  Receipt,
  Key,
  Bed,
  Bath,
  Square
} from "lucide-react";

const RoomOwnerDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Check authentication
  useEffect(() => {
    const checkAuth = () => {
      const authToken = localStorage.getItem('authToken');
      const userData = localStorage.getItem('user');

      if (!authToken || !userData) {
        navigate('/login');
        return;
      }

      try {
        const user = JSON.parse(userData);
        // Check if user is a room owner (role 3 or specific role for room owners)
        if (user.role !== 3) {
          navigate('/login');
          return;
        }
        setUser(user);
      } catch (error) {
        console.error('Error parsing user data:', error);
        navigate('/login');
        return;
      }

      setLoading(false);
    };

    checkAuth();
  }, [navigate]);

  // Mock data for room owner dashboard
  // Mock stats for now, can be replaced with real analytics endpoint later
  const stats = {
    totalProperties: properties.length,
    activeListings: properties.filter(p => p.status === 'active').length,
    totalTenants: properties.reduce((acc, curr) => acc + (curr.rooms?.reduce((rAcc, r) => rAcc + (r.current_occupants || 0), 0) || 0), 0),
    monthlyRevenue: 85000, // Placeholder
    averageRating: 4.7, // Placeholder
    occupancyRate: 92 // Placeholder
  };

  const [properties, setProperties] = useState([]);

  // Fetch properties
  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const authToken = localStorage.getItem('authToken');
        const response = await fetch('http://localhost:5000/api/property/owner/properties', {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        });
        const data = await response.json();
        if (data.success) {
          setProperties(data.data);
        }
      } catch (error) {
        console.error('Error fetching properties:', error);
      }
    };

    if (user) {
      fetchProperties();
    }
  }, [user]);

  const recentTransactions = [
    {
      id: 1,
      property: "Modern 2BHK Apartment",
      tenant: "Sarah Johnson",
      amount: "₹25,000",
      type: "Rent",
      status: "Completed",
      date: "2024-04-01"
    },
    {
      id: 2,
      property: "Premium 3BHK Villa",
      tenant: "Mike Chen",
      amount: "₹45,000",
      type: "Rent",
      status: "Pending",
      date: "2024-04-05"
    },
    {
      id: 3,
      property: "Cozy Studio Room",
      tenant: "Alex Kumar",
      amount: "₹15,000",
      type: "Deposit",
      status: "Completed",
      date: "2024-03-28"
    }
  ];

  const maintenanceRequests = [
    {
      id: 1,
      property: "Modern 2BHK Apartment",
      tenant: "Sarah Johnson",
      issue: "AC not working",
      priority: "High",
      status: "In Progress",
      date: "2024-04-02"
    },
    {
      id: 2,
      property: "Premium 3BHK Villa",
      tenant: "Mike Chen",
      issue: "Water leakage",
      priority: "Medium",
      status: "Completed",
      date: "2024-03-30"
    }
  ];

  // Chart data
  const revenueData = [
    { month: 'Jan', revenue: 75000 },
    { month: 'Feb', revenue: 82000 },
    { month: 'Mar', revenue: 78000 },
    { month: 'Apr', revenue: 85000 },
    { month: 'May', revenue: 90000 },
    { month: 'Jun', revenue: 95000 }
  ];

  const occupancyData = [
    { name: 'Occupied', value: 92, color: '#10b981' },
    { name: 'Vacant', value: 8, color: '#ef4444' }
  ];

  const propertyTypes = [
    { name: 'Apartments', value: 2, color: '#3b82f6' },
    { name: 'Studios', value: 1, color: '#f59e0b' },
    { name: 'Villas', value: 1, color: '#10b981' }
  ];

  const sidebarLinks = [
    { name: 'Overview', icon: BarChart3, tab: 'overview' },
    { name: 'Properties', icon: Home, tab: 'properties' },
    { name: 'Tenants', icon: Users, tab: 'tenants' },
    { name: 'Payments', icon: CreditCard, tab: 'payments' },
    { name: 'Maintenance', icon: Shield, tab: 'maintenance' },
    { name: 'Analytics', icon: TrendingUp, tab: 'analytics' },
    { name: 'Settings', icon: Settings, tab: 'settings' },
    { name: 'Logout', icon: LogOut, tab: 'logout' }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'Occupied': return 'text-green-600 bg-green-100';
      case 'Available': return 'text-blue-600 bg-blue-100';
      case 'Maintenance': return 'text-orange-600 bg-orange-100';
      case 'Rented': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High': return 'text-red-600 bg-red-100';
      case 'Medium': return 'text-yellow-600 bg-yellow-100';
      case 'Low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-stone-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-50 to-stone-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col py-8 px-4 shadow-lg">
        <div className="flex items-center mb-10">
          <div className="w-10 h-10 bg-gradient-to-br from-red-500 via-orange-400 to-red-700 rounded-xl flex items-center justify-center shadow-lg mr-3">
            <span className="text-white font-bold text-xl">L</span>
          </div>
          <span className="text-xl font-bold text-gray-900"><span className="text-red-600">Lyvo</span><span className="text-black">+</span> Owner</span>
        </div>

        <nav className="flex-1">
          <ul className="space-y-2">
            {sidebarLinks.map((link) => (
              <li key={link.name}>
                <button
                  onClick={() => setActiveTab(link.tab)}
                  className={`w-full flex items-center px-3 py-2 rounded-lg text-gray-700 hover:bg-red-50 hover:text-red-600 transition-all ${activeTab === link.tab ? 'bg-red-50 text-red-600' : ''
                    }`}
                >
                  <link.icon className="w-5 h-5 mr-3" />
                  <span className="font-medium">{link.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-10 text-xs text-gray-400 text-center">&copy; {new Date().getFullYear()} <span className="text-red-600">Lyvo</span><span className="text-black">+</span></div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Topbar */}
        <header className="flex items-center justify-between px-8 py-6 bg-white border-b border-gray-200 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Room Owner Dashboard</h1>
            <p className="text-gray-500 text-sm">Welcome back, {user?.name || 'Owner'}! Manage your properties here.</p>
          </div>
          <div className="flex items-center space-x-4">
            <button className="relative p-2 text-gray-600 hover:text-gray-900">
              <Bell className="w-6 h-6" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
            </button>
            <span className="text-gray-700 font-medium">{user?.name || 'Owner'}</span>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 via-orange-400 to-red-700 flex items-center justify-center text-white font-bold text-lg shadow">
              {user?.name?.charAt(0) || 'O'}
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="flex-1 p-8">
          {activeTab === 'overview' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm">Total Properties</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.totalProperties}</p>
                    </div>
                    <Building className="w-8 h-8 text-red-500" />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm">Active Listings</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.activeListings}</p>
                    </div>
                    <Home className="w-8 h-8 text-blue-500" />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm">Total Tenants</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.totalTenants}</p>
                    </div>
                    <Users className="w-8 h-8 text-green-500" />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm">Monthly Revenue</p>
                      <p className="text-2xl font-bold text-gray-900">₹{stats.monthlyRevenue.toLocaleString()}</p>
                    </div>
                    <DollarSign className="w-8 h-8 text-purple-500" />
                  </div>
                </div>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Chart */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Revenue Trend</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="revenue" stroke="#ef4444" strokeWidth={3} dot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Occupancy Chart */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Occupancy Rate</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={occupancyData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {occupancyData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="text-center mt-4">
                    <p className="text-2xl font-bold text-gray-900">{stats.occupancyRate}%</p>
                    <p className="text-gray-500 text-sm">Occupancy Rate</p>
                  </div>
                </div>
              </div>

              {/* Recent Properties */}
              <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800">Recent Properties</h3>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {properties.slice(0, 3).map((property) => (
                      <motion.div
                        key={property._id}
                        whileHover={{ y: -5 }}
                        className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                        onClick={() => navigate(`/owner/properties/${property._id}`)}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-gray-900">{property.property_name}</h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(property.status)}`}>
                            {property.status}
                          </span>
                        </div>
                        <div className="space-y-2 text-sm text-gray-600">
                          <div className="flex items-center">
                            <MapPin className="w-4 h-4 mr-2" />
                            {property.address?.city || 'Unknown Location'}
                          </div>
                          <div className="flex items-center">
                            <DollarSign className="w-4 h-4 mr-2" />
                            {/* Display rent range or first room's rent */}
                            {property.rooms?.[0]?.rent ? `₹${property.rooms[0].rent}/month` : 'Contact for Price'}
                          </div>
                          <div className="flex items-center">
                            <Users className="w-4 h-4 mr-2" />
                            {/* Calculate total tenants if available, or just mock for now if backend doesn't send it yet */}
                            {property.rooms?.reduce((acc, r) => acc + (r.current_occupants || 0), 0)} tenants
                          </div>
                          <div className="flex items-center">
                            <Star className="w-4 h-4 mr-2 text-yellow-500" />
                            {property.average_rating || 'New'} rating
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'properties' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">My Properties</h2>
                <button
                  onClick={() => navigate('/owner/properties/add')}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Add Property
                </button>
              </div>

              {properties.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-8 text-center">
                  <Home className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">No properties found</h3>
                  <p className="text-gray-500 mt-2 mb-6">You haven't added any properties yet.</p>
                  <button
                    onClick={() => navigate('/owner/properties/add')}
                    className="text-red-500 font-medium hover:text-red-700"
                  >
                    Add your first property
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {properties.map((property) => (
                    <motion.div
                      key={property._id}
                      whileHover={{ y: -5 }}
                      className="bg-white rounded-lg shadow-lg overflow-hidden cursor-pointer"
                      onClick={() => navigate(`/owner/properties/${property._id}`)}
                    >
                      <div className="h-48 bg-gray-200 relative">
                        <img
                          src={property.images?.front || property.images?.gallery?.[0] || 'https://via.placeholder.com/400x300?text=No+Image'}
                          alt={property.property_name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-3 right-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(property.status)}`}>
                            {property.status}
                          </span>
                        </div>
                      </div>

                      <div className="p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{property.property_name}</h3>
                        <div className="space-y-3">
                          <div className="flex items-center text-sm text-gray-600">
                            <MapPin className="w-4 h-4 mr-2" />
                            {property.address?.city || 'Unknown'}, {property.address?.state || ''}
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4 text-sm text-gray-600">
                              <div className="flex items-center">
                                <Bed className="w-4 h-4 mr-1" />
                                {property.rooms?.length || 0} Rooms
                              </div>
                            </div>
                            <div className="text-lg font-bold text-gray-900">
                              {property.rooms?.[0]?.rent ? `₹${property.rooms[0].rent}` : 'N/A'}
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <Star className="w-4 h-4 text-yellow-500 mr-1" />
                              <span className="text-sm text-gray-600">{property.average_rating || 'New'}</span>
                            </div>
                            <div className="flex items-center">
                              <Users className="w-4 h-4 text-gray-400 mr-1" />
                              <span className="text-sm text-gray-600">
                                {property.rooms?.reduce((acc, r) => acc + (r.current_occupants || 0), 0)} tenants
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                            <button className="text-red-500 hover:text-red-700 text-sm font-medium flex items-center">
                              <Edit className="w-4 h-4 mr-1" />
                              Edit
                            </button>
                            <button
                              className="text-gray-500 hover:text-gray-700 text-sm font-medium flex items-center"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/owner/properties/${property._id}`);
                              }}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View Details
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'payments' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <h2 className="text-2xl font-bold text-gray-900">Payment History</h2>

              <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800">Recent Transactions</h3>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {recentTransactions.map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                            <Receipt className="w-5 h-5 text-red-500" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{transaction.property}</p>
                            <p className="text-sm text-gray-600">Tenant: {transaction.tenant}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900">{transaction.amount}</p>
                          <p className="text-sm text-gray-600">{transaction.date}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${transaction.status === 'Completed' ? 'text-green-600 bg-green-100' : 'text-yellow-600 bg-yellow-100'
                            }`}>
                            {transaction.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'maintenance' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <h2 className="text-2xl font-bold text-gray-900">Maintenance Requests</h2>

              <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800">Active Requests</h3>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {maintenanceRequests.map((request) => (
                      <div key={request.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                            <AlertCircle className="w-5 h-5 text-orange-500" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{request.property}</p>
                            <p className="text-sm text-gray-600">Issue: {request.issue}</p>
                            <p className="text-sm text-gray-600">Tenant: {request.tenant}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">{request.date}</p>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(request.priority)}`}>
                            {request.priority}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${request.status === 'Completed' ? 'text-green-600 bg-green-100' :
                            request.status === 'In Progress' ? 'text-blue-600 bg-blue-100' : 'text-gray-600 bg-gray-100'
                            }`}>
                            {request.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'analytics' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <h2 className="text-2xl font-bold text-gray-900">Analytics</h2>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Property Types</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={propertyTypes}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {propertyTypes.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Monthly Revenue</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="revenue" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-600">Settings page coming soon...</p>
              </div>
            </motion.div>
          )}

          {activeTab === 'logout' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="bg-white rounded-lg shadow p-6 text-center">
                <LogOut className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Logout</h3>
                <p className="text-gray-600 mb-4">Are you sure you want to logout?</p>
                <button
                  onClick={() => {
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('user');
                    navigate('/login');
                  }}
                  className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg transition-colors"
                >
                  Logout
                </button>
              </div>
            </motion.div>
          )}

          {activeTab !== 'overview' && activeTab !== 'properties' && activeTab !== 'logout' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <h2 className="text-2xl font-bold text-gray-900">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h2>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-600">This section is coming soon...</p>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoomOwnerDashboard; 