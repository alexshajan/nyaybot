import { useState, useRef, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { useNyayBot } from './hooks/useNyayBot';
import { useCases } from './hooks/useCases';
import { CaseHistory } from './components/CaseHistory';
import { translations } from './i18n/translations';
import { FIR_PORTALS } from './data/firPortals';
import './App.css';

const CATEGORIES = [
  { id: 'consumer', icon: '🛒' },
  { id: 'police', icon: '🚔' },
  { id: 'employment', icon: '💼' },
  { id: 'landlord', icon: '🏠' },
  { id: 'cyber', icon: '💻' },
  { id: 'rti', icon: '📋' },
];

export default function App() {
  const [lang, setLang] = useState('en');
  const [cat, setCat] = useState('consumer');
  const [input, setInput] = useState('');
  const [modal, setModal] = useState(null);
  const [chipsVisible, setChipsVisible] = useState(true);
  const [modalLoading, setModalLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // null | 'saving' | 'saved' | 'error'
  const [historyOpen, setHistoryOpen] = useState(false);

  const { user, loading: authLoading, signInWithGoogle, signOut, getToken } = useAuth();
  const { messages, history, loading, hasConversation, addMessage, resetChat, sendMessage, generateLetter, generateSummary } = useNyayBot(getToken);
  const { cases, loadingCases, activeCaseId, setActiveCaseId, loadCases, loadCase, saveCase, updateCase, deleteCase } = useCases(getToken);

  const msgsRef = useRef(null);
  const t = translations[lang];

  // Welcome message on mount
  useEffect(() => {
    addMessage('bot', t.welcome, true);
  }, []);

  // Scroll to bottom on new message
  useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight;
  }, [messages, loading]);

  // Load cases when user logs in
  useEffect(() => {
    if (user) loadCases();
  }, [user]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    setChipsVisible(false);
    const text = input;
    setInput('');
    await sendMessage(text, cat, lang);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleChip = (text) => {
    setChipsVisible(false);
    sendMessage(text, cat, lang);
  };

  // Save current conversation
  const handleSave = async () => {
    if (!user) { signInWithGoogle(); return; }
    if (!hasConversation) return;
    setSaveStatus('saving');
    try {
      if (activeCaseId) {
        await updateCase(activeCaseId, { messages: history });
      } else {
        await saveCase({ messages: history, category: cat, language: lang });
      }
      setSaveStatus('saved');
    } catch {
      setSaveStatus('error');
    }
    setTimeout(() => setSaveStatus(null), 2500);
  };

  // Load a saved case into the chat
  const handleLoadCase = async (id) => {
    const caseData = await loadCase(id);
    if (!caseData) return;
    setActiveCaseId(id);
    setCat(caseData.category || 'consumer');
    setLang(caseData.language || 'en');
    setChipsVisible(false);
    setHistoryOpen(false);
    resetChat();
    // Replay messages into UI
    caseData.messages.forEach(m => {
      if (m.role === 'user') addMessage('user', m.content, false);
      else addMessage('bot', m.content, true);
    });
  };

  const handleNewCase = () => {
    setActiveCaseId(null);
    setChipsVisible(true);
    resetChat(t.welcome);
    setHistoryOpen(false);
  };

  const handleLetter = async () => {
    if (!hasConversation) { setModal({ type: 'info', message: t.chatFirst }); return; }
    setModal({ type: 'letter', content: null });
    setModalLoading(true);
    try {
      const letter = await generateLetter(lang);
      setModal({ type: 'letter', content: letter });
      if (activeCaseId) updateCase(activeCaseId, { letter });
    } catch { setModal({ type: 'error' }); }
    setModalLoading(false);
  };

  const handleSummary = async () => {
    if (!hasConversation) { setModal({ type: 'info', message: t.chatFirst }); return; }
    setModal({ type: 'summary', content: null });
    setModalLoading(true);
    try {
      const summary = await generateSummary();
      setModal({ type: 'summary', content: summary });
      if (activeCaseId) updateCase(activeCaseId, { summary });
    } catch { setModal({ type: 'error' }); }
    setModalLoading(false);
  };

  if (authLoading) return <div className="auth-loading">Loading…</div>;

  return (
    <div className="app">
      {/* Top bar */}
      <header className="topbar">
        <div className="logo">
          <div className="logo-icon">⚖</div>
          <div>
            <div className="logo-text">NyayBot</div>
            <div className="logo-sub">Know your rights</div>
          </div>
        </div>
        <div className="topbar-right">
          {['en', 'hi', 'ml'].map(l => (
            <button key={l} className={`lang-btn ${lang === l ? 'active' : ''}`} onClick={() => setLang(l)}>
              {l === 'en' ? 'EN' : l === 'hi' ? 'हि' : 'മ'}
            </button>
          ))}
          <span className="beta">Beta</span>
          {user ? (
            <div className="user-area">
              <img src={user.user_metadata?.avatar_url} alt="" className="user-avatar" />
              <span className="user-name">{user.user_metadata?.name?.split(' ')[0]}</span>
              <button className="signout-btn" onClick={signOut}>Sign out</button>
            </div>
          ) : (
            <button className="google-btn" onClick={signInWithGoogle}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{flexShrink:0}}>
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Sign in
            </button>
          )}
        </div>
      </header>

      <div className="layout">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-label">Legal Areas</div>
          {CATEGORIES.map(c => (
            <button
              key={c.id}
              className={`cat-btn ${cat === c.id ? 'active' : ''}`}
              onClick={() => { setCat(c.id); setChipsVisible(true); setHistoryOpen(false); }}
            >
              <span className="cat-icon">{c.icon}</span>
              {t.categories[c.id]}
            </button>
          ))}
          <div className="sidebar-divider" />
          <div className="sidebar-label">Tools</div>
          <button className="cat-btn" onClick={() => setModal({ type: 'fir' })}>
            <span className="cat-icon">🗺</span> FIR Portals
          </button>
          <button className="cat-btn" onClick={handleLetter}>
            <span className="cat-icon">📄</span> Draft Letter
          </button>
          <button className="cat-btn" onClick={handleSummary}>
            <span className="cat-icon">🔗</span> Share Summary
          </button>
          {user && (
            <>
              <div className="sidebar-divider" />
              <button className="cat-btn" onClick={handleNewCase}>
                <span className="cat-icon">✏️</span> New Case
              </button>
              <button className={`cat-btn ${historyOpen ? 'active' : ''}`} onClick={() => setHistoryOpen(h => !h)}>
                <span className="cat-icon">📂</span> Case History
              </button>
              {historyOpen && (
                <CaseHistory
                  cases={cases}
                  loadingCases={loadingCases}
                  activeCaseId={activeCaseId}
                  onLoad={handleLoadCase}
                  onDelete={deleteCase}
                  onLoadCases={loadCases}
                />
              )}
            </>
          )}
        </aside>

        {/* Main chat */}
        <main className="main">
          <div className="msgs" ref={msgsRef}>
            {messages.map(msg => (
              <div key={msg.id} className={`msg ${msg.role}`}>
                {msg.role === 'bot' && <div className="av">⚖</div>}
                {msg.role === 'user' && <div className="av av-user">👤</div>}
                <div
                  className="bubble"
                  {...(msg.isHTML
                    ? { dangerouslySetInnerHTML: { __html: msg.content } }
                    : { children: msg.content }
                  )}
                />
              </div>
            ))}
            {loading && (
              <div className="msg bot">
                <div className="av">⚖</div>
                <div className="typing-ind"><span /><span /><span /></div>
              </div>
            )}
          </div>

          {hasConversation && (
            <div className="action-bar">
              <button className="action-btn primary" onClick={handleLetter}>📄 {t.draftLetter}</button>
              <button className="action-btn" onClick={handleSummary}>🔗 {t.shareSummary}</button>
              {user && (
                <button className="action-btn save-btn" onClick={handleSave} disabled={saveStatus === 'saving'}>
                  {saveStatus === 'saving' ? '…' : saveStatus === 'saved' ? '✓ Saved' : saveStatus === 'error' ? '⚠ Error' : activeCaseId ? '↑ Update' : '💾 Save case'}
                </button>
              )}
              {!user && (
                <button className="action-btn" onClick={signInWithGoogle}>Sign in to save</button>
              )}
            </div>
          )}

          {chipsVisible && (
            <div className="chips">
              {(t.chips[cat] || []).map(chip => (
                <button key={chip} className="chip" onClick={() => handleChip(chip)}>{chip}</button>
              ))}
            </div>
          )}

          <div className="input-row">
            <textarea
              className="inp"
              rows={1}
              value={input}
              placeholder={t.placeholder}
              onChange={e => {
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
              }}
              onKeyDown={handleKey}
            />
            <button className="send-btn" disabled={loading || !input.trim()} onClick={handleSend}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 8L14 8M14 8L9 3M14 8L9 13" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          <div className="disc">{t.disclaimer}</div>
        </main>
      </div>

      {/* Modal */}
      {modal && (
        <div className="modal-bg" onClick={e => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className="modal">
            <div className="modal-head">
              <span className="modal-title">
                {modal.type === 'letter' ? '📄 Complaint Letter'
                  : modal.type === 'summary' ? '🔗 Case Summary'
                  : modal.type === 'fir' ? '🗺 ' + t.firPortals
                  : 'Info'}
              </span>
              <button className="modal-close" onClick={() => setModal(null)}>×</button>
            </div>
            <div className="modal-body">
              {modal.type === 'fir' && (
                <>
                  <p className="fir-note">{t.firNote}</p>
                  <div className="fir-grid">
                    {FIR_PORTALS.map(p => (
                      <div key={p.state} className="fir-card">
                        <div className="fir-state">{p.state}</div>
                        {p.note && <div className="fir-note-sm">{p.note}</div>}
                        <a className="fir-link" href={p.url} target="_blank" rel="noreferrer">{p.url.replace('https://', '')}</a>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {(modal.type === 'letter' || modal.type === 'summary') && (
                modalLoading
                  ? <div className="modal-loading"><div className="typing-ind"><span /><span /><span /></div><span>{t.generating}</span></div>
                  : modal.content
                    ? <pre className="modal-pre">{modal.content}</pre>
                    : <p className="modal-err">Something went wrong. Please try again.</p>
              )}
              {modal.type === 'info' && <p className="modal-info">{modal.message}</p>}
            </div>
            <div className="modal-foot">
              {(modal.type === 'letter' || modal.type === 'summary') && modal.content && (
                <CopyButton
                  text={modal.content}
                  label={modal.type === 'letter' ? t.copyLetter : t.copySummary}
                  copiedLabel={t.copied}
                />
              )}
              <button className="action-btn" onClick={() => setModal(null)}>{t.close}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CopyButton({ text, label, copiedLabel }) {
  const [copied, setCopied] = useState(false);
  return (
    <button className="action-btn" onClick={() => {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }}>
      {copied ? copiedLabel : label}
    </button>
  );
}
