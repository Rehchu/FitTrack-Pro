import React, { useEffect, useState } from 'react';

/**
 * Private Demographics Component
 * Only visible to trainer and client, never in public profiles
 */
export function DemographicsTab({ client, apiBase }) {
  const [demographics, setDemographics] = useState({
    age: '',
    height: '',
    weight_goal: '',
    medical_conditions: '',
    injuries: '',
    medications: '',
    allergies: '',
    fitness_history: '',
    lifestyle_notes: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    loadDemographics();
  }, [client.id]);

  const loadDemographics = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${apiBase}/clients/${client.id}/demographics`);
      
      if (res.ok) {
        const data = await res.json();
        if (data) {
          setDemographics(data);
        }
      } else if (res.status !== 404) {
        throw new Error('Failed to load demographics');
      }
    } catch (err) {
      console.error('Load demographics error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const saveDemographics = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      
      const res = await fetch(`${apiBase}/clients/${client.id}/demographics`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(demographics)
      });
      
      if (!res.ok) throw new Error('Failed to save demographics');
      
      setSuccess('Demographics saved successfully!');
      setEditing(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Save demographics error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ 
        background: '#2a2f42', 
        padding: 16, 
        borderRadius: 8, 
        marginBottom: 16,
        borderLeft: '4px solid #9333EA'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 24 }}>🔒</span>
          <div>
            <h4 style={{ margin: 0, color: '#9333EA' }}>Private Information</h4>
            <div className="small" style={{ opacity: 0.8 }}>
              This information is only visible to you and {client.name}. Never shared publicly.
            </div>
          </div>
        </div>
      </div>

      {error && <div className="banner-warning" style={{ marginBottom: 12 }}>{error}</div>}
      {success && (
        <div style={{ 
          background: '#1BB55C33', 
          color: '#1BB55C', 
          padding: 12, 
          borderRadius: 8, 
          marginBottom: 12 
        }}>
          ✅ {success}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0 }}>👤 Demographics & Health Information</h3>
        {!editing && (
          <button onClick={() => setEditing(true)} className="btn-primary">
            Edit Information
          </button>
        )}
      </div>

      <form onSubmit={saveDemographics}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
          gap: 16 
        }}>
          <div style={{ background: '#2a2f42', padding: 16, borderRadius: 8 }}>
            <h4 style={{ marginTop: 0, color: '#FFB82B' }}>📊 Basic Information</h4>
            
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 4 }}>Age</label>
              <input 
                type="number" 
                value={demographics.age}
                onChange={(e) => setDemographics({...demographics, age: e.target.value})}
                disabled={!editing}
                min="1"
                max="120"
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 4 }}>Height (e.g., "5'10\" or 178cm")</label>
              <input 
                type="text" 
                value={demographics.height}
                onChange={(e) => setDemographics({...demographics, height: e.target.value})}
                disabled={!editing}
                placeholder="5'10&quot; or 178cm"
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ marginBottom: 0 }}>
              <label style={{ display: 'block', marginBottom: 4 }}>Weight Goal</label>
              <input 
                type="text" 
                value={demographics.weight_goal}
                onChange={(e) => setDemographics({...demographics, weight_goal: e.target.value})}
                disabled={!editing}
                placeholder="e.g., 180 lbs, Maintain, Bulk"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div style={{ background: '#2a2f42', padding: 16, borderRadius: 8 }}>
            <h4 style={{ marginTop: 0, color: '#FF4B39' }}>🏥 Medical Information</h4>
            
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 4 }}>Medical Conditions</label>
              <textarea 
                value={demographics.medical_conditions}
                onChange={(e) => setDemographics({...demographics, medical_conditions: e.target.value})}
                disabled={!editing}
                rows="3"
                placeholder="Diabetes, hypertension, etc."
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 4 }}>Current Injuries</label>
              <textarea 
                value={demographics.injuries}
                onChange={(e) => setDemographics({...demographics, injuries: e.target.value})}
                disabled={!editing}
                rows="3"
                placeholder="Knee pain, shoulder injury, etc."
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ marginBottom: 0 }}>
              <label style={{ display: 'block', marginBottom: 4 }}>Medications</label>
              <textarea 
                value={demographics.medications}
                onChange={(e) => setDemographics({...demographics, medications: e.target.value})}
                disabled={!editing}
                rows="2"
                placeholder="Current medications"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div style={{ background: '#2a2f42', padding: 16, borderRadius: 8 }}>
            <h4 style={{ marginTop: 0, color: '#1BB55C' }}>🍎 Allergies & Restrictions</h4>
            
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 4 }}>Food Allergies</label>
              <textarea 
                value={demographics.allergies}
                onChange={(e) => setDemographics({...demographics, allergies: e.target.value})}
                disabled={!editing}
                rows="3"
                placeholder="Nuts, dairy, gluten, etc."
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ marginBottom: 0 }}>
              <label style={{ display: 'block', marginBottom: 4 }}>Fitness History</label>
              <textarea 
                value={demographics.fitness_history}
                onChange={(e) => setDemographics({...demographics, fitness_history: e.target.value})}
                disabled={!editing}
                rows="3"
                placeholder="Previous training experience, sports background, etc."
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div style={{ background: '#2a2f42', padding: 16, borderRadius: 8 }}>
            <h4 style={{ marginTop: 0, color: '#9333EA' }}>📝 Lifestyle Notes</h4>
            
            <div style={{ marginBottom: 0 }}>
              <label style={{ display: 'block', marginBottom: 4 }}>Additional Notes</label>
              <textarea 
                value={demographics.lifestyle_notes}
                onChange={(e) => setDemographics({...demographics, lifestyle_notes: e.target.value})}
                disabled={!editing}
                rows="6"
                placeholder="Work schedule, stress levels, sleep patterns, preferences, goals, etc."
                style={{ width: '100%' }}
              />
            </div>
          </div>
        </div>

        {editing && (
          <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Save Demographics'}
            </button>
            <button 
              type="button" 
              onClick={() => {
                setEditing(false);
                loadDemographics();
              }}
              style={{ background: '#3a3f52' }}
            >
              Cancel
            </button>
          </div>
        )}
      </form>

      {loading && <div className="small" style={{ marginTop: 12 }}>Loading...</div>}
    </div>
  );
}
