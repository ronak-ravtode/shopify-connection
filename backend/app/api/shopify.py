"""Shopify sync routes (thin): fixture fallback + live REST with single retry."""

from __future__ import annotations

import json
import os
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.config import settings
from app.database import get_db
from app.services.shopify_service import decrypt_token, upsert_order

router = APIRouter(prefix="/api/v1/shopify", tags=["shopify"])

FIXTURE_PATH = Path(__file__).resolve().parents[2] / "tests" / "fixtures" / "shopify_orders.json"


def _load_fixture() -> list[dict]:
    with open(FIXTURE_PATH, encoding="utf-8") as f:
        data = json.load(f)
    return data if isinstance(data, list) else data.get("orders", [])


def _resolve_business_id(db: Session, business_id: str | None) -> str:
    from app.models.business import Business

    if business_id:
        return business_id
    first = db.query(Business).first()
    if first is not None:
        return first.id
    b = Business(name="Default Business", email="owner@example.com")
    db.add(b)
    db.commit()
    db.refresh(b)
    return b.id


def _fetch_live_orders(days: int, shop_domain: str, token: str) -> tuple[list[dict] | None, str | None]:
    """Fetch live orders; single retry on transient 429/5xx. Returns (orders, error) on failure."""
    import httpx

    since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    url = f"https://{shop_domain}/admin/api/{settings.shopify_api_version}/orders.json"
    params = {"status": "any", "created_at_min": since, "limit": 100}
    headers = {"X-Shopify-Access-Token": token}
    last_err = None
    for attempt in range(2):  # initial + single retry
        try:
            r = httpx.get(url, params=params, headers=headers, timeout=20.0)
        except Exception as e:
            last_err = f"Connection error: {e}"
            if attempt == 0:
                time.sleep(1.0)
                continue
            return None, last_err
        if r.status_code in (429,) or 500 <= r.status_code < 600:
            last_err = f"Shopify HTTP {r.status_code}"
            if attempt == 0:
                time.sleep(1.0)
                continue
            return None, last_err
        if r.status_code != 200:
            if r.status_code == 401:
                return None, f"Invalid Shopify Access Token (401 Unauthorized) for {shop_domain}"
            return None, f"Shopify API HTTP {r.status_code}"
        try:
            body = r.json()
        except Exception as e:
            return None, f"Failed to parse Shopify response: {e}"
        if isinstance(body, dict) and "orders" in body:
            return body["orders"], None
        return (body if isinstance(body, list) else []), None
    return None, last_err or "Unknown sync error"


@router.post("/sync")
def sync_orders(
    days: int = 30,
    business_id: str | None = None,
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    from app.models.shopify_store import ShopifyStore

    bid = _resolve_business_id(db, business_id)
    env_token = os.getenv("SHOPIFY_ACCESS_TOKEN", "") or settings.shopify_access_token
    shop_domain = os.getenv("SHOPIFY_SHOP_DOMAIN", "") or settings.shopify_shop_domain
    orders: list[dict] = []
    source = "fixture"
    sync_error = None
    if env_token and shop_domain:
        live, err = _fetch_live_orders(days, shop_domain, env_token)
        if live is not None:
            orders = live
            source = "live"
        else:
            sync_error = err
            orders = _load_fixture()
            source = "fixture"
    else:
        store = db.query(ShopifyStore).filter_by(business_id=bid).first()
        raw_token = ""
        if store is not None and store.access_token_encrypted:
            raw_token = decrypt_token(store.access_token_encrypted)
        if raw_token and store is not None:
            live, err = _fetch_live_orders(days, store.shop_domain, raw_token)
            if live is not None:
                orders = live
                source = "live"
            else:
                sync_error = err
                orders = _load_fixture()
        else:
            sync_error = "No Shopify credentials configured"
            orders = _load_fixture()
    synced = 0
    for payload in orders:
        try:
            upsert_order(db, bid, payload)
            synced += 1
        except Exception:
            db.rollback()
    now = datetime.now(timezone.utc)
    store = db.query(ShopifyStore).filter_by(business_id=bid).first()
    if store is None:
        store = ShopifyStore(
            business_id=bid,
            shop_domain=shop_domain or "fixture.local",
            access_token_encrypted="",
            api_version=settings.shopify_api_version,
            last_sync_at=now,
        )
        db.add(store)
    else:
        store.last_sync_at = now
    db.commit()
    return {
        "success": True,
        "data": {
            "synced": synced,
            "source": source,
            "business_id": bid,
            "error": sync_error,
        },
    }


@router.get("/status")
def sync_status(
    business_id: str | None = None,
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    from app.models.order import Order
    from app.models.shopify_store import ShopifyStore

    bid = business_id
    store = None
    if bid:
        store = db.query(ShopifyStore).filter_by(business_id=bid).first()
    else:
        store = db.query(ShopifyStore).first()
        if store is not None:
            bid = store.business_id
    count_q = db.query(Order)
    if bid:
        count_q = count_q.filter_by(business_id=bid)
    # Never expose access tokens.
    last_sync = store.last_sync_at.isoformat() if store and store.last_sync_at else None
    return {
        "success": True,
        "data": {
            "business_id": bid,
            "last_sync_at": last_sync,
            "order_count": count_q.count(),
            "shop_domain": store.shop_domain if store else None,
        },
    }
