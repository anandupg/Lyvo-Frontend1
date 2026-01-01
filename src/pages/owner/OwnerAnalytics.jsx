import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import OwnerLayout from '../../components/owner/OwnerLayout';
import apiClient from '../../utils/apiClient';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Building,
  Calendar,
  Eye,
  Star,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';

const OwnerAnalytics = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('6months'); // '1month', '3months', '6months', '1year'

  // Data states
  const [properties, setProperties] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState([]);

  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  // Fetch data
  useEffect(() => {
    const fetchAnalyticsData = async () => {
      setLoading(true);
      try {
        const authToken = localStorage.getItem('authToken');
        const userData = JSON.parse(localStorage.getItem('user') || '{}');

        if (!authToken || !userData._id) {
          navigate('/login');
          return;
        }

        // Fetch properties (owner-scoped via auth) and bookings
        const [propertiesRes, bookingsRes] = await Promise.all([
          apiClient.get('/property/owner/properties?page=1&limit=500'),
          apiClient.get('/property/owner/bookings')
        ]);

        const propertiesData = propertiesRes.data;
        const bookingsData = bookingsRes.data;

        const propsArray = propertiesData.properties || propertiesData.data || [];
        setProperties(propsArray);
        setBookings(bookingsData.bookings || bookingsData.data || []);

        // Extract all rooms from properties
        const allRooms = propsArray.reduce((acc, prop) => {
          const propRooms = (prop.rooms && Array.isArray(prop.rooms)) ? prop.rooms : [];
          const normalized = propRooms.map(room => ({
            ...room,
            rent: room.rent ?? room.price ?? 0,
            roomType: room.roomType ?? room.room_type ?? 'Unknown',
            is_available: typeof room.is_available === 'boolean' ? room.is_available : (room.status === 'active'),
            property: prop
          }));
          return [...acc, ...normalized];
        }, []);
        setRooms(allRooms);

      } catch (error) {
        console.error('Error fetching analytics data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyticsData();
  }, [navigate]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalProperties = properties.length;
    const totalRooms = rooms.length;
    const activeRooms = rooms.filter(r => (r.status === 'active' || r.is_available)).length;
    const occupiedRooms = rooms.filter(r => r.is_available === false).length;

    // Revenue calculations
    const confirmedBookings = bookings.filter(b => {
      const paymentStatus = b.payment?.paymentStatus || b.paymentStatus;
      const status = b.status || b.bookingStatus;
      return status === 'confirmed' && paymentStatus === 'completed';
    });

    const totalRevenue = confirmedBookings.reduce((sum, b) => sum + (b.payment?.amount || 0), 0);

    // Current month revenue
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlyRevenue = confirmedBookings
      .filter(b => {
        const bookingDate = new Date(b.createdAt);
        return bookingDate.getMonth() === currentMonth && bookingDate.getFullYear() === currentYear;
      })
      .reduce((sum, b) => sum + (b.payment?.amount || 0), 0);

    // Last month revenue for comparison
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const lastMonthRevenue = confirmedBookings
      .filter(b => {
        const bookingDate = new Date(b.createdAt);
        return bookingDate.getMonth() === lastMonth && bookingDate.getFullYear() === lastMonthYear;
      })
      .reduce((sum, b) => sum + (b.payment?.amount || 0), 0);

    const revenueChange = lastMonthRevenue > 0
      ? ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1)
      : 0;

    // Occupancy rate
    const occupancyRate = totalRooms > 0 ? ((occupiedRooms / totalRooms) * 100).toFixed(1) : 0;

    // Average rent
    const avgRent = rooms.length > 0
      ? Math.round(rooms.reduce((sum, r) => sum + (r.rent || 0), 0) / rooms.length)
      : 0;

    // Pending applications
    const pendingBookings = bookings.filter(b => b.status === 'pending').length;

    return {
      totalProperties,
      totalRooms,
      activeRooms,
      occupiedRooms,
      totalRevenue,
      monthlyRevenue,
      revenueChange,
      occupancyRate,
      avgRent,
      pendingBookings,
      totalBookings: bookings.length
    };
  }, [properties, rooms, bookings]);

  // Revenue data by month
  const revenueData = useMemo(() => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const months = timeRange === '1month' ? 1 : timeRange === '3months' ? 3 : timeRange === '6months' ? 6 : 12;
    const data = [];
    const today = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthIndex = date.getMonth();
      const year = date.getFullYear();

      const monthRevenue = bookings
        .filter(b => {
          const status = b.status || b.bookingStatus;
          const paymentStatus = b.payment?.paymentStatus || b.paymentStatus;
          if (status !== 'confirmed' || paymentStatus !== 'completed') return false;
          const bookingDate = new Date(b.createdAt || b.updatedAt || b.date || Date.now());
          return bookingDate.getMonth() === monthIndex && bookingDate.getFullYear() === year;
        })
        .reduce((sum, b) => sum + (b.payment?.amount || b.amount || b.totalAmount || 0), 0);

      data.push({
        month: monthNames[monthIndex],
        revenue: monthRevenue,
        bookings: bookings.filter(b => {
          const bookingDate = new Date(b.createdAt || b.updatedAt || b.date || Date.now());
          return bookingDate.getMonth() === monthIndex && bookingDate.getFullYear() === year;
        }).length
      });
    }

    return data;
  }, [bookings, timeRange]);

  // Property performance data
  const propertyPerformance = useMemo(() => {
    return properties.map(prop => {
      const propName = prop.propertyName || prop.property_name || 'Property';
      const propRooms = Array.isArray(prop.rooms) ? prop.rooms : [];
      const propRoomIds = new Set(propRooms.map(r => (r._id || r.id || '').toString()));
      const propBookings = bookings.filter(b => {
        const roomId = (b.roomId || b.room_id || '').toString();
        return roomId && propRoomIds.has(roomId);
      });
      const propRevenue = propBookings
        .filter(b => (b.status || b.bookingStatus) === 'confirmed' && (b.payment?.paymentStatus || b.paymentStatus) === 'completed')
        .reduce((sum, b) => sum + (b.payment?.amount || b.amount || b.totalAmount || 0), 0);

      return {
        name: propName.length > 15 ? propName.substring(0, 15) + '...' : propName,
        fullName: propName,
        revenue: propRevenue,
        bookings: propBookings.length,
        rooms: propRooms.length,
        occupiedRooms: propRooms.filter(r => r.is_available === false).length
      };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [properties, bookings]);

  // Booking status distribution
  const bookingStatusData = useMemo(() => {
    const confirmed = bookings.filter(b => b.status === 'confirmed').length;
    const pending = bookings.filter(b => b.status === 'pending').length;
    const rejected = bookings.filter(b => b.status === 'rejected').length;
    const cancelled = bookings.filter(b => b.status === 'cancelled').length;

    return [
      { name: 'Confirmed', value: confirmed, color: '#10b981' },
      { name: 'Pending', value: pending, color: '#f59e0b' },
      { name: 'Rejected', value: rejected, color: '#ef4444' },
      { name: 'Cancelled', value: cancelled, color: '#6b7280' }
    ].filter(item => item.value > 0);
  }, [bookings]);

  // Room type distribution
  const roomTypeData = useMemo(() => {
    const types = {};
    rooms.forEach(room => {
      const type = room.roomType || room.room_type || 'Unknown';
      types[type] = (types[type] || 0) + 1;
    });

    return Object.entries(types).map(([name, value]) => ({
      name,
      value,
      color: name === 'Single' ? '#3b82f6' :
        name === 'Double' ? '#8b5cf6' :
          name === 'Triple' ? '#ec4899' : '#6b7280'
    }));
  }, [rooms]);

  // Format currency
  const formatCurrency = (amount) => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
    return `₹${amount}`;
  };

  if (loading) {
    return (
      <OwnerLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-red-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading analytics...</p>
          </div>
        </div>
      </OwnerLayout>
    );
  }

  const statCards = [
    {
      title: 'Total Revenue',
      value: formatCurrency(stats.totalRevenue),
      change: `${stats.revenueChange}%`,
      changeType: stats.revenueChange >= 0 ? 'positive' : 'negative',
      icon: DollarSign,
      color: 'bg-green-500',
      description: 'All-time earnings'
    },
    {
      title: 'Monthly Revenue',
      value: formatCurrency(stats.monthlyRevenue),
      change: `${stats.revenueChange}%`,
      changeType: stats.revenueChange >= 0 ? 'positive' : 'negative',
      icon: TrendingUp,
      color: 'bg-blue-500',
      description: 'This month'
    },
    {
      title: 'Occupancy Rate',
      value: `${stats.occupancyRate}%`,
      change: `${stats.occupiedRooms}/${stats.totalRooms} rooms`,
      icon: Building,
      color: 'bg-purple-500',
      description: 'Current occupancy'
    },
    {
      title: 'Total Bookings',
      value: stats.totalBookings.toString(),
      change: `${stats.pendingBookings} pending`,
      icon: Calendar,
      color: 'bg-orange-500',
      description: 'All bookings'
    },
    {
      title: 'Average Rent',
      value: formatCurrency(stats.avgRent),
      change: `${stats.totalRooms} rooms`,
      icon: Activity,
      color: 'bg-pink-500',
      description: 'Per room'
    },
    {
      title: 'Active Rooms',
      value: stats.activeRooms.toString(),
      change: `${stats.totalRooms} total`,
      icon: CheckCircle,
      color: 'bg-teal-500',
      description: 'Available for booking'
    }
  ];

  return (
    <OwnerLayout>
      <div className="min-h-screen bg-gray-50 p-3 sm:p-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
                <BarChart3 className="w-6 h-6 sm:w-8 sm:h-8 text-red-600" />
                Analytics Dashboard
              </h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">Track your property performance and revenue</p>
            </div>

            {/* Time Range Selector */}
            <div className="flex items-center gap-1 sm:gap-2 bg-white rounded-lg border border-gray-200 p-1">
              {[
                { label: '1M', value: '1month' },
                { label: '3M', value: '3months' },
                { label: '6M', value: '6months' },
                { label: '1Y', value: '1year' }
              ].map((range) => (
                <button
                  key={range.value}
                  onClick={() => setTimeRange(range.value)}
                  className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${timeRange === range.value
                    ? 'bg-red-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                    }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`${stat.color} p-2 sm:p-3 rounded-lg`}>
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  {stat.changeType && (
                    <div className={`flex items-center gap-1 text-sm font-medium ${stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                      }`}>
                      {stat.changeType === 'positive' ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4" />
                      )}
                      {stat.change}
                    </div>
                  )}
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">{stat.value}</h3>
                <p className="text-sm text-gray-600">{stat.title}</p>
                <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Revenue Trend */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Revenue Trend
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" stroke="#6b7280" style={{ fontSize: '12px' }} />
                <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  formatter={(value) => [`₹${value.toLocaleString()}`, 'Revenue']}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#10b981"
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Bookings Trend */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Bookings Trend
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" stroke="#6b7280" style={{ fontSize: '12px' }} />
                <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  formatter={(value) => [value, 'Bookings']}
                />
                <Line
                  type="monotone"
                  dataKey="bookings"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Property Performance */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 lg:col-span-2"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Building className="w-5 h-5 text-purple-600" />
              Property Performance
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={propertyPerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" stroke="#6b7280" style={{ fontSize: '11px' }} />
                <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  formatter={(value, name) => [
                    name === 'revenue' ? `₹${value.toLocaleString()}` : value,
                    name === 'revenue' ? 'Revenue' : 'Bookings'
                  ]}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                          <p className="font-semibold text-gray-900 mb-2">{data.fullName}</p>
                          <p className="text-sm text-gray-600">Revenue: <span className="font-medium text-purple-600">₹{data.revenue.toLocaleString()}</span></p>
                          <p className="text-sm text-gray-600">Bookings: <span className="font-medium text-blue-600">{data.bookings}</span></p>
                          <p className="text-sm text-gray-600">Occupancy: <span className="font-medium">{data.occupiedRooms}/{data.rooms} rooms</span></p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="revenue" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Booking Status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-orange-600" />
              Booking Status
            </h3>
            {bookingStatusData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={bookingStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {bookingStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {bookingStatusData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                        <span className="text-gray-600">{item.name}</span>
                      </div>
                      <span className="font-semibold text-gray-900">{item.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-gray-400">
                <div className="text-center">
                  <AlertCircle className="w-12 h-12 mx-auto mb-2" />
                  <p className="text-sm">No bookings yet</p>
                </div>
              </div>
            )}
          </motion.div>
        </div>

        {/* Room Type Distribution */}
        {roomTypeData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Eye className="w-5 h-5 text-pink-600" />
              Room Type Distribution
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              {roomTypeData.map((type) => (
                <div key={type.name} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: type.color }}></div>
                    <span className="text-sm font-medium text-gray-700">{type.name}</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{type.value}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {((type.value / rooms.length) * 100).toFixed(1)}% of total
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </OwnerLayout>
  );
};

export default OwnerAnalytics;

