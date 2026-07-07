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

// Logovani navstevniku - IP + geolokace (jen kdyz nekdo otevre stranku, ne API volani)
app.use(async (req, res, next) => {
  if (req.path === '/' || req.path === '/index.html') {
    const ip =
      (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
      req.socket.remoteAddress ||
      'neznama';

    // ip-api.com je zdarma, nevyzaduje klic, limit 45 req/min
    try {
      const geoRes = await fetch(`http://ip-api.com/json/${ip}?fields=country,regionName,city,status`);
      const geo = await geoRes.json();
      if (geo.status === 'success') {
        console.log(`[NAVSTEVA] IP: ${ip} | ${geo.city}, ${geo.regionName}, ${geo.country}`);
      } else {
        console.log(`[NAVSTEVA] IP: ${ip} | geolokace nedostupna`);
      }
    } catch {
      console.log(`[NAVSTEVA] IP: ${ip} | geolokace selhala`);
    }
  }
  next();
});

app.use(express.static(path.join(__dirname, 'public'), {
  etag: false,
  lastModified: false,
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
}));

// Pomocna funkce - overi, ze uid je v pozadavku pritomne
function requireUid(req, res) {
  const uid = req.query.uid;
  if (!uid || typeof uid !== 'string') {
    res.status(400).json({ error: 'Chybi uid parametr' });
    return null;
  }
  return uid;
}

// Ziskat vsechny zaznamy pro dany mesic (format YYYY-MM)
app.get('/api/days/:month', async (req, res) => {
  try {
    const uid = requireUid(req, res);
    if (!uid) return;

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
      .eq('user_id', uid)
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
    const uid = requireUid(req, res);
    if (!uid) return;

    const { date } = req.params; // YYYY-MM-DD
    const { crossed, note } = req.body;

    const { data, error } = await supabase
      .from('calendar_days')
      .upsert(
        {
          date,
          user_id: uid,
          crossed: !!crossed,
          note: note || null,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'date,user_id' }
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
    const uid = requireUid(req, res);
    if (!uid) return;

    const { date } = req.params;
    const { error } = await supabase
      .from('calendar_days')
      .delete()
      .eq('date', date)
      .eq('user_id', uid);

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
    const uid = requireUid(req, res);
    if (!uid) return;

    const { data, error } = await supabase
      .from('countdown_goals')
      .select('*')
      .eq('user_id', uid)
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
    const uid = requireUid(req, res);
    if (!uid) return;

    const { label, target_date } = req.body;

    if (!label || !target_date) {
      return res.status(400).json({ error: 'Chybi label nebo target_date' });
    }

    const { data, error } = await supabase
      .from('countdown_goals')
      .insert({ label, target_date, user_id: uid })
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
    const uid = requireUid(req, res);
    if (!uid) return;

    const { id } = req.params;
    const { error } = await supabase
      .from('countdown_goals')
      .delete()
      .eq('id', id)
      .eq('user_id', uid);

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
