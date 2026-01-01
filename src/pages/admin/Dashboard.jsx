import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import AdminLayout from "../../components/admin/AdminLayout";
import { Loader2 } from "lucide-react";
import apiClient from "../../utils/apiClient";

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [isLoading, setIsLoading] = useState(true);

  // Real data states
  const [users, setUsers] = useState([]);
  const [properties, setProperties] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeProperties: 0,
    monthlyRevenue: 0,
    pendingApprovals: 0
  });


  // Helper function to format time ago (defined early to avoid hoisting issues)
  const getTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return `${seconds} seconds ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 2592000) return `${Math.floor(seconds / 86400)} days ago`;
    return `${Math.floor(seconds / 2592000)} months ago`;
  };

  // Format revenue helper
  const formatRevenue = (amount) => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
    return `₹${amount}`;
  };

  // Fetch all data
  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        const authToken = localStorage.getItem('authToken');
        const headers = {
          'Content-Type': 'application/json',
          'Authorization': authToken ? `Bearer ${authToken}` : ''
        };

        // Fetch users, properties, and bookings in parallel
        const [usersRes, propertiesRes, bookingsRes] = await Promise.all([
          apiClient.get('/user/all'),
          apiClient.get('/property/admin/properties?limit=1000'), // Fetch all properties
          apiClient.get('/property/debug/bookings')
        ]);

        const usersData = usersRes.data;
        const propertiesData = propertiesRes.data;
        const bookingsData = bookingsRes.data;

        // Set data (handle different response formats)
        setUsers(usersData.data || []);
        setProperties(propertiesData.data || propertiesData.properties || []);
        setBookings(bookingsData.bookings || []);

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Calculate real stats from fetched data
  const calculatedStats = useMemo(() => {
    const totalUsers = users.filter(u => u.role !== 2).length; // Exclude admins
    const totalProperties = properties.length;

    // Active listings: match the logic from Properties page
    // Properties with approval_status = 'approved' OR status = 'active', but NOT inactive
    const activeProperties = properties.filter(p =>
      (p.approval_status === 'approved' || p.status === 'active') && p.status !== 'inactive'
    ).length;

    const pendingApprovals = properties.filter(p => p.approval_status === 'pending').length;

    // Debug logging with detailed property info
    console.log('Dashboard Stats:', {
      totalProperties: properties.length,
      activeProperties,
      pendingApprovals,
      propertiesBreakdown: properties.map(p => ({
        name: p.property_name,
        approval_status: p.approval_status,
        status: p.status,
        isActive: (p.approval_status === 'approved' || p.status === 'active') && p.status !== 'inactive'
      }))
    });

    // Calculate monthly revenue from bookings
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlyBookings = bookings.filter(b => {
      const bookingDate = new Date(b.createdAt);
      return bookingDate.getMonth() === currentMonth &&
        bookingDate.getFullYear() === currentYear &&
        b.status === 'confirmed' &&
        b.payment?.paymentStatus === 'completed';
    });

    const monthlyRevenue = monthlyBookings.reduce((sum, booking) => {
      return sum + (booking.payment?.amount || 0);
    }, 0);

    return {
      totalUsers,
      totalProperties,
      activeProperties,
      monthlyRevenue,
      pendingApprovals
    };
  }, [users, properties, bookings]);

  // Calculate user growth data by month
  const userGrowthData = useMemo(() => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const last6Months = [];
    const today = new Date();

    for (let i = 5; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthIndex = date.getMonth();
      const year = date.getFullYear();

      const usersInMonth = users.filter(u => {
        if (u.role === 2) return false; // Exclude admins
        const userDate = new Date(u.createdAt);
        return userDate.getMonth() === monthIndex && userDate.getFullYear() === year;
      }).length;

      last6Months.push({
        month: monthNames[monthIndex],
        users: usersInMonth,
        growth: usersInMonth
      });
    }

    // Calculate cumulative users
    let cumulative = 0;
    return last6Months.map(month => {
      cumulative += month.users;
      return {
        ...month,
        users: cumulative
      };
    });
  }, [users]);

  // Calculate revenue and bookings data by month
  const revenueData = useMemo(() => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const last6Months = [];
    const today = new Date();

    for (let i = 5; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthIndex = date.getMonth();
      const year = date.getFullYear();

      const monthBookings = bookings.filter(b => {
        const bookingDate = new Date(b.createdAt);
        return bookingDate.getMonth() === monthIndex &&
          bookingDate.getFullYear() === year &&
          b.status === 'confirmed' &&
          b.payment?.paymentStatus === 'completed';
      });

      const revenue = monthBookings.reduce((sum, b) => sum + (b.payment?.amount || 0), 0);

      last6Months.push({
        month: monthNames[monthIndex],
        revenue,
        bookings: monthBookings.length
      });
    }

    return last6Months;
  }, [bookings]);

  const statsCards = [
    {
      title: "Total Users",
      value: calculatedStats.totalUsers.toLocaleString(),
      change: "+0%",
      changeType: "positive",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
        </svg>
      ),
    },
    {
      title: "Total Properties",
      value: calculatedStats.totalProperties.toString(),
      change: "+0%",
      changeType: "positive",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    },
    {
      title: "Monthly Revenue",
      value: formatRevenue(calculatedStats.monthlyRevenue),
      change: "+0%",
      changeType: "positive",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
      ),
    },
    {
      title: "Pending Approvals",
      value: calculatedStats.pendingApprovals.toString(),
      change: "0%",
      changeType: calculatedStats.pendingApprovals > 0 ? "negative" : "positive",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  // Calculate recent activities from real data
  const recentActivities = useMemo(() => {
    const activities = [];

    // Recent users (last 5)
    const recentUsers = users
      .filter(u => u.role !== 2)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 3);

    recentUsers.forEach(user => {
      activities.push({
        id: `user-${user._id}`,
        type: "user_registration",
        message: `New user registered: ${user.name}`,
        time: getTimeAgo(user.createdAt),
        status: "success"
      });
    });

    // Recent properties (last 3)
    const recentProperties = properties
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 2);

    recentProperties.forEach(prop => {
      if (prop.approval_status === 'approved') {
        activities.push({
          id: `prop-${prop._id}`,
          type: "property_approval",
          message: `Property approved: ${prop.property_name}`,
          time: getTimeAgo(prop.updatedAt || prop.createdAt),
          status: "success"
        });
      }
    });

    // Recent bookings (last 2)
    const recentBookings = bookings
      .filter(b => b.status === 'confirmed' && b.payment?.paymentStatus === 'completed')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 2);

    recentBookings.forEach(booking => {
      activities.push({
        id: `booking-${booking._id}`,
        type: "payment_received",
        message: `Payment received: ${formatRevenue(booking.payment?.amount || 0)}`,
        time: getTimeAgo(booking.createdAt),
        status: "success"
      });
    });

    // Sort by time and return last 5
    return activities
      .sort((a, b) => {
        // Sort by recency (this is approximate since we're using "time ago" strings)
        return 0; // Already sorted by creation date in each category
      })
      .slice(0, 5);
  }, [users, properties, bookings]);

  const tabs = [
    { id: "overview", label: "Overview", icon: "📊" },
    { id: "analytics", label: "Analytics", icon: "📈" },
    { id: "reports", label: "Reports", icon: "📋" },
  ];

  // Loading state
  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-red-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600 text-lg">Loading dashboard data...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-4 lg:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="mt-1 lg:mt-2 text-sm lg:text-base text-gray-600">
              Welcome back! Here's what's happening with your platform today.
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex space-x-2 lg:space-x-3">
            <button className="px-3 lg:px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200 text-sm">
              <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
            <button className="px-3 lg:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 text-sm">
              <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {statsCards.map((card, index) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6 hover:shadow-md transition-shadow duration-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs lg:text-sm font-medium text-gray-600">{card.title}</p>
                  <p className="text-xl lg:text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
                  <div className="flex items-center mt-2">
                    <span
                      className={`text-xs lg:text-sm font-medium ${card.changeType === "positive" ? "text-green-600" : "text-red-600"
                        }`}
                    >
                      {card.change}
                    </span>
                    <span className="text-xs lg:text-sm text-gray-500 ml-1 hidden sm:inline">from last month</span>
                  </div>
                </div>
                <div className="p-2 lg:p-3 bg-red-50 rounded-lg text-red-600">
                  {card.icon}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-4 lg:space-x-8 px-4 lg:px-6 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-3 lg:py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors duration-200 ${activeTab === tab.id
                    ? "border-red-500 text-red-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-4 lg:p-6">
            {activeTab === "overview" && (
              <div className="space-y-4 lg:space-y-6">
                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                  {/* User Growth Chart */}
                  <div className="bg-gray-50 rounded-xl p-4 lg:p-6">
                    <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4">User Growth</h3>
                    <ResponsiveContainer width="100%" height={250} className="lg:h-[300px]">
                      <AreaChart data={userGrowthData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Area
                          type="monotone"
                          dataKey="users"
                          stroke="#ef4444"
                          fill="#fef2f2"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Revenue Chart */}
                  <div className="bg-gray-50 rounded-xl p-4 lg:p-6">
                    <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4">Revenue & Bookings</h3>
                    <ResponsiveContainer width="100%" height={250} className="lg:h-[300px]">
                      <BarChart data={revenueData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis yAxisId="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip />
                        <Legend />
                        <Bar yAxisId="left" dataKey="revenue" fill="#ef4444" />
                        <Bar yAxisId="right" dataKey="bookings" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "analytics" && (
              <div className="space-y-4 lg:space-y-6">
                <div className="bg-gray-50 rounded-xl p-4 lg:p-6">
                  <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4">Detailed Analytics</h3>
                  <ResponsiveContainer width="100%" height={300} className="lg:h-[400px]">
                    <LineChart data={userGrowthData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="users"
                        stroke="#ef4444"
                        strokeWidth={3}
                        dot={{ fill: "#ef4444", strokeWidth: 2, r: 6 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="growth"
                        stroke="#3b82f6"
                        strokeWidth={3}
                        dot={{ fill: "#3b82f6", strokeWidth: 2, r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {activeTab === "reports" && (
              <div className="space-y-4 lg:space-y-6">
                <div className="bg-gray-50 rounded-xl p-4 lg:p-6">
                  <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4">Recent Activities</h3>
                  <div className="space-y-3 lg:space-y-4">
                    {recentActivities.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-center justify-between p-3 lg:p-4 bg-white rounded-lg border border-gray-200"
                      >
                        <div className="flex items-center flex-1 min-w-0">
                          <div
                            className={`w-2 h-2 lg:w-3 lg:h-3 rounded-full mr-3 flex-shrink-0 ${activity.status === "success" ? "bg-green-500" : "bg-yellow-500"
                              }`}
                          ></div>
                          <span className="text-gray-700 text-sm lg:text-base truncate">{activity.message}</span>
                        </div>
                        <span className="text-xs lg:text-sm text-gray-500 ml-2 flex-shrink-0">{activity.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Dashboard; 