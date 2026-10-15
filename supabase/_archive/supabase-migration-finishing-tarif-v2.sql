-- Migration: update tarif finishing dari 2.500 → 3.000 per pcs
-- Gosok 1.100→1.300 | Lipat 600→700 | Hangtag 100→200 | Seri 100→200

UPDATE finance_config SET nilai = 1300, updated_at = now() WHERE key = 'tarif_gosok';
UPDATE finance_config SET nilai = 700,  updated_at = now() WHERE key = 'tarif_lipat';
UPDATE finance_config SET nilai = 200,  updated_at = now() WHERE key = 'tarif_hangtag';
UPDATE finance_config SET nilai = 200,  updated_at = now() WHERE key = 'tarif_seri';
