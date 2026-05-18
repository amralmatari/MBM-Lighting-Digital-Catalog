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
    return {product["item_number"]: product for product in json.loads(match.group(1))}


def require_contains(product, field, expected):
    value = str(product.get(field, ""))
    if expected not in value:
        raise AssertionError(
            f"{product['item_number']} expected {field} to contain {expected!r}, got {value!r}"
        )


def require_not_contains(product, field, forbidden_terms):
    value = str(product.get(field, ""))
    found = [term for term in forbidden_terms if term in value]
    if found:
        raise AssertionError(
            f"{product['item_number']} expected {field} to be Arabic, found English terms {found!r} in {value!r}"
        )


def require_concise(product):
    specs = str(product.get("technical_specs", ""))
    if specs != "-" and specs.count("؛") > 4:
        raise AssertionError(
            f"{product['item_number']} technical_specs should be concise, got {specs!r}"
        )


def main():
    products = load_products()

    checks = [
        ("07-001-14-001", "lumen", "630"),
        ("07-001-14-001", "technical_specs", "قص السقف: Φ75"),
        ("07-001-14-001", "features", "اختيار COB أو SMD"),
        ("07-001-15-002", "lumen", "1125"),
        ("07-001-15-002", "technical_specs", "مانع التوهج: UGR<19"),
        ("07-001-06-005", "lumen", "840"),
        ("07-001-17-001", "technical_specs", "زاوية: 120°"),
        ("07-001-18-015", "technical_specs", "المقاس: L230*W22*H43mm"),
    ]

    for item_number, field, expected in checks:
        require_contains(products[item_number], field, expected)

    forbidden_terms = [
        "Lumen:",
        "Optic:",
        "Size:",
        "Cut-out:",
        "Voltage:",
        "Material:",
        "Power:",
        "Color:",
        "Beam angle:",
        "magnetic",
        "optional",
        "lamp",
        "design",
    ]
    for product in products.values():
        require_not_contains(product, "technical_specs", forbidden_terms)
        require_not_contains(product, "features", forbidden_terms)
        require_concise(product)

    print("OK: brochure specs and features are Arabic and concise.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
