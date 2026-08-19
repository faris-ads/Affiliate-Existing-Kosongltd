// /api/data.js
// Serverless function (Vercel) yang jadi jembatan antara dashboard (browser)
// dan GitHub Contents API. Token GitHub TIDAK PERNAH dikirim ke browser —
// dia cuma hidup sebagai environment variable di server ini.
//
// ENV VARS yang wajib di-set di Vercel:
//   GITHUB_TOKEN  -> fine-grained PAT, scope ke repo ini, permission "Contents: Read and write"
//   GITHUB_OWNER  -> contoh: faris-ads
//   GITHUB_REPO   -> contoh: Affiliate-Existing-Kosongltd
//   GITHUB_BRANCH -> opsional, default "main"

const GITHUB_API = 'https://api.github.com';

function getConfig() {
  const { GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH } = process.env;
  if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
    throw new Error('Environment variables GITHUB_TOKEN / GITHUB_OWNER / GITHUB_REPO belum di-set di Vercel.');
  }
  return {
    token: GITHUB_TOKEN,
    owner: GITHUB_OWNER,
    repo: GITHUB_REPO,
    branch: GITHUB_BRANCH || 'main',
  };
}

async function ghFetch(path, cfg, options = {}) {
  const url = `${GITHUB_API}/repos/${cfg.owner}/${cfg.repo}/contents/${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  return res;
}

// Ambil sha file (dibutuhkan GitHub API untuk update/delete file yang sudah ada)
async function getFileSha(path, cfg) {
  const res = await ghFetch(`${path}?ref=${cfg.branch}`, cfg);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Gagal cek file ${path}: ${res.status}`);
  const json = await res.json();
  return json.sha;
}

module.exports = async (req, res) => {
  let cfg;
  try {
    cfg = getConfig();
  } catch (err) {
    res.status(500).json({ error: err.message });
    return;
  }

  try {
    if (req.method === 'GET') {
      const { month } = req.query;

      if (month) {
        // Ambil isi 1 file bulan tertentu
        const path = `data/${month}.json`;
        const r = await ghFetch(`${path}?ref=${cfg.branch}`, cfg);
        if (r.status === 404) {
          res.status(404).json({ error: 'Data bulan tersebut belum ada.' });
          return;
        }
        if (!r.ok) throw new Error(`GitHub API error: ${r.status}`);
        const json = await r.json();
        const content = Buffer.from(json.content, 'base64').toString('utf-8');
        res.status(200).json(JSON.parse(content));
        return;
      }

      // List semua file di folder data/
      const r = await ghFetch(`data?ref=${cfg.branch}`, cfg);
      if (r.status === 404) {
        res.status(200).json({ months: [] });
        return;
      }
      if (!r.ok) throw new Error(`GitHub API error: ${r.status}`);
      const files = await r.json();
      const months = files
        .filter((f) => f.name.endsWith('.json'))
        .map((f) => f.name.replace('.json', ''))
        .sort();
      res.status(200).json({ months });
      return;
    }

    if (req.method === 'POST') {
      const { month, label, rows } = req.body;
      if (!month || !Array.isArray(rows)) {
        res.status(400).json({ error: 'Body harus berisi { month, label, rows }' });
        return;
      }

      const path = `data/${month}.json`;
      const sha = await getFileSha(path, cfg);

      const payload = {
        month,
        label: label || month,
        uploaded_at: new Date().toISOString(),
        row_count: rows.length,
        rows,
      };

      const contentBase64 = Buffer.from(JSON.stringify(payload)).toString('base64');

      const r = await ghFetch(path, cfg, {
        method: 'PUT',
        body: JSON.stringify({
          message: sha
            ? `Update data ${month} (${rows.length} creator)`
            : `Tambah data ${month} (${rows.length} creator)`,
          content: contentBase64,
          branch: cfg.branch,
          ...(sha ? { sha } : {}),
        }),
      });

      if (!r.ok) {
        const errText = await r.text();
        throw new Error(`Gagal simpan ke GitHub: ${r.status} ${errText}`);
      }

      res.status(200).json({ ok: true, month, row_count: rows.length, updated: !!sha });
      return;
    }

    if (req.method === 'DELETE') {
      const { month } = req.query;
      if (!month) {
        res.status(400).json({ error: 'Parameter ?month= wajib diisi.' });
        return;
      }
      const path = `data/${month}.json`;
      const sha = await getFileSha(path, cfg);
      if (!sha) {
        res.status(404).json({ error: 'Data bulan tersebut tidak ditemukan.' });
        return;
      }
      const r = await ghFetch(path, cfg, {
        method: 'DELETE',
        body: JSON.stringify({
          message: `Hapus data ${month}`,
          sha,
          branch: cfg.branch,
        }),
      });
      if (!r.ok) {
        const errText = await r.text();
        throw new Error(`Gagal hapus di GitHub: ${r.status} ${errText}`);
      }
      res.status(200).json({ ok: true, month });
      return;
    }

    res.status(405).json({ error: 'Method tidak didukung' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
