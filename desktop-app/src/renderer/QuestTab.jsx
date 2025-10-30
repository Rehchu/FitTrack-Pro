import React, { useEffect, useState } from 'react';

/**
 * Quest Assignment Component for Trainers
 * Assign quests/achievements to motivate clients
 */
export function QuestTab({ client, apiBase }) {
  const [templates, setTemplates] = useState([]);
  const [activeQuests, setActiveQuests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');

  useEffect(() => {
    loadTemplates();
    loadActiveQuests();
  }, [client.id]);

  const loadTemplates = async () => {
    try {
      const res = await fetch(`${apiBase}/quests/templates`);
      if (!res.ok) throw new Error('Failed to load templates');
      const data = await res.json();
      setTemplates(data);
    } catch (err) {
      console.error('Load templates error:', err);
      setError(err.message);
    }
  };

  const loadActiveQuests = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${apiBase}/clients/${client.id}/quests`);
      if (!res.ok) throw new Error('Failed to load quests');
      const data = await res.json();
      setActiveQuests(data);
    } catch (err) {
      console.error('Load quests error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const assignQuest = async () => {
    if (!selectedTemplate) return;

    try {
      setLoading(true);
      setError('');
      
      const res = await fetch(`${apiBase}/clients/${client.id}/quests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_id: selectedTemplate })
      });
      
      if (!res.ok) throw new Error('Failed to assign quest');
      
      setSelectedTemplate('');
      await loadActiveQuests();
    } catch (err) {
      console.error('Assign quest error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'easy': return '#1BB55C';
      case 'medium': return '#FFB82B';
      case 'hard': return '#FF4B39';
      case 'epic': return '#9333EA';
      default: return '#9ca3af';
    }
  };

  const getDifficultyEmoji = (difficulty) => {
    switch (difficulty) {
      case 'easy': return '⭐';
      case 'medium': return '⭐⭐';
      case 'hard': return '⭐⭐⭐';
      case 'epic': return '💎';
      default: return '📋';
    }
  };

  return (
    <div style={{ marginTop: 16 }}>
      <h3 style={{ color: '#FFB82B' }}>🎯 Quest Assignment for {client.name}</h3>
      
      {error && <div className="banner-warning" style={{ marginBottom: 12 }}>{error}</div>}

      <div style={{ 
        background: '#2a2f42', 
        padding: 20, 
        borderRadius: 8, 
        marginBottom: 24 
      }}>
        <h4 style={{ marginTop: 0 }}>📜 Assign New Quest</h4>
        
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 8 }}>Select Quest Template:</label>
          <select 
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
            style={{ width: '100%', padding: 12 }}
          >
            <option value="">-- Choose a quest --</option>
            {templates.map(t => (
              <option key={t.id} value={t.id}>
                {getDifficultyEmoji(t.difficulty)} {t.name} - {t.xp_reward} XP
              </option>
            ))}
          </select>
        </div>

        {selectedTemplate && (
          <div style={{ 
            background: '#1a1d2e', 
            padding: 16, 
            borderRadius: 8, 
            marginBottom: 12 
          }}>
            {templates.filter(t => t.id == selectedTemplate).map(quest => (
              <div key={quest.id}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: 8
                }}>
                  <h4 style={{ margin: 0 }}>{quest.name}</h4>
                  <div style={{ 
                    padding: '4px 12px', 
                    borderRadius: 20, 
                    background: getDifficultyColor(quest.difficulty) + '33',
                    color: getDifficultyColor(quest.difficulty),
                    fontSize: 13,
                    fontWeight: 'bold'
                  }}>
                    {getDifficultyEmoji(quest.difficulty)} {quest.difficulty.toUpperCase()}
                  </div>
                </div>
                <p style={{ margin: '8px 0' }}>{quest.description}</p>
                <div className="small" style={{ opacity: 0.8 }}>
                  <strong>Objective:</strong> {quest.criteria_description}
                </div>
                <div className="small" style={{ marginTop: 4, color: '#FFB82B' }}>
                  🏆 Reward: {quest.xp_reward} XP
                </div>
              </div>
            ))}
          </div>
        )}

        <button 
          onClick={assignQuest}
          className="btn-primary"
          disabled={!selectedTemplate || loading}
          style={{ opacity: (!selectedTemplate || loading) ? 0.5 : 1 }}
        >
          {loading ? 'Assigning...' : 'Assign Quest'}
        </button>
      </div>

      <div>
        <h4>🔥 Active Quests ({activeQuests.filter(q => q.status === 'active').length})</h4>
        {activeQuests.filter(q => q.status === 'active').length === 0 ? (
          <div className="small" style={{ padding: 16, background: '#2a2f42', borderRadius: 8 }}>
            No active quests. Assign a quest to motivate {client.name}!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {activeQuests.filter(q => q.status === 'active').map(quest => (
              <div key={quest.id} style={{ 
                background: '#2a2f42', 
                padding: 16, 
                borderRadius: 8,
                borderLeft: `4px solid ${getDifficultyColor(quest.difficulty)}`
              }}>
                <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'start', marginBottom: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 4 }}>
                      {quest.name}
                    </div>
                    <div className="small" style={{ opacity: 0.8, marginBottom: 8 }}>
                      {quest.description}
                    </div>
                  </div>
                  <div style={{ 
                    padding: '4px 12px', 
                    borderRadius: 20, 
                    background: getDifficultyColor(quest.difficulty) + '33',
                    color: getDifficultyColor(quest.difficulty),
                    fontSize: 11,
                    fontWeight: 'bold',
                    whiteSpace: 'nowrap',
                    marginLeft: 12
                  }}>
                    {getDifficultyEmoji(quest.difficulty)} {quest.difficulty}
                  </div>
                </div>

                <div style={{ 
                  background: '#1a1d2e', 
                  borderRadius: 8, 
                  padding: 8, 
                  marginBottom: 8 
                }}>
                  <div style={{ 
                    height: 8, 
                    background: '#3a3f52', 
                    borderRadius: 4, 
                    overflow: 'hidden' 
                  }}>
                    <div style={{ 
                      width: `${quest.progress || 0}%`, 
                      height: '100%', 
                      background: getDifficultyColor(quest.difficulty),
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                  <div className="small" style={{ marginTop: 4, textAlign: 'center' }}>
                    Progress: {quest.progress || 0}%
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="small" style={{ color: '#FFB82B' }}>
                    🏆 {quest.xp_reward} XP
                  </div>
                  <div className="small" style={{ opacity: 0.6 }}>
                    Started: {new Date(quest.assigned_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: 24 }}>
        <h4 style={{ color: '#1BB55C' }}>✅ Completed Quests ({activeQuests.filter(q => q.status === 'completed').length})</h4>
        {activeQuests.filter(q => q.status === 'completed').length === 0 ? (
          <div className="small" style={{ padding: 16, background: '#2a2f42', borderRadius: 8, opacity: 0.6 }}>
            No completed quests yet
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {activeQuests.filter(q => q.status === 'completed').slice(0, 5).map(quest => (
              <div key={quest.id} style={{ 
                background: '#2a2f42', 
                padding: 12, 
                borderRadius: 8,
                opacity: 0.8
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                      ✅ {quest.name}
                    </div>
                    <div className="small" style={{ opacity: 0.7 }}>
                      Completed: {quest.completed_at ? new Date(quest.completed_at).toLocaleDateString() : 'N/A'}
                    </div>
                  </div>
                  <div style={{ 
                    padding: '6px 12px', 
                    borderRadius: 20, 
                    background: '#1BB55C33',
                    color: '#1BB55C',
                    fontSize: 13,
                    fontWeight: 'bold'
                  }}>
                    +{quest.xp_reward} XP
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {loading && <div className="small" style={{ marginTop: 12 }}>Loading...</div>}
    </div>
  );
}
