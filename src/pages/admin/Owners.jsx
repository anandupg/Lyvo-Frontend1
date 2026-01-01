import React, { useEffect, useMemo, useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { motion } from 'framer-motion';
import { Users, Search, Mail, Eye, CheckCircle, XCircle, Clock } from 'lucide-react';
import apiClient from '../../utils/apiClient';

const AdminOwners = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [kycReviewing, setKycReviewing] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);

  useEffect(() => {
    const fetchOwners = async () => {
      try {
        setLoading(true);
        setError('');
        const token = localStorage.getItem('authToken');
        const res = await apiClient.get('/user/users');
        const data = res.data;
        if (res.status !== 200) throw new Error(data?.message || 'Failed to fetch users');
        const ownersOnly = (data?.data || []).filter(u => u.role === 3).map(u => ({
          _id: u._id,
          name: u.name,
          email: u.email,
          kycStatus: u.kycStatus || 'not_submitted',
          govtIdFrontUrl: u.govtIdFrontUrl || null,
          govtIdBackUrl: u.govtIdBackUrl || null,
          isVerified: !!u.isVerified,
          isActive: u.isActive !== false, // Default to true if not specified
          createdAt: u.createdAt,
          updatedAt: u.updatedAt,
        }));
        setItems(ownersOnly);
      } catch (e) {
        setError(e.message);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    fetchOwners();
  }, []);

  const filtered = useMemo(() => items.filter(o =>
    o.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.email.toLowerCase().includes(searchTerm.toLowerCase())
  ), [items, searchTerm]);

  const handleKycReview = async (userId, action) => {
    try {
      setKycReviewing(true);
      const token = localStorage.getItem('authToken');
      const response = await apiClient.post('/admin/kyc/review', {
        userId: userId,
        action: action // 'approve' or 'reject'
      });

      const data = response.data;

      if (response.status !== 200) {
        throw new Error(data?.message || 'Failed to update KYC status');
      }

      // Update the local state
      setItems(prev => prev.map(item =>
        item._id === userId
          ? { ...item, kycStatus: action === 'approve' ? 'approved' : 'rejected' }
          : item
      ));

      // Update selected item if it's the same user
      if (selected && selected._id === userId) {
        setSelected(prev => ({ ...prev, kycStatus: action === 'approve' ? 'approved' : 'rejected' }));
      }

      alert(`KYC ${action === 'approve' ? 'approved' : 'rejected'} successfully!`);
    } catch (error) {
      console.error('KYC review error:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setKycReviewing(false);
    }
  };

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
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Room Owners</h1>
            <p className="text-gray-600 mt-1">Manage all property owners</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-gray-600">
            <Users className="w-4 h-4" />
            <span>{filtered.length} owners</span>
          </div>
        </div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search owners..." className="w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500" />
            </div>
          </div>
          {loading && <div className="mt-3 text-sm text-gray-600">Loading owners…</div>}
          {error && !loading && <div className="mt-3 text-sm text-red-600">{error}</div>}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="hidden lg:block overflow-x-auto overflow-y-auto max-h-[60vh]">
            <table className="w-full table-fixed">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 text-left w-1/5">Owner</th>
                  <th className="px-6 py-3 text-left w-1/5">Email</th>
                  <th className="px-6 py-3 text-left w-20">KYC</th>
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
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${o.kycStatus === 'approved' ? 'bg-green-100 text-green-800' : o.kycStatus === 'rejected' ? 'bg-red-100 text-red-800' : o.kycStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>{String(o.kycStatus).toUpperCase()}</span>
                    </td>
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
                        {o.kycStatus === 'pending' && (o.govtIdFrontUrl || o.govtIdBackUrl) && (
                          <>
                            <button
                              onClick={() => handleKycReview(o._id, 'approve')}
                              disabled={kycReviewing}
                              className="inline-flex items-center px-2 py-1 text-xs bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                              title="Approve KYC"
                            >
                              <CheckCircle className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleKycReview(o._id, 'reject')}
                              disabled={kycReviewing}
                              className="inline-flex items-center px-2 py-1 text-xs bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                              title="Reject KYC"
                            >
                              <XCircle className="w-3 h-3" />
                            </button>
                          </>
                        )}
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
                <div className="mt-2 flex gap-2">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${o.kycStatus === 'approved' ? 'bg-green-100 text-green-800' : o.kycStatus === 'rejected' ? 'bg-red-100 text-red-800' : o.kycStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>{String(o.kycStatus).toUpperCase()}</span>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${o.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {o.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>
                <div className="mt-2 flex gap-2 flex-wrap">
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
                  {o.kycStatus === 'pending' && (o.govtIdFrontUrl || o.govtIdBackUrl) && (
                    <>
                      <button
                        onClick={() => handleKycReview(o._id, 'approve')}
                        disabled={kycReviewing}
                        className="inline-flex items-center px-2 py-1 text-xs bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />Approve
                      </button>
                      <button
                        onClick={() => handleKycReview(o._id, 'reject')}
                        disabled={kycReviewing}
                        className="inline-flex items-center px-2 py-1 text-xs bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                      >
                        <XCircle className="w-3 h-3 mr-1" />Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {detailsOpen && selected && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl w-full max-w-2xl overflow-hidden shadow-xl">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                <div className="text-sm font-semibold text-gray-900">Owner Details</div>
                <button onClick={() => setDetailsOpen(false)} className="px-2 py-1 text-gray-500 hover:text-gray-700 text-sm">Close</button>
              </div>
              <div className="p-4 space-y-4 text-sm">
                <div className="font-medium text-gray-900">{selected.name}</div>
                <div className="text-gray-700 flex items-center gap-2"><Mail className="w-4 h-4" /> {selected.email}</div>
                <div className="flex items-center gap-2">
                  <span>KYC Status:</span>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${selected.kycStatus === 'approved' ? 'bg-green-100 text-green-800' :
                    selected.kycStatus === 'rejected' ? 'bg-red-100 text-red-800' :
                      selected.kycStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                    }`}>
                    {String(selected.kycStatus).toUpperCase()}
                  </span>
                </div>

                {(selected.govtIdFrontUrl || selected.govtIdBackUrl) && (
                  <div className="space-y-3">
                    <div className="font-medium text-gray-900">Government ID Documents:</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selected.govtIdFrontUrl && (
                        <div>
                          <div className="text-xs text-gray-600 mb-1">Front Image</div>
                          <img src={selected.govtIdFrontUrl} alt="Front" className="w-full h-40 object-cover rounded border" />
                        </div>
                      )}
                      {selected.govtIdBackUrl && (
                        <div>
                          <div className="text-xs text-gray-600 mb-1">Back Image</div>
                          <img src={selected.govtIdBackUrl} alt="Back" className="w-full h-40 object-cover rounded border" />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* KYC Review Actions */}
                {selected.kycStatus === 'pending' && (selected.govtIdFrontUrl || selected.govtIdBackUrl) && (
                  <div className="border-t pt-4">
                    <div className="font-medium text-gray-900 mb-3">Review KYC Documents:</div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleKycReview(selected._id, 'approve')}
                        disabled={kycReviewing}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <CheckCircle className="w-4 h-4" />
                        {kycReviewing ? 'Processing...' : 'Approve KYC'}
                      </button>
                      <button
                        onClick={() => handleKycReview(selected._id, 'reject')}
                        disabled={kycReviewing}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <XCircle className="w-4 h-4" />
                        {kycReviewing ? 'Processing...' : 'Reject KYC'}
                      </button>
                    </div>
                  </div>
                )}

                {selected.kycStatus === 'pending' && !selected.govtIdFrontUrl && !selected.govtIdBackUrl && (
                  <div className="border-t pt-4">
                    <div className="flex items-center gap-2 text-yellow-600">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm">No KYC documents uploaded yet</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminOwners;


