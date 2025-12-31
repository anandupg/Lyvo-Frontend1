import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import OwnerLayout from '../../components/owner/OwnerLayout';
import {
    User, Phone, Mail, MapPin, Calendar, DollarSign,
    Shield, FileText, CheckCircle, XCircle, ArrowLeft,
    CreditCard, Clock, AlertTriangle, Eye
} from 'lucide-react';

import apiClient from '../../utils/apiClient';

const OwnerTenantDetails = () => {
    const { tenantId } = useParams();
    const navigate = useNavigate();
    const [tenant, setTenant] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const response = await apiClient.get(`/property/tenants/${tenantId}`);
                if (response.data.success) {
                    setTenant(response.data.tenant);
                }
            } catch (err) {
                console.error('Error fetching tenant details:', err);
                setError(err.response?.data?.message || 'Failed to load tenant details');
            } finally {
                setLoading(false);
            }
        };

        if (tenantId) fetchDetails();
    }, [tenantId]);

    const formatCurrency = (amount) => {
        if (!amount) return '-';
        return `₹${Number(amount).toLocaleString()}`;
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    if (loading) {
        return (
            <OwnerLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            </OwnerLayout>
        );
    }

    if (error || !tenant) {
        return (
            <OwnerLayout>
                <div className="max-w-4xl mx-auto px-4 py-8">
                    <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-red-900 mb-2">Error Loading Tenant</h3>
                        <p className="text-red-600 mb-6">{error || 'Tenant not found'}</p>
                        <button
                            onClick={() => navigate('/owner-tenants')}
                            className="px-4 py-2 bg-white border border-red-300 rounded-lg text-red-700 font-medium hover:bg-red-50"
                        >
                            Back to Tenants
                        </button>
                    </div>
                </div>
            </OwnerLayout>
        );
    }

    const { kyc } = tenant;
    const aadharData = kyc?.aadhar?.extractedData;

    return (
        <OwnerLayout>
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() => navigate('/owner-tenants')}
                        className="flex items-center text-gray-600 hover:text-gray-900 transition-colors mb-4"
                    >
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        Back to Tenants List
                    </button>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">Tenant Profile</h1>
                            <p className="text-gray-600">Detailed information and documents</p>
                        </div>
                        <div className={`px-4 py-2 rounded-full text-sm font-medium border ${tenant.status === 'active' ? 'bg-green-100 text-green-800 border-green-200' :
                            tenant.status === 'checked_out' ? 'bg-red-100 text-red-800 border-red-200' :
                                'bg-gray-100 text-gray-800 border-gray-200'
                            }`}>
                            Status: {tenant.status.charAt(0).toUpperCase() + tenant.status.slice(1)}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Profile & Contact */}
                    <div className="space-y-6">
                        {/* Profile Card */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <div className="flex flex-col items-center text-center">
                                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4 overflow-hidden border-4 border-white shadow-md">
                                    {tenant.profilePicture ? (
                                        <img
                                            src={tenant.profilePicture}
                                            alt={tenant.userName}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <User className="w-10 h-10 text-gray-400" />
                                    )}
                                </div>
                                <h2 className="text-xl font-bold text-gray-900 mb-1">{tenant.userName}</h2>
                                <p className="text-sm text-gray-500 mb-4">Tenant since {formatDate(tenant.actualCheckInDate)}</p>

                                <div className="w-full space-y-3 pt-4 border-t border-gray-100">
                                    <div className="flex items-center text-sm text-gray-600">
                                        <Mail className="w-4 h-4 mr-3 text-gray-400" />
                                        <span className="truncate">{tenant.userEmail}</span>
                                    </div>
                                    <div className="flex items-center text-sm text-gray-600">
                                        <Phone className="w-4 h-4 mr-3 text-gray-400" />
                                        <span>{tenant.userPhone || 'No phone provided'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Lease Info */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                <FileText className="w-5 h-5 mr-2 text-blue-600" />
                                Lease Details
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">Property</p>
                                    <div className="flex items-start">
                                        <MapPin className="w-4 h-4 mr-2 text-gray-400 mt-0.5" />
                                        <p className="text-sm font-medium text-gray-900">{tenant.propertyName}</p>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">Room</p>
                                    <p className="text-sm font-medium text-gray-900 ml-6">Room {tenant.roomNumber}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Monthly Rent</p>
                                        <p className="text-sm font-bold text-green-600 ml-6">{formatCurrency(tenant.monthlyRent)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Deposit</p>
                                        <p className="text-sm font-bold text-blue-600 ml-6">{formatCurrency(tenant.securityDeposit)}</p>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">Check-in Date</p>
                                    <div className="flex items-center">
                                        <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                                        <p className="text-sm font-medium text-gray-900">{formatDate(tenant.actualCheckInDate)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: KYC & Documents */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* KYC Status Banner */}
                        <div className={`rounded-xl p-6 border ${kyc?.status === 'approved' ? 'bg-green-50 border-green-200' :
                            kyc?.status === 'rejected' ? 'bg-red-50 border-red-200' :
                                'bg-yellow-50 border-yellow-200'
                            }`}>
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-full ${kyc?.status === 'approved' ? 'bg-green-100 text-green-600' :
                                        kyc?.status === 'rejected' ? 'bg-red-100 text-red-600' :
                                            'bg-yellow-100 text-yellow-600'
                                        }`}>
                                        <Shield className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className={`text-lg font-bold ${kyc?.status === 'approved' ? 'text-green-900' :
                                            kyc?.status === 'rejected' ? 'text-red-900' :
                                                'text-yellow-900'
                                            }`}>
                                            KYC Status: {kyc?.status ? kyc.status.charAt(0).toUpperCase() + kyc.status.slice(1) : 'Not Submitted'}
                                        </h3>
                                        <p className={`text-sm ${kyc?.status === 'approved' ? 'text-green-700' :
                                            kyc?.status === 'rejected' ? 'text-red-700' :
                                                'text-yellow-700'
                                            }`}>
                                            {kyc?.status === 'approved' ? 'Identity verified successfully.' :
                                                kyc?.status === 'rejected' ? 'Identity verification failed.' :
                                                    'Verification is pending or incomplete.'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* KYC Documents & Data */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                                <h3 className="font-semibold text-gray-900 flex items-center">
                                    <CreditCard className="w-5 h-5 mr-2 text-blue-600" />
                                    Identity Verification
                                </h3>
                            </div>

                            <div className="p-6">
                                {aadharData ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Extracted Details</h4>
                                            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                                                <div>
                                                    <span className="text-xs text-gray-500 block">Full Name</span>
                                                    <span className="text-sm font-semibold text-gray-900">{aadharData.name}</span>
                                                </div>
                                                <div>
                                                    <span className="text-xs text-gray-500 block">Date of Birth</span>
                                                    <span className="text-sm font-semibold text-gray-900">{aadharData.dateOfBirth}</span>
                                                </div>
                                                <div>
                                                    <span className="text-xs text-gray-500 block">Gender</span>
                                                    <span className="text-sm font-semibold text-gray-900">{aadharData.gender}</span>
                                                </div>
                                                <div>
                                                    <span className="text-xs text-gray-500 block">Aadhar Number</span>
                                                    <span className="text-sm font-semibold text-gray-900 blur-sm hover:blur-none transition-all cursor-pointer" title="Click to reveal">
                                                        {aadharData.aadharNumber}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Document Images</h4>
                                            <div className="grid grid-cols-1 gap-4">
                                                {kyc?.aadhar?.frontImageUrl && (
                                                    <div className="border rounded-lg p-2">
                                                        <p className="text-xs text-gray-500 mb-2">Front Side</p>
                                                        <div className="aspect-[1.6] bg-gray-100 rounded overflow-hidden relative group">
                                                            <img
                                                                src={kyc.aadhar.frontImageUrl}
                                                                alt="ID Front"
                                                                className="w-full h-full object-contain"
                                                            />
                                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                <a
                                                                    href={kyc.aadhar.frontImageUrl}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="px-3 py-1.5 bg-white text-gray-900 text-xs font-medium rounded-full"
                                                                >
                                                                    View Full Size
                                                                </a>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                                {kyc?.aadhar?.backImageUrl && (
                                                    <div className="border rounded-lg p-2">
                                                        <p className="text-xs text-gray-500 mb-2">Back Side</p>
                                                        <div className="aspect-[1.6] bg-gray-100 rounded overflow-hidden relative group">
                                                            <img
                                                                src={kyc.aadhar.backImageUrl}
                                                                alt="ID Back"
                                                                className="w-full h-full object-contain"
                                                            />
                                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                <a
                                                                    href={kyc.aadhar.backImageUrl}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="px-3 py-1.5 bg-white text-gray-900 text-xs font-medium rounded-full"
                                                                >
                                                                    View Full Size
                                                                </a>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                        <p className="text-gray-500">No identity documents have been processed for this tenant.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </OwnerLayout>
    );
};

export default OwnerTenantDetails;
