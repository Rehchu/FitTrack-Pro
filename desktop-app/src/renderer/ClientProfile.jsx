import React, { useEffect, useMemo, useState } from 'react';
import { FitnessAvatar, calculateProgressScore } from './FitnessAvatar';
import { WorkoutBuilder } from './WorkoutBuilder';
import { MealBuilder } from './MealBuilder';

export function ClientProfile({ client, apiBase, onBack, onEmail, onShare }) {
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [measurements, setMeasurements] = useState([]);
  const [meals, setMeals] = useState([]);
  const [workouts, setWorkouts] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [weightInput, setWeightInput] = useState('');
  const [activeTab, setActiveTab] = useState('summary');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showWorkoutBuilder, setShowWorkoutBuilder] = useState(false);
  const [showMealBuilder, setShowMealBuilder] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showMeasurementForm, setShowMeasurementForm] = useState(false);
  const [measurementForm, setMeasurementForm] = useState({
    weight: '',
    body_fat: '',
    chest: '',
    waist: '',
    hips: '',
    biceps_left: '',
    biceps_right: '',
    thigh_left: '',
    thigh_right: '',
    calf_left: '',
    calf_right: ''
  });

  const cid = client?.id;

  useEffect(() => {
    let revoked = false;
    async function loadAvatar() {
      try {
        const resp = await fetch(`${apiBase}/clients/${cid}/avatar`);
        if (!resp.ok) throw new Error(`avatar ${resp.status}`);
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        if (!revoked) setAvatarUrl(url);
      } catch (e) {
        // no-op; avatar optional
      }
    }
    if (cid) loadAvatar();
    return () => {
      revoked = true;
      if (avatarUrl) URL.revokeObjectURL(avatarUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cid]);

  async function refreshAll() {
    setLoading(true);
    setError('');
    try {
      const [mRes, mealRes, workoutRes, aRes] = await Promise.all([
        fetch(`${apiBase}/clients/${cid}/measurements`),
        fetch(`${apiBase}/clients/${cid}/meals`),
        fetch(`${apiBase}/clients/${cid}/workouts`),
        fetch(`${apiBase}/clients/${cid}/achievements`),
      ]);
      if (!mRes.ok || !mealRes.ok || !workoutRes.ok || !aRes.ok) throw new Error('Failed to load client data');
      const [mJson, mealJson, workoutJson, aJson] = await Promise.all([
        mRes.json(), 
        mealRes.json(), 
        workoutRes.json(),
        aRes.json()
      ]);
      setMeasurements(mJson || []);
      setMeals(mealJson || []);
      setWorkouts(workoutJson || []);
      setAchievements(aJson || []);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (cid) refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cid, apiBase]);

  async function addWeight() {
    const v = parseFloat(weightInput);
    if (!v || isNaN(v)) {
      alert('Enter a valid weight');
      return;
    }
    try {
      const resp = await fetch(`${apiBase}/clients/${cid}/weights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weight: v }),
      });
      if (!resp.ok) throw new Error('Failed to add weight');
      setWeightInput('');
      refreshAll();
    } catch (e) {
      alert(e.message || 'Failed to add weight');
    }
  }

  async function openPdf() {
    try {
      const resp = await fetch(`${apiBase}/clients/${cid}/pdf?embed_avatar=true`, {
        method: 'POST'
      });
      if (!resp.ok) throw new Error('PDF generation failed');
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${client.name || 'client'}-plan.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2500);
    } catch (e) {
      alert(e.message || 'Unable to generate PDF');
    }
  }

  async function deleteClient() {
    if (!confirm(`Are you sure you want to delete ${client.name}? This will permanently remove all their data including measurements, meals, workouts, and achievements. This action cannot be undone.`)) {
      return;
    }
    try {
      const resp = await fetch(`${apiBase}/clients/${cid}`, {
        method: 'DELETE'
      });
      if (!resp.ok) throw new Error('Failed to delete client');
      alert(`${client.name} has been deleted.`);
      onBack();
    } catch (e) {
      alert(e.message || 'Failed to delete client');
    }
  }

  async function submitMeasurement() {
    try {
      // Convert empty strings to null
      const payload = {};
      Object.keys(measurementForm).forEach(key => {
        const val = measurementForm[key];
        payload[key] = val === '' ? null : parseFloat(val);
      });
      
      const resp = await fetch(`${apiBase}/clients/${cid}/measurements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!resp.ok) throw new Error('Failed to save measurement');
      
      // Reset form and refresh
      setMeasurementForm({
        weight: '',
        body_fat: '',
        chest: '',
        waist: '',
        hips: '',
        biceps_left: '',
        biceps_right: '',
        thigh_left: '',
        thigh_right: '',
        calf_left: '',
        calf_right: ''
      });
      setShowMeasurementForm(false);
      refreshAll();
    } catch (e) {
      alert(e.message || 'Failed to save measurement');
    }
  }

  // Calculate fitness progress score for dynamic avatar
  const progressScore = useMemo(() => {
    if (measurements.length < 2) return 50; // Neutral if not enough data
    
    const latest = measurements[0];
    const baseline = measurements[measurements.length - 1];
    
    const weightChange = (baseline.weight || 0) - (latest.weight || 0); // kg lost (positive = good)
    const bodyFatChange = (baseline.body_fat || 0) - (latest.body_fat || 0); // % reduced
    const waistChange = (baseline.waist || 0) - (latest.waist || 0); // cm lost
    
    // Count meal-tracked days in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentMeals = meals.filter(m => {
      if (!m.date) return false;
      const mealDate = new Date(m.date);
      return mealDate >= thirtyDaysAgo;
    });
    const mealsDays = new Set(recentMeals.map(m => m.date?.split('T')[0])).size;
    
    return calculateProgressScore({
      weightChange,
      bodyFatChange,
      waistChange,
      mealsDays
    });
  }, [measurements, meals]);

  if (showWorkoutBuilder) {
    return (
      <div>
        <WorkoutBuilder 
          clientId={cid}
          apiBase={apiBase}
          onSave={(result) => {
            if (result) {
              refreshAll();
              setShowWorkoutBuilder(false);
              setActiveTab('workouts');
            } else {
              setShowWorkoutBuilder(false);
            }
          }}
        />
      </div>
    );
  }

  if (showMealBuilder) {
    return (
      <div>
        <MealBuilder 
          clientId={cid}
          apiBase={apiBase}
          onSave={(result) => {
            if (result) {
              refreshAll();
              setShowMealBuilder(false);
              setActiveTab('meals');
            } else {
              setShowMealBuilder(false);
            }
          }}
        />
      </div>
    );
  }

  return (
    <div>
      <button onClick={onBack}>← Back to Clients</button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 16 }}>
        <FitnessAvatar 
          avatarUrl={avatarUrl}
          progressScore={progressScore}
          size={80}
          showBadge={true}
          clientName={client.name}
        />
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0 }}>{client.name}</h2>
          <div className="small">{client.email}</div>
          <div className="row" style={{ marginTop: 8, gap: 4 }}>
            <button className="btn-primary" onClick={onShare}>Share</button>
            <button onClick={() => onEmail(client)}>Email</button>
            <button onClick={openPdf}>PDF</button>
            <button onClick={refreshAll}>Refresh</button>
            <button onClick={deleteClient} style={{ marginLeft: 'auto', backgroundColor: '#dc2626' }}>Delete Client</button>
          </div>
        </div>
      </div>

      <div className="row" style={{ gap: 4, marginTop: 16 }}>
        <button onClick={() => setActiveTab('summary')} className={activeTab==='summary' ? 'btn-primary' : ''}>Summary</button>
        <button onClick={() => setActiveTab('measurements')} className={activeTab==='measurements' ? 'btn-primary' : ''}>Measurements</button>
        <button onClick={() => setActiveTab('workouts')} className={activeTab==='workouts' ? 'btn-primary' : ''}>Workouts</button>
        <button onClick={() => setActiveTab('meals')} className={activeTab==='meals' ? 'btn-primary' : ''}>Meals</button>
        <button onClick={() => setActiveTab('achievements')} className={activeTab==='achievements' ? 'btn-primary' : ''}>Achievements</button>
      </div>

      {error && <div className="banner-warning" style={{ marginTop: 12 }}>Error: {error}</div>}
      {loading && <div className="small" style={{ marginTop: 12 }}>Loading...</div>}

      {activeTab === 'summary' && (
        <div style={{ marginTop: 16 }}>
          <div style={{ 
            padding: 16, 
            backgroundColor: '#1a1d2e', 
            borderRadius: 8, 
            marginBottom: 16,
            border: `2px solid ${progressScore >= 70 ? '#1BB55C' : progressScore >= 40 ? '#FFB82B' : '#FF4B39'}`
          }}>
            <h3 style={{ margin: '0 0 8px 0' }}>Fitness Progress Score</h3>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: progressScore >= 70 ? '#1BB55C' : progressScore >= 40 ? '#FFB82B' : '#FF4B39' }}>
              {Math.round(progressScore)}/100
            </div>
            <div className="small" style={{ marginTop: 8 }}>
              {progressScore >= 70 && '🎉 Excellent progress! Keep it up!'}
              {progressScore >= 55 && progressScore < 70 && '💪 Good momentum! Stay consistent!'}
              {progressScore >= 40 && progressScore < 55 && '📈 Making progress. Push harder!'}
              {progressScore < 40 && '⚠️ Needs improvement. Let\'s refocus!'}
            </div>
          </div>

          <div className="row" style={{ alignItems: 'flex-end', gap: 8 }}>
            <div>
              <label>Quick add weight</label>
              <div className="row">
                <input value={weightInput} onChange={e => setWeightInput(e.target.value)} placeholder="e.g., 178.2" />
                <button className="btn-primary" onClick={addWeight}>Add</button>
              </div>
            </div>
          </div>

          <h3 style={{ marginTop: 20 }}>Recent measurements</h3>
          <ul>
            {measurements.slice(0,5).map(m => (
              <li key={m.id}>
                <span>{m.date?.slice(0,10)} — {m.weight ? `${m.weight} lbs` : 'n/a'}{m.body_fat ? ` • ${m.body_fat}%` : ''}</span>
              </li>
            ))}
            {measurements.length === 0 && <div className="small">No measurements yet.</div>}
          </ul>

          <h3 style={{ marginTop: 20 }}>Quick Stats</h3>
          <div className="row" style={{ gap: 16 }}>
            <div style={{ flex: 1, padding: 12, backgroundColor: '#1a1d2e', borderRadius: 4 }}>
              <div className="small">Total Workouts</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{workouts.length}</div>
            </div>
            <div style={{ flex: 1, padding: 12, backgroundColor: '#1a1d2e', borderRadius: 4 }}>
              <div className="small">Meals Logged</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{meals.length}</div>
            </div>
            <div style={{ flex: 1, padding: 12, backgroundColor: '#1a1d2e', borderRadius: 4 }}>
              <div className="small">Achievements</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{achievements.length}</div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'measurements' && (
        <div style={{ marginTop: 16 }}>
          <button 
            className="btn-primary" 
            onClick={() => setShowMeasurementForm(!showMeasurementForm)}
            style={{ marginBottom: 16 }}
          >
            {showMeasurementForm ? '× Cancel' : '+ Add Measurement'}
          </button>

          {showMeasurementForm && (
            <div style={{ 
              padding: 16, 
              backgroundColor: '#1a1d2e', 
              borderRadius: 8, 
              marginBottom: 16 
            }}>
              <h3 style={{ marginTop: 0 }}>New Measurement</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                <div>
                  <label>Weight (lbs)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={measurementForm.weight}
                    onChange={e => setMeasurementForm({...measurementForm, weight: e.target.value})}
                    placeholder="178.5"
                  />
                </div>
                <div>
                  <label>Body Fat (%)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={measurementForm.body_fat}
                    onChange={e => setMeasurementForm({...measurementForm, body_fat: e.target.value})}
                    placeholder="15.2"
                  />
                </div>
                <div>
                  <label>Chest (in)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={measurementForm.chest}
                    onChange={e => setMeasurementForm({...measurementForm, chest: e.target.value})}
                    placeholder="42.5"
                  />
                </div>
                <div>
                  <label>Waist (in)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={measurementForm.waist}
                    onChange={e => setMeasurementForm({...measurementForm, waist: e.target.value})}
                    placeholder="32.0"
                  />
                </div>
                <div>
                  <label>Hips (in)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={measurementForm.hips}
                    onChange={e => setMeasurementForm({...measurementForm, hips: e.target.value})}
                    placeholder="38.0"
                  />
                </div>
                <div>
                  <label>Left Bicep (in)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={measurementForm.biceps_left}
                    onChange={e => setMeasurementForm({...measurementForm, biceps_left: e.target.value})}
                    placeholder="14.5"
                  />
                </div>
                <div>
                  <label>Right Bicep (in)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={measurementForm.biceps_right}
                    onChange={e => setMeasurementForm({...measurementForm, biceps_right: e.target.value})}
                    placeholder="14.5"
                  />
                </div>
                <div>
                  <label>Left Thigh (in)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={measurementForm.thigh_left}
                    onChange={e => setMeasurementForm({...measurementForm, thigh_left: e.target.value})}
                    placeholder="22.0"
                  />
                </div>
                <div>
                  <label>Right Thigh (in)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={measurementForm.thigh_right}
                    onChange={e => setMeasurementForm({...measurementForm, thigh_right: e.target.value})}
                    placeholder="22.0"
                  />
                </div>
                <div>
                  <label>Left Calf (in)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={measurementForm.calf_left}
                    onChange={e => setMeasurementForm({...measurementForm, calf_left: e.target.value})}
                    placeholder="15.0"
                  />
                </div>
                <div>
                  <label>Right Calf (in)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={measurementForm.calf_right}
                    onChange={e => setMeasurementForm({...measurementForm, calf_right: e.target.value})}
                    placeholder="15.0"
                  />
                </div>
              </div>
              <div style={{ marginTop: 16 }}>
                <button className="btn-primary" onClick={submitMeasurement}>
                  Save Measurement
                </button>
              </div>
            </div>
          )}

          <h3>Measurement History</h3>
          {measurements.length === 0 ? (
            <div className="small">No measurements yet. Click "Add Measurement" to get started.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #3a3f5c' }}>
                  <th style={{ padding: 8, textAlign: 'left' }}>Date</th>
                  <th style={{ padding: 8, textAlign: 'right' }}>Weight</th>
                  <th style={{ padding: 8, textAlign: 'right' }}>BF%</th>
                  <th style={{ padding: 8, textAlign: 'right' }}>Chest</th>
                  <th style={{ padding: 8, textAlign: 'right' }}>Waist</th>
                  <th style={{ padding: 8, textAlign: 'right' }}>Hips</th>
                  <th style={{ padding: 8, textAlign: 'right' }}>Biceps</th>
                  <th style={{ padding: 8, textAlign: 'right' }}>Thighs</th>
                  <th style={{ padding: 8, textAlign: 'right' }}>Calves</th>
                </tr>
              </thead>
              <tbody>
                {measurements.map(m => (
                  <tr key={m.id} style={{ borderBottom: '1px solid #2a2f4c' }}>
                    <td style={{ padding: 8 }}>{m.date?.slice(0,10)}</td>
                    <td style={{ padding: 8, textAlign: 'right' }}>{m.weight ?? '—'}</td>
                    <td style={{ padding: 8, textAlign: 'right' }}>{m.body_fat ?? '—'}</td>
                    <td style={{ padding: 8, textAlign: 'right' }}>{m.chest ?? '—'}</td>
                    <td style={{ padding: 8, textAlign: 'right' }}>{m.waist ?? '—'}</td>
                    <td style={{ padding: 8, textAlign: 'right' }}>{m.hips ?? '—'}</td>
                    <td style={{ padding: 8, textAlign: 'right' }}>
                      {m.biceps_left && m.biceps_right ? `${m.biceps_left} / ${m.biceps_right}` : '—'}
                    </td>
                    <td style={{ padding: 8, textAlign: 'right' }}>
                      {m.thigh_left && m.thigh_right ? `${m.thigh_left} / ${m.thigh_right}` : '—'}
                    </td>
                    <td style={{ padding: 8, textAlign: 'right' }}>
                      {m.calf_left && m.calf_right ? `${m.calf_left} / ${m.calf_right}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'workouts' && (
        <div style={{ marginTop: 16 }}>
          <button className="btn-primary" onClick={() => setShowWorkoutBuilder(true)} style={{ marginBottom: 16 }}>
            + Create Workout Plan
          </button>
          <ul>
            {workouts.map(w => (
              <li key={w.id}>
                <span>{w.title} — {w.scheduled_at?.slice(0,10)}</span>
              </li>
            ))}
            {workouts.length === 0 && <div className="small">No workouts yet. Click "Create Workout Plan" to get started.</div>}
          </ul>
        </div>
      )}

      {activeTab === 'meals' && (
        <div style={{ marginTop: 16 }}>
          <button className="btn-primary" onClick={() => setShowMealBuilder(true)} style={{ marginBottom: 16 }}>
            + Create Meal Plan
          </button>
          <ul>
            {meals.map(meal => (
              <li key={meal.id}>
                <span>{meal.date?.slice(0,10)} — {meal.name} • {meal.total_nutrients?.calories ?? 0} kcal</span>
              </li>
            ))}
            {meals.length === 0 && <div className="small">No meals yet. Click "Create Meal Plan" to get started.</div>}
          </ul>
        </div>
      )}

      {activeTab === 'achievements' && (
        <div style={{ marginTop: 16 }}>
          <h3>Achievements & Quests</h3>
          {achievements.length === 0 ? (
            <div className="small">No achievements yet. Achievements are automatically awarded when clients reach milestones.</div>
          ) : (
            <ul>
              {achievements.map(a => (
                <li key={a.id}>
                  <strong>{a.name}</strong>
                  {a.description && <div className="small">{a.description}</div>}
                  {a.achieved_at && <div className="small">Achieved: {new Date(a.achieved_at).toLocaleDateString()}</div>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
