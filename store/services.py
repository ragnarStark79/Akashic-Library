"""
Store services — Business logic for catalog, inventory, and product management.

Enforces inventory constraints, manages status transitions, bridges
the boundary between PostgreSQL commerce and MongoDB discovery,
handles Open Library imports, and manages universal card customization.
"""

import logging
import re
import uuid
from decimal import Decimal
from typing import Any

import requests
from bson import ObjectId
from bson.errors import InvalidId
from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Q

from discovery.exceptions import BookNotFoundError
from discovery.models import NormalizedBook
from discovery.repository import _get_collection, get_book_by_id, upsert_book
from store.models import Inventory, StoreProduct, StoreStatus, StoreProductDetail

logger = logging.getLogger(__name__)

LOW_STOCK_THRESHOLD = 5

SAFE_HTML_TAGS = {"b", "strong", "i", "em", "p", "br", "ul", "ol", "li", "span"}


def sanitize_rich_text(html: str) -> str:
    """
    Sanitize rich text descriptions to prevent XSS.
    Whitelists formatting elements (<b>, <i>, <p>, <br>, <ul>, etc.)
    and strips script, iframe, inline event handlers, and style tags.
    """
    if not html:
        return ""

    # Remove script, style, iframe, object, embed, etc.
    cleaned = re.sub(
        r"<(script|style|iframe|object|embed|applet)[\s\S]*?</\1>",
        "",
        html,
        flags=re.IGNORECASE,
    )
    # Strip on* event attributes (onclick, onerror, onload, etc.)
    cleaned = re.sub(r"\s+on\w+\s*=\s*(['\"]).*?\1", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s+on\w+\s*=\s*[^\s>]+", "", cleaned, flags=re.IGNORECASE)
    # Strip javascript: links
    cleaned = re.sub(r"href\s*=\s*(['\"])javascript:.*?\1", "", cleaned, flags=re.IGNORECASE)

    # Filter tags
    def tag_replacer(match):
        full_tag = match.group(0)
        is_closing = full_tag.startswith("</")
        tag_match = re.match(r"</?([a-zA-Z0-9]+)", full_tag)
        if not tag_match:
            return ""
        tag_name = tag_match.group(1).lower()
        if tag_name not in SAFE_HTML_TAGS:
            return ""
        return f"</{tag_name}>" if is_closing else f"<{tag_name}>"

    sanitized = re.sub(r"<[^>]+>", tag_replacer, cleaned)
    return sanitized.strip()


class StoreService:
    @staticmethod
    def parse_open_library_identifier(url_or_id: str) -> dict[str, str]:
        """
        Parse an Open Library URL, work key, edition key, or ISBN into a structured dict:
        {"type": "work" | "edition" | "isbn", "id": str}
        """
        s = url_or_id.strip()

        # Case 1: Work URL e.g. https://openlibrary.org/works/OL82563W/Frankenstein
        work_match = re.search(r"/works/(OL\d+W)", s, re.IGNORECASE)
        if work_match:
            return {"type": "work", "id": work_match.group(1).upper()}

        # Case 2: Edition / Book URL e.g. https://openlibrary.org/books/OL24364628M/...
        edition_match = re.search(r"/books/(OL\d+M)", s, re.IGNORECASE)
        if edition_match:
            return {"type": "edition", "id": edition_match.group(1).upper()}

        # Case 3: ISBN URL e.g. https://openlibrary.org/isbn/9780140328721
        isbn_match = re.search(r"/isbn/([0-9Xx]{10,13})", s, re.IGNORECASE)
        if isbn_match:
            return {"type": "isbn", "id": isbn_match.group(1).upper()}

        # Case 4: Raw work ID e.g. OL82563W
        if re.match(r"^OL\d+W$", s, re.IGNORECASE):
            return {"type": "work", "id": s.upper()}

        # Case 5: Raw edition ID e.g. OL24364628M
        if re.match(r"^OL\d+M$", s, re.IGNORECASE):
            return {"type": "edition", "id": s.upper()}

        # Case 6: Raw ISBN (10 or 13 digits)
        clean_isbn = re.sub(r"[^0-9Xx]", "", s).upper()
        if len(clean_isbn) in (10, 13):
            return {"type": "isbn", "id": clean_isbn}

        raise ValidationError(
            {"url": "Invalid Open Library URL or identifier. Provide an Open Library work, book, or ISBN URL."}
        )

    @staticmethod
    def preview_open_library_import(url_or_id: str) -> dict[str, Any]:
        """
        Fetch book metadata from Open Library for preview before saving.
        Returns a normalized dictionary.
        """
        parsed = StoreService.parse_open_library_identifier(url_or_id)
        target_type = parsed["type"]
        target_id = parsed["id"]

        try:
            if target_type == "work":
                work_url = f"https://openlibrary.org/works/{target_id}.json"
                resp = requests.get(work_url, timeout=10)
                if resp.status_code == 404:
                    raise ValidationError({"url": f"Work '{target_id}' was not found on Open Library."})
                resp.raise_for_status()
                raw = resp.json()

                title = (raw.get("title") or "").strip()
                desc_raw = raw.get("description")
                if isinstance(desc_raw, dict):
                    description = desc_raw.get("value") or ""
                else:
                    description = desc_raw or ""

                subjects = raw.get("subjects") or []
                cover_ids = raw.get("covers") or []
                cover_urls = [
                    f"https://covers.openlibrary.org/b/id/{cid}-L.jpg"
                    for cid in cover_ids
                    if cid and cid != -1
                ]

                # Authors
                authors = []
                for author_entry in raw.get("authors", []):
                    author_key = ""
                    if isinstance(author_entry, dict):
                        author_dict = author_entry.get("author") or author_entry
                        author_key = author_dict.get("key") or ""
                    if author_key:
                        try:
                            a_resp = requests.get(f"https://openlibrary.org{author_key}.json", timeout=5)
                            if a_resp.ok:
                                name = a_resp.json().get("name")
                                if name and name not in authors:
                                    authors.append(name)
                        except Exception:
                            pass

                return {
                    "source_type": "work",
                    "source_id": target_id,
                    "title": title,
                    "authors": authors,
                    "description": description,
                    "cover_urls": cover_urls,
                    "genres": subjects[:8],
                    "publisher": "",
                    "published_date": "",
                    "isbn13": None,
                    "isbn10": None,
                }

            elif target_type in ("edition", "isbn"):
                endpoint = (
                    f"https://openlibrary.org/books/{target_id}.json"
                    if target_type == "edition"
                    else f"https://openlibrary.org/isbn/{target_id}.json"
                )
                resp = requests.get(endpoint, timeout=10)
                if resp.status_code == 404:
                    raise ValidationError(
                        {"url": f"Edition/ISBN '{target_id}' was not found on Open Library."}
                    )
                resp.raise_for_status()
                raw = resp.json()

                title = (raw.get("title") or "").strip()
                desc_raw = raw.get("description")
                if isinstance(desc_raw, dict):
                    description = desc_raw.get("value") or ""
                else:
                    description = desc_raw or ""

                publishers = raw.get("publishers") or []
                publisher = publishers[0] if publishers else ""
                published_date = str(raw.get("publish_date") or "")

                isbns_13 = raw.get("isbn_13") or []
                isbns_10 = raw.get("isbn_10") or []
                isbn13 = isbns_13[0] if isbns_13 else None
                isbn10 = isbns_10[0] if isbns_10 else None

                cover_ids = raw.get("covers") or []
                cover_urls = [
                    f"https://covers.openlibrary.org/b/id/{cid}-L.jpg"
                    for cid in cover_ids
                    if cid and cid != -1
                ]

                # Authors
                authors = []
                for author_entry in raw.get("authors", []):
                    author_key = author_entry.get("key") if isinstance(author_entry, dict) else str(author_entry)
                    if author_key:
                        try:
                            a_resp = requests.get(f"https://openlibrary.org{author_key}.json", timeout=5)
                            if a_resp.ok:
                                name = a_resp.json().get("name")
                                if name and name not in authors:
                                    authors.append(name)
                        except Exception:
                            pass

                return {
                    "source_type": target_type,
                    "source_id": target_id,
                    "title": title,
                    "authors": authors,
                    "description": description,
                    "cover_urls": cover_urls,
                    "genres": (raw.get("subjects") or [])[:8],
                    "publisher": publisher,
                    "published_date": published_date,
                    "isbn13": isbn13,
                    "isbn10": isbn10,
                }

        except requests.RequestException as e:
            logger.warning("Open Library lookup failed: %s", e)
            raise ValidationError({"url": f"Failed to connect to Open Library: {str(e)}"})

    @staticmethod
    @transaction.atomic
    def create_store_product(
        price,
        book_reference: str | None = None,
        manual_book: dict[str, Any] | None = None,
        open_library_data: dict[str, Any] | None = None,
        edition: str = "",
        condition: str = "",
        status: str = StoreStatus.OUT_OF_STOCK,
        quantity: int = 0,
        reserved_quantity: int = 0,
        custom_cover_url: str = "",
        custom_description: str = "",
        custom_genres: list[str] | None = None,
        card_customization: dict[str, Any] | None = None,
    ) -> StoreProduct:
        """
        Create a StoreProduct and its Inventory simultaneously.
        Supports linking to an existing MongoDB book, or creating one from
        manual data or Open Library import data.
        """
        # 1. Determine or create canonical MongoDB book
        if not book_reference:
            if manual_book:
                title = manual_book.get("title", "").strip()
                if not title:
                    raise ValidationError({"manual_book": "Title is required for manual book creation."})

                authors_raw = manual_book.get("authors", [])
                if isinstance(authors_raw, str):
                    authors = [a.strip() for a in authors_raw.split(",") if a.strip()]
                else:
                    authors = list(authors_raw)

                genres_raw = manual_book.get("genres", [])
                if isinstance(genres_raw, str):
                    genres = [g.strip() for g in genres_raw.split(",") if g.strip()]
                else:
                    genres = list(genres_raw)

                cover_url = manual_book.get("cover_url") or custom_cover_url
                normalized_book = NormalizedBook(
                    title=title,
                    authors=authors,
                    description=manual_book.get("description", ""),
                    isbn10=manual_book.get("isbn10") or None,
                    isbn13=manual_book.get("isbn13") or None,
                    publisher=manual_book.get("publisher") or None,
                    published_date=manual_book.get("published_date") or None,
                    subjects=genres,
                    cover_urls=[cover_url] if cover_url else [],
                    source_name="store_manager_manual",
                    source_id=str(uuid.uuid4()),
                )
                book_reference = upsert_book(normalized_book)

            elif open_library_data:
                title = open_library_data.get("title", "").strip()
                if not title:
                    raise ValidationError({"open_library_data": "Title is required for Open Library book."})

                authors = open_library_data.get("authors", [])
                genres = open_library_data.get("genres", [])
                cover_urls = open_library_data.get("cover_urls", [])
                if custom_cover_url and custom_cover_url not in cover_urls:
                    cover_urls = [custom_cover_url] + cover_urls

                normalized_book = NormalizedBook(
                    title=title,
                    authors=authors,
                    description=open_library_data.get("description", ""),
                    isbn10=open_library_data.get("isbn10") or None,
                    isbn13=open_library_data.get("isbn13") or None,
                    publisher=open_library_data.get("publisher") or None,
                    published_date=open_library_data.get("published_date") or None,
                    subjects=genres,
                    cover_urls=cover_urls,
                    source_name="open_library",
                    source_id=open_library_data.get("source_id", str(uuid.uuid4())),
                )
                book_reference = upsert_book(normalized_book)

            else:
                raise ValidationError({"book_reference": "Book reference or book creation data is required."})

        # Validate the book reference exists
        try:
            get_book_by_id(book_reference)
        except BookNotFoundError:
            # Check if book exists in MongoDB directly by alternative ID
            col = _get_collection()
            doc = col.find_one({"$or": [{"_id": book_reference}, {"identifiers.isbn13": book_reference}]})
            if not doc:
                raise ValidationError({"book_reference": "Book reference does not exist in the catalog."})

        # 2. Validate price
        try:
            dec_price = Decimal(str(price))
            if dec_price < 0:
                raise ValidationError({"price": "Price cannot be negative."})
        except Exception:
            raise ValidationError({"price": "Invalid price format."})

        # Sanitize custom description
        clean_description = sanitize_rich_text(custom_description)

        # 3. Create the product
        product = StoreProduct.objects.create(
            book_reference=book_reference,
            price=dec_price,
            edition=edition,
            condition=condition,
            status=status,
            custom_cover_url=custom_cover_url.strip(),
            custom_description=clean_description,
            custom_genres=custom_genres or [],
            card_customization=card_customization or {},
        )

        # 4. Initialize inventory
        StoreService.update_inventory(
            product,
            quantity=quantity,
            reserved_quantity=reserved_quantity,
            force_status_update=(status == StoreStatus.OUT_OF_STOCK or quantity > 0),
        )
        return product

    @staticmethod
    def update_store_product(product: StoreProduct, **kwargs) -> StoreProduct:
        """Update StoreProduct scalar fields, custom attributes, and card customization."""
        if "price" in kwargs and kwargs["price"] is not None:
            dec_price = Decimal(str(kwargs["price"]))
            if dec_price < 0:
                raise ValidationError({"price": "Price cannot be negative."})
            kwargs["price"] = dec_price

        if "custom_description" in kwargs and kwargs["custom_description"] is not None:
            kwargs["custom_description"] = sanitize_rich_text(kwargs["custom_description"])

        for key, value in kwargs.items():
            if hasattr(product, key) and value is not None:
                setattr(product, key, value)

        product.save()
        return product

    @staticmethod
    @transaction.atomic
    def update_inventory(
        product: StoreProduct,
        quantity: int | None = None,
        reserved_quantity: int | None = None,
        force_status_update: bool = True,
    ) -> Inventory:
        """
        Safely update inventory levels and recalculate the product's status.
        """
        inventory, _ = Inventory.objects.get_or_create(product=product)

        if quantity is not None:
            if quantity < 0:
                raise ValidationError({"quantity": "Quantity cannot be negative."})
            inventory.quantity = quantity

        if reserved_quantity is not None:
            if reserved_quantity < 0:
                raise ValidationError({"reserved_quantity": "Reserved quantity cannot be negative."})
            inventory.reserved_quantity = reserved_quantity

        if inventory.reserved_quantity > inventory.quantity:
            raise ValidationError({"reserved_quantity": "Reserved quantity cannot exceed total quantity."})

        inventory.save()

        # Determine if we should cascade a status update
        if force_status_update and product.status != StoreStatus.DISCONTINUED:
            available = inventory.available_quantity
            new_status = product.status

            if available == 0:
                new_status = StoreStatus.OUT_OF_STOCK
            elif available <= LOW_STOCK_THRESHOLD:
                new_status = StoreStatus.LOW_STOCK
            else:
                new_status = StoreStatus.IN_STOCK

            if new_status != product.status:
                product.status = new_status
                product.save(update_fields=["status", "updated_at"])

        return inventory

    @staticmethod
    def enrich_products_with_book_data(products: list[StoreProduct]) -> list[dict[str, Any]]:
        """
        Batch-fetches MongoDB book metadata for a list of StoreProducts
        to eliminate N+1 queries.
        Returns a list of unified dictionaries with both commerce and bibliographic attributes.
        """
        if not products:
            return []

        # 1. Collect all distinct book references
        refs = list({p.book_reference for p in products if p.book_reference})
        object_ids = []
        string_refs = []
        for ref in refs:
            try:
                object_ids.append(ObjectId(ref))
            except (InvalidId, TypeError):
                string_refs.append(ref)

        # 2. Bulk query MongoDB
        col = _get_collection()
        mongo_query: dict[str, Any] = {}
        clauses = []
        if object_ids:
            clauses.append({"_id": {"$in": object_ids}})
        if string_refs:
            clauses.append({"_id": {"$in": string_refs}})
            clauses.append({"identifiers.isbn13": {"$in": string_refs}})
            clauses.append({"identifiers.isbn10": {"$in": string_refs}})

        if clauses:
            mongo_query = {"$or": clauses}
            docs = list(col.find(mongo_query))
        else:
            docs = []

        # 3. Index docs by id and isbn
        book_map: dict[str, dict[str, Any]] = {}
        for d in docs:
            doc_id = str(d.get("_id"))
            book_map[doc_id] = d
            isbn13 = (d.get("identifiers") or {}).get("isbn13")
            if isbn13:
                book_map[isbn13] = d
            isbn10 = (d.get("identifiers") or {}).get("isbn10")
            if isbn10:
                book_map[isbn10] = d

        # 4. Assemble enriched product dictionaries
        enriched_list = []
        for p in products:
            book = book_map.get(str(p.book_reference), {})

            # Title
            title = book.get("title") or "Untitled Edition"

            # Authors
            raw_authors = book.get("authors") or []
            authors = []
            for a in raw_authors:
                if isinstance(a, dict):
                    name = a.get("name")
                    if name:
                        authors.append(name)
                elif isinstance(a, str):
                    authors.append(a)

            # Cover Image: custom_cover_url takes highest precedence
            cover_image = p.custom_cover_url.strip() if p.custom_cover_url else ""
            if not cover_image:
                cover_urls = book.get("cover_urls") or []
                if cover_urls and isinstance(cover_urls, list) and cover_urls[0]:
                    cover_image = cover_urls[0]
                elif book.get("cover_image"):
                    cover_image = book.get("cover_image")
                elif book.get("covers") and isinstance(book.get("covers"), list) and book["covers"][0]:
                    cover_image = book["covers"][0]

            # Description: custom_description takes precedence
            description = p.custom_description.strip() if p.custom_description else (book.get("description") or "")

            # Genres: custom_genres takes precedence, falls back to book subjects/genres
            genres = list(p.custom_genres) if p.custom_genres else (book.get("subjects") or book.get("genres") or [])

            # ISBN
            identifiers = book.get("identifiers") or {}
            isbn = identifiers.get("isbn13") or identifiers.get("isbn10") or None

            # Inventory quantities
            try:
                inv = p.inventory
                quantity = inv.quantity
                reserved = inv.reserved_quantity
                available = inv.available_quantity
            except Exception:
                quantity = 0
                reserved = 0
                available = 0

            # Detail editorial content for BDP
            detail_obj = getattr(p, "detail", None)
            orig_price = None
            is_disc = False
            disc_pct = None

            # Seller Attribution
            store_id = str(p.created_by.id) if p.created_by else None
            store_name = (
                (p.created_by.business_name or p.created_by.display_name or p.created_by.username)
                if p.created_by
                else "Akashic Official Sanctuary"
            )
            manager_username = p.created_by.username if p.created_by else None

            if detail_obj and detail_obj.original_price is not None:
                orig_price = str(detail_obj.original_price)
                if detail_obj.original_price > p.price:
                    is_disc = True
                    disc_pct = round(
                        float((detail_obj.original_price - p.price) / detail_obj.original_price) * 100
                    )

            # At a Glance highlights
            if detail_obj and detail_obj.at_a_glance:
                at_a_glance = detail_obj.at_a_glance
            else:
                icons = ["🪄", "📜", "⚔️", "🧙", "🔮", "✨", "💫", "📖"]
                selected_genres = genres[:4] if genres else ["Staff Pick", "Exclusive Edition"]
                at_a_glance = [
                    {"icon": icons[idx % len(icons)], "label": g, "bg_color": "", "text_color": ""}
                    for idx, g in enumerate(selected_genres)
                ]

            # Synopsis & Full Description
            synopsis = (
                detail_obj.synopsis.strip()
                if detail_obj and detail_obj.synopsis
                else (description.split("\n")[0][:280] if description else "")
            )
            full_description = (
                detail_obj.full_description.strip()
                if detail_obj and detail_obj.full_description
                else description
            )

            # Editorial Cards
            editorial_cards = detail_obj.editorial_cards if detail_obj and detail_obj.editorial_cards else []

            # Excerpt
            excerpt = detail_obj.excerpt if detail_obj and detail_obj.excerpt else ""

            # Why we chose & Content warnings
            why_we_chose = (
                detail_obj.why_we_chose
                if detail_obj and detail_obj.why_we_chose
                else f"Selected by the Akashic Curators for its exquisite craftsmanship, resonant storytelling, and distinctive voice in {genres[0] if genres else 'literature'}."
            )
            content_warnings = (
                detail_obj.content_warnings if detail_obj and detail_obj.content_warnings is not None else []
            )

            # Hero theme
            hero_theme = detail_obj.hero_theme if detail_obj and detail_obj.hero_theme else {
                "background_color": "#FEE6D0",
                "wave_color": "#FDD7B5"
            }
            hero_title_color = hero_theme.get("title_color") or ""

            detail_dict = {
                "original_price": orig_price,
                "is_discounted": is_disc,
                "discount_percentage": disc_pct,
                "hero_theme": hero_theme,
                "hero_title_color": hero_title_color,
                "at_a_glance": at_a_glance,
                "synopsis": synopsis,
                "full_description": full_description,
                "editorial_cards": editorial_cards,
                "excerpt": excerpt,
                "sample_excerpt": excerpt,
                "why_we_chose": why_we_chose,
                "content_warnings": content_warnings,
            }

            enriched_list.append(
                {
                    "id": str(p.id),
                    "book_reference": str(p.book_reference),
                    "store_id": store_id,
                    "store_name": store_name,
                    "manager_username": manager_username,
                    "edition": p.edition or "",
                    "condition": p.condition or "",
                    "price": str(p.price),
                    "original_price": orig_price,
                    "is_discounted": is_disc,
                    "discount_percentage": disc_pct,
                    "status": p.status,
                    "title": title,
                    "authors": authors,
                    "cover_image": cover_image,
                    "description": description,
                    "genres": genres,
                    "isbn": isbn,
                    "custom_cover_url": p.custom_cover_url,
                    "custom_description": p.custom_description,
                    "custom_genres": p.custom_genres,
                    "card_customization": p.card_customization or {},
                    "detail": detail_dict,
                    "quantity": quantity,
                    "reserved_quantity": reserved,
                    "available_quantity": available,
                    "inventory": {
                        "quantity": quantity,
                        "reserved_quantity": reserved,
                        "available_quantity": available,
                    },
                    "created_at": p.created_at.isoformat() if p.created_at else "",
                    "updated_at": p.updated_at.isoformat() if p.updated_at else "",
                }
            )

        return enriched_list

    @staticmethod
    def get_or_create_product_detail(product: StoreProduct) -> StoreProductDetail:
        """Retrieve existing detail record or create a baseline default."""
        detail, _ = StoreProductDetail.objects.get_or_create(product=product)
        return detail

    @staticmethod
    @transaction.atomic
    def update_product_detail(product: StoreProduct, **kwargs) -> StoreProductDetail:
        """
        Update editorial, promotional, and aesthetic fields for the Book Detail Page.
        Sanitizes rich text fields to prevent XSS.
        """
        detail, _ = StoreProductDetail.objects.get_or_create(product=product)

        if "original_price" in kwargs:
            orig = kwargs["original_price"]
            if orig is not None and str(orig).strip():
                dec_orig = Decimal(str(orig))
                if dec_orig < 0:
                    raise ValidationError({"original_price": "Original price cannot be negative."})
                detail.original_price = dec_orig
            else:
                detail.original_price = None

        if "synopsis" in kwargs and kwargs["synopsis"] is not None:
            detail.synopsis = sanitize_rich_text(kwargs["synopsis"])

        if "full_description" in kwargs and kwargs["full_description"] is not None:
            detail.full_description = sanitize_rich_text(kwargs["full_description"])

        if "sample_excerpt" in kwargs and kwargs["sample_excerpt"] is not None:
            detail.excerpt = sanitize_rich_text(kwargs["sample_excerpt"])
        elif "excerpt" in kwargs and kwargs["excerpt"] is not None:
            detail.excerpt = sanitize_rich_text(kwargs["excerpt"])

        if "why_we_chose" in kwargs and kwargs["why_we_chose"] is not None:
            detail.why_we_chose = sanitize_rich_text(kwargs["why_we_chose"])

        if "hero_theme" in kwargs and kwargs["hero_theme"] is not None:
            detail.hero_theme = dict(kwargs["hero_theme"])

        if "hero_title_color" in kwargs and kwargs["hero_title_color"] is not None:
            if not isinstance(detail.hero_theme, dict):
                detail.hero_theme = {}
            detail.hero_theme["title_color"] = str(kwargs["hero_title_color"]).strip()

        if "at_a_glance" in kwargs and kwargs["at_a_glance"] is not None:
            detail.at_a_glance = kwargs["at_a_glance"]

        if "editorial_cards" in kwargs and kwargs["editorial_cards"] is not None:
            detail.editorial_cards = kwargs["editorial_cards"]

        if "content_warnings" in kwargs and kwargs["content_warnings"] is not None:
            raw_warnings = kwargs["content_warnings"]
            if isinstance(raw_warnings, str):
                raw_warnings = raw_warnings.split("\n")
            normalized: list[str] = []
            if isinstance(raw_warnings, (list, tuple)):
                for w in raw_warnings:
                    cleaned = str(w).strip()
                    if cleaned and cleaned not in normalized:
                        normalized.append(cleaned)
            detail.content_warnings = normalized

        detail.save()
        return detail

    @staticmethod
    def get_filtered_store_products(
        genre: str | None = None,
        search: str | None = None,
        status_filter: str | None = None,
        include_discontinued: bool = False,
    ) -> list[dict[str, Any]]:
        """
        Query StoreProducts with optional genre and search filters,
        enriching them with MongoDB book data.
        """
        qs = StoreProduct.objects.all().select_related("inventory", "detail", "created_by")

        if not include_discontinued:
            qs = qs.exclude(status=StoreStatus.DISCONTINUED)

        # Exclude products from suspended or deactivated managers
        qs = qs.exclude(
            Q(created_by__manager_status="SUSPENDED")
            | Q(created_by__is_active=False)
        )

        if status_filter:
            qs = qs.filter(status=status_filter)

        # 1. If searching by genre:
        if genre and genre.strip() and genre.strip().lower() not in ("all", "all books"):
            target_genre = genre.strip()
            # Match in PostgreSQL custom_genres JSONField or query MongoDB for matching books
            col = _get_collection()
            regex = re.compile(re.escape(target_genre), re.IGNORECASE)
            matched_books = list(col.find({"$or": [{"subjects": regex}, {"genres": regex}]}, {"_id": 1}))
            matched_ids = [str(b["_id"]) for b in matched_books]

            qs = qs.filter(
                Q(custom_genres__icontains=target_genre) | Q(book_reference__in=matched_ids)
            )

        # 2. If text search query:
        if search and search.strip():
            query = search.strip()
            regex = re.compile(re.escape(query), re.IGNORECASE)
            col = _get_collection()
            matched_books = list(
                col.find(
                    {
                        "$or": [
                            {"title": regex},
                            {"authors.name": regex},
                            {"description": regex},
                            {"identifiers.isbn13": regex},
                            {"identifiers.isbn10": regex},
                        ]
                    },
                    {"_id": 1},
                )
            )
            matched_ids = [str(b["_id"]) for b in matched_books]

            qs = qs.filter(
                Q(book_reference__in=matched_ids)
                | Q(custom_description__icontains=query)
                | Q(edition__icontains=query)
            )

        products = list(qs.order_by("-created_at"))
        return StoreService.enrich_products_with_book_data(products)

    @staticmethod
    def get_bulk_store_availability(book_ids: list[str]) -> dict[str, dict]:
        """
        Retrieve StoreProduct availability for a list of MongoDB book IDs.
        Used to enrich discovery API responses without N+1 queries.
        """
        if not book_ids:
            return {}

        products = (
            StoreProduct.objects.filter(book_reference__in=book_ids)
            .exclude(status=StoreStatus.DISCONTINUED)
            .order_by("book_reference", "price")
        )

        availability = {}
        for p in products:
            if p.book_reference not in availability:
                is_available = p.status in [StoreStatus.IN_STOCK, StoreStatus.LOW_STOCK]
                availability[p.book_reference] = {
                    "available": is_available,
                    "product_id": str(p.id),
                    "price": str(p.price),
                }
            elif not availability[p.book_reference]["available"]:
                if p.status in [StoreStatus.IN_STOCK, StoreStatus.LOW_STOCK]:
                    availability[p.book_reference] = {
                        "available": True,
                        "product_id": str(p.id),
                        "price": str(p.price),
                    }

        return availability

    @staticmethod
    def get_store_product_offers(product_id_or_ref: str) -> list[dict[str, Any]]:
        """
        Retrieve all alternative active StoreProduct offers for the same canonical edition
        across approved, active store curators.
        """
        try:
            prod = StoreProduct.objects.get(pk=product_id_or_ref)
            ref = prod.book_reference
        except Exception:
            ref = product_id_or_ref

        offers = (
            StoreProduct.objects.filter(book_reference=ref)
            .exclude(status=StoreStatus.DISCONTINUED)
            .exclude(
                Q(created_by__manager_status="SUSPENDED") | Q(created_by__is_active=False)
            )
            .select_related("inventory", "created_by", "detail")
            .order_by("price")
        )

        return StoreService.enrich_products_with_book_data(list(offers))
