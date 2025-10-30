import React, { useState } from 'react';

/**
 * Workout Plan Builder Component
 * Allows trainers to create structured workout plans with exercises from ExerciseDB
 */
export function WorkoutBuilder({ clientId, apiBase, onSave, existingWorkout = null }) {
  const [title, setTitle] = useState(existingWorkout?.title || '');
  const [description, setDescription] = useState(existingWorkout?.description || '');
  const [exercises, setExercises] = useState(existingWorkout?.exercises || []);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  async function searchExercises() {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const resp = await fetch(`${apiBase}/exercisedb/exercises/search?q=${encodeURIComponent(searchQuery)}&limit=20`);
      if (!resp.ok) throw new Error('Search failed');
      const data = await resp.json();
      
      // ExerciseDB API returns {success, metadata, data} format
      const exercises = data.data || data.exercises || [];
      console.log('Search results:', exercises);
      setSearchResults(exercises);
      
      if (exercises.length === 0) {
        alert('No exercises found. Try a different search term (e.g., "push", "pull", "legs")');
      }
    } catch (e) {
      console.error('Exercise search error:', e);
      alert(e.message || 'Failed to search exercises');
    } finally {
      setSearching(false);
    }
  }

  function addExercise(exercise) {
    setExercises([...exercises, {
      id: exercise.id,
      name: exercise.name,
      bodyPart: exercise.bodyPart,
      equipment: exercise.equipment,
      gifUrl: exercise.gifUrl,
      sets: 3,
      reps: 10,
      weight: 0,
      duration_seconds: 0,
      notes: ''
    }]);
    setSearchResults([]);
    setSearchQuery('');
  }

  function removeExercise(index) {
    setExercises(exercises.filter((_, i) => i !== index));
  }

  function updateExercise(index, field, value) {
    const updated = [...exercises];
    updated[index][field] = value;
    setExercises(updated);
  }

  async function handleSave() {
    if (!title.trim()) {
      alert('Please enter a workout title');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title,
        description,
        exercises: exercises.map(ex => ({
          exercise_id: ex.id,
          name: ex.name,
          sets: parseInt(ex.sets) || 3,
          reps: parseInt(ex.reps) || 10,
          weight: parseFloat(ex.weight) || 0,
          duration_seconds: parseInt(ex.duration_seconds) || 0,
          notes: ex.notes
        }))
      };
      const resp = await fetch(`${apiBase}/clients/${clientId}/workouts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!resp.ok) throw new Error('Failed to save workout');
      const result = await resp.json();
      onSave && onSave(result);
    } catch (e) {
      alert(e.message || 'Failed to save workout');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <h3>Workout Plan Builder</h3>
      
      <div style={{ marginBottom: 16 }}>
        <label>Workout Title</label>
        <input 
          value={title} 
          onChange={e => setTitle(e.target.value)} 
          placeholder="e.g., Upper Body Strength"
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label>Description (optional)</label>
        <textarea 
          value={description} 
          onChange={e => setDescription(e.target.value)} 
          placeholder="Notes about this workout..."
          rows={3}
          style={{ width: '100%' }}
        />
      </div>

      <h4>Add Exercises</h4>
      <div className="row" style={{ marginBottom: 16 }}>
        <input 
          value={searchQuery} 
          onChange={e => setSearchQuery(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && searchExercises()}
          placeholder="Search exercises (e.g., bench press, squat)"
          style={{ flex: 1 }}
        />
        <button onClick={searchExercises} disabled={searching}>
          {searching ? 'Searching...' : 'Search'}
        </button>
      </div>

      {searchResults.length > 0 && (
        <div style={{ marginBottom: 16, maxHeight: 200, overflowY: 'auto', border: '1px solid #374151', borderRadius: 4, padding: 8 }}>
          {searchResults.map(ex => (
            <div 
              key={ex.id} 
              onClick={() => addExercise(ex)}
              style={{ 
                padding: 8, 
                cursor: 'pointer', 
                borderBottom: '1px solid #2a2f42',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#2a2f42'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              {ex.gifUrl && <img src={ex.gifUrl} alt={ex.name} width={40} height={40} style={{ borderRadius: 4 }} />}
              <div>
                <div style={{ fontWeight: 500 }}>{ex.name}</div>
                <div className="small">{ex.bodyPart} • {ex.equipment}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <h4>Exercises ({exercises.length})</h4>
      {exercises.length === 0 && (
        <div className="small" style={{ marginBottom: 16 }}>No exercises added yet. Search above to add exercises.</div>
      )}
      
      {exercises.map((ex, idx) => (
        <div key={idx} style={{ 
          marginBottom: 12, 
          padding: 12, 
          border: '1px solid #374151', 
          borderRadius: 4,
          backgroundColor: '#1a1d2e'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500, marginBottom: 4 }}>{ex.name}</div>
              <div className="small">{ex.bodyPart} • {ex.equipment}</div>
            </div>
            <button onClick={() => removeExercise(idx)} style={{ padding: '4px 8px' }}>Remove</button>
          </div>
          
          <div className="row" style={{ gap: 8 }}>
            <div style={{ flex: 1 }}>
              <label className="small">Sets</label>
              <input 
                type="number" 
                value={ex.sets} 
                onChange={e => updateExercise(idx, 'sets', e.target.value)}
                min="1"
                style={{ width: '100%' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label className="small">Reps</label>
              <input 
                type="number" 
                value={ex.reps} 
                onChange={e => updateExercise(idx, 'reps', e.target.value)}
                min="1"
                style={{ width: '100%' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label className="small">Weight (lbs)</label>
              <input 
                type="number" 
                value={ex.weight} 
                onChange={e => updateExercise(idx, 'weight', e.target.value)}
                min="0"
                step="5"
                style={{ width: '100%' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label className="small">Time (sec)</label>
              <input 
                type="number" 
                value={ex.duration_seconds || 0} 
                onChange={e => updateExercise(idx, 'duration_seconds', e.target.value)}
                min="0"
                step="15"
                placeholder="0"
                style={{ width: '100%' }}
              />
            </div>
          </div>
          
          <div style={{ marginTop: 8 }}>
            <label className="small">Notes (optional)</label>
            <input 
              value={ex.notes} 
              onChange={e => updateExercise(idx, 'notes', e.target.value)}
              placeholder="Form cues, tempo, rest time..."
              style={{ width: '100%' }}
            />
          </div>
        </div>
      ))}

      <div className="row" style={{ marginTop: 16, gap: 8 }}>
        <button className="btn-primary" onClick={handleSave} disabled={saving || !title.trim()}>
          {saving ? 'Saving...' : 'Save Workout Plan'}
        </button>
        <button onClick={() => onSave && onSave(null)}>Cancel</button>
      </div>
    </div>
  );
}
