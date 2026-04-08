from django.core.management.base import BaseCommand

from qrcode.models import Product


class Command(BaseCommand):
    help = "Regenerate QR images for existing products using the current public frontend URL."

    def add_arguments(self, parser):
        parser.add_argument(
            "--id",
            type=int,
            action="append",
            dest="product_ids",
            help="Regenerate QR code only for the specified product id. Repeat to target multiple products.",
        )

    def handle(self, *args, **options):
        queryset = Product.objects.order_by("pk")
        product_ids = options.get("product_ids") or []
        if product_ids:
            queryset = queryset.filter(pk__in=product_ids)

        regenerated = 0
        for product in queryset.iterator():
            product.rebuild_qr_code(save=True)
            regenerated += 1
            self.stdout.write(f"Regenerated QR for product {product.pk}")

        summary = f"Regenerated {regenerated} QR code(s)."
        self.stdout.write(self.style.SUCCESS(summary))
