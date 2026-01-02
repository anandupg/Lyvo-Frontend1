import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Search, Filter, MoreVertical, Edit, Trash2, Eye, MapPin, DollarSign, Users, Star, Calendar, CheckCircle2, XCircle, User, Building, ArrowRight, AlertCircle } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import { motion, AnimatePresence } from 'framer-motion';
import apiClient from '../../utils/apiClient';

const PropertiesPage = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'pending', 'approved'
  const [selectedOwner, setSelectedOwner] = useState('all');
  const [selectedProperties, setSelectedProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [properties, setProperties] = useState([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');


  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        setError('');
        const authToken = localStorage.getItem('authToken');
        const user = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; } })();
        const userId = user._id || user.id || '';

        // Unified backend path: /api/property/admin/properties
        const url = `/property/admin/properties?page=1&limit=200`;
        console.log('Fetching Admin Properties from:', url);
        console.log('Using Auth Token:', authToken ? 'Yes' : 'No');
        console.log('User ID:', userId);

        const resp = await apiClient.get(url, {
          headers: {
            'x-user-id': userId
          }
        });

        console.log('Response Status:', resp.status);
        const data = resp.data;
        console.log('Response Data:', data);

        if (resp.status !== 200 || data.success !== true) {
          throw new Error(data.message || 'Failed to fetch properties');
        }
        const propertiesData = Array.isArray(data.data) ? data.data : [];
        console.log('Set Properties:', propertiesData.length);
        setProperties(propertiesData);
      } catch (e) {
        console.error('Fetch Error:', e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const filteredProperties = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return (properties || []).filter(p => {
      const title = (p.property_name || '').toLowerCase();
      const location = `${p.address?.street || ''} ${p.address?.city || ''} ${p.address?.state || ''}`.toLowerCase();
      const ownerName = (p.owner?.name || '').toLowerCase();

      const matchesSearch = !term || title.includes(term) || location.includes(term) || ownerName.includes(term);

      // Tab filtering
      let matchesTab = true;
      if (activeTab === 'pending') {
        const hasPendingRooms = (p.rooms || []).some(r => (r.approval_status || 'pending') === 'pending');
        matchesTab = (p.approval_status || 'pending') === 'pending' || hasPendingRooms;
      } else if (activeTab === 'approved') {
        matchesTab = (p.approval_status || 'pending') === 'approved';
      }

      // Owner filtering
      const matchesOwner = selectedOwner === 'all' || (p.owner?.name || p.owner_id) === selectedOwner;

      return matchesSearch && matchesTab && matchesOwner;
    });
  }, [properties, searchTerm, activeTab, selectedOwner]);

  const groupedByOwner = useMemo(() => {
    const groups = {};
    filteredProperties.forEach(p => {
      const key = p.owner?.name || p.owner?.email || p.owner_id || 'Unknown Owner';
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    });
    return groups;
  }, [filteredProperties]);

  // Calculate actual statistics
  const stats = useMemo(() => {
    const totalProperties = properties.length;

    // Active listings: properties with approval_status = 'approved' and status = 'active'
    const activeListings = properties.filter(p =>
      (p.approval_status === 'approved' || p.status === 'active') && p.status !== 'inactive'
    ).length;

    // Pending approval: properties with approval_status = 'pending' OR with any pending rooms
    const pendingApproval = properties.filter(p =>
      p.approval_status === 'pending' || (p.rooms || []).some(r => (r.approval_status || 'pending') === 'pending')
    ).length;

    // Total revenue: sum of all room rents from all properties (monthly)
    let totalRevenue = 0;
    properties.forEach(property => {
      if (property.rooms && Array.isArray(property.rooms)) {
        property.rooms.forEach(room => {
          if (room.rent && typeof room.rent === 'number') {
            totalRevenue += room.rent;
          }
        });
      }
    });

    // Format revenue
    const formatRevenue = (amount) => {
      if (amount >= 10000000) { // >= 1 crore
        return `₹${(amount / 10000000).toFixed(1)}Cr`;
      } else if (amount >= 100000) { // >= 1 lakh
        return `₹${(amount / 100000).toFixed(1)}L`;
      } else if (amount >= 1000) { // >= 1 thousand
        return `₹${(amount / 1000).toFixed(1)}K`;
      }
      return `₹${amount}`;
    };

    return {
      totalProperties,
      activeListings,
      pendingApproval,
      totalRevenue: formatRevenue(totalRevenue)
    };
  }, [properties]);

  const getStatusBadge = (status) => {
    const badges = {
      active: { text: 'Active', color: 'bg-green-100 text-green-800' },
      pending: { text: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
      approved: { text: 'Approved', color: 'bg-green-100 text-green-800' },
      rejected: { text: 'Rejected', color: 'bg-red-100 text-red-800' },
      inactive: { text: 'Inactive', color: 'bg-gray-100 text-gray-800' },
      suspended: { text: 'Suspended', color: 'bg-red-100 text-red-800' }
    };
    return badges[status] || badges.inactive;
  };

  const approveRoom = async (roomId, action) => {
    try {
      const authToken = localStorage.getItem('authToken');
      const user = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; } })();
      const userId = user._id || user.id || '';
      const resp = await apiClient.post(`/admin/rooms/${roomId}/approval`, { action }, {
        headers: {
          'x-user-id': userId
        }
      });
      const data = resp.data;
      if (resp.status !== 200 || data.success !== true) {
        throw new Error(data.message || 'Failed to update room');
      }
      setProperties(prev => prev.map(p => ({
        ...p,
        rooms: (p.rooms || []).map(r => r._id === roomId ? { ...r, ...data.data } : r)
      })));

      // Show success modal
      setSuccessMessage(`Room ${action === 'approve' ? 'approved' : 'rejected'} successfully!`);
      setShowSuccessModal(true);

      // Auto-close success modal after 3 seconds
      setTimeout(() => {
        setShowSuccessModal(false);
      }, 3000);
    } catch (e) {
      setError(e.message);
    }
  };

  const handleSelectProperty = (propertyId) => {
    setSelectedProperties(prev =>
      prev.includes(propertyId)
        ? prev.filter(id => id !== propertyId)
        : [...prev, propertyId]
    );
  };

  const handleSelectAll = () => {
    if (selectedProperties.length === filteredProperties.length) {
      setSelectedProperties([]);
    } else {
      setSelectedProperties(filteredProperties.map(property => property.id));
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Property Management</h1>
            <p className="text-gray-600 mt-1">Manage all owner properties, view details, and approve or reject rooms</p>
          </div>
          {error && (
            <div className="p-3 rounded-md bg-red-50 text-red-700 border border-red-200">{error}</div>
          )}

          {loading && (
            <div className="p-3 rounded-md bg-gray-50 text-gray-700 border border-gray-200">Loading properties…</div>
          )}


        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Properties</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalProperties}</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-50">
                <Home className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Listings</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeListings}</p>
              </div>
              <div className="p-3 rounded-lg bg-green-50">
                <Star className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Approval</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pendingApproval}</p>
              </div>
              <div className="p-3 rounded-lg bg-yellow-50">
                <Calendar className="w-6 h-6 text-yellow-500" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Tabs and Filters */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Tabs */}
            <div className="flex bg-gray-100 p-1 rounded-xl w-fit">
              {[
                { id: 'all', label: 'All Properties', count: stats.totalProperties },
                { id: 'pending', label: 'Pending Approval', count: stats.pendingApproval, color: 'text-yellow-600' },
                { id: 'approved', label: 'Approved', count: stats.activeListings, color: 'text-green-600' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${activeTab === tab.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                  <span className={activeTab === tab.id ? tab.color : ''}>{tab.label}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === tab.id ? 'bg-gray-100 text-gray-900' : 'bg-gray-200 text-gray-600'
                    }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Owner Filter */}
            <div className="flex items-center gap-3">
              <div className="flex items-center space-x-2 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
                <Users className="w-4 h-4 text-gray-400" />
                <select
                  value={selectedOwner}
                  onChange={(e) => setSelectedOwner(e.target.value)}
                  className="text-sm font-medium focus:outline-none bg-transparent min-w-[150px]"
                >
                  <option value="all">All Owners</option>
                  {Object.keys(groupedByOwner).sort().map(owner => (
                    <option key={owner} value={owner}>{owner}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Filters and Search */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by property name, location, or owner..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200"
                />
              </div>

              {/* Bulk Actions */}
              <AnimatePresence>
                {selectedProperties.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex items-center space-x-2"
                  >
                    <span className="text-sm font-medium text-gray-600 whitespace-nowrap">{selectedProperties.length} selected</span>
                    <div className="flex gap-2">
                      <button className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors shadow-sm">
                        Approve
                      </button>
                      <button className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors shadow-sm">
                        Reject
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>

        {/* Grouped by Owner */}
        <div className="space-y-8">
          {Object.entries(groupedByOwner).map(([ownerName, list]) => (
            <div key={ownerName} className="space-y-4">
              <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                    <User className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{ownerName}</h2>
                    <p className="text-gray-500 text-sm font-medium">{list[0]?.owner?.email || ''} • {list.length} Properties</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="hidden sm:flex flex-col items-end">
                    <span className="text-sm font-bold text-gray-900">₹{
                      list.reduce((acc, p) => acc + (p.rooms?.reduce((rAcc, r) => rAcc + (r.rent || 0), 0) || 0), 0).toLocaleString()
                    }</span>
                    <span className="text-xs text-gray-500">Total Potential Rent</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {list.map((property, index) => {
                  const statusBadge = getStatusBadge(property.approval_status || 'pending');
                  const rooms = property.rooms || [];
                  const displayImage = property.images?.front || rooms.find(r => r.room_image)?.room_image;
                  const pendingRooms = rooms.filter(r => (r.approval_status || 'pending') === 'pending').length;
                  const approvedRooms = rooms.filter(r => (r.approval_status || 'pending') === 'approved').length;

                  return (
                    <motion.div
                      key={property._id}
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer group"
                      onClick={() => {
                        console.log('Property clicked:', property._id, property.property_name);
                        console.log('Navigating to:', `/admin-property-details/${property._id}`);
                        navigate(`/admin-property-details/${property._id}`);
                      }}
                    >
                      {/* Property Image */}
                      <div className="relative h-48 bg-gray-200">
                        {displayImage ? (
                          <img
                            src={displayImage}
                            alt={property.property_name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-100">
                            <Building className="w-12 h-12 text-gray-400" />
                          </div>
                        )}
                        <div className="absolute top-3 right-3">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusBadge.color}`}>
                            {statusBadge.text}
                          </span>
                        </div>
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <Eye className="w-8 h-8 text-white" />
                          </div>
                        </div>
                      </div>

                      {/* Property Details */}
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">{property.property_name}</h3>
                        </div>

                        <div className="flex items-center text-sm text-gray-500 mb-3">
                          <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
                          <span className="truncate">{`${property.address?.city || ''}, ${property.address?.state || ''}`}</span>
                        </div>

                        <div className="space-y-3 mb-6">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500 font-medium">Room Status</span>
                            <span className="text-xs font-bold text-gray-700">{approvedRooms}/{rooms.length} Approved</span>
                          </div>
                          <div className="flex w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="bg-green-500 h-full transition-all duration-500"
                              style={{ width: `${(approvedRooms / (rooms.length || 1)) * 100}%` }}
                            />
                            <div
                              className="bg-yellow-400 h-full transition-all duration-500"
                              style={{ width: `${(pendingRooms / (rooms.length || 1)) * 100}%` }}
                            />
                          </div>
                          {pendingRooms > 0 && (
                            <div className="flex items-center gap-1.5 text-xs font-bold text-yellow-600 bg-yellow-50 px-2 py-1 rounded-md w-fit">
                              <AlertCircle className="w-3.5 h-3.5" />
                              {pendingRooms} {pendingRooms === 1 ? 'Room Needs' : 'Rooms Need'} Review
                            </div>
                          )}
                        </div>

                        {/* Quick Actions */}
                        <div className="flex items-center justify-between pt-3 border-t">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                console.log('View Details clicked:', property._id, property.property_name);
                                console.log('Navigating to:', `/admin-property-details/${property._id}`);
                                navigate(`/admin-property-details/${property._id}`);
                              }}
                              className="flex items-center px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              View Details
                            </button>
                          </div>
                          <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-gray-500">
              Showing <span className="text-gray-900 font-bold">{Object.keys(groupedByOwner).length}</span> owner groups • <span className="text-gray-900 font-bold">{filteredProperties.length}</span> properties
            </div>
            <div className="flex items-center gap-1.5">
              <button className="p-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">
                <ArrowRight className="w-4 h-4 rotate-180" />
              </button>
              {[1, 2, 3].map(page => (
                <button
                  key={page}
                  className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-bold transition-all duration-200 ${page === 1
                    ? 'bg-red-600 text-white shadow-lg shadow-red-200'
                    : 'text-gray-600 hover:bg-gray-50'
                    }`}
                >
                  {page}
                </button>
              ))}
              <button className="p-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Success Modal */}
        {showSuccessModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-xl max-w-md w-full p-6"
            >
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Success!</h3>
                <p className="text-sm text-gray-600 mb-4">{successMessage}</p>
                <button
                  onClick={() => setShowSuccessModal(false)}
                  className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  OK
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default PropertiesPage; 