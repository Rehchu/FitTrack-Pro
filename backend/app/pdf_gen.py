from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from io import BytesIO


def generate_workout_pdf(client_name: str, workouts: list[dict], meal_plans: list[dict], avatar_png: bytes | None = None) -> bytes:
    """Generate a simple PDF summarizing workouts and meal plans. Optionally embed avatar PNG bytes. Returns bytes."""
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter

    c.setFont("Helvetica-Bold", 16)
    c.drawString(40, height - 40, f"Workout & Meal Plan for {client_name}")

    # If avatar provided, draw it at top-right
    if avatar_png:
        try:
            img = ImageReader(BytesIO(avatar_png))
            img_w = 120
            img_h = 120
            c.drawImage(img, width - img_w - 40, height - img_h - 60, width=img_w, height=img_h, mask='auto')
        except Exception:
            # ignore image embedding errors and continue
            pass

    y = height - 160
    c.setFont("Helvetica-Bold", 12)
    c.drawString(40, y, "Workouts:")
    y -= 20
    c.setFont("Helvetica", 10)
    if not workouts:
        c.drawString(60, y, "No workouts planned.")
        y -= 20
    else:
        for w in workouts:
            c.drawString(60, y, f"- {w.get('title', 'Untitled')} ({w.get('scheduled_at', '')})")
            y -= 14
            if y < 80:
                c.showPage()
                y = height - 40

    y -= 10
    c.setFont("Helvetica-Bold", 12)
    c.drawString(40, y, "Meal Plans:")
    y -= 20
    c.setFont("Helvetica", 10)
    if not meal_plans:
        c.drawString(60, y, "No meal plans.")
        y -= 20
    else:
        for m in meal_plans:
            c.drawString(60, y, f"- {m.get('title', 'Untitled')}")
            y -= 14
            if y < 80:
                c.showPage()
                y = height - 40

    c.showPage()
    c.save()
    buffer.seek(0)
    return buffer.read()
