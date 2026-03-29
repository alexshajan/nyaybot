import { useState, useCallback } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function useNyayBot(getToken) {
  const [messages, setMessages] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  const authHeaders = () => {
    const token = getToken?.();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const addMessage = useCallback((role, content, isHTML = false) => {
    setMessages(prev => [...prev, { role, content, isHTML, id: Date.now() + Math.random() }]);
  }, []);

  const resetChat = useCallback((welcomeMsg) => {
    setMessages(welcomeMsg ? [{ role: 'bot', content: welcomeMsg, isHTML: true, id: Date.now() }] : []);
    setHistory([]);
  }, []);

  const sendMessage = useCallback(async (text, category, language) => {
    if (!text.trim() || loading) return;

    const userMsg = { role: 'user', content: text };
    const newHistory = [...history, userMsg];

    addMessage('user', text);
    setHistory(newHistory);
    setLoading(true);

    try {
      const res = await fetch(`${API}/api/chat`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ messages: newHistory, category, language }),
      });
      const data = await res.json();
      const reply = data.content || 'Sorry, something went wrong.';
      setHistory(prev => [...prev, { role: 'assistant', content: reply }]);
      addMessage('bot', reply, true);
    } catch {
      addMessage('bot', 'Connection error. Please try again.', false);
    } finally {
      setLoading(false);
    }
  }, [history, loading, addMessage, getToken]);

  const generateLetter = useCallback(async (language) => {
    if (history.length < 2) return null;
    const res = await fetch(`${API}/api/generate-letter`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ messages: history, language }),
    });
    const data = await res.json();
    return data.letter;
  }, [history, getToken]);

  const generateSummary = useCallback(async () => {
    if (history.length < 2) return null;
    const res = await fetch(`${API}/api/summarise`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ messages: history }),
    });
    const data = await res.json();
    return data.summary;
  }, [history, getToken]);

  const hasConversation = history.length >= 2;

  return {
    messages,
    history,
    loading,
    hasConversation,
    addMessage,
    resetChat,
    sendMessage,
    generateLetter,
    generateSummary,
  };
}
