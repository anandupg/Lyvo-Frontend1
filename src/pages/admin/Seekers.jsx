import React, { useEffect, useMemo, useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { motion } from 'framer-motion';
import { Users, Search, Mail, Eye } from 'lucide-react';
import apiClient from '../../utils/apiClient';

const AdminSeekers = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [togglingStatus, setTogglingStatus] = useState(false);

  useEffect(() => {
    const fetchSeekers = async () => {
      try {
        setLoading(true);
        setError('');
        const token = localStorage.getItem('authToken');
        const res = await apiClient.get('/user/users');
        const data = res.data;
        if (res.status !== 200) throw new Error(data?.message || 'Failed to fetch users');
        const seekersOnly = (data?.data || []).filter(u => u.role === 1).map(u => ({
          _id: u._id,
          name: u.name,
          email: u.email,
          isVerified: !!u.isVerified,
          isActive: u.isActive !== false, // Default to true if not specified
          createdAt: u.createdAt,
          updatedAt: u.updatedAt,
        }));
        setItems(seekersOnly);
      } catch (e) {
        setError(e.message);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    fetchSeekers();
  }, []);

  const filtered = useMemo(() => items.filter(o =>
    o.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.email.toLowerCase().includes(searchTerm.toLowerCase())
  ), [items, searchTerm]);

  const handleToggleStatus = async (userId) => {
    try {
      setTogglingStatus(true);
      const token = localStorage.getItem('authToken');
      const response = await apiClient.patch(`/admin/user/${userId}/toggle-status`);

      const data = response.data;

      if (response.status !== 200) {
        throw new Error(data?.message || 'Failed to toggle user status');
      }

      // Update the local state
      setItems(prev => prev.map(item =>
        item._id === userId
          ? { ...item, isActive: !item.isActive }
          : item
      ));

      // Update selected item if it's the same user
      if (selected && selected._id === userId) {
        setSelected(prev => ({ ...prev, isActive: !prev.isActive }));
      }

      alert(`User ${data.user.isActive ? 'activated' : 'deactivated'} successfully!`);
    } catch (error) {
      console.error('Toggle status error:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setTogglingStatus(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Seekers</h1>
            <p className="text-gray-600 mt-1">Manage all room seekers</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-gray-600">
            <Users className="w-4 h-4" />
            <span>{filtered.length} seekers</span>
          </div>
        </div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search seekers..." className="w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500" />
            </div>
          </div>
          {loading && <div className="mt-3 text-sm text-gray-600">Loading seekers…</div>}
          {error && !loading && <div className="mt-3 text-sm text-red-600">{error}</div>}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="hidden lg:block overflow-x-auto overflow-y-auto max-h-[60vh]">
            <table className="w-full table-fixed">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 text-left w-1/5">Seeker</th>
                  <th className="px-6 py-3 text-left w-1/5">Email</th>
                  <th className="px-6 py-3 text-left w-20">Status</th>
                  <th className="px-6 py-3 text-left w-24">Email Verified</th>
                  <th className="px-6 py-3 text-left w-32">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.map((o) => (
                  <tr key={o._id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 truncate">{o.name}</td>
                    <td className="px-6 py-3 truncate flex items-center gap-2"><Mail className="w-4 h-4 text-gray-400" />{o.email}</td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${o.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {o.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    <td className="px-6 py-3">{o.isVerified ? 'Yes' : 'No'}</td>
                    <td className="px-6 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => { setSelected(o); setDetailsOpen(true); }} className="inline-flex items-center px-2 py-1 text-xs border rounded-md hover:bg-gray-50"><Eye className="w-4 h-4 mr-1" />Details</button>
                        <button
                          onClick={() => handleToggleStatus(o._id)}
                          disabled={togglingStatus}
                          className={`inline-flex items-center px-2 py-1 text-xs rounded-md text-white disabled:opacity-50 ${o.isActive
                              ? 'bg-red-600 hover:bg-red-700'
                              : 'bg-green-600 hover:bg-green-700'
                            }`}
                          title={o.isActive ? 'Deactivate User' : 'Activate User'}
                        >
                          {o.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="lg:hidden p-4 space-y-3">
            {filtered.map((o) => (
              <div key={o._id} className="border rounded-lg p-3">
                <div className="font-semibold">{o.name}</div>
                <div className="text-sm text-gray-600 flex items-center gap-2"><Mail className="w-4 h-4" />{o.email}</div>
                <div className="mt-2">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${o.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {o.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>
                <div className="mt-2 flex gap-2">
                  <button onClick={() => { setSelected(o); setDetailsOpen(true); }} className="inline-flex items-center px-2 py-1 text-xs border rounded-md">View</button>
                  <button
                    onClick={() => handleToggleStatus(o._id)}
                    disabled={togglingStatus}
                    className={`inline-flex items-center px-2 py-1 text-xs rounded-md text-white disabled:opacity-50 ${o.isActive
                        ? 'bg-red-600 hover:bg-red-700'
                        : 'bg-green-600 hover:bg-green-700'
                      }`}
                  >
                    {o.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {detailsOpen && selected && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl w-full max-w-2xl overflow-hidden shadow-xl">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                <div className="text-sm font-semibold text-gray-900">Seeker Details</div>
                <button onClick={() => setDetailsOpen(false)} className="px-2 py-1 text-gray-500 hover:text-gray-700 text-sm">Close</button>
              </div>
              <div className="p-4 space-y-3 text-sm">
                <div className="font-medium text-gray-900">{selected.name}</div>
                <div className="text-gray-700 flex items-center gap-2"><Mail className="w-4 h-4" /> {selected.email}</div>
                <div>Email Verified: <span className="font-medium">{selected.isVerified ? 'Yes' : 'No'}</span></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminSeekers;


