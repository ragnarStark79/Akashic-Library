"""
Constants for Recommendations and Legal Access Classifications.
"""

class AccessClassification:
    """The six authoritative legal access classifications defined in Section 24."""
    OUR_STORE = "OUR_STORE"
    EXTERNAL_PURCHASE = "EXTERNAL_PURCHASE"
    PREVIEW = "PREVIEW"
    BORROW = "BORROW"
    PUBLIC_DOMAIN = "PUBLIC_DOMAIN"
    INFORMATION = "INFORMATION"

    CHOICES = [
        OUR_STORE,
        EXTERNAL_PURCHASE,
        PREVIEW,
        BORROW,
        PUBLIC_DOMAIN,
        INFORMATION,
    ]
