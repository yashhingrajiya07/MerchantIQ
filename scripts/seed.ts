import { SQLiteStore } from '../apps/api/src/store';
import { DEMO_PRESETS, executeFullSimulationPipeline } from './seed_demo_data';

async function main() {
  console.log('================================================================');
  console.log('MerchantIQ — Deterministic Demo Data & SQLite Bootstrap');
  console.log('================================================================');
  console.log('[1/3] Initializing SQLite database and verifying schema...');
  const store = new SQLiteStore();

  console.log(`[2/3] Verified merchant profile: "${store.merchant.name}" (Cash: ₹${(store.merchant.current_cash_paise / 10000000).toFixed(2)}L)`);
  const inventory = store.getInventorySummary();
  console.log(`      Verified inventory: ${inventory.total_units} units across ${inventory.items.length} SKUs (Valuation: ₹${(inventory.total_valuation_paise / 10000000).toFixed(2)}L)`);

  console.log('[3/3] Ensuring 6 demo showcase presets are fully simulated in SQLite...');
  let seededCount = 0;
  for (const preset of DEMO_PRESETS) {
    if (!store.decisions.has(preset.id)) {
      const dec = executeFullSimulationPipeline(preset.id, preset.question, store.merchant);
      store.saveDecision(dec);
      seededCount++;
    }
  }

  console.log(`[✓] Bootstrap complete! Total decisions/presets in database: ${store.decisions.size} (${seededCount} newly generated).`);
  console.log('================================================================');
}

main().catch((err) => {
  console.error('[!] Bootstrap failed:', err);
  process.exit(1);
});
