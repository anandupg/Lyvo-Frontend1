import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Search, Filter, MoreVertical, Edit, Trash2, Eye, MapPin, DollarSign, Users, Star, Calendar, CheckCircle2, XCircle, User, Building, ArrowRight } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import { motion } from 'framer-motion';

const PropertiesPage = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedProperties, setSelectedProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [properties, setProperties] = useState([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const propertyServiceUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        setError('');
        const authToken = localStorage.getItem('authToken');
        const user = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; } })();
        const userId = user._id || user.id || '';

        // Unified backend path: /api/property/admin/properties
        const url = `${propertyServiceUrl}/property/admin/properties?page=1&limit=200`;
        console.log('Fetching Admin Properties from:', url);
        console.log('Using Auth Token:', authToken ? 'Yes' : 'No');
        console.log('User ID:', userId);

        const resp = await fetch(url, {
          headers: {
            'Authorization': authToken ? `Bearer ${authToken}` : '',
            'x-user-id': userId
          }
        });

        console.log('Response Status:', resp.status);
        const data = await resp.json();
        console.log('Response Data:', data);

        if (!resp.ok || data.success !== true) {
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
      const matchesSearch = !term || title.includes(term) || location.includes(term) || (p.owner?.name || '').toLowerCase().includes(term);
      const matchesStatus = filterStatus === 'all' || (p.approval_status || 'pending') === filterStatus || (p.status || 'active') === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [properties, searchTerm, filterStatus]);

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

    // Pending approval: properties with approval_status = 'pending'
    const pendingApproval = properties.filter(p =>
      p.approval_status === 'pending'
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
      const resp = await fetch(`${propertyServiceUrl}/api/admin/rooms/${roomId}/approval`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authToken ? `Bearer ${authToken}` : '',
          'x-user-id': userId
        },
        body: JSON.stringify({ action })
      });
      const data = await resp.json();
      if (!resp.ok || data.success !== true) {
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalRevenue}</p>
              </div>
              <div className="p-3 rounded-lg bg-green-50">
                <DollarSign className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </motion.div>
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
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search properties by title or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>

            {/* Bulk Actions */}
            {selectedProperties.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">{selectedProperties.length} selected</span>
                <button className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200">
                  Approve Selected
                </button>
                <button className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200">
                  Reject Selected
                </button>
              </div>
            )}
          </div>
        </motion.div>

        {/* Grouped by Owner */}
        <div className="space-y-8">
          {Object.entries(groupedByOwner).map(([ownerName, list]) => (
            <div key={ownerName} className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                  <User className="w-5 h-5 text-gray-700" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{ownerName}</h2>
                  <p className="text-gray-500 text-sm">{list[0]?.owner?.email || ''}</p>
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

                        <div className="space-y-2 mb-4">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Total Rooms</span>
                            <span className="font-semibold text-gray-900">{rooms.length}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Approved</span>
                            <span className="font-semibold text-green-600">{approvedRooms}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Pending</span>
                            <span className="font-semibold text-yellow-600">{pendingRooms}</span>
                          </div>
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
            <div className="text-sm text-gray-700">
              Showing <span className="font-medium">{Object.keys(groupedByOwner).length}</span> owner groups • <span className="font-medium">{filteredProperties.length}</span> properties
            </div>
            <div className="flex items-center space-x-2">
              <button className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
                Previous
              </button>
              <button className="px-3 py-1 text-sm bg-red-600 text-white rounded-md">1</button>
              <button className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50">2</button>
              <button className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50">3</button>
              <button className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
                Next
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