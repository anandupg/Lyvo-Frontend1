import { useState, useEffect, useCallback } from 'react';
import apiClient from '../utils/apiClient';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const useTenantStatus = () => {
    const [isTenant, setIsTenant] = useState(false);
    const [tenantData, setTenantData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchTenantStatus = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // Use apiClient for consistent base URL handling
            const response = await apiClient.get('/property/user/tenant-status');

            const nextIsTenant = !!response.data.isTenant;
            setIsTenant(nextIsTenant);
            setTenantData(response.data.tenantData);

            // Persist tenant flag for global redirects (RootAuthCheck / getRedirectUrl)
            try {
                const raw = localStorage.getItem('user');
                if (raw) {
                    const user = JSON.parse(raw);
                    if (user && user.isTenant !== nextIsTenant) {
                        localStorage.setItem('user', JSON.stringify({ ...user, isTenant: nextIsTenant }));
                    }
                }
            } catch (storageErr) {
                console.warn('Failed to persist isTenant flag:', storageErr);
            }
        } catch (err) {
            console.error('Error fetching tenant status:', err);
            setError(err.message);
            setIsTenant(false);
            setTenantData(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTenantStatus();
    }, [fetchTenantStatus]);

    const refreshTenantStatus = useCallback(() => {
        fetchTenantStatus();
    }, [fetchTenantStatus]);

    return {
        isTenant,
        tenantData,
        loading,
        error,
        refreshTenantStatus
    };
};
