import { useState, useCallback } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function useCases(getToken) {
  const [cases, setCases] = useState([]);
  const [loadingCases, setLoadingCases] = useState(false);
  const [activeCaseId, setActiveCaseId] = useState(null);

  const authHeaders = () => {
    const token = getToken();
    return token
      ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      : { 'Content-Type': 'application/json' };
  };

  // Load all cases for the user
  const loadCases = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoadingCases(true);
    try {
      const res = await fetch(`${API}/api/cases`, { headers: authHeaders() });
      const data = await res.json();
      setCases(data.cases || []);
    } catch (err) {
      console.error('Load cases error:', err);
    } finally {
      setLoadingCases(false);
    }
  }, [getToken]);

  // Load a single case (returns full messages)
  const loadCase = useCallback(async (id) => {
    const res = await fetch(`${API}/api/cases/${id}`, { headers: authHeaders() });
    const data = await res.json();
    return data.case;
  }, [getToken]);

  // Save current conversation as a new case
  const saveCase = useCallback(async ({ messages, category, language, summary, letter }) => {
    const token = getToken();
    if (!token) return null;
    try {
      const res = await fetch(`${API}/api/cases`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ messages, category, language, summary, letter }),
      });
      const data = await res.json();
      if (data.case) {
        setCases(prev => [data.case, ...prev]);
        setActiveCaseId(data.case.id);
      }
      return data.case;
    } catch (err) {
      console.error('Save case error:', err);
      return null;
    }
  }, [getToken]);

  // Update an existing case (e.g. append messages or attach letter/summary)
  const updateCase = useCallback(async (id, updates) => {
    const token = getToken();
    if (!token || !id) return;
    try {
      const res = await fetch(`${API}/api/cases/${id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (data.case) {
        setCases(prev => prev.map(c => c.id === id ? { ...c, ...data.case } : c));
      }
    } catch (err) {
      console.error('Update case error:', err);
    }
  }, [getToken]);

  // Delete a case
  const deleteCase = useCallback(async (id) => {
    const token = getToken();
    if (!token) return;
    try {
      await fetch(`${API}/api/cases/${id}`, { method: 'DELETE', headers: authHeaders() });
      setCases(prev => prev.filter(c => c.id !== id));
      if (activeCaseId === id) setActiveCaseId(null);
    } catch (err) {
      console.error('Delete case error:', err);
    }
  }, [getToken, activeCaseId]);

  return {
    cases,
    loadingCases,
    activeCaseId,
    setActiveCaseId,
    loadCases,
    loadCase,
    saveCase,
    updateCase,
    deleteCase,
  };
}
