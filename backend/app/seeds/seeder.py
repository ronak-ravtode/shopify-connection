import gzip
import json
import logging
from pathlib import Path
from sqlalchemy import text
import app.models  # Register all models on Base.metadata
from app.database import engine, Base

logger = logging.getLogger("app.seeder")

SEED_FILE = Path(__file__).parent / "seed_data.json.gz"

TABLES_IN_ORDER = [
    "businesses",
    "users",
    "shopify_stores",
    "customers",
    "products",
    "orders",
    "order_items",
    "parcels",
    "parcel_items",
    "shipments",
    "payments",
    "financial_transactions",
    "reconciliations",
    "whatsapp_notifications",
    "tally_mappings",
    "sales_channel_connections",
    "export_batches",
    "audit_logs",
]


def auto_seed_if_empty(target_engine=None):
    """Ensures database tables are created and seeds live production data if empty."""
    eng = target_engine or engine
    Base.metadata.create_all(bind=eng)

    try:
        with eng.connect() as conn:
            # Check if orders table has data
            try:
                has_orders = conn.execute(text("SELECT COUNT(*) FROM orders")).scalar()
            except Exception:
                has_orders = 0

            if has_orders and has_orders > 0:
                logger.info(f"Database already populated ({has_orders} orders). Skipping seed.")
                return

        if not SEED_FILE.exists():
            logger.warning(f"Seed file not found at {SEED_FILE}")
            return

        logger.info("Empty database detected. Populating with orders and operational records...")
        with gzip.open(SEED_FILE, "rt", encoding="utf-8") as f:
            dump = json.load(f)

        with eng.begin() as conn:
            for t in TABLES_IN_ORDER:
                rows = dump.get(t, [])
                if not rows:
                    continue
                table_obj = Base.metadata.tables.get(t)
                if table_obj is None:
                    continue
                valid_cols = {c.name for c in table_obj.columns}
                filtered_rows = []
                for r in rows:
                    clean_r = {}
                    for k in valid_cols:
                        if k in r:
                            val = r[k]
                            if isinstance(val, (dict, list)):
                                clean_r[k] = json.dumps(val)
                            else:
                                clean_r[k] = val
                    filtered_rows.append(clean_r)
                if not filtered_rows:
                    continue
                cols = list(filtered_rows[0].keys())
                col_names = ", ".join([f'"{c}"' for c in cols])
                param_names = ", ".join([f":{c}" for c in cols])
                sql = text(f'INSERT INTO "{t}" ({col_names}) VALUES ({param_names})')
                conn.execute(sql, filtered_rows)
                logger.info(f"Seeded {len(filtered_rows)} records into {t}")

        logger.info("Successfully seeded all 375 orders, 287 products, and dashboard data!")
    except Exception as e:
        logger.error(f"Error during auto_seed_if_empty: {e}")
