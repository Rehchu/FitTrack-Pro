import React, { useState, useEffect } from 'react';

/**
 * Meal Plan Builder with USDA FoodData Central API integration
 * Allows trainers and clients to build meals with accurate nutritional data
 */
export function MealBuilder({ clientId, apiBase, onSave, existingMeal = null }) {
  const [name, setName] = useState(existingMeal?.name || '');
  const [date, setDate] = useState(existingMeal?.date || new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState(existingMeal?.notes || '');
  const [items, setItems] = useState(existingMeal?.items || []);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  // Calculate total nutrients
  const totals = items.reduce((acc, item) => ({
    calories: acc.calories + (item.calories || 0),
    protein: acc.protein + (item.protein || 0),
    carbs: acc.carbs + (item.carbs || 0),
    fat: acc.fat + (item.fat || 0),
    fiber: acc.fiber + (item.fiber || 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });

  async function searchFood() {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const resp = await fetch(`${apiBase}/usda/search?q=${encodeURIComponent(searchQuery)}`);
      if (!resp.ok) throw new Error('USDA search failed');
      const data = await resp.json();
      setSearchResults(data.foods || []);
    } catch (e) {
      alert(e.message || 'Failed to search foods');
    } finally {
      setSearching(false);
    }
  }

  function addFoodItem(food) {
    setItems([...items, {
      name: food.description,
      quantity: 1,
      unit: food.servingSize || 'serving',
      calories: food.calories || 0,
      protein: food.protein || 0,
      carbs: food.carbs || 0,
      fat: food.fat || 0,
      fiber: food.fiber || 0,
      fdcId: food.fdcId
    }]);
    setSearchResults([]);
    setSearchQuery('');
  }

  function addCustomItem() {
    setItems([...items, {
      name: 'Custom Food',
      quantity: 1,
      unit: 'serving',
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      custom: true
    }]);
  }

  function removeItem(index) {
    setItems(items.filter((_, i) => i !== index));
  }

  function updateItem(index, field, value) {
    const updated = [...items];
    updated[index][field] = field === 'name' || field === 'unit' ? value : parseFloat(value) || 0;
    setItems(updated);
  }

  async function handleSave() {
    if (!name.trim()) {
      alert('Please enter a meal name');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name,
        date,
        notes,
        items: items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          calories: item.calories,
          protein: item.protein,
          carbs: item.carbs,
          fat: item.fat,
          fiber: item.fiber,
          raw_data: item.fdcId ? { fdcId: item.fdcId } : null
        }))
      };
      const resp = await fetch(`${apiBase}/clients/${clientId}/meals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!resp.ok) throw new Error('Failed to save meal');
      const result = await resp.json();
      onSave && onSave(result);
    } catch (e) {
      alert(e.message || 'Failed to save meal');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <h3>Meal Plan Builder</h3>
      
      <div className="row" style={{ gap: 16, marginBottom: 16 }}>
        <div style={{ flex: 2 }}>
          <label>Meal Name</label>
          <input 
            value={name} 
            onChange={e => setName(e.target.value)} 
            placeholder="e.g., Breakfast, Post-Workout"
            style={{ width: '100%' }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label>Date</label>
          <input 
            type="date"
            value={date} 
            onChange={e => setDate(e.target.value)} 
            style={{ width: '100%' }}
          />
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label>Notes (optional)</label>
        <textarea 
          value={notes} 
          onChange={e => setNotes(e.target.value)} 
          placeholder="Meal timing, preferences, substitutions..."
          rows={2}
          style={{ width: '100%' }}
        />
      </div>

      <h4>Add Food Items</h4>
      <div className="row" style={{ marginBottom: 8, gap: 8 }}>
        <input 
          value={searchQuery} 
          onChange={e => setSearchQuery(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && searchFood()}
          placeholder="Search USDA database (e.g., chicken breast, brown rice)"
          style={{ flex: 1 }}
        />
        <button onClick={searchFood} disabled={searching}>
          {searching ? 'Searching...' : 'Search USDA'}
        </button>
        <button onClick={addCustomItem}>Add Custom</button>
      </div>

      {searchResults.length > 0 && (
        <div style={{ marginBottom: 16, maxHeight: 200, overflowY: 'auto', border: '1px solid #374151', borderRadius: 4, padding: 8 }}>
          {searchResults.map((food, idx) => (
            <div 
              key={idx} 
              onClick={() => addFoodItem(food)}
              style={{ 
                padding: 8, 
                cursor: 'pointer', 
                borderBottom: '1px solid #2a2f42'
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#2a2f42'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <div style={{ fontWeight: 500 }}>{food.description}</div>
              <div className="small">
                {food.calories}cal • P:{food.protein}g C:{food.carbs}g F:{food.fat}g
              </div>
            </div>
          ))}
        </div>
      )}

      <h4>Food Items ({items.length})</h4>
      <div style={{ 
        marginBottom: 16, 
        padding: 12, 
        backgroundColor: '#1a1d2e', 
        borderRadius: 4,
        fontWeight: 500
      }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span>Totals:</span>
          <span>{Math.round(totals.calories)} cal</span>
        </div>
        <div className="small" style={{ marginTop: 4 }}>
          Protein: {Math.round(totals.protein)}g • 
          Carbs: {Math.round(totals.carbs)}g • 
          Fat: {Math.round(totals.fat)}g • 
          Fiber: {Math.round(totals.fiber)}g
        </div>
      </div>

      {items.length === 0 && (
        <div className="small" style={{ marginBottom: 16 }}>No items added yet. Search USDA database or add custom items.</div>
      )}
      
      {items.map((item, idx) => (
        <div key={idx} style={{ 
          marginBottom: 12, 
          padding: 12, 
          border: '1px solid #374151', 
          borderRadius: 4,
          backgroundColor: '#1a1d2e'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <input 
              value={item.name} 
              onChange={e => updateItem(idx, 'name', e.target.value)}
              style={{ flex: 1, fontWeight: 500, marginRight: 8 }}
              disabled={!item.custom}
            />
            <button onClick={() => removeItem(idx)} style={{ padding: '4px 8px' }}>Remove</button>
          </div>
          
          <div className="row" style={{ gap: 8, marginBottom: 8 }}>
            <div style={{ flex: 1 }}>
              <label className="small">Quantity</label>
              <input 
                type="number" 
                value={item.quantity} 
                onChange={e => updateItem(idx, 'quantity', e.target.value)}
                min="0.1"
                step="0.1"
                style={{ width: '100%' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label className="small">Unit</label>
              <input 
                value={item.unit} 
                onChange={e => updateItem(idx, 'unit', e.target.value)}
                placeholder="g, oz, cup"
                style={{ width: '100%' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label className="small">Calories</label>
              <input 
                type="number" 
                value={item.calories} 
                onChange={e => updateItem(idx, 'calories', e.target.value)}
                min="0"
                style={{ width: '100%' }}
                disabled={!item.custom}
              />
            </div>
          </div>
          
          <div className="row" style={{ gap: 8 }}>
            <div style={{ flex: 1 }}>
              <label className="small">Protein (g)</label>
              <input 
                type="number" 
                value={item.protein} 
                onChange={e => updateItem(idx, 'protein', e.target.value)}
                min="0"
                step="0.1"
                style={{ width: '100%' }}
                disabled={!item.custom}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label className="small">Carbs (g)</label>
              <input 
                type="number" 
                value={item.carbs} 
                onChange={e => updateItem(idx, 'carbs', e.target.value)}
                min="0"
                step="0.1"
                style={{ width: '100%' }}
                disabled={!item.custom}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label className="small">Fat (g)</label>
              <input 
                type="number" 
                value={item.fat} 
                onChange={e => updateItem(idx, 'fat', e.target.value)}
                min="0"
                step="0.1"
                style={{ width: '100%' }}
                disabled={!item.custom}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label className="small">Fiber (g)</label>
              <input 
                type="number" 
                value={item.fiber} 
                onChange={e => updateItem(idx, 'fiber', e.target.value)}
                min="0"
                step="0.1"
                style={{ width: '100%' }}
                disabled={!item.custom}
              />
            </div>
          </div>
        </div>
      ))}

      <div className="row" style={{ marginTop: 16, gap: 8 }}>
        <button className="btn-primary" onClick={handleSave} disabled={saving || !name.trim()}>
          {saving ? 'Saving...' : 'Save Meal'}
        </button>
        <button onClick={() => onSave && onSave(null)}>Cancel</button>
      </div>
    </div>
  );
}
