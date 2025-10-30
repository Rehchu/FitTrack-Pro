import React, { useEffect, useState } from 'react';

/**
 * Video Call Scheduling Component
 * Allows trainers to schedule video calls with clients
 */
export function VideoCallTab({ client, apiBase }) {
  const [upcomingCalls, setUpcomingCalls] = useState([]);
  const [pastCalls, setPastCalls] = useState([]);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [scheduleForm, setScheduleForm] = useState({
    scheduled_time: '',
    duration: 30,
    meeting_url: '',
    notes: ''
  });

  useEffect(() => {
    loadCalls();
  }, [client.id]);

  const loadCalls = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${apiBase}/video/calls/${client.id}`);
      if (!res.ok) throw new Error('Failed to load calls');
      
      const data = await res.json();
      const now = new Date();
      
      const upcoming = data.filter(call => new Date(call.scheduled_time) > now);
      const past = data.filter(call => new Date(call.scheduled_time) <= now);
      
      setUpcomingCalls(upcoming);
      setPastCalls(past);
    } catch (err) {
      console.error('Load calls error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const scheduleCall = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError('');
      
      const res = await fetch(`${apiBase}/video/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: client.id,
          ...scheduleForm
        })
      });
      
      if (!res.ok) throw new Error('Failed to schedule call');
      
      // Reset form and reload
      setScheduleForm({
        scheduled_time: '',
        duration: 30,
        meeting_url: '',
        notes: ''
      });
      setShowScheduleForm(false);
      await loadCalls();
    } catch (err) {
      console.error('Schedule call error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateCallStatus = async (callId, status) => {
    try {
      const res = await fetch(`${apiBase}/video/calls/${callId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      
      if (!res.ok) throw new Error('Failed to update call');
      await loadCalls();
    } catch (err) {
      console.error('Update call error:', err);
      setError(err.message);
    }
  };

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0 }}>📹 Video Calls with {client.name}</h3>
        <button onClick={() => setShowScheduleForm(!showScheduleForm)} className="btn-primary">
          {showScheduleForm ? 'Cancel' : 'Schedule Call'}
        </button>
      </div>

      {error && <div className="banner-warning" style={{ marginBottom: 12 }}>{error}</div>}

      {showScheduleForm && (
        <form onSubmit={scheduleCall} style={{ 
          background: '#2a2f42', 
          padding: 20, 
          borderRadius: 8, 
          marginBottom: 20 
        }}>
          <h4 style={{ marginTop: 0, color: '#FFB82B' }}>Schedule New Call</h4>
          
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 4 }}>Date & Time</label>
            <input 
              type="datetime-local" 
              value={scheduleForm.scheduled_time}
              onChange={(e) => setScheduleForm({...scheduleForm, scheduled_time: e.target.value})}
              required
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 4 }}>Duration (minutes)</label>
            <input 
              type="number" 
              value={scheduleForm.duration}
              onChange={(e) => setScheduleForm({...scheduleForm, duration: parseInt(e.target.value)})}
              min="15"
              max="180"
              step="15"
              required
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 4 }}>Meeting URL (Zoom, Google Meet, etc.)</label>
            <input 
              type="url" 
              value={scheduleForm.meeting_url}
              onChange={(e) => setScheduleForm({...scheduleForm, meeting_url: e.target.value})}
              placeholder="https://zoom.us/j/..."
              required
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 4 }}>Notes (optional)</label>
            <textarea 
              value={scheduleForm.notes}
              onChange={(e) => setScheduleForm({...scheduleForm, notes: e.target.value})}
              rows="3"
              placeholder="Agenda, topics to discuss, etc."
              style={{ width: '100%' }}
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Scheduling...' : 'Schedule Call'}
          </button>
        </form>
      )}

      <div style={{ marginBottom: 24 }}>
        <h4 style={{ color: '#1BB55C' }}>📅 Upcoming Calls ({upcomingCalls.length})</h4>
        {upcomingCalls.length === 0 ? (
          <div className="small" style={{ padding: 16, background: '#2a2f42', borderRadius: 8 }}>
            No upcoming calls scheduled
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {upcomingCalls.map(call => (
              <div key={call.id} style={{ 
                background: '#2a2f42', 
                padding: 16, 
                borderRadius: 8,
                borderLeft: '4px solid #1BB55C'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>
                      {new Date(call.scheduled_time).toLocaleString()}
                    </div>
                    <div className="small" style={{ marginBottom: 4 }}>
                      Duration: {call.duration} minutes
                    </div>
                    {call.notes && (
                      <div className="small" style={{ marginTop: 8, opacity: 0.9 }}>
                        📝 {call.notes}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <a 
                      href={call.meeting_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="btn-primary"
                      style={{ textDecoration: 'none', fontSize: 13 }}
                    >
                      Join Call
                    </a>
                    <button 
                      onClick={() => updateCallStatus(call.id, 'completed')}
                      style={{ fontSize: 13, background: '#3a3f52' }}
                    >
                      Mark Complete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h4 style={{ color: '#9ca3af' }}>📜 Past Calls ({pastCalls.length})</h4>
        {pastCalls.length === 0 ? (
          <div className="small" style={{ padding: 16, background: '#2a2f42', borderRadius: 8 }}>
            No past calls
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {pastCalls.slice(0, 10).map(call => (
              <div key={call.id} style={{ 
                background: '#2a2f42', 
                padding: 12, 
                borderRadius: 8,
                opacity: 0.8
              }}>
                <div style={{ fontSize: 14, marginBottom: 4 }}>
                  {new Date(call.scheduled_time).toLocaleDateString()} - {call.duration} min
                </div>
                {call.notes && (
                  <div className="small" style={{ opacity: 0.7 }}>
                    {call.notes}
                  </div>
                )}
                {call.recording_url && (
                  <a 
                    href={call.recording_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="small"
                    style={{ color: '#FFB82B', marginTop: 4, display: 'block' }}
                  >
                    📹 View Recording
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {loading && <div className="small" style={{ marginTop: 12 }}>Loading...</div>}
    </div>
  );
}
