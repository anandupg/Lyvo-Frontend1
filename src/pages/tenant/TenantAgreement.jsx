import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    FileText, Download, Calendar, User, Home, DollarSign,
    CheckCircle, Shield, AlertCircle, Printer
} from 'lucide-react';
import SeekerLayout from '../../components/seeker/SeekerLayout';
import { useTenantStatus } from '../../hooks/useTenantStatus';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const TenantAgreement = () => {
    const { tenantData, loading } = useTenantStatus();

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount || 0);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const formatAddress = (address) => {
        if (!address) return 'N/A';
        if (typeof address === 'string') return address;
        const { street, city, state, pincode, landmark } = address;
        const parts = [street, landmark, city, state, pincode].filter(Boolean);
        return parts.join(', ');
    };

    const handleDownload = async () => {
        const element = document.getElementById('rental-agreement-content');
        if (!element) return;

        try {
            // Show loading state if needed
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                logging: false,
                windowWidth: element.scrollWidth,
                windowHeight: element.scrollHeight
            });
            const imgData = canvas.toDataURL('image/png');

            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Rental-Agreement-${tenantData?.userName || 'Tenant'}.pdf`);
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Failed to generate agreement PDF. Please try again.');
        }
    };

    const handlePrint = () => {
        window.print();
    };

    if (loading) {
        return (
            <SeekerLayout>
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading agreement...</p>
                    </div>
                </div>
            </SeekerLayout>
        );
    }

    if (!tenantData) {
        return (
            <SeekerLayout>
                <div className="min-h-screen flex items-center justify-center p-4">
                    <div className="text-center max-w-md">
                        <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">No Agreement Found</h2>
                        <p className="text-gray-600">You don't have an active tenancy agreement.</p>
                    </div>
                </div>
            </SeekerLayout>
        );
    }

    const { property, room } = tenantData;

    return (
        <SeekerLayout>
            <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Header */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-8"
                    >
                        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl shadow-2xl p-8 text-white relative overflow-hidden">
                            <div className="absolute inset-0 opacity-10">
                                <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full blur-3xl"></div>
                                <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
                            </div>

                            <div className="relative z-10">
                                <div className="flex items-center justify-between flex-wrap gap-4">
                                    <div>
                                        <h1 className="text-3xl sm:text-4xl font-bold mb-2 flex items-center">
                                            <FileText className="w-10 h-10 mr-3" />
                                            Tenancy Agreement
                                        </h1>
                                        <p className="text-purple-100 text-lg">Your rental agreement details</p>
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={handlePrint}
                                            className="bg-white text-purple-600 px-4 py-2 rounded-lg font-medium hover:bg-purple-50 transition-colors shadow-lg flex items-center gap-2"
                                        >
                                            <Printer className="w-4 h-4" />
                                            Print
                                        </button>
                                        <button
                                            onClick={handleDownload}
                                            className="bg-white text-purple-600 px-4 py-2 rounded-lg font-medium hover:bg-purple-50 transition-colors shadow-lg flex items-center gap-2"
                                        >
                                            <Download className="w-4 h-4" />
                                            Download
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Agreement Document */}
                    <motion.div
                        id="rental-agreement-content"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white rounded-2xl shadow-xl overflow-hidden"
                    >
                        {/* Document Header */}
                        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-8 border-b-4 border-purple-600">
                            <div className="text-center">
                                <h2 className="text-3xl font-bold text-gray-900 mb-2">RENTAL AGREEMENT</h2>
                                <p className="text-gray-600">This agreement is made on {formatDate(tenantData.actualCheckInDate)}</p>
                            </div>
                        </div>

                        {/* Agreement Content */}
                        <div className="p-8 space-y-8">
                            {/* Parties */}
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                                    <User className="w-5 h-5 mr-2 text-purple-600" />
                                    Parties to the Agreement
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-purple-50 rounded-xl p-6">
                                        <p className="text-sm text-purple-700 font-medium mb-2">LANDLORD (Owner)</p>
                                        <p className="text-lg font-bold text-gray-900">{tenantData.owner?.name || tenantData.ownerName}</p>
                                        <p className="text-sm text-gray-600 mt-1">{tenantData.owner?.email || tenantData.ownerEmail || 'Email not available'}</p>
                                        <p className="text-sm text-gray-600">{tenantData.owner?.phone || tenantData.ownerPhone || 'Phone not available'}</p>
                                    </div>
                                    <div className="bg-indigo-50 rounded-xl p-6">
                                        <p className="text-sm text-indigo-700 font-medium mb-2">TENANT</p>
                                        <p className="text-lg font-bold text-gray-900">{tenantData.userName}</p>
                                        <p className="text-sm text-gray-600 mt-1">{tenantData.userEmail}</p>
                                        <p className="text-sm text-gray-600">{tenantData.userPhone}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Property Details */}
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                                    <Home className="w-5 h-5 mr-2 text-purple-600" />
                                    Property Details
                                </h3>
                                <div className="bg-gray-50 rounded-xl p-6 space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-gray-500 font-medium">Property Name</p>
                                            <p className="text-base font-semibold text-gray-900">{property?.propertyName || tenantData.propertyName}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500 font-medium">Room Number</p>
                                            <p className="text-base font-semibold text-gray-900">Room {room?.roomNumber || tenantData.roomNumber}</p>
                                        </div>
                                        <div className="md:col-span-2">
                                            <p className="text-sm text-gray-500 font-medium">Address</p>
                                            <p className="text-base font-semibold text-gray-900">
                                                {formatAddress(property?.address) !== 'N/A'
                                                    ? formatAddress(property?.address)
                                                    : tenantData.propertySnapshot?.address || 'Address not available'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500 font-medium">Room Type</p>
                                            <p className="text-base font-semibold text-gray-900">{room?.roomType || 'Standard'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Financial Terms */}
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                                    <DollarSign className="w-5 h-5 mr-2 text-purple-600" />
                                    Financial Terms
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-green-50 rounded-xl p-6">
                                        <p className="text-sm text-green-700 font-medium mb-1">Monthly Rent</p>
                                        <p className="text-3xl font-bold text-green-900">{formatCurrency(tenantData.monthlyRent)}</p>
                                        <p className="text-xs text-green-600 mt-2">Payable on or before 5th of every month</p>
                                    </div>
                                    <div className="bg-blue-50 rounded-xl p-6">
                                        <p className="text-sm text-blue-700 font-medium mb-1">Security Deposit</p>
                                        <p className="text-3xl font-bold text-blue-900">
                                            {formatCurrency(tenantData.security_deposit || tenantData.securityDeposit || property?.security_deposit)}
                                        </p>
                                        <p className="text-xs text-blue-600 mt-2">Refundable at end of tenancy</p>
                                    </div>
                                </div>
                            </div>

                            {/* Tenure */}
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                                    <Calendar className="w-5 h-5 mr-2 text-purple-600" />
                                    Tenure Details
                                </h3>
                                <div className="bg-gray-50 rounded-xl p-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-gray-500 font-medium">Check-in Date</p>
                                            <p className="text-base font-semibold text-gray-900">{formatDate(tenantData.actualCheckInDate)}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500 font-medium">Agreement Status</p>
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                                                <CheckCircle className="w-4 h-4 mr-1" />
                                                Active
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>



                            <div className="border-t-2 border-gray-200 pt-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div>
                                        <p className="text-sm text-gray-500 font-medium mb-4">Landlord's Signature</p>
                                        <div className="border-b-2 border-gray-300 pb-4 mb-2">
                                            <div className="flex items-end justify-between">
                                                <p className="text-3xl text-indigo-900" style={{ fontFamily: '"Great Vibes", cursive' }}>
                                                    {tenantData.ownerName}
                                                </p>
                                                <span className="text-[10px] uppercase tracking-wider text-green-600 font-semibold border border-green-200 px-2 py-0.5 rounded bg-green-50">
                                                    Digitally Signed
                                                </span>
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-500">Date: {formatDate(tenantData.actualCheckInDate)}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 font-medium mb-4">Tenant's Signature</p>
                                        <div className="border-b-2 border-gray-300 pb-4 mb-2">
                                            <div className="flex items-end justify-between">
                                                <p className="text-3xl text-indigo-900" style={{ fontFamily: '"Great Vibes", cursive' }}>
                                                    {tenantData.userName}
                                                </p>
                                                <span className="text-[10px] uppercase tracking-wider text-green-600 font-semibold border border-green-200 px-2 py-0.5 rounded bg-green-50">
                                                    Digitally Signed
                                                </span>
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-500">Date: {formatDate(tenantData.actualCheckInDate)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="bg-gray-100 p-6 text-center border-t">
                            <p className="text-sm text-gray-600">
                                This is a digitally generated agreement. For any queries, please contact the property owner.
                            </p>
                        </div>
                    </motion.div>

                    {/* Terms & Conditions - Outside Agreement */}
                    <div className="mt-8 bg-white rounded-2xl shadow-xl overflow-hidden p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <Shield className="w-8 h-8 text-purple-600" />
                            <h3 className="text-2xl font-bold text-gray-900">Terms & Conditions</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-start gap-3 bg-gray-50 p-4 rounded-lg">
                                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                <p className="text-gray-700">The tenant shall pay the monthly rent on or before the 5th of every month.</p>
                            </div>
                            <div className="flex items-start gap-3 bg-gray-50 p-4 rounded-lg">
                                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                <p className="text-gray-700">The security deposit will be refunded within 30 days of vacating the premises, subject to deductions for damages.</p>
                            </div>
                            <div className="flex items-start gap-3 bg-gray-50 p-4 rounded-lg">
                                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                <p className="text-gray-700">The tenant must provide 30 days notice before vacating the property.</p>
                            </div>
                            <div className="flex items-start gap-3 bg-gray-50 p-4 rounded-lg">
                                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                <p className="text-gray-700">The tenant is responsible for maintaining the property in good condition.</p>
                            </div>
                            <div className="flex items-start gap-3 bg-gray-50 p-4 rounded-lg">
                                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                <p className="text-gray-700">Subletting is not permitted without prior written consent from the landlord.</p>
                            </div>
                            <div className="flex items-start gap-3 bg-gray-50 p-4 rounded-lg">
                                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                <p className="text-gray-700">The landlord reserves the right to inspect the property with 24 hours prior notice.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </SeekerLayout>
    );
};

export default TenantAgreement;
