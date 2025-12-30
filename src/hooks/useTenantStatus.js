import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

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

            const token = localStorage.getItem('authToken');
            if (!token) {
                setIsTenant(false);
                setTenantData(null);
                setLoading(false);
                return;
            }

            const response = await axios.get(`${API_URL}/property/user/tenant-status`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setIsTenant(response.data.isTenant);
            setTenantData(response.data.tenantData);
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
