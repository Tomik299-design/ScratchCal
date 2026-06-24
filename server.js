require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('CHYBA: chybi SUPABASE_URL nebo SUPABASE_SERVICE_KEY v .env');
}

const supabase = createClient(supabaseUrl, supabaseKey);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Ziskat vsechny zaznamy pro dany mesic (format YYYY-MM)
app.get('/api/days/:month', async (req, res) => {
  try {
    const { month } = req.params; // napr. 2026-06

    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: 'Spatny format mesice, ocekavano YYYY-MM' });
    }

    const [yearStr, monthStr] = month.split('-');
    const year = parseInt(yearStr, 10);
    const monthNum = parseInt(monthStr, 10);

    const startDate = `${month}-01`;
    const nextMonth = monthNum === 12 ? 1 : monthNum + 1;
    const nextYear = monthNum === 12 ? year + 1 : year;
    const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

    const { data, error } = await supabase
      .from('calendar_days')
      .select('*')
      .gte('date', startDate)
      .lt('date', endDate);

    if (error) throw error;

    res.json(data || []);
  } catch (err) {
    console.error('GET /api/days error:', err.message);
    res.status(500).json({ error: 'Nepodarilo se nacist dny' });
  }
});

// Vytvorit / aktualizovat zaznam pro konkretni den
app.post('/api/days/:date', async (req, res) => {
  try {
    const { date } = req.params; // YYYY-MM-DD
    const { crossed, note } = req.body;

    const { data, error } = await supabase
      .from('calendar_days')
      .upsert(
        {
          date,
          crossed: !!crossed,
          note: note || null,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'date' }
      )
      .select();

    if (error) throw error;

    res.json(data[0]);
  } catch (err) {
    console.error('POST /api/days error:', err.message);
    res.status(500).json({ error: 'Nepodarilo se ulozit den' });
  }
});

// Smazat zaznam pro den (reset na prazdny)
app.delete('/api/days/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const { error } = await supabase
      .from('calendar_days')
      .delete()
      .eq('date', date);

    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/days error:', err.message);
    res.status(500).json({ error: 'Nepodarilo se smazat den' });
  }
});

// Ziskat vsechny cile/odpocty
app.get('/api/goals', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('countdown_goals')
      .select('*')
      .order('target_date', { ascending: true });

    if (error) throw error;

    res.json(data || []);
  } catch (err) {
    console.error('GET /api/goals error:', err.message);
    res.status(500).json({ error: 'Nepodarilo se nacist cile' });
  }
});

// Vytvorit novy cil/odpocet
app.post('/api/goals', async (req, res) => {
  try {
    const { label, target_date } = req.body;

    if (!label || !target_date) {
      return res.status(400).json({ error: 'Chybi label nebo target_date' });
    }

    const { data, error } = await supabase
      .from('countdown_goals')
      .insert({ label, target_date })
      .select();

    if (error) throw error;

    res.json(data[0]);
  } catch (err) {
    console.error('POST /api/goals error:', err.message);
    res.status(500).json({ error: 'Nepodarilo se ulozit cil' });
  }
});

// Smazat cil/odpocet
app.delete('/api/goals/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('countdown_goals')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/goals error:', err.message);
    res.status(500).json({ error: 'Nepodarilo se smazat cil' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`ScratchCal bezi na portu ${PORT}`);
});
