import json
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"


def load_products():
    html = INDEX.read_text(encoding="utf-8")
    match = re.search(r"const mbmProducts = (\[[\s\S]*?\]);", html)
    if not match:
        raise AssertionError("Could not find mbmProducts in index.html")
    return json.loads(match.group(1))


def main():
    products = load_products()
    missing_specs = [p["item_number"] for p in products if p.get("technical_specs") == "-"]
    missing_features = [p["item_number"] for p in products if p.get("features") == "-"]

    if missing_specs or missing_features:
        if missing_specs:
            print(f"Missing technical specs for {len(missing_specs)} products: {', '.join(missing_specs[:20])}")
        if missing_features:
            print(f"Missing features for {len(missing_features)} products: {', '.join(missing_features[:20])}")
        return 1

    by_item = {product["item_number"]: product for product in products}
    checks = [
        ("07-001-01-022", "technical_specs", "الخامة: PP"),
        ("07-001-01-022", "features", "جسم نحيف"),
        ("07-001-16-001", "technical_specs", "الخامة: Al+PC"),
        ("07-001-17-007", "technical_specs", "الألوان: 3000K/4000K"),
        ("07-001-17-017", "features", "نظام مغناطيسي 48V"),
        ("07-001-18-017", "technical_specs", "القدرة: 300W"),
        ("07-001-18-001", "features", "ملحقات نظام التراك"),
    ]

    for item_number, field, expected in checks:
        value = by_item[item_number].get(field, "")
        if expected not in value:
            raise AssertionError(
                f"{item_number} expected {field} to contain {expected!r}, got {value!r}"
            )

    print("OK: every product has technical specs and features.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
