// src/components/SearchBar.jsx
import React, { useState } from 'react';
import { api } from '../api/client';

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setAnswer(null);

    try {
      const res = await api.ai.search(query);
      setAnswer(res.answer);
    } catch (err) {
      setError(err.messageHi || err.message || 'AI assistant temporarily unavailable. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="biteshare-ai-search" style={{ margin: '10px 0', width: '100%' }}>
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, width: '100%' }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask AI anything (e.g. 'How to safely store cooked rice', 'Leftover recipes', 'Iska matlab kya hai')..."
          style={{
            flex: 1,
            padding: '10px 14px',
            border: '1.5px solid #ebdccb',
            borderRadius: 8,
            fontSize: 14,
            outline: 'none',
            background: '#ffffff'
          }}
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            background: '#f25c05',
            color: '#fff',
            border: 'none',
            padding: '10px 18px',
            borderRadius: 8,
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 14,
            whiteSpace: 'nowrap'
          }}
        >
          {loading ? 'Thinking... 🤖' : '✨ Ask AI'}
        </button>
      </form>

      {error && (
        <div style={{ marginTop: 8, padding: '8px 12px', background: '#ffe3e3', color: '#c92a2a', borderRadius: 6, fontSize: 13 }}>
          {error}
        </div>
      )}

      {answer && (
        <div style={{ marginTop: 10, padding: 14, background: '#fdfbf7', borderLeft: '4px solid #2d6a4f', borderRadius: 6, fontSize: 14, lineHeight: 1.6, color: '#2b2b2b' }}>
          <div style={{ fontWeight: 600, color: '#2d6a4f', marginBottom: 4 }}>🤖 BiteShare AI Guide:</div>
          <div style={{ whiteSpace: 'pre-line' }}>{answer}</div>
        </div>
      )}
    </div>
  );
}
